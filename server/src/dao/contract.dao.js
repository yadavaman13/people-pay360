import { db } from '../config/database.config.js';
import { contracts } from '../db/schema/contracts.schema.js';
import { eq, and, lte, or, gte, isNull } from 'drizzle-orm';

/**
 * Contract DAO (Dev 1 module dependency - dummy/operational implementation)
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
