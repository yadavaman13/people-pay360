import {
    getPayrunById,
    getPayrunEmployeesAuditRoster,
    getPayrunPayslips,
    findConflictingPayslips,
    getSalaryRulesCount,
    updatePayrunToValidated,
    getPendingLeaveRequestsInPeriod,
    getOpenAttendanceRecordsInPeriod,
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

    // 0. Future Period Check (BLOCKER)
    const today = new Date().toISOString().split('T')[0];
    if (payrun.periodEnd > today) {
        alerts.push({
            type: 'FUTURE_PERIOD_OPEN',
            severity: 'BLOCKER',
            message: `Payroll period end date (${payrun.periodEnd}) is in the future. Payroll validation requires a completed period.`,
        });
    }

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

    // 5. Pending leave requests overlapping this payrun period (WARNING)
    if (employeeIds.length > 0) {
        const pendingLeave = await getPendingLeaveRequestsInPeriod(
            employeeIds,
            payrun.periodStart,
            payrun.periodEnd,
        );

        const pendingByEmp = new Map();
        for (const r of pendingLeave) {
            if (!pendingByEmp.has(r.employeeId)) pendingByEmp.set(r.employeeId, []);
            pendingByEmp.get(r.employeeId).push(r);
        }

        for (const emp of roster) {
            if (emp.selectionStatus === 'EXCLUDED') continue;
            const pending = pendingByEmp.get(emp.employeeId);
            if (pending && pending.length > 0) {
                const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                alerts.push({
                    type: 'PENDING_LEAVE_IN_PERIOD',
                    severity: 'WARNING',
                    employeeId: emp.employeeId,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    count: pending.length,
                    message: `${fullName} (${emp.employeeCode}) has ${pending.length} pending unapproved leave request(s) overlapping this payroll period. These may affect net pay.`,
                });
            }
        }
    }

    // 6. Open attendance records (missing checkout) in this payrun period (WARNING)
    if (employeeIds.length > 0) {
        const openRecords = await getOpenAttendanceRecordsInPeriod(
            employeeIds,
            payrun.periodStart,
            payrun.periodEnd,
        );

        const openByEmp = new Map();
        for (const rec of openRecords) {
            if (!openByEmp.has(rec.employeeId)) openByEmp.set(rec.employeeId, []);
            openByEmp.get(rec.employeeId).push(rec);
        }

        for (const emp of roster) {
            if (emp.selectionStatus === 'EXCLUDED') continue;
            const open = openByEmp.get(emp.employeeId);
            if (open && open.length > 0) {
                const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                alerts.push({
                    type: 'OPEN_ATTENDANCE_RECORD',
                    severity: 'WARNING',
                    employeeId: emp.employeeId,
                    employeeCode: emp.employeeCode,
                    employeeName: fullName,
                    count: open.length,
                    dates: open.map((r) => r.attendanceDate),
                    message: `${fullName} (${emp.employeeCode}) has ${open.length} attendance record(s) without checkout in this period. Worked hours may be inaccurate.`,
                });
            }
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

        if (payrun.status !== 'COMPUTED') {
            return sendResponse({
                res,
                statusCode: 400,
                message: `Payrun must be in COMPUTED status before validation (current status: "${payrun.status}")`,
                success: false,
            });
        }

        // Run validation audit
        const audit = await auditPayrunWarnings(payrunId);

        // Enforce hard non-overridable blockers
        const hardBlockers = audit.alerts.filter((a) =>
            ['DUPLICATE_PAYSLIP_PERIOD', 'FUTURE_PERIOD_OPEN'].includes(a.type),
        );
        if (hardBlockers.length > 0) {
            return sendResponse({
                res,
                statusCode: 422,
                message: `Payrun cannot be validated due to non-overridable blocker(s): ${hardBlockers.map((b) => b.message).join('; ')}`,
                success: false,
                data: {
                    summary: audit.summary,
                    blockers: hardBlockers,
                },
            });
        }

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
