import { db } from '../config/database.config.js';
import { employees } from '../db/schema/employees.schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Employee DAO (Dev 1 module dependency - dummy/operational implementation)
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
