import {
    getPayrunById,
    getPayrunEmployeesAuditRoster,
    getPayrunPayslips,
    findConflictingPayslips,
    getSalaryRulesCount,
    updatePayrunToValidated,
} from '../../../dao/payrollValidation.dao.js';
import { sendResponse } from '../../../utils/response.utlis.js';

/**
 * Audit warnings engine for a payrun
 *
 * @param {string} payrunId
 * @returns {Promise<object>}
 */
async function auditPayrunWarnings(payrunId) {
    const payrun = await getPayrunById(payrunId);
    if (!payrun) {
        return { error: 'Payrun not found' };
    }

    const roster = await getPayrunEmployeesAuditRoster(payrunId);
    const payslips = await getPayrunPayslips(payrunId);
    const rulesCount = await getSalaryRulesCount(payrun.structureId);

    const alerts = [];

    // 1. Structure Rules Check (BLOCKER)
    if (rulesCount === 0) {
        alerts.push({
            type: 'EMPTY_SALARY_STRUCTURE',
            severity: 'BLOCKER',
            message: `Salary structure "${payrun.structureName || 'Assigned'}" has zero salary rules defined. Calculation cannot proceed.`,
        });
    }

    // 2. Payslip Generation Check (BLOCKER)
    if (payslips.length === 0) {
        alerts.push({
            type: 'NO_COMPUTED_PAYSLIPS',
            severity: 'BLOCKER',
            message:
                'No payslips have been computed for this payrun. Please compute the payrun before validating.',
        });
    }

    // 3. Employee Roster Checks
    const employeeIds = [];
    const payslipByEmpId = new Map();
    for (const p of payslips) {
        payslipByEmpId.set(p.employeeId, p);
    }

    for (const emp of roster) {
        const fullName = `${emp.firstName} ${emp.lastName}`.trim();
        const empLabel = `${fullName} (${emp.employeeCode})`;

        // Only inspect selected/eligible employees
        if (emp.selectionStatus === 'EXCLUDED') {
            continue;
        }

        employeeIds.push(emp.employeeId);

        // A. Missing Bank Account (BLOCKER for payroll settlement)
        if (!emp.bankId || !emp.isBankPrimary || !emp.isBankActive) {
            alerts.push({
                type: 'MISSING_BANK_ACCOUNT',
                severity: 'BLOCKER',
                employeeId: emp.employeeId,
                employeeCode: emp.employeeCode,
                employeeName: fullName,
                message: `Employee ${empLabel} has no active primary bank account for salary disbursement.`,
            });
        }

        // B. Missing or Inactive Contract (BLOCKER)
        if (!emp.contractId || emp.contractStatus !== 'ACTIVE') {
            alerts.push({
                type: 'MISSING_ACTIVE_CONTRACT',
                severity: 'BLOCKER',
                employeeId: emp.employeeId,
                employeeCode: emp.employeeCode,
                employeeName: fullName,
                message: `Employee ${empLabel} does not have an active contract linked for this period.`,
            });
        } else {
            // Check contract expiration warning
            if (emp.contractEndDate) {
                const contractEnd = new Date(emp.contractEndDate);
                const periodEnd = new Date(payrun.periodEnd);
                const diffDays = Math.ceil((contractEnd - periodEnd) / (1000 * 60 * 60 * 24));
                if (diffDays <= 30 && diffDays >= 0) {
                    alerts.push({
                        type: 'CONTRACT_EXPIRING_SOON',
                        severity: 'WARNING',
                        employeeId: emp.employeeId,
                        employeeCode: emp.employeeCode,
                        employeeName: fullName,
                        message: `Contract for ${empLabel} expires in ${diffDays} days (${emp.contractEndDate}).`,
                    });
                }
            }
        }

        // C. Payslip Specific Checks
        const empPayslip = payslipByEmpId.get(emp.employeeId);
        if (empPayslip) {
            if (Number(empPayslip.netAmount) <= 0) {
                alerts.push({
                    type: 'ZERO_OR_NEGATIVE_NET',
                    severity: 'WARNING',
                    employeeId: emp.employeeId,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    message: `Employee ${empLabel} has zero or negative net pay (₹${empPayslip.netAmount}).`,
                });
            }

            if (empPayslip.workedDays && Number(empPayslip.workedDays) === 0) {
                alerts.push({
                    type: 'ZERO_WORKED_DAYS',
                    severity: 'WARNING',
                    employeeId: emp.employeeId,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    message: `Employee ${empLabel} has 0 recorded worked days for this period.`,
                });
            }
        }
    }

    // 4. Overlapping duplicate payslips across other payruns (BLOCKER)
    if (employeeIds.length > 0) {
        const conflicts = await findConflictingPayslips(
            employeeIds,
            payrun.periodStart,
            payrun.periodEnd,
            payrunId,
        );

        for (const conf of conflicts) {
            alerts.push({
                type: 'DUPLICATE_PAYSLIP_PERIOD',
                severity: 'BLOCKER',
                employeeId: conf.employeeId,
                otherPayrunId: conf.otherPayrunId,
                message: `Employee already has an existing payslip in payrun "${conf.otherPayrunName}" covering an overlapping period (${conf.periodStart} to ${conf.periodEnd}).`,
            });
        }
    }

    const blockers = alerts.filter((a) => a.severity === 'BLOCKER');
    const warnings = alerts.filter((a) => a.severity === 'WARNING');

    return {
        payrun: {
            id: payrun.id,
            name: payrun.name,
            status: payrun.status,
            periodStart: payrun.periodStart,
            periodEnd: payrun.periodEnd,
            totalEmployees: payrun.totalEmployees,
            totalGross: payrun.totalGross,
            totalNet: payrun.totalNet,
            computedAt: payrun.computedAt,
            validatedAt: payrun.validatedAt,
        },
        summary: {
            blockersCount: blockers.length,
            warningsCount: warnings.length,
            totalAlerts: alerts.length,
            canValidate: blockers.length === 0,
        },
        alerts,
    };
}

/**
 * GET /api/payruns/:id/warnings
 */
export async function getPayrunWarnings(req, res, next) {
    try {
        const { id: payrunId } = req.params;
        const result = await auditPayrunWarnings(payrunId);

        if (result.error) {
            return sendResponse({
                res,
                statusCode: 404,
                message: result.error,
                success: false,
            });
        }

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Payrun warnings evaluated successfully',
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/payruns/:id/validate
 */
export async function validatePayrun(req, res, next) {
    try {
        const { id: payrunId } = req.params;
        const { overrideBlockers = false } = req.body;

        const payrun = await getPayrunById(payrunId);
        if (!payrun) {
            return sendResponse({
                res,
                statusCode: 404,
                message: 'Payrun not found',
                success: false,
            });
        }

        // State Machine validation
        if (payrun.status === 'VALIDATED') {
            return sendResponse({
                res,
                statusCode: 400,
                message: 'Payrun is already validated',
                success: false,
                data: payrun,
            });
        }

        if (payrun.status === 'PAID') {
            return sendResponse({
                res,
                statusCode: 400,
                message: 'Payrun has already been paid and is immutable',
                success: false,
            });
        }

        // Run validation audit
        const audit = await auditPayrunWarnings(payrunId);
        if (audit.summary.blockersCount > 0 && !overrideBlockers) {
            return sendResponse({
                res,
                statusCode: 422,
                message: `Payrun cannot be validated due to ${audit.summary.blockersCount} blocking warning(s). Resolve the blockers or explicitly provide overrideBlockers: true.`,
                success: false,
                data: {
                    summary: audit.summary,
                    blockers: audit.alerts.filter((a) => a.severity === 'BLOCKER'),
                },
            });
        }

        // Perform atomic transition
        const updatedPayrun = await updatePayrunToValidated(payrunId, req.user?.id || null);

        return sendResponse({
            res,
            statusCode: 200,
            message:
                'Payrun validated successfully. Payslips are now locked for payment and distribution.',
            success: true,
            data: {
                payrun: updatedPayrun,
                auditSummary: audit.summary,
            },
        });
    } catch (error) {
        next(error);
    }
}
