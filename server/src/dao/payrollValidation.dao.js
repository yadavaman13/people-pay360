import { db } from '../config/database.config.js';
import { payruns, payrunEmployees, payslips } from '../db/schema/payroll.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { contracts } from '../db/schema/contracts.schema.js';
import { bankAccounts } from '../db/schema/bank_accounts.schema.js';
import { salaryStructures, salaryRules } from '../db/schema/salary.schema.js';
import { timeOffRequests } from '../db/schema/time_off.schema.js';
import { attendanceRecords } from '../db/schema/attendance.schema.js';
import { eq, and, sql, inArray, ne, gte, lte } from 'drizzle-orm';

/**
 * Get payrun by ID with structure details
 */
export async function getPayrunById(payrunId) {
    const [payrun] = await db
        .select({
            id: payruns.id,
            name: payruns.name,
            structureId: payruns.structureId,
            periodStart: payruns.periodStart,
            periodEnd: payruns.periodEnd,
            paymentDate: payruns.paymentDate,
            status: payruns.status,
            totalEmployees: payruns.totalEmployees,
            totalGross: payruns.totalGross,
            totalDeductions: payruns.totalDeductions,
            totalNet: payruns.totalNet,
            computedAt: payruns.computedAt,
            validatedAt: payruns.validatedAt,
            paidAt: payruns.paidAt,
            createdBy: payruns.createdBy,
            validatedBy: payruns.validatedBy,
            paidBy: payruns.paidBy,
            notes: payruns.notes,
            createdAt: payruns.createdAt,
            updatedAt: payruns.updatedAt,
            structureName: salaryStructures.name,
        })
        .from(payruns)
        .leftJoin(salaryStructures, eq(payruns.structureId, salaryStructures.id))
        .where(eq(payruns.id, payrunId));

    return payrun || null;
}

/**
 * Fetch all roster employees for a payrun with employee profile, contract, and primary bank account
 */
export async function getPayrunEmployeesAuditRoster(payrunId) {
    const roster = await db
        .select({
            rosterId: payrunEmployees.id,
            payrunId: payrunEmployees.payrunId,
            employeeId: payrunEmployees.employeeId,
            contractId: payrunEmployees.contractId,
            eligibilityStatus: payrunEmployees.eligibilityStatus,
            selectionStatus: payrunEmployees.selectionStatus,
            rosterNotes: payrunEmployees.notes,
            // Employee details
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            employeeStatus: employees.status,
            isActive: employees.isActive,
            departmentId: employees.departmentId,
            jobPositionId: employees.jobPositionId,
            // Contract details
            contractWage: contracts.wage,
            contractStatus: contracts.status,
            contractStartDate: contracts.startDate,
            contractEndDate: contracts.endDate,
            contractStructureId: contracts.salaryStructureId,
            // Bank details
            bankId: bankAccounts.id,
            bankName: bankAccounts.bankName,
            accountNumber: bankAccounts.accountNumber,
            ifscCode: bankAccounts.ifscCode,
            isBankPrimary: bankAccounts.isPrimary,
            isBankActive: bankAccounts.isActive,
        })
        .from(payrunEmployees)
        .innerJoin(employees, eq(payrunEmployees.employeeId, employees.id))
        .leftJoin(contracts, eq(payrunEmployees.contractId, contracts.id))
        .leftJoin(
            bankAccounts,
            and(
                eq(bankAccounts.employeeId, employees.id),
                eq(bankAccounts.isPrimary, true),
                eq(bankAccounts.isActive, true),
            ),
        )
        .where(eq(payrunEmployees.payrunId, payrunId));

    return roster;
}

/**
 * Fetch all generated payslips for a payrun
 */
export async function getPayrunPayslips(payrunId) {
    return await db
        .select({
            id: payslips.id,
            payrunId: payslips.payrunId,
            employeeId: payslips.employeeId,
            contractId: payslips.contractId,
            structureId: payslips.structureId,
            contractWageSnapshot: payslips.contractWageSnapshot,
            periodStart: payslips.periodStart,
            periodEnd: payslips.periodEnd,
            workedDays: payslips.workedDays,
            grossAmount: payslips.grossAmount,
            deductionAmount: payslips.deductionAmount,
            netAmount: payslips.netAmount,
            status: payslips.status,
            pdfUrl: payslips.pdfUrl,
            computedAt: payslips.computedAt,
            validatedAt: payslips.validatedAt,
        })
        .from(payslips)
        .where(eq(payslips.payrunId, payrunId));
}

/**
 * Check for duplicate payslips for employees in overlapping periods from other active/finalized payruns
 */
export async function findConflictingPayslips(
    employeeIds,
    periodStart,
    periodEnd,
    currentPayrunId,
) {
    if (!employeeIds || employeeIds.length === 0) return [];

    const conflicts = await db
        .select({
            payslipId: payslips.id,
            employeeId: payslips.employeeId,
            otherPayrunId: payslips.payrunId,
            otherPayrunName: payruns.name,
            periodStart: payslips.periodStart,
            periodEnd: payslips.periodEnd,
            status: payslips.status,
        })
        .from(payslips)
        .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
        .where(
            and(
                inArray(payslips.employeeId, employeeIds),
                ne(payslips.payrunId, currentPayrunId),
                ne(payruns.status, 'ARCHIVED'),
                sql`daterange(${payslips.periodStart}, ${payslips.periodEnd}, '[]') && daterange(${periodStart}::date, ${periodEnd}::date, '[]')`,
            ),
        );

    return conflicts;
}

/**
 * Check if salary structure rules exist for a given structure ID
 */
export async function getSalaryRulesCount(structureId) {
    if (!structureId) return 0;
    const [result] = await db
        .select({ count: sql`count(*)::int` })
        .from(salaryRules)
        .where(eq(salaryRules.structureId, structureId));
    return result?.count || 0;
}

/**
 * Atomically update payrun and all associated payslips to VALIDATED status
 */
export async function updatePayrunToValidated(payrunId, userId) {
    return await db.transaction(async (tx) => {
        const now = new Date();

        // 1. Update Payrun
        const [updatedPayrun] = await tx
            .update(payruns)
            .set({
                status: 'VALIDATED',
                validatedAt: now,
                validatedBy: userId,
                updatedAt: now,
            })
            .where(eq(payruns.id, payrunId))
            .returning();

        // 2. Update child Payslips
        await tx
            .update(payslips)
            .set({
                status: 'VALIDATED',
                validatedAt: now,
                updatedAt: now,
            })
            .where(eq(payslips.payrunId, payrunId));

        return updatedPayrun;
    });
}

/**
 * Get PENDING time-off requests for a set of employees overlapping a payrun period.
 * Used by auditPayrunWarnings() to detect unapproved leave that may affect net pay.
 * @param {string[]} employeeIds
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd - 'YYYY-MM-DD'
 */
export async function getPendingLeaveRequestsInPeriod(employeeIds, periodStart, periodEnd) {
    if (!employeeIds || employeeIds.length === 0) return [];

    return db
        .select({
            id: timeOffRequests.id,
            employeeId: timeOffRequests.employeeId,
            startDate: timeOffRequests.startDate,
            endDate: timeOffRequests.endDate,
            numberOfDays: timeOffRequests.numberOfDays,
            status: timeOffRequests.status,
        })
        .from(timeOffRequests)
        .where(
            and(
                inArray(timeOffRequests.employeeId, employeeIds),
                eq(timeOffRequests.status, 'PENDING'),
                lte(timeOffRequests.startDate, periodEnd),
                gte(timeOffRequests.endDate, periodStart),
            ),
        );
}

/**
 * Get attendance records with no checkout for a set of employees within a payrun period.
 * Used by auditPayrunWarnings() to detect records where worked hours may be inaccurate.
 * @param {string[]} employeeIds
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd - 'YYYY-MM-DD'
 */
export async function getOpenAttendanceRecordsInPeriod(employeeIds, periodStart, periodEnd) {
    if (!employeeIds || employeeIds.length === 0) return [];

    return db
        .select({
            id: attendanceRecords.id,
            employeeId: attendanceRecords.employeeId,
            attendanceDate: attendanceRecords.attendanceDate,
            checkInTime: attendanceRecords.checkInTime,
            checkOutTime: attendanceRecords.checkOutTime,
        })
        .from(attendanceRecords)
        .where(
            and(
                inArray(attendanceRecords.employeeId, employeeIds),
                sql`${attendanceRecords.checkOutTime} IS NULL`,
                gte(attendanceRecords.attendanceDate, periodStart),
                lte(attendanceRecords.attendanceDate, periodEnd),
            ),
        );
}
