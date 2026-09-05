import { db } from '../config/database.config.js';
import { contracts } from '../db/schema/contracts.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { salaryStructures } from '../db/schema/salary.schema.js';
import { departments } from '../db/schema/departments.schema.js';
import { jobPositions } from '../db/schema/job_positions.schema.js';
import { workingSchedules } from '../db/schema/working_schedules.schema.js';
import { payslips } from '../db/schema/payroll.schema.js';
import { eq, and, lte, or, gte, isNull, ne, sql, desc, ilike, inArray } from 'drizzle-orm';

/**
 * Contract DAO — Data Access Object
 */

/**
 * Find contract by ID
 * @param {string} id
 */
export async function findContractById(id) {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return contract || null;
}

/**
 * Check if a working schedule is currently assigned to any active contract
 * @param {string} scheduleId
 * @returns {Promise<boolean>}
 */
export async function checkScheduleInContracts(scheduleId) {
    const [record] = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.workingScheduleId, scheduleId), eq(contracts.status, 'ACTIVE')))
        .limit(1);
    return Boolean(record);
}

/**
 * Get applicable active contract for an employee in a given period
 * @param {string} employeeId
 * @param {string} periodStart - YYYY-MM-DD
 * @param {string} periodEnd - YYYY-MM-DD
 */
export async function getApplicableContract(employeeId, periodStart, periodEnd) {
    const result = await db
        .select()
        .from(contracts)
        .where(
            and(
                eq(contracts.employeeId, employeeId),
                eq(contracts.status, 'ACTIVE'),
                lte(contracts.startDate, periodEnd),
                or(isNull(contracts.endDate), gte(contracts.endDate, periodStart)),
            ),
        );

    if (result.length === 0) return null;
    if (result.length > 1) {
        throw new Error(`CONFLICT: Multiple active contracts found for employee ${employeeId}`);
    }
    return result[0];
}

/**
 * Find current active contract for an employee
 * @param {string} employeeId
 */
export async function findActiveContractByEmployee(employeeId) {
    const [contract] = await db
        .select()
        .from(contracts)
        .where(and(eq(contracts.employeeId, employeeId), eq(contracts.status, 'ACTIVE')))
        .limit(1);
    return contract || null;
}

/**
 * Find all contracts for an employee (history ordered by startDate DESC)
 * @param {string} employeeId
 */
export async function findContractsByEmployeeId(employeeId) {
    const rows = await db
        .select({
            id: contracts.id,
            employeeId: contracts.employeeId,
            salaryStructureId: contracts.salaryStructureId,
            startDate: contracts.startDate,
            endDate: contracts.endDate,
            wage: contracts.wage,
            departmentId: contracts.departmentId,
            jobPositionId: contracts.jobPositionId,
            workingScheduleId: contracts.workingScheduleId,
            status: contracts.status,
            maxPunchesPerDay: contracts.maxPunchesPerDay,
            notes: contracts.notes,
            createdAt: contracts.createdAt,
            updatedAt: contracts.updatedAt,
            salaryStructure: {
                id: salaryStructures.id,
                name: salaryStructures.name,
                code: salaryStructures.code,
            },
            department: {
                id: departments.id,
                name: departments.name,
                code: departments.code,
            },
            jobPosition: {
                id: jobPositions.id,
                title: jobPositions.title,
                code: jobPositions.code,
            },
        })
        .from(contracts)
        .leftJoin(salaryStructures, eq(contracts.salaryStructureId, salaryStructures.id))
        .leftJoin(departments, eq(contracts.departmentId, departments.id))
        .leftJoin(jobPositions, eq(contracts.jobPositionId, jobPositions.id))
        .where(eq(contracts.employeeId, employeeId))
        .orderBy(desc(contracts.startDate));

    return rows.map((r) => ({
        ...r,
        salaryStructure: r.salaryStructure?.id ? r.salaryStructure : null,
        department: r.department?.id ? r.department : null,
        jobPosition: r.jobPosition?.id ? r.jobPosition : null,
    }));
}

/**
 * Create a new contract
 * @param {object} data
 */
export async function createContract(data) {
    const [contract] = await db.insert(contracts).values(data).returning();
    return contract;
}

/**
 * Update an existing contract
 * @param {string} id
 * @param {object} data
 */
export async function updateContract(id, data) {
    const [contract] = await db
        .update(contracts)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(contracts.id, id))
        .returning();
    return contract || null;
}

/**
 * Delete a contract record
 * @param {string} id
 */
export async function deleteContract(id) {
    const [contract] = await db.delete(contracts).where(eq(contracts.id, id)).returning();
    return contract || null;
}

/**
 * Find contract by ID with all relational joins
 * @param {string} id
 */
export async function findContractWithJoins(id) {
    const rows = await db
        .select({
            id: contracts.id,
            employeeId: contracts.employeeId,
            salaryStructureId: contracts.salaryStructureId,
            startDate: contracts.startDate,
            endDate: contracts.endDate,
            wage: contracts.wage,
            departmentId: contracts.departmentId,
            jobPositionId: contracts.jobPositionId,
            workingScheduleId: contracts.workingScheduleId,
            status: contracts.status,
            maxPunchesPerDay: contracts.maxPunchesPerDay,
            notes: contracts.notes,
            createdBy: contracts.createdBy,
            createdAt: contracts.createdAt,
            updatedAt: contracts.updatedAt,
            employee: {
                id: employees.id,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
                status: employees.status,
                isActive: employees.isActive,
            },
            salaryStructure: {
                id: salaryStructures.id,
                name: salaryStructures.name,
                code: salaryStructures.code,
            },
            department: {
                id: departments.id,
                name: departments.name,
                code: departments.code,
            },
            jobPosition: {
                id: jobPositions.id,
                title: jobPositions.title,
                code: jobPositions.code,
            },
            workingSchedule: {
                id: workingSchedules.id,
                name: workingSchedules.name,
                timezone: workingSchedules.timezone,
            },
        })
        .from(contracts)
        .leftJoin(employees, eq(contracts.employeeId, employees.id))
        .leftJoin(salaryStructures, eq(contracts.salaryStructureId, salaryStructures.id))
        .leftJoin(departments, eq(contracts.departmentId, departments.id))
        .leftJoin(jobPositions, eq(contracts.jobPositionId, jobPositions.id))
        .leftJoin(workingSchedules, eq(contracts.workingScheduleId, workingSchedules.id))
        .where(eq(contracts.id, id))
        .limit(1);

    if (!rows.length) return null;
    const row = rows[0];

    return {
        ...row,
        employee: row.employee?.id ? row.employee : null,
        salaryStructure: row.salaryStructure?.id ? row.salaryStructure : null,
        department: row.department?.id ? row.department : null,
        jobPosition: row.jobPosition?.id ? row.jobPosition : null,
        workingSchedule: row.workingSchedule?.id ? row.workingSchedule : null,
    };
}

/**
 * Check if employee has any active contracts overlapping with given date range
 * @param {string} employeeId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string|null} endDate - YYYY-MM-DD or null
 * @param {string} [excludeContractId] - Optional contract ID to exclude (for updates)
 * @returns {Promise<Array>} List of overlapping active contracts
 */
export async function findActiveOverlappingContracts(
    employeeId,
    startDate,
    endDate = null,
    excludeContractId = null,
) {
    const conditions = [eq(contracts.employeeId, employeeId), eq(contracts.status, 'ACTIVE')];

    if (endDate) {
        conditions.push(lte(contracts.startDate, endDate));
    }
    conditions.push(or(isNull(contracts.endDate), gte(contracts.endDate, startDate)));

    if (excludeContractId) {
        conditions.push(ne(contracts.id, excludeContractId));
    }

    return db
        .select()
        .from(contracts)
        .where(and(...conditions));
}

/**
 * Check if contract has any associated payslips
 * @param {string} contractId
 * @returns {Promise<boolean>}
 */
export async function checkContractHasPayslips(contractId) {
    const [row] = await db
        .select({ id: payslips.id })
        .from(payslips)
        .where(eq(payslips.contractId, contractId))
        .limit(1);
    return Boolean(row);
}

/**
 * List contracts with filtering and pagination
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.employeeId]
 * @param {string} [params.status]
 * @param {string} [params.departmentId]
 * @param {string} [params.search]
 */
export async function listContractsWithFilters({
    page = 1,
    limit = 20,
    employeeId,
    status,
    departmentId,
    search,
} = {}) {
    const conditions = [];

    if (employeeId) {
        conditions.push(eq(contracts.employeeId, employeeId));
    }
    if (status) {
        const rawList = Array.isArray(status) ? status : String(status).split(',');
        const statusList = rawList.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
        if (statusList.length === 1) {
            conditions.push(eq(contracts.status, statusList[0]));
        } else if (statusList.length > 1) {
            conditions.push(inArray(contracts.status, statusList));
        }
    }
    if (departmentId) {
        conditions.push(eq(contracts.departmentId, departmentId));
    }
    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(
            or(
                ilike(employees.firstName, term),
                ilike(employees.lastName, term),
                ilike(employees.employeeCode, term),
                ilike(contracts.notes, term),
            ),
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [countRow] = await db
        .select({ count: sql`count(*)` })
        .from(contracts)
        .leftJoin(employees, eq(contracts.employeeId, employees.id))
        .where(whereClause);

    const total = Number(countRow?.count || 0);

    const rows = await db
        .select({
            id: contracts.id,
            employeeId: contracts.employeeId,
            salaryStructureId: contracts.salaryStructureId,
            startDate: contracts.startDate,
            endDate: contracts.endDate,
            wage: contracts.wage,
            departmentId: contracts.departmentId,
            jobPositionId: contracts.jobPositionId,
            workingScheduleId: contracts.workingScheduleId,
            status: contracts.status,
            maxPunchesPerDay: contracts.maxPunchesPerDay,
            notes: contracts.notes,
            createdAt: contracts.createdAt,
            updatedAt: contracts.updatedAt,
            employee: {
                id: employees.id,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
            },
            salaryStructure: {
                id: salaryStructures.id,
                name: salaryStructures.name,
                code: salaryStructures.code,
            },
            department: {
                id: departments.id,
                name: departments.name,
                code: departments.code,
            },
        })
        .from(contracts)
        .leftJoin(employees, eq(contracts.employeeId, employees.id))
        .leftJoin(salaryStructures, eq(contracts.salaryStructureId, salaryStructures.id))
        .leftJoin(departments, eq(contracts.departmentId, departments.id))
        .where(whereClause)
        .orderBy(desc(contracts.createdAt))
        .limit(limitNum)
        .offset(offset);

    const mapped = rows.map((r) => ({
        ...r,
        employee: r.employee?.id ? r.employee : null,
        salaryStructure: r.salaryStructure?.id ? r.salaryStructure : null,
        department: r.department?.id ? r.department : null,
    }));

    return {
        contracts: mapped,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
    };
}
