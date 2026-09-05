import { db } from '../config/database.config.js';
import { payslips, payslipLines, payruns } from '../db/schema/payroll.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { salaryStructures } from '../db/schema/salary.schema.js';
import { departments } from '../db/schema/departments.schema.js';
import { jobPositions } from '../db/schema/job_positions.schema.js';
import { eq, and, desc, asc, count, inArray } from 'drizzle-orm';

/**
 * Payslip DAO
 */

/**
 * Find payslips with filtering and pagination
 * @param {object} params
 */
export async function findPayslips({ payrunId, employeeId, status, page = 1, limit = 20 } = {}) {
    const conditions = [];

    if (payrunId) {
        conditions.push(eq(payslips.payrunId, payrunId));
    }
    if (employeeId) {
        conditions.push(eq(payslips.employeeId, employeeId));
    }
    if (status) {
        if (Array.isArray(status)) {
            conditions.push(inArray(payslips.status, status));
        } else {
            conditions.push(eq(payslips.status, status.toUpperCase()));
        }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (Math.max(1, page) - 1) * limit;

    const [records, [{ totalCount }]] = await Promise.all([
        db
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
                updatedAt: payslips.updatedAt,
                // Employee
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
                departmentName: departments.name,
                jobTitle: jobPositions.title,
                // Payrun
                payrunName: payruns.name,
            })
            .from(payslips)
            .innerJoin(employees, eq(payslips.employeeId, employees.id))
            .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
            .leftJoin(departments, eq(employees.departmentId, departments.id))
            .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
            .where(whereClause)
            .orderBy(desc(payslips.createdAt))
            .limit(limit)
            .offset(offset),
        db.select({ totalCount: count() }).from(payslips).where(whereClause),
    ]);

    return {
        data: records,
        pagination: {
            page,
            limit,
            totalCount: Number(totalCount),
            totalPages: Math.ceil(Number(totalCount) / limit),
        },
    };
}

/**
 * Find payslip by ID
 * @param {string} id
 */
export async function findPayslipById(id) {
    const [payslip] = await db
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
            updatedAt: payslips.updatedAt,
            // Joined
            payrunName: payruns.name,
            payrunStatus: payruns.status,
            paymentDate: payruns.paymentDate,
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            departmentName: departments.name,
            jobTitle: jobPositions.title,
            structureName: salaryStructures.name,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .leftJoin(salaryStructures, eq(payslips.structureId, salaryStructures.id))
        .where(eq(payslips.id, id))
        .limit(1);

    return payslip || null;
}

/**
 * Get lines breakdown for a payslip
 * @param {string} payslipId
 */
export async function getPayslipLines(payslipId) {
    return db
        .select({
            id: payslipLines.id,
            payslipId: payslipLines.payslipId,
            salaryRuleId: payslipLines.salaryRuleId,
            code: payslipLines.code,
            name: payslipLines.name,
            category: payslipLines.category,
            sequenceOrder: payslipLines.sequenceOrder,
            computationType: payslipLines.computationType,
            fixedAmount: payslipLines.fixedAmount,
            percentageBaseCode: payslipLines.percentageBaseCode,
            percentageRate: payslipLines.percentageRate,
            formulaExpression: payslipLines.formulaExpression,
            amount: payslipLines.amount,
            createdAt: payslipLines.createdAt,
        })
        .from(payslipLines)
        .where(eq(payslipLines.payslipId, payslipId))
        .orderBy(asc(payslipLines.sequenceOrder));
}

/**
 * Find payslip with breakdown lines
 * @param {string} id
 */
export async function findPayslipWithLines(id) {
    const payslip = await findPayslipById(id);
    if (!payslip) return null;

    const lines = await getPayslipLines(id);

    return {
        ...payslip,
        lines,
    };
}

/**
 * Check if employee already has a payslip in a payrun
 * @param {string} employeeId
 * @param {string} payrunId
 */
export async function findPayslipByEmployeeAndPayrun(employeeId, payrunId) {
    const [record] = await db
        .select()
        .from(payslips)
        .where(and(eq(payslips.employeeId, employeeId), eq(payslips.payrunId, payrunId)))
        .limit(1);

    return record || null;
}

/**
 * Create a single payslip
 * @param {object} data
 */
export async function createPayslip(data) {
    const [created] = await db
        .insert(payslips)
        .values({
            payrunId: data.payrunId,
            employeeId: data.employeeId,
            contractId: data.contractId || null,
            structureId: data.structureId || null,
            contractWageSnapshot: data.contractWageSnapshot
                ? String(data.contractWageSnapshot)
                : null,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            workedDays: data.workedDays ? String(data.workedDays) : null,
            grossAmount: data.grossAmount ? String(data.grossAmount) : '0.00',
            deductionAmount: data.deductionAmount ? String(data.deductionAmount) : '0.00',
            netAmount: data.netAmount ? String(data.netAmount) : '0.00',
            status: data.status || 'DRAFT',
        })
        .returning();

    return created;
}

/**
 * Update payslip
 * @param {string} id
 * @param {object} data
 */
export async function updatePayslip(id, data) {
    const updateData = {
        updatedAt: new Date(),
    };

    if (data.contractId !== undefined) updateData.contractId = data.contractId;
    if (data.structureId !== undefined) updateData.structureId = data.structureId;
    if (data.contractWageSnapshot !== undefined) {
        updateData.contractWageSnapshot =
            data.contractWageSnapshot !== null ? String(data.contractWageSnapshot) : null;
    }
    if (data.workedDays !== undefined) {
        updateData.workedDays = data.workedDays !== null ? String(data.workedDays) : null;
    }
    if (data.grossAmount !== undefined) updateData.grossAmount = String(data.grossAmount);
    if (data.deductionAmount !== undefined)
        updateData.deductionAmount = String(data.deductionAmount);
    if (data.netAmount !== undefined) updateData.netAmount = String(data.netAmount);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.pdfUrl !== undefined) updateData.pdfUrl = data.pdfUrl;
    if (data.computedAt !== undefined) updateData.computedAt = data.computedAt;
    if (data.validatedAt !== undefined) updateData.validatedAt = data.validatedAt;
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt;
    if (data.sentAt !== undefined) updateData.sentAt = data.sentAt;

    const [updated] = await db
        .update(payslips)
        .set(updateData)
        .where(eq(payslips.id, id))
        .returning();

    return updated || null;
}

/**
 * Delete payslip
 * @param {string} id
 */
export async function deletePayslip(id) {
    return await db.transaction(async (tx) => {
        await tx.delete(payslipLines).where(eq(payslipLines.payslipId, id));
        const [deleted] = await tx.delete(payslips).where(eq(payslips.id, id)).returning();
        return deleted || null;
    });
}

/**
 * Delete lines of a payslip (before recomputing)
 * @param {string} payslipId
 */
export async function deletePayslipLines(payslipId) {
    return db.delete(payslipLines).where(eq(payslipLines.payslipId, payslipId));
}

/**
 * Insert payslip lines in bulk
 * @param {Array<object>} lines
 */
export async function createPayslipLines(lines) {
    if (!lines || lines.length === 0) return [];
    return db.insert(payslipLines).values(lines).returning();
}

/**
 * Atomically update payslip and replace its computed lines
 * @param {string} payslipId
 * @param {object} computationResult
 */
export async function updatePayslipWithComputedLines(
    payslipId,
    { grossAmount, deductionAmount, netAmount, workedDays, contractWageSnapshot, lines },
) {
    return await db.transaction(async (tx) => {
        // 1. Delete existing lines
        await tx.delete(payslipLines).where(eq(payslipLines.payslipId, payslipId));

        // 2. Insert new lines
        if (lines && lines.length > 0) {
            const formattedLines = lines.map((l) => ({
                payslipId,
                salaryRuleId: l.salaryRuleId || null,
                code: l.code,
                name: l.name,
                category: l.category,
                sequenceOrder: Number(l.sequenceOrder),
                computationType: l.computationType,
                fixedAmount: l.fixedAmount ? String(l.fixedAmount) : null,
                percentageBaseCode: l.percentageBaseCode || null,
                percentageRate: l.percentageRate ? String(l.percentageRate) : null,
                formulaExpression: l.formulaExpression || null,
                amount: String(l.amount),
            }));

            await tx.insert(payslipLines).values(formattedLines);
        }

        // 3. Update payslip record
        const [updated] = await tx
            .update(payslips)
            .set({
                grossAmount: String(grossAmount),
                deductionAmount: String(deductionAmount),
                netAmount: String(netAmount),
                workedDays: String(workedDays),
                contractWageSnapshot: contractWageSnapshot ? String(contractWageSnapshot) : null,
                status: 'COMPUTED',
                computedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(payslips.id, payslipId))
            .returning();

        return updated;
    });
}
