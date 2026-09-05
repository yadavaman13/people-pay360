import { db } from '../config/database.config.js';
import { payruns, payrunEmployees, payslips } from '../db/schema/payroll.schema.js';
import { salaryStructures } from '../db/schema/salary.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { contracts } from '../db/schema/contracts.schema.js';
import { departments } from '../db/schema/departments.schema.js';
import { jobPositions } from '../db/schema/job_positions.schema.js';
import { eq, and, desc, asc, gte, lte, count, sql } from 'drizzle-orm';

/**
 * Payrun DAO
 */

/**
 * List payruns with filtering and pagination
 * @param {object} params
 */
export async function findAllPayruns({
    status,
    periodStart,
    periodEnd,
    structureId,
    page = 1,
    limit = 20,
} = {}) {
    const conditions = [];

    if (status) {
        conditions.push(eq(payruns.status, status.toUpperCase()));
    }
    if (structureId) {
        conditions.push(eq(payruns.structureId, structureId));
    }
    if (periodStart) {
        conditions.push(gte(payruns.periodStart, periodStart));
    }
    if (periodEnd) {
        conditions.push(lte(payruns.periodEnd, periodEnd));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (Math.max(1, page) - 1) * limit;

    const [records, [{ totalCount }]] = await Promise.all([
        db
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
                structureCode: salaryStructures.code,
            })
            .from(payruns)
            .leftJoin(salaryStructures, eq(payruns.structureId, salaryStructures.id))
            .where(whereClause)
            .orderBy(desc(payruns.createdAt))
            .limit(limit)
            .offset(offset),
        db.select({ totalCount: count() }).from(payruns).where(whereClause),
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
 * Find payrun by ID with structure details
 * @param {string} id
 */
export async function findPayrunById(id) {
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
            structureCode: salaryStructures.code,
        })
        .from(payruns)
        .leftJoin(salaryStructures, eq(payruns.structureId, salaryStructures.id))
        .where(eq(payruns.id, id))
        .limit(1);

    return payrun || null;
}

/**
 * Find payrun with its employee roster and payslips
 * @param {string} id
 */
export async function findPayrunWithPayslips(id) {
    const payrun = await findPayrunById(id);
    if (!payrun) return null;

    const [roster, payslipList] = await Promise.all([
        db
            .select({
                id: payrunEmployees.id,
                payrunId: payrunEmployees.payrunId,
                employeeId: payrunEmployees.employeeId,
                contractId: payrunEmployees.contractId,
                eligibilityStatus: payrunEmployees.eligibilityStatus,
                selectionStatus: payrunEmployees.selectionStatus,
                notes: payrunEmployees.notes,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                departmentName: departments.name,
                jobTitle: jobPositions.title,
            })
            .from(payrunEmployees)
            .innerJoin(employees, eq(payrunEmployees.employeeId, employees.id))
            .leftJoin(departments, eq(employees.departmentId, departments.id))
            .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
            .where(eq(payrunEmployees.payrunId, id)),
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
                computedAt: payslips.computedAt,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
            })
            .from(payslips)
            .innerJoin(employees, eq(payslips.employeeId, employees.id))
            .where(eq(payslips.payrunId, id)),
    ]);

    return {
        ...payrun,
        employees: roster,
        payslips: payslipList,
    };
}

/**
 * Wizard Step 1: Find eligible employees for a payrun structure and period
 * @param {string} structureId
 * @param {string} periodStart
 * @param {string} periodEnd
 */
export async function findEligibleEmployees(structureId, periodStart, periodEnd) {
    // 1. Get all active employees
    const activeEmployees = await db
        .select({
            id: employees.id,
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            departmentId: employees.departmentId,
            departmentName: departments.name,
            jobTitle: jobPositions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .where(eq(employees.isActive, true))
        .orderBy(asc(employees.employeeCode));

    // 2. Fetch contracts covering the period
    const allContracts = await db
        .select()
        .from(contracts)
        .where(
            and(
                eq(contracts.status, 'ACTIVE'),
                lte(contracts.startDate, periodEnd),
                sql`(${contracts.endDate} IS NULL OR ${contracts.endDate} >= ${periodStart})`,
            ),
        );

    // Group contracts by employeeId
    const contractsByEmployee = new Map();
    for (const contract of allContracts) {
        if (!contractsByEmployee.has(contract.employeeId)) {
            contractsByEmployee.set(contract.employeeId, []);
        }
        contractsByEmployee.get(contract.employeeId).push(contract);
    }

    const eligible = [];
    const ineligible = [];
    const warnings = [];

    for (const emp of activeEmployees) {
        const empContracts = contractsByEmployee.get(emp.id) || [];

        if (empContracts.length === 0) {
            ineligible.push({
                employee: emp,
                contract: null,
                eligibilityStatus: 'INELIGIBLE',
                notes: 'No active contract covering this period',
            });
            continue;
        }

        if (empContracts.length > 1) {
            ineligible.push({
                employee: emp,
                contract: null,
                eligibilityStatus: 'INELIGIBLE',
                notes: 'Multiple conflicting active contracts covering this period',
            });
            warnings.push({
                employeeId: emp.id,
                message: `Employee ${emp.employeeCode} has ${empContracts.length} overlapping active contracts.`,
            });
            continue;
        }

        const contract = empContracts[0];
        if (contract.salaryStructureId !== structureId) {
            ineligible.push({
                employee: emp,
                contract,
                eligibilityStatus: 'INELIGIBLE',
                notes: 'Active contract uses a different salary structure',
            });
            continue;
        }

        eligible.push({
            employee: emp,
            contract,
            eligibilityStatus: 'ELIGIBLE',
            notes: null,
        });
    }

    return {
        eligible,
        ineligible,
        totalEligible: eligible.length,
        totalIneligible: ineligible.length,
        warnings,
    };
}

/**
 * Step 2: Create payrun header, payrun_employees roster, and initial draft payslips (Transactional)
 * @param {object} payrunData
 * @param {Array<object>} selectedItems - array of { employeeId, contractId, eligibilityStatus }
 */
export async function createPayrunWithRoster(payrunData, selectedItems) {
    return await db.transaction(async (tx) => {
        // 1. Insert payruns row
        const [payrun] = await tx
            .insert(payruns)
            .values({
                name: payrunData.name,
                structureId: payrunData.structureId,
                periodStart: payrunData.periodStart,
                periodEnd: payrunData.periodEnd,
                paymentDate: payrunData.paymentDate || null,
                status: 'DRAFT',
                totalEmployees: selectedItems.length,
                totalGross: '0.00',
                totalDeductions: '0.00',
                totalNet: '0.00',
                createdBy: payrunData.createdBy || null,
                notes: payrunData.notes || null,
            })
            .returning();

        // 2. Insert payrun_employees and draft payslips
        if (selectedItems.length > 0) {
            const rosterValues = selectedItems.map((item) => ({
                payrunId: payrun.id,
                employeeId: item.employeeId,
                contractId: item.contractId || null,
                eligibilityStatus: item.eligibilityStatus || 'ELIGIBLE',
                selectionStatus: item.selectionStatus || 'SELECTED',
                notes: item.notes || null,
            }));

            await tx.insert(payrunEmployees).values(rosterValues);

            const draftPayslipsValues = selectedItems
                .filter((item) => item.selectionStatus !== 'EXCLUDED')
                .map((item) => ({
                    payrunId: payrun.id,
                    employeeId: item.employeeId,
                    contractId: item.contractId || null,
                    structureId: payrunData.structureId,
                    contractWageSnapshot: item.wage ? String(item.wage) : null,
                    periodStart: payrunData.periodStart,
                    periodEnd: payrunData.periodEnd,
                    status: 'DRAFT',
                    grossAmount: '0.00',
                    deductionAmount: '0.00',
                    netAmount: '0.00',
                }));

            if (draftPayslipsValues.length > 0) {
                await tx.insert(payslips).values(draftPayslipsValues);
            }
        }

        return payrun;
    });
}

/**
 * Update payrun
 * @param {string} id
 * @param {object} data
 */
export async function updatePayrun(id, data) {
    const updateData = {
        updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.paymentDate !== undefined) updateData.paymentDate = data.paymentDate;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.totalEmployees !== undefined) updateData.totalEmployees = data.totalEmployees;
    if (data.totalGross !== undefined) updateData.totalGross = String(data.totalGross);
    if (data.totalDeductions !== undefined)
        updateData.totalDeductions = String(data.totalDeductions);
    if (data.totalNet !== undefined) updateData.totalNet = String(data.totalNet);
    if (data.computedAt !== undefined) updateData.computedAt = data.computedAt;
    if (data.validatedAt !== undefined) updateData.validatedAt = data.validatedAt;
    if (data.validatedBy !== undefined) updateData.validatedBy = data.validatedBy;
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt;
    if (data.paidBy !== undefined) updateData.paidBy = data.paidBy;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [updated] = await db
        .update(payruns)
        .set(updateData)
        .where(eq(payruns.id, id))
        .returning();

    return updated || null;
}

/**
 * Delete payrun (only DRAFT)
 * @param {string} id
 */
export async function deletePayrun(id) {
    return await db.transaction(async (tx) => {
        // Delete child payslips
        await tx.delete(payslips).where(eq(payslips.payrunId, id));

        // Delete payrun_employees
        await tx.delete(payrunEmployees).where(eq(payrunEmployees.payrunId, id));

        // Delete payrun
        const [deleted] = await tx.delete(payruns).where(eq(payruns.id, id)).returning();

        return deleted || null;
    });
}

/**
 * Find roster employees for a payrun
 * @param {string} payrunId
 */
export async function findPayrunEmployees(payrunId) {
    return db
        .select({
            id: payrunEmployees.id,
            payrunId: payrunEmployees.payrunId,
            employeeId: payrunEmployees.employeeId,
            contractId: payrunEmployees.contractId,
            eligibilityStatus: payrunEmployees.eligibilityStatus,
            selectionStatus: payrunEmployees.selectionStatus,
            notes: payrunEmployees.notes,
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
        })
        .from(payrunEmployees)
        .innerJoin(employees, eq(payrunEmployees.employeeId, employees.id))
        .where(eq(payrunEmployees.payrunId, payrunId));
}

/**
 * Export for Dev 4 (Payrun Summary)
 * @param {string} payrunId
 */
export async function getPayrunSummary(payrunId) {
    const payrun = await findPayrunById(payrunId);
    if (!payrun) return null;

    const payslipsSummary = await db
        .select({
            status: payslips.status,
            count: count(),
            totalGross: sql`COALESCE(SUM(CAST(${payslips.grossAmount} AS NUMERIC)), 0)`,
            totalNet: sql`COALESCE(SUM(CAST(${payslips.netAmount} AS NUMERIC)), 0)`,
        })
        .from(payslips)
        .where(eq(payslips.payrunId, payrunId))
        .groupBy(payslips.status);

    return {
        ...payrun,
        statusBreakdown: payslipsSummary,
    };
}

/**
 * Export for Dev 4 (Dashboard totals)
 * @param {object} [filter={}]
 */
export async function getPayrollTotals({ periodStart, periodEnd } = {}) {
    const conditions = [];
    if (periodStart) conditions.push(gte(payruns.periodStart, periodStart));
    if (periodEnd) conditions.push(lte(payruns.periodEnd, periodEnd));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totals] = await db
        .select({
            totalPayruns: count(),
            totalGrossSum: sql`COALESCE(SUM(CAST(${payruns.totalGross} AS NUMERIC)), 0)`,
            totalNetSum: sql`COALESCE(SUM(CAST(${payruns.totalNet} AS NUMERIC)), 0)`,
            totalDeductionsSum: sql`COALESCE(SUM(CAST(${payruns.totalDeductions} AS NUMERIC)), 0)`,
        })
        .from(payruns)
        .where(whereClause);

    return totals;
}
