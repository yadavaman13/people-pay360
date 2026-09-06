import * as payrunDao from '../../../dao/payrun.dao.js';
import * as payslipDao from '../../../dao/payslip.dao.js';
import * as salaryStructureDao from '../../../dao/salaryStructure.dao.js';
import * as salaryRuleDao from '../../../dao/salaryRule.dao.js';
import { getApplicableContract } from '../../../dao/contract.dao.js';
import { findEmployeeById } from '../../../dao/employee.dao.js';
import { getAttendanceForPeriod } from '../../../dao/attendance.dao.js';
import { getApprovedTimeOff } from '../../../dao/timeOffRequest.dao.js';
import { computePayslip } from '../../payslips/services/salaryEngine.service.js';
import { AppError } from '../../../utils/appError.js';
import { db } from '../../../config/database.config.js';
import { payruns, payslips } from '../../../db/schema/payroll.schema.js';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Payrun Service
 */

/**
 * Step 1 Wizard: Validate scope and return eligible roster preview
 */
export async function validateWizardScope({ salaryStructureId, periodStart, periodEnd }) {
    const structure = await salaryStructureDao.findStructureById(salaryStructureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    const preview = await payrunDao.findEligibleEmployees(
        salaryStructureId,
        periodStart,
        periodEnd,
    );

    return {
        structure: {
            id: structure.id,
            name: structure.name,
            code: structure.code,
        },
        period: {
            start: periodStart,
            end: periodEnd,
        },
        eligible: preview.eligible,
        ineligible: preview.ineligible,
        totalEligible: preview.totalEligible,
        totalIneligible: preview.totalIneligible,
        warnings: preview.warnings,
    };
}

/**
 * Step 2: Create payrun batch header, roster, and initial draft payslips
 */
export async function createPayrun(data, createdByUserId) {
    const structure = await salaryStructureDao.findStructureById(data.salaryStructureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    const selectedItems = [];

    for (const empId of data.employeeIds) {
        const emp = await findEmployeeById(empId);
        if (!emp) {
            continue;
        }

        let contract = null;
        let eligibilityStatus = 'ELIGIBLE';
        let notes = null;

        try {
            contract = await getApplicableContract(empId, data.periodStart, data.periodEnd);
            if (!contract) {
                eligibilityStatus = 'INELIGIBLE';
                notes = 'No active contract found for this payroll period';
            } else if (contract.salaryStructureId !== data.salaryStructureId) {
                eligibilityStatus = 'INELIGIBLE';
                notes = 'Contract assigned to a different salary structure';
            }
        } catch (err) {
            eligibilityStatus = 'INELIGIBLE';
            notes = err.message;
        }

        selectedItems.push({
            employeeId: empId,
            contractId: contract ? contract.id : null,
            wage: contract ? contract.wage : null,
            eligibilityStatus,
            selectionStatus: 'SELECTED',
            notes,
        });
    }

    if (selectedItems.length === 0) {
        throw new AppError('No valid employees found in selection', 422);
    }

    let payrunName = data.name;
    if (!payrunName) {
        const [year, month] = data.periodStart.split('-');
        const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
        const monthYear = dateObj.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
        });
        payrunName = `${monthYear} ${structure.name} Payroll`;
    }

    const payrun = await payrunDao.createPayrunWithRoster(
        {
            name: payrunName,
            structureId: data.salaryStructureId,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            paymentDate: data.paymentDate || null,
            createdBy: createdByUserId,
            notes: data.notes || null,
        },
        selectedItems,
    );

    return payrunDao.findPayrunWithPayslips(payrun.id);
}

export async function listPayruns(filter) {
    return payrunDao.findAllPayruns(filter);
}

export async function getPayrunById(id) {
    const payrun = await payrunDao.findPayrunWithPayslips(id);
    if (!payrun) {
        throw new AppError('Payrun not found', 404);
    }
    return payrun;
}

export async function updatePayrun(id, data) {
    const payrun = await payrunDao.findPayrunById(id);
    if (!payrun) {
        throw new AppError('Payrun not found', 404);
    }

    if (payrun.status !== 'DRAFT') {
        throw new AppError(
            `Cannot update payrun metadata while in "${payrun.status}" status (only allowed in DRAFT)`,
            409,
        );
    }

    const updated = await payrunDao.updatePayrun(id, data);
    return updated;
}

export async function deletePayrun(id) {
    const payrun = await payrunDao.findPayrunById(id);
    if (!payrun) {
        throw new AppError('Payrun not found', 404);
    }

    if (payrun.status !== 'DRAFT') {
        throw new AppError(
            `Cannot delete payrun with status "${payrun.status}". Only DRAFT payruns may be deleted.`,
            409,
        );
    }

    const deleted = await payrunDao.deletePayrun(id);
    return deleted;
}

/**
 * Execute payroll computation engine for all selected employees in a payrun
 */
export async function computePayrun(payrunId, _computedByUserId) {
    const payrun = await payrunDao.findPayrunById(payrunId);
    if (!payrun) {
        throw new AppError('Payrun not found', 404);
    }

    // Invariant: future period check
    const today = new Date().toISOString().split('T')[0];
    if (payrun.periodEnd > today) {
        throw new AppError(
            'Payroll period has not ended yet. Computation is only allowed after the period has completed.',
            422,
        );
    }

    // Invariant: recomputation is only permitted in DRAFT or COMPUTED state
    if (!['DRAFT', 'COMPUTED'].includes(payrun.status)) {
        throw new AppError(
            `Cannot compute payrun in "${payrun.status}" status. Only DRAFT and COMPUTED payruns can be computed.`,
            409,
        );
    }

    // Load active salary rules for the assigned structure
    const rules = await salaryRuleDao.findRulesByStructureId(payrun.structureId, {
        isActive: true,
    });
    if (!rules || rules.length === 0) {
        throw new AppError(
            `Salary structure "${payrun.structureName}" has no active rules defined. Calculation cannot proceed.`,
            422,
        );
    }

    // Set payrun status to COMPUTING
    await payrunDao.updatePayrun(payrunId, { status: 'COMPUTING' });

    try {
        const roster = await payrunDao.findPayrunEmployees(payrunId);
        const selectedEmployees = roster.filter((r) => r.selectionStatus !== 'EXCLUDED');

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let computedCount = 0;

        for (const empItem of selectedEmployees) {
            const employee = await findEmployeeById(empItem.employeeId);
            if (!employee) continue;

            let contract = null;
            if (empItem.contractId) {
                const { findContractById } = await import('../../../dao/contract.dao.js');
                contract = await findContractById(empItem.contractId);
            }
            if (!contract) {
                contract = await getApplicableContract(
                    empItem.employeeId,
                    payrun.periodStart,
                    payrun.periodEnd,
                );
            }

            if (!contract) {
                // If employee lacks contract, skip or flag
                continue;
            }

            const [attendanceData, timeOffData] = await Promise.all([
                getAttendanceForPeriod(empItem.employeeId, payrun.periodStart, payrun.periodEnd),
                getApprovedTimeOff(empItem.employeeId, payrun.periodStart, payrun.periodEnd),
            ]);

            const computation = computePayslip({
                employee,
                contract,
                payrun,
                attendanceData,
                timeOffData,
                rules,
            });

            // Find existing payslip record
            let payslip = await payslipDao.findPayslipByEmployeeAndPayrun(
                empItem.employeeId,
                payrunId,
            );

            if (!payslip) {
                payslip = await payslipDao.createPayslip({
                    payrunId,
                    employeeId: empItem.employeeId,
                    contractId: contract.id,
                    structureId: payrun.structureId,
                    periodStart: payrun.periodStart,
                    periodEnd: payrun.periodEnd,
                    status: 'DRAFT',
                });
            }

            await payslipDao.updatePayslipWithComputedLines(payslip.id, {
                grossAmount: computation.grossAmount,
                deductionAmount: computation.deductionAmount,
                netAmount: computation.netAmount,
                workedDays: computation.workedDays,
                contractWageSnapshot: computation.contractWageSnapshot,
                lines: computation.lines,
            });

            totalGross += computation.grossAmount;
            totalDeductions += computation.deductionAmount;
            totalNet += computation.netAmount;
            computedCount += 1;
        }

        // Finalize payrun header status
        const updatedPayrun = await payrunDao.updatePayrun(payrunId, {
            status: 'COMPUTED',
            totalEmployees: computedCount,
            totalGross: totalGross.toFixed(2),
            totalDeductions: totalDeductions.toFixed(2),
            totalNet: totalNet.toFixed(2),
            computedAt: new Date(),
        });

        return {
            payrun: updatedPayrun,
            computedEmployees: computedCount,
            totalGross: Number(totalGross.toFixed(2)),
            totalDeductions: Number(totalDeductions.toFixed(2)),
            totalNet: Number(totalNet.toFixed(2)),
        };
    } catch (err) {
        // Rollback status to DRAFT on failure
        await payrunDao.updatePayrun(payrunId, { status: 'DRAFT' });
        throw err;
    }
}

/**
 * Mark a validated payrun as PAID (immutable settlement)
 */
export async function markPayrunAsPaid(payrunId, paidByUserId, paymentDate) {
    const payrun = await payrunDao.findPayrunById(payrunId);
    if (!payrun) {
        throw new AppError('Payrun not found', 404);
    }

    if (payrun.status !== 'VALIDATED') {
        throw new AppError(
            `Payrun must be in VALIDATED state before marking as paid (current state: ${payrun.status})`,
            409,
        );
    }

    const payDate = paymentDate || new Date().toISOString().split('T')[0];
    const now = new Date();

    return await db.transaction(async (tx) => {
        // 1. Update Payrun
        const [updatedPayrun] = await tx
            .update(payruns)
            .set({
                status: 'PAID',
                paidAt: now,
                paidBy: paidByUserId,
                paymentDate: payDate,
                updatedAt: now,
            })
            .where(eq(payruns.id, payrunId))
            .returning();

        // 2. Update child Payslips (both VALIDATED and SENT are marked PAID)
        await tx
            .update(payslips)
            .set({
                status: 'PAID',
                paidAt: now,
                updatedAt: now,
            })
            .where(
                and(
                    eq(payslips.payrunId, payrunId),
                    inArray(payslips.status, ['VALIDATED', 'SENT']),
                ),
            );

        return updatedPayrun;
    });
}
