import { db } from '../config/database.config.js';
import { payslips, payslipLines, payruns } from '../db/schema/payroll.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { departments } from '../db/schema/departments.schema.js';
import { jobPositions } from '../db/schema/job_positions.schema.js';
import { salaryStructures } from '../db/schema/salary.schema.js';
import { bankAccounts } from '../db/schema/bank_accounts.schema.js';
import { eq, and, inArray, asc } from 'drizzle-orm';

/**
 * Fetch a single payslip with complete employee, department, bank, payrun header, and lines breakdown
 */
export async function getPayslipByIdWithDetails(payslipId) {
    const [payslipRecord] = await db
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
            emailSentAt: payslips.emailSentAt,
            computedAt: payslips.computedAt,
            validatedAt: payslips.validatedAt,
            paidAt: payslips.paidAt,
            sentAt: payslips.sentAt,
            createdAt: payslips.createdAt,
            // Payrun context
            payrunName: payruns.name,
            payrunPaymentDate: payruns.paymentDate,
            payrunStatus: payruns.status,
            // Employee context
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            phone: employees.phone,
            address: employees.address,
            hireDate: employees.hireDate,
            // Department & Designation
            departmentName: departments.name,
            jobTitle: jobPositions.title,
            // Structure
            structureName: salaryStructures.name,
            // Bank details
            bankName: bankAccounts.bankName,
            accountNumber: bankAccounts.accountNumber,
            accountHolderName: bankAccounts.accountHolderName,
            ifscCode: bankAccounts.ifscCode,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .leftJoin(salaryStructures, eq(payslips.structureId, salaryStructures.id))
        .leftJoin(
            bankAccounts,
            and(
                eq(bankAccounts.employeeId, employees.id),
                eq(bankAccounts.isPrimary, true),
                eq(bankAccounts.isActive, true),
            ),
        )
        .where(eq(payslips.id, payslipId));

    if (!payslipRecord) return null;

    // Fetch lines breakdown
    const lines = await db
        .select({
            id: payslipLines.id,
            payslipId: payslipLines.payslipId,
            salaryRuleId: payslipLines.salaryRuleId,
            code: payslipLines.code,
            name: payslipLines.name,
            category: payslipLines.category,
            sequenceOrder: payslipLines.sequenceOrder,
            computationType: payslipLines.computationType,
            amount: payslipLines.amount,
        })
        .from(payslipLines)
        .where(eq(payslipLines.payslipId, payslipId))
        .orderBy(asc(payslipLines.sequenceOrder));

    return {
        ...payslipRecord,
        lines,
    };
}

/**
 * Fetch all payslips for a given payrun (used for bulk PDF generation or email delivery)
 */
export async function getPayslipsByPayrunId(payrunId) {
    const records = await db
        .select({
            id: payslips.id,
            payrunId: payslips.payrunId,
            employeeId: payslips.employeeId,
            periodStart: payslips.periodStart,
            periodEnd: payslips.periodEnd,
            grossAmount: payslips.grossAmount,
            deductionAmount: payslips.deductionAmount,
            netAmount: payslips.netAmount,
            status: payslips.status,
            pdfUrl: payslips.pdfUrl,
            emailSentAt: payslips.emailSentAt,
            sentAt: payslips.sentAt,
            // Payrun
            payrunName: payruns.name,
            paymentDate: payruns.paymentDate,
            // Employee
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            // Dept
            departmentName: departments.name,
            jobTitle: jobPositions.title,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .where(eq(payslips.payrunId, payrunId));

    return records;
}

/**
 * Update payslip rendered PDF URL
 */
export async function updatePayslipPdfUrl(payslipId, pdfUrl) {
    const [updated] = await db
        .update(payslips)
        .set({
            pdfUrl,
            updatedAt: new Date(),
        })
        .where(eq(payslips.id, payslipId))
        .returning();

    return updated;
}

/**
 * Update payslip delivery status after email transmission
 */
export async function updatePayslipSentStatus(payslipId, sentAt = new Date()) {
    const [updated] = await db
        .update(payslips)
        .set({
            status: 'SENT',
            sentAt,
            emailSentAt: sentAt,
            updatedAt: new Date(),
        })
        .where(eq(payslips.id, payslipId))
        .returning();

    return updated;
}

/**
 * Batch update payslips sent status
 */
export async function updateBulkPayslipsSentStatus(payslipIds, sentAt = new Date()) {
    if (!payslipIds || payslipIds.length === 0) return [];

    return await db
        .update(payslips)
        .set({
            status: 'SENT',
            sentAt,
            emailSentAt: sentAt,
            updatedAt: new Date(),
        })
        .where(inArray(payslips.id, payslipIds))
        .returning();
}
