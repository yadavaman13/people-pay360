import { db } from '../config/database.config.js';
import { salaryRules, salaryStructures } from '../db/schema/salary.schema.js';
import { eq, and, asc, count, sql } from 'drizzle-orm';

/**
 * Salary Rule DAO
 */

/**
 * Find rules belonging to a structure ordered by sequenceOrder ASC
 * @param {string} structureId
 * @param {object} [options]
 */
export async function findRulesByStructureId(structureId, { isActive } = {}) {
    const conditions = [eq(salaryRules.structureId, structureId)];
    if (isActive !== undefined) {
        conditions.push(eq(salaryRules.isActive, isActive));
    }

    return db
        .select()
        .from(salaryRules)
        .where(and(...conditions))
        .orderBy(asc(salaryRules.sequenceOrder));
}

/**
 * Find a salary rule by ID
 * @param {string} id
 */
export async function findRuleById(id) {
    const [rule] = await db
        .select({
            id: salaryRules.id,
            structureId: salaryRules.structureId,
            code: salaryRules.code,
            name: salaryRules.name,
            category: salaryRules.category,
            sequenceOrder: salaryRules.sequenceOrder,
            computationType: salaryRules.computationType,
            fixedAmount: salaryRules.fixedAmount,
            percentageBaseCode: salaryRules.percentageBaseCode,
            percentageRate: salaryRules.percentageRate,
            formulaExpression: salaryRules.formulaExpression,
            isActive: salaryRules.isActive,
            createdAt: salaryRules.createdAt,
            updatedAt: salaryRules.updatedAt,
            structureName: salaryStructures.name,
            structureCode: salaryStructures.code,
        })
        .from(salaryRules)
        .leftJoin(salaryStructures, eq(salaryRules.structureId, salaryStructures.id))
        .where(eq(salaryRules.id, id))
        .limit(1);

    return rule || null;
}

/**
 * Find rule by code within a structure
 * @param {string} structureId
 * @param {string} code
 */
export async function findRuleByCodeInStructure(structureId, code) {
    const [rule] = await db
        .select()
        .from(salaryRules)
        .where(
            and(eq(salaryRules.structureId, structureId), eq(salaryRules.code, code.toUpperCase())),
        )
        .limit(1);

    return rule || null;
}

/**
 * Find rule by sequence order within a structure
 * @param {string} structureId
 * @param {number} sequenceOrder
 */
export async function findRuleBySequenceInStructure(structureId, sequenceOrder) {
    const [rule] = await db
        .select()
        .from(salaryRules)
        .where(
            and(
                eq(salaryRules.structureId, structureId),
                eq(salaryRules.sequenceOrder, sequenceOrder),
            ),
        )
        .limit(1);

    return rule || null;
}

/**
 * Find highest sequence order in a structure
 * @param {string} structureId
 */
export async function findHighestSequenceOrder(structureId) {
    const [result] = await db
        .select({ maxSeq: sql`COALESCE(MAX(${salaryRules.sequenceOrder}), 0)::int` })
        .from(salaryRules)
        .where(eq(salaryRules.structureId, structureId));

    return result?.maxSeq || 0;
}

/**
 * Standalone rules list with filtering and pagination
 * @param {object} params
 */
export async function findAllRules({ structureId, category, isActive, page = 1, limit = 50 } = {}) {
    const conditions = [];

    if (structureId) {
        conditions.push(eq(salaryRules.structureId, structureId));
    }
    if (category) {
        conditions.push(eq(salaryRules.category, category.toUpperCase()));
    }
    if (isActive !== undefined) {
        conditions.push(eq(salaryRules.isActive, isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (Math.max(1, page) - 1) * limit;

    const [records, [{ totalCount }]] = await Promise.all([
        db
            .select({
                id: salaryRules.id,
                structureId: salaryRules.structureId,
                code: salaryRules.code,
                name: salaryRules.name,
                category: salaryRules.category,
                sequenceOrder: salaryRules.sequenceOrder,
                computationType: salaryRules.computationType,
                fixedAmount: salaryRules.fixedAmount,
                percentageBaseCode: salaryRules.percentageBaseCode,
                percentageRate: salaryRules.percentageRate,
                formulaExpression: salaryRules.formulaExpression,
                isActive: salaryRules.isActive,
                createdAt: salaryRules.createdAt,
                updatedAt: salaryRules.updatedAt,
                structureName: salaryStructures.name,
                structureCode: salaryStructures.code,
            })
            .from(salaryRules)
            .leftJoin(salaryStructures, eq(salaryRules.structureId, salaryStructures.id))
            .where(whereClause)
            .orderBy(asc(salaryRules.sequenceOrder))
            .limit(limit)
            .offset(offset),
        db.select({ totalCount: count() }).from(salaryRules).where(whereClause),
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
 * Create a new salary rule
 * @param {object} data
 */
export async function createRule(data) {
    const [created] = await db
        .insert(salaryRules)
        .values({
            structureId: data.structureId,
            code: data.code.toUpperCase(),
            name: data.name,
            category: data.category.toUpperCase(),
            sequenceOrder: Number(data.sequenceOrder),
            computationType: data.computationType.toUpperCase(),
            fixedAmount:
                data.fixedAmount !== undefined && data.fixedAmount !== null
                    ? String(data.fixedAmount)
                    : null,
            percentageBaseCode: data.percentageBaseCode
                ? data.percentageBaseCode.toUpperCase()
                : null,
            percentageRate:
                data.percentageRate !== undefined && data.percentageRate !== null
                    ? String(data.percentageRate)
                    : null,
            formulaExpression: data.formulaExpression || null,
            isActive: data.isActive !== undefined ? data.isActive : true,
        })
        .returning();

    return created;
}

/**
 * Update a salary rule
 * @param {string} id
 * @param {object} data
 */
export async function updateRule(id, data) {
    const updateData = {
        updatedAt: new Date(),
    };

    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category.toUpperCase();
    if (data.sequenceOrder !== undefined) updateData.sequenceOrder = Number(data.sequenceOrder);
    if (data.computationType !== undefined)
        updateData.computationType = data.computationType.toUpperCase();
    if (data.fixedAmount !== undefined) {
        updateData.fixedAmount = data.fixedAmount !== null ? String(data.fixedAmount) : null;
    }
    if (data.percentageBaseCode !== undefined) {
        updateData.percentageBaseCode = data.percentageBaseCode
            ? data.percentageBaseCode.toUpperCase()
            : null;
    }
    if (data.percentageRate !== undefined) {
        updateData.percentageRate =
            data.percentageRate !== null ? String(data.percentageRate) : null;
    }
    if (data.formulaExpression !== undefined) {
        updateData.formulaExpression = data.formulaExpression;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await db
        .update(salaryRules)
        .set(updateData)
        .where(eq(salaryRules.id, id))
        .returning();

    return updated || null;
}

/**
 * Delete a rule
 * @param {string} id
 */
export async function deleteRule(id) {
    const [deleted] = await db.delete(salaryRules).where(eq(salaryRules.id, id)).returning();

    return deleted || null;
}
