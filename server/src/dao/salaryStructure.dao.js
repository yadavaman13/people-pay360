import { db } from '../config/database.config.js';
import { salaryStructures, salaryRules } from '../db/schema/salary.schema.js';
import { contracts } from '../db/schema/contracts.schema.js';
import { payruns } from '../db/schema/payroll.schema.js';
import { eq, and, desc, asc, ilike, or, sql, count, inArray } from 'drizzle-orm';

/**
 * Salary Structure DAO
 */

/**
 * Find all salary structures with optional filters and pagination
 * @param {object} params
 */
export async function findAllStructures({ isActive, search, page = 1, limit = 50 } = {}) {
    const conditions = [];

    if (isActive !== undefined) {
        conditions.push(eq(salaryStructures.isActive, isActive));
    }

    if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
            or(
                ilike(salaryStructures.name, searchPattern),
                ilike(salaryStructures.code, searchPattern),
            ),
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (Math.max(1, page) - 1) * limit;

    const [records, [{ totalCount }]] = await Promise.all([
        db
            .select({
                id: salaryStructures.id,
                name: salaryStructures.name,
                code: salaryStructures.code,
                description: salaryStructures.description,
                isActive: salaryStructures.isActive,
                createdAt: salaryStructures.createdAt,
                updatedAt: salaryStructures.updatedAt,
                rulesCount: sql`COALESCE(
                    (SELECT count(*)::int FROM ${salaryRules} 
                     WHERE ${salaryRules.structureId} = ${salaryStructures.id} 
                     AND ${salaryRules.isActive} = true), 0
                )`.as('rules_count'),
            })
            .from(salaryStructures)
            .where(whereClause)
            .orderBy(desc(salaryStructures.createdAt))
            .limit(limit)
            .offset(offset),
        db.select({ totalCount: count() }).from(salaryStructures).where(whereClause),
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
 * Find structure by ID
 * @param {string} id
 */
export async function findStructureById(id) {
    const [structure] = await db
        .select()
        .from(salaryStructures)
        .where(eq(salaryStructures.id, id))
        .limit(1);

    return structure || null;
}

/**
 * Find structure by unique code
 * @param {string} code
 */
export async function findStructureByCode(code) {
    const [structure] = await db
        .select()
        .from(salaryStructures)
        .where(eq(salaryStructures.code, code.toUpperCase()))
        .limit(1);

    return structure || null;
}

/**
 * Find structure with its ordered rules
 * @param {string} id
 */
export async function findStructureWithRules(id) {
    const structure = await findStructureById(id);
    if (!structure) return null;

    const rules = await db
        .select()
        .from(salaryRules)
        .where(and(eq(salaryRules.structureId, id), eq(salaryRules.isActive, true)))
        .orderBy(asc(salaryRules.sequenceOrder));

    return {
        ...structure,
        rules,
    };
}

/**
 * Create a new salary structure
 * @param {object} data
 */
export async function createStructure(data) {
    const [created] = await db
        .insert(salaryStructures)
        .values({
            name: data.name,
            code: data.code.toUpperCase(),
            description: data.description || null,
            isActive: data.isActive !== undefined ? data.isActive : true,
        })
        .returning();

    return created;
}

/**
 * Update salary structure metadata
 * @param {string} id
 * @param {object} data
 */
export async function updateStructure(id, data) {
    const updateData = {
        updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
        .update(salaryStructures)
        .set(updateData)
        .where(eq(salaryStructures.id, id))
        .returning();

    return updated || null;
}

/**
 * Soft delete salary structure
 * @param {string} id
 */
export async function softDeleteStructure(id) {
    const [deleted] = await db
        .update(salaryStructures)
        .set({
            isActive: false,
            updatedAt: new Date(),
        })
        .where(eq(salaryStructures.id, id))
        .returning();

    return deleted || null;
}

/**
 * Check if structure is assigned to any active contracts
 * @param {string} structureId
 * @returns {Promise<boolean>}
 */
export async function checkStructureInContracts(structureId) {
    const [record] = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(and(eq(contracts.salaryStructureId, structureId), eq(contracts.status, 'ACTIVE')))
        .limit(1);

    return Boolean(record);
}

/**
 * Check if structure is referenced by any active/pending payruns
 * @param {string} structureId
 * @returns {Promise<boolean>}
 */
export async function checkStructureInPayruns(structureId) {
    const [record] = await db
        .select({ id: payruns.id })
        .from(payruns)
        .where(
            and(
                eq(payruns.structureId, structureId),
                inArray(payruns.status, ['DRAFT', 'COMPUTING', 'COMPUTED']),
            ),
        )
        .limit(1);

    return Boolean(record);
}
