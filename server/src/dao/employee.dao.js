import { db } from '../config/database.config.js';
import { employees } from '../db/schema/employees.schema.js';
import { users } from '../db/schema/users.schema.js';
import { departments } from '../db/schema/departments.schema.js';
import { jobPositions } from '../db/schema/job_positions.schema.js';
import { workingSchedules } from '../db/schema/working_schedules.schema.js';
import { contracts } from '../db/schema/contracts.schema.js';
import { bankAccounts } from '../db/schema/bank_accounts.schema.js';
import { eq, and, or, ilike, sql, desc, lte, gte, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

/**
 * Employee DAO — Data Access Object
 */

/**
 * Find employee by ID
 * @param {string} id
 */
export async function findEmployeeById(id) {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    return employee || null;
}

/**
 * Find active employee by ID
 * @param {string} employeeId
 */
export async function findActiveEmployee(employeeId) {
    const [employee] = await db
        .select()
        .from(employees)
        .where(and(eq(employees.id, employeeId), eq(employees.isActive, true)))
        .limit(1);
    return employee || null;
}

/**
 * Find employee by linked user ID (1:1 relationship)
 * @param {string} userId
 */
export async function findEmployeeByUserId(userId) {
    const [employee] = await db
        .select()
        .from(employees)
        .where(and(eq(employees.userId, userId), eq(employees.isActive, true)))
        .limit(1);
    return employee || null;
}

/**
 * Check if a working schedule is currently assigned to any active employee
 * @param {string} scheduleId
 * @returns {Promise<boolean>}
 */
export async function checkScheduleInEmployees(scheduleId) {
    const [record] = await db
        .select({ id: employees.id })
        .from(employees)
        .where(and(eq(employees.workingScheduleId, scheduleId), eq(employees.isActive, true)))
        .limit(1);
    return Boolean(record);
}

/**
 * List employees with basic filtering
 * @param {object} [filter={}]
 */
export async function listEmployees({ isActive = true, departmentId } = {}) {
    const conditions = [];
    if (isActive !== undefined) {
        conditions.push(eq(employees.isActive, isActive));
    }
    if (departmentId) {
        conditions.push(eq(employees.departmentId, departmentId));
    }

    if (conditions.length > 0) {
        return db
            .select()
            .from(employees)
            .where(and(...conditions));
    }
    return db.select().from(employees);
}

/**
 * Find employee by email
 * @param {string} email
 */
export async function findEmployeeByEmail(email) {
    const [employee] = await db.select().from(employees).where(eq(employees.email, email)).limit(1);
    return employee || null;
}

/**
 * Find employee by employeeCode
 * @param {string} code
 */
export async function findEmployeeByCode(code) {
    const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.employeeCode, code))
        .limit(1);
    return employee || null;
}

/**
 * Find employee by name, employee code, or id
 * @param {string} identifier
 */
export async function findEmployeeByNameOrIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    const term = identifier.trim();
    if (!term) return null;

    // Check if UUID
    const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term);
    if (isUuid) {
        const byId = await findEmployeeById(term);
        if (byId) return byId;
    }

    // Check exact code
    const byCode = await findEmployeeByCode(term);
    if (byCode) return byCode;

    // Check full name or partial name
    const [byName] = await db
        .select()
        .from(employees)
        .where(
            or(
                sql`lower(trim(concat(${employees.firstName}, ' ', coalesce(${employees.lastName}, '')))) = lower(${term})`,
                ilike(employees.firstName, term),
                ilike(employees.lastName, term),
                ilike(employees.firstName, `%${term}%`),
                ilike(employees.lastName, `%${term}%`),
            ),
        )
        .limit(1);

    return byName || null;
}

/**
 * Create a new employee record
 * @param {object} data
 * @param {object} [tx=db] Optional transaction client
 */
export async function createEmployee(data, tx = db) {
    const client = tx || db;
    const [employee] = await client.insert(employees).values(data).returning();
    return employee;
}

/**
 * Update an employee record
 * @param {string} id
 * @param {object} data
 */
export async function updateEmployee(id, data) {
    const [employee] = await db
        .update(employees)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(employees.id, id))
        .returning();
    return employee || null;
}

/**
 * Soft delete an employee (isActive = false, status = 'ARCHIVED')
 * @param {string} id
 */
export async function softDeleteEmployee(id) {
    const [employee] = await db
        .update(employees)
        .set({
            isActive: false,
            status: 'ARCHIVED',
            updatedAt: new Date(),
        })
        .where(eq(employees.id, id))
        .returning();
    return employee || null;
}

/**
 * Find employee by ID with full relational joins
 * @param {string} id
 */
export async function findEmployeeWithJoins(id) {
    const managers = alias(employees, 'manager');

    const rows = await db
        .select({
            id: employees.id,
            userId: employees.userId,
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            phone: employees.phone,
            gender: employees.gender,
            dateOfBirth: employees.dateOfBirth,
            address: employees.address,
            hireDate: employees.hireDate,
            terminationDate: employees.terminationDate,
            departmentId: employees.departmentId,
            jobPositionId: employees.jobPositionId,
            managerId: employees.managerId,
            workingScheduleId: employees.workingScheduleId,
            status: employees.status,
            isActive: employees.isActive,
            notes: employees.notes,
            createdBy: employees.createdBy,
            createdAt: employees.createdAt,
            updatedAt: employees.updatedAt,
            user: {
                id: users.id,
                role: users.role,
                profileImage: users.profileImage,
                emailVerified: users.emailVerified,
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
            manager: {
                id: managers.id,
                firstName: managers.firstName,
                lastName: managers.lastName,
                employeeCode: managers.employeeCode,
            },
        })
        .from(employees)
        .leftJoin(users, eq(employees.userId, users.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .leftJoin(workingSchedules, eq(employees.workingScheduleId, workingSchedules.id))
        .leftJoin(managers, eq(employees.managerId, managers.id))
        .where(eq(employees.id, id))
        .limit(1);

    if (!rows.length) return null;
    const row = rows[0];

    return {
        ...row,
        user: row.user?.id ? row.user : null,
        department: row.department?.id ? row.department : null,
        jobPosition: row.jobPosition?.id ? row.jobPosition : null,
        workingSchedule: row.workingSchedule?.id ? row.workingSchedule : null,
        manager: row.manager?.id ? row.manager : null,
    };
}

/**
 * Find employee by User ID with full relational joins (used for /me self-service)
 * @param {string} userId
 */
export async function findEmployeeWithJoinsByUserId(userId) {
    const managers = alias(employees, 'manager');

    const rows = await db
        .select({
            id: employees.id,
            userId: employees.userId,
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            phone: employees.phone,
            gender: employees.gender,
            dateOfBirth: employees.dateOfBirth,
            address: employees.address,
            hireDate: employees.hireDate,
            terminationDate: employees.terminationDate,
            departmentId: employees.departmentId,
            jobPositionId: employees.jobPositionId,
            managerId: employees.managerId,
            workingScheduleId: employees.workingScheduleId,
            status: employees.status,
            isActive: employees.isActive,
            notes: employees.notes,
            createdBy: employees.createdBy,
            createdAt: employees.createdAt,
            updatedAt: employees.updatedAt,
            user: {
                id: users.id,
                role: users.role,
                profileImage: users.profileImage,
                emailVerified: users.emailVerified,
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
            manager: {
                id: managers.id,
                firstName: managers.firstName,
                lastName: managers.lastName,
                employeeCode: managers.employeeCode,
            },
        })
        .from(employees)
        .leftJoin(users, eq(employees.userId, users.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .leftJoin(workingSchedules, eq(employees.workingScheduleId, workingSchedules.id))
        .leftJoin(managers, eq(employees.managerId, managers.id))
        .where(and(eq(employees.userId, userId), eq(employees.isActive, true)))
        .limit(1);

    if (!rows.length) return null;
    const row = rows[0];

    return {
        ...row,
        user: row.user?.id ? row.user : null,
        department: row.department?.id ? row.department : null,
        jobPosition: row.jobPosition?.id ? row.jobPosition : null,
        workingSchedule: row.workingSchedule?.id ? row.workingSchedule : null,
        manager: row.manager?.id ? row.manager : null,
    };
}

/**
 * Find employee with active primary bank account for payroll processing
 * @param {string} id
 */
export async function findEmployeeForPayroll(id) {
    const rows = await db
        .select({
            employee: employees,
            bankAccount: {
                id: bankAccounts.id,
                bankName: bankAccounts.bankName,
                accountNumber: bankAccounts.accountNumber,
                accountHolderName: bankAccounts.accountHolderName,
                ifscCode: bankAccounts.ifscCode,
                accountType: bankAccounts.accountType,
                isPrimary: bankAccounts.isPrimary,
                isActive: bankAccounts.isActive,
            },
        })
        .from(employees)
        .leftJoin(
            bankAccounts,
            and(
                eq(bankAccounts.employeeId, employees.id),
                eq(bankAccounts.isPrimary, true),
                eq(bankAccounts.isActive, true),
            ),
        )
        .where(eq(employees.id, id))
        .limit(1);

    if (!rows.length) return null;
    return {
        ...rows[0].employee,
        primaryBankAccount: rows[0].bankAccount?.id ? rows[0].bankAccount : null,
    };
}

/**
 * Query eligible active employees for Step 2 Payrun creation wizard
 * @param {string} structureId
 * @param {string} periodStart - YYYY-MM-DD
 * @param {string} periodEnd - YYYY-MM-DD
 */
export async function getEmployeesForPayrun(structureId, periodStart, periodEnd) {
    const rows = await db
        .select({
            employee: {
                id: employees.id,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
                departmentId: employees.departmentId,
                status: employees.status,
                isActive: employees.isActive,
            },
            department: {
                id: departments.id,
                name: departments.name,
                code: departments.code,
            },
            jobPosition: {
                id: jobPositions.id,
                title: jobPositions.title,
            },
            contract: {
                id: contracts.id,
                wage: contracts.wage,
                startDate: contracts.startDate,
                endDate: contracts.endDate,
                status: contracts.status,
                salaryStructureId: contracts.salaryStructureId,
            },
            bankAccount: {
                id: bankAccounts.id,
                bankName: bankAccounts.bankName,
                accountNumber: bankAccounts.accountNumber,
                accountHolderName: bankAccounts.accountHolderName,
                ifscCode: bankAccounts.ifscCode,
            },
        })
        .from(employees)
        .innerJoin(
            contracts,
            and(
                eq(contracts.employeeId, employees.id),
                eq(contracts.status, 'ACTIVE'),
                eq(contracts.salaryStructureId, structureId),
                lte(contracts.startDate, periodEnd),
                or(isNull(contracts.endDate), gte(contracts.endDate, periodStart)),
            ),
        )
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .leftJoin(
            bankAccounts,
            and(
                eq(bankAccounts.employeeId, employees.id),
                eq(bankAccounts.isPrimary, true),
                eq(bankAccounts.isActive, true),
            ),
        )
        .where(and(eq(employees.isActive, true), eq(employees.status, 'ACTIVE')))
        .orderBy(employees.employeeCode);

    return rows.map((r) => {
        const hasBank = Boolean(r.bankAccount?.id);
        return {
            id: r.employee.id,
            employeeCode: r.employee.employeeCode,
            firstName: r.employee.firstName,
            lastName: r.employee.lastName,
            email: r.employee.email,
            department: r.department?.name || 'Unassigned',
            departmentId: r.employee.departmentId,
            jobPosition: r.jobPosition?.title || 'Unassigned',
            contractId: r.contract.id,
            contractWage: r.contract.wage,
            contractStartDate: r.contract.startDate,
            contractEndDate: r.contract.endDate,
            hasPrimaryBankAccount: hasBank,
            bankAccount: hasBank ? r.bankAccount : null,
            eligibilityStatus: 'ELIGIBLE',
            eligibilityNotes: hasBank ? null : 'Missing active primary bank account',
        };
    });
}

/**
 * Filter employees with pagination, search, department, and status filters
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.search]
 * @param {string} [params.departmentId]
 * @param {string} [params.status]
 * @param {boolean} [params.isActive]
 */
export async function findEmployeesWithFilters({
    page = 1,
    limit = 20,
    search,
    departmentId,
    status,
    isActive,
} = {}) {
    const conditions = [];

    if (isActive !== undefined) {
        conditions.push(eq(employees.isActive, Boolean(isActive)));
    }
    if (status) {
        conditions.push(eq(employees.status, String(status).toUpperCase()));
    }
    if (departmentId) {
        conditions.push(eq(employees.departmentId, departmentId));
    }
    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(
            or(
                ilike(employees.firstName, term),
                ilike(employees.lastName, term),
                ilike(employees.email, term),
                ilike(employees.employeeCode, term),
            ),
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const [countRow] = await db
        .select({ count: sql`count(*)` })
        .from(employees)
        .where(whereClause);
    const total = Number(countRow?.count || 0);

    // Get paginated rows with department and job position joins
    const rows = await db
        .select({
            id: employees.id,
            userId: employees.userId,
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
            phone: employees.phone,
            gender: employees.gender,
            dateOfBirth: employees.dateOfBirth,
            address: employees.address,
            hireDate: employees.hireDate,
            terminationDate: employees.terminationDate,
            departmentId: employees.departmentId,
            jobPositionId: employees.jobPositionId,
            managerId: employees.managerId,
            workingScheduleId: employees.workingScheduleId,
            status: employees.status,
            isActive: employees.isActive,
            notes: employees.notes,
            createdAt: employees.createdAt,
            updatedAt: employees.updatedAt,
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
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
        .where(whereClause)
        .orderBy(desc(employees.createdAt))
        .limit(limitNum)
        .offset(offset);

    const mapped = rows.map((r) => ({
        ...r,
        department: r.department?.id ? r.department : null,
        jobPosition: r.jobPosition?.id ? r.jobPosition : null,
    }));

    return {
        employees: mapped,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
    };
}

/**
 * Get maximum employee sequence number for the current year
 * @param {number|string} year
 * @param {string} [prefix='PP360']
 * @returns {Promise<number>}
 */
export async function getMaxEmployeeSequence(year, prefix = 'PP360') {
    const yr = String(year || new Date().getFullYear()).slice(-4);
    const pattern = `${prefix}-%-${yr}-%`;

    const result = await db
        .select({ code: employees.employeeCode })
        .from(employees)
        .where(sql`${employees.employeeCode} LIKE ${pattern}`);

    let maxSeq = 0;
    for (const row of result) {
        if (!row.code) continue;
        const parts = row.code.split('-');
        const seqStr = parts[parts.length - 1];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    }
    return maxSeq;
}
