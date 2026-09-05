import { db } from '../config/database.config.js';
import { departments } from '../db/schema/departments.schema.js';
import { jobPositions } from '../db/schema/job_positions.schema.js';
import { eq, and, asc } from 'drizzle-orm';

/**
 * Department & Job Position DAO
 */

/**
 * Fetch all active departments ordered by name
 */
export async function getAllDepartments() {
    return db
        .select({
            id: departments.id,
            name: departments.name,
            code: departments.code,
            description: departments.description,
            isActive: departments.isActive,
        })
        .from(departments)
        .where(eq(departments.isActive, true))
        .orderBy(asc(departments.name));
}

/**
 * Fetch all active job positions with optional department filter
 * @param {string} [departmentId]
 */
export async function getAllJobPositions(departmentId) {
    const conditions = [eq(jobPositions.isActive, true)];
    if (departmentId) {
        conditions.push(eq(jobPositions.departmentId, departmentId));
    }

    return db
        .select({
            id: jobPositions.id,
            title: jobPositions.title,
            code: jobPositions.code,
            departmentId: jobPositions.departmentId,
            description: jobPositions.description,
            isActive: jobPositions.isActive,
        })
        .from(jobPositions)
        .where(and(...conditions))
        .orderBy(asc(jobPositions.title));
}
