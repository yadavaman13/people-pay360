import * as payslipDao from '../../../dao/payslip.dao.js';
import * as payrunDao from '../../../dao/payrun.dao.js';
import * as salaryRuleDao from '../../../dao/salaryRule.dao.js';
import { findContractById, getApplicableContract } from '../../../dao/contract.dao.js';
import { findEmployeeById } from '../../../dao/employee.dao.js';
import { getAttendanceForPeriod } from '../../../dao/attendance.dao.js';
import { getApprovedTimeOff } from '../../../dao/timeOffRequest.dao.js';
import { computePayslip } from './salaryEngine.service.js';
import { AppError } from '../../../utils/appError.js';
import { db } from '../../../config/database.config.js';
import { payslips } from '../../../db/schema/payroll.schema.js';
import { eq } from 'drizzle-orm';

/**
 * Payslip Service
 */

export async function listPayslips(filter, user) {
    const queryParams = { ...filter };

    // Employee RBAC: only view own payslips in PAID or SENT states
    if (user.role === 'EMPLOYEE') {
        if (!user.employeeId) {
            throw new AppError('No employee profile linked to current user', 403);
        }
        queryParams.employeeId = user.employeeId;
        queryParams.status = ['PAID', 'SENT'];
    }

    return payslipDao.findPayslips(queryParams);
}

export async function getPayslipById(id, user) {
    const payslip = await payslipDao.findPayslipWithLines(id);
    if (!payslip) {
        throw new AppError('Payslip not found', 404);
    }

    // Employee RBAC
    if (user.role === 'EMPLOYEE') {
        if (!user.employeeId || payslip.employeeId !== user.employeeId) {
            throw new AppError('Access denied: You can only view your own payslips', 403);
        }
    }

    // Group breakdown lines for clear payroll presentation
    const breakdown = {
        basic: payslip.lines.filter((l) => l.category === 'BASIC'),
        allowances: payslip.lines.filter((l) => l.category === 'ALLOWANCE'),
        gross: payslip.lines.find((l) => l.category === 'GROSS') || null,
        deductions: payslip.lines.filter((l) => l.category === 'DEDUCTION'),
        net: payslip.lines.find((l) => l.category === 'NET') || null,
        other: payslip.lines.filter((l) => l.category === 'OTHER'),
    };

    return {
        ...payslip,
        breakdown,
    };
}

export async function getPayslipLines(id, user) {
    const payslip = await payslipDao.findPayslipById(id);
    if (!payslip) {
        throw new AppError('Payslip not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        if (!user.employeeId || payslip.employeeId !== user.employeeId) {
            throw new AppError('Access denied: You can only view your own payslip lines', 403);
        }
    }

    return payslipDao.getPayslipLines(id);
}

export async function updatePayslip(id, data) {
    const payslip = await payslipDao.findPayslipById(id);
    if (!payslip) {
        throw new AppError('Payslip not found', 404);
    }

    if (payslip.status !== 'DRAFT') {
        throw new AppError(
            `Cannot update payslip with status "${payslip.status}". Direct updates only permitted in DRAFT state.`,
            409,
        );
    }

    const updated = await payslipDao.updatePayslip(id, data);
    return updated;
}

export async function deletePayslip(id) {
    const payslip = await payslipDao.findPayslipById(id);
    if (!payslip) {
        throw new AppError('Payslip not found', 404);
    }

    if (payslip.status !== 'DRAFT') {
        throw new AppError(
            `Cannot delete payslip with status "${payslip.status}". Only DRAFT payslips may be deleted.`,
            409,
        );
    }

    const deleted = await payslipDao.deletePayslip(id);
    return deleted;
}

/**
 * Recompute individual payslip with fresh data
 */
export async function recomputeSinglePayslip(payslipId, _userId) {
    const payslip = await payslipDao.findPayslipById(payslipId);
    if (!payslip) {
        throw new AppError('Payslip not found', 404);
    }

    if (!['DRAFT', 'COMPUTED'].includes(payslip.status)) {
        throw new AppError(
            `Cannot recompute payslip in "${payslip.status}" status. Recomputation is forbidden once VALIDATED, PAID, or SENT.`,
            409,
        );
    }

    const payrun = await payrunDao.findPayrunById(payslip.payrunId);
    if (!payrun) {
        throw new AppError('Parent payrun not found', 404);
    }

    if (['VALIDATED', 'PAID'].includes(payrun.status)) {
        throw new AppError(
            `Cannot recompute payslip: parent payrun is already ${payrun.status}`,
            409,
        );
    }

    const employee = await findEmployeeById(payslip.employeeId);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    let contract = null;
    if (payslip.contractId) {
        contract = await findContractById(payslip.contractId);
    }
    if (!contract) {
        contract = await getApplicableContract(
            payslip.employeeId,
            payslip.periodStart,
            payslip.periodEnd,
        );
    }
    if (!contract) {
        throw new AppError('No applicable active contract found for this employee period', 422);
    }

    const structureId = payslip.structureId || payrun.structureId;
    const rules = await salaryRuleDao.findRulesByStructureId(structureId, { isActive: true });
    if (!rules || rules.length === 0) {
        throw new AppError('Assigned salary structure has no rules defined', 422);
    }

    const [attendanceData, timeOffData] = await Promise.all([
        getAttendanceForPeriod(payslip.employeeId, payslip.periodStart, payslip.periodEnd),
        getApprovedTimeOff(payslip.employeeId, payslip.periodStart, payslip.periodEnd),
    ]);

    const computation = computePayslip({
        employee,
        contract,
        payrun,
        attendanceData,
        timeOffData,
        rules,
    });

    await payslipDao.updatePayslipWithComputedLines(payslipId, {
        grossAmount: computation.grossAmount,
        deductionAmount: computation.deductionAmount,
        netAmount: computation.netAmount,
        workedDays: computation.workedDays,
        contractWageSnapshot: computation.contractWageSnapshot,
        lines: computation.lines,
    });

    // Update parent payrun financial totals to reflect the recomputed payslip
    const payrunPayslips = await db
        .select({
            grossAmount: payslips.grossAmount,
            deductionAmount: payslips.deductionAmount,
            netAmount: payslips.netAmount,
        })
        .from(payslips)
        .where(eq(payslips.payrunId, payrun.id));

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    for (const p of payrunPayslips) {
        totalGross += Number(p.grossAmount || 0);
        totalDeductions += Number(p.deductionAmount || 0);
        totalNet += Number(p.netAmount || 0);
    }

    await payrunDao.updatePayrun(payrun.id, {
        totalGross: totalGross.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalNet: totalNet.toFixed(2),
    });

    return payslipDao.findPayslipWithLines(payslipId);
}
