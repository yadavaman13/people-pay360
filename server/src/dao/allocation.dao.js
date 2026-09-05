import { db } from '../config/database.config.js';
import { timeOffAllocations, timeOffTypes } from '../db/schema/time_off.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { eq, and, desc, count, gte, lte, or, isNull, sql } from 'drizzle-orm';

/**
 * Allocation DAO
 */

export async function findAllAllocations({
    employeeId,
    typeId,
    status,
    page = 1,
    limit = 50,
} = {}) {
    const conditions = [];

    if (employeeId) conditions.push(eq(timeOffAllocations.employeeId, employeeId));
    if (typeId) conditions.push(eq(timeOffAllocations.typeId, typeId));
    if (status) conditions.push(eq(timeOffAllocations.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (Math.max(1, page) - 1) * limit;

    const [allocations, [{ totalCount }]] = await Promise.all([
        db
            .select({
                id: timeOffAllocations.id,
                employeeId: timeOffAllocations.employeeId,
                typeId: timeOffAllocations.typeId,
                totalDays: timeOffAllocations.totalDays,
                usedDays: timeOffAllocations.usedDays,
                remainingDays: sql`CAST(${timeOffAllocations.totalDays} AS NUMERIC) - CAST(${timeOffAllocations.usedDays} AS NUMERIC)`,
                validityStart: timeOffAllocations.validityStart,
                validityEnd: timeOffAllocations.validityEnd,
                status: timeOffAllocations.status,
                approvedBy: timeOffAllocations.approvedBy,
                approvedAt: timeOffAllocations.approvedAt,
                notes: timeOffAllocations.notes,
                createdAt: timeOffAllocations.createdAt,
                updatedAt: timeOffAllocations.updatedAt,
                employee: {
                    id: employees.id,
                    employeeCode: employees.employeeCode,
                    firstName: employees.firstName,
                    lastName: employees.lastName,
                    email: employees.email,
                },
                timeOffType: {
                    id: timeOffTypes.id,
                    name: timeOffTypes.name,
                    code: timeOffTypes.code,
                    paidTimeOff: timeOffTypes.paidTimeOff,
                },
            })
            .from(timeOffAllocations)
            .leftJoin(employees, eq(timeOffAllocations.employeeId, employees.id))
            .leftJoin(timeOffTypes, eq(timeOffAllocations.typeId, timeOffTypes.id))
            .where(whereClause)
            .orderBy(desc(timeOffAllocations.createdAt))
            .limit(limit)
            .offset(offset),

        db.select({ totalCount: count() }).from(timeOffAllocations).where(whereClause),
    ]);

    return {
        allocations,
        total: Number(totalCount),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(totalCount) / limit),
    };
}

export async function findAllocationById(id) {
    const [allocation] = await db
        .select({
            id: timeOffAllocations.id,
            employeeId: timeOffAllocations.employeeId,
            typeId: timeOffAllocations.typeId,
            totalDays: timeOffAllocations.totalDays,
            usedDays: timeOffAllocations.usedDays,
            remainingDays: sql`CAST(${timeOffAllocations.totalDays} AS NUMERIC) - CAST(${timeOffAllocations.usedDays} AS NUMERIC)`,
            validityStart: timeOffAllocations.validityStart,
            validityEnd: timeOffAllocations.validityEnd,
            status: timeOffAllocations.status,
            approvedBy: timeOffAllocations.approvedBy,
            approvedAt: timeOffAllocations.approvedAt,
            notes: timeOffAllocations.notes,
            createdAt: timeOffAllocations.createdAt,
            updatedAt: timeOffAllocations.updatedAt,
            employee: {
                id: employees.id,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
            },
            timeOffType: {
                id: timeOffTypes.id,
                name: timeOffTypes.name,
                code: timeOffTypes.code,
                paidTimeOff: timeOffTypes.paidTimeOff,
                allocationRequired: timeOffTypes.allocationRequired,
                maxDaysPerRequest: timeOffTypes.maxDaysPerRequest,
            },
        })
        .from(timeOffAllocations)
        .leftJoin(employees, eq(timeOffAllocations.employeeId, employees.id))
        .leftJoin(timeOffTypes, eq(timeOffAllocations.typeId, timeOffTypes.id))
        .where(eq(timeOffAllocations.id, id))
        .limit(1);

    return allocation || null;
}

export async function createAllocation(data) {
    const [created] = await db
        .insert(timeOffAllocations)
        .values({
            employeeId: data.employeeId,
            typeId: data.typeId,
            totalDays: String(data.totalDays),
            usedDays: '0.00',
            validityStart: data.validityStart,
            validityEnd: data.validityEnd ?? null,
            status: 'PENDING',
            notes: data.notes ?? null,
        })
        .returning();

    return created;
}

export async function updateAllocation(id, updates) {
    const data = { ...updates, updatedAt: new Date() };
    if (data.totalDays !== undefined) {
        data.totalDays = String(data.totalDays);
    }

    const [updated] = await db
        .update(timeOffAllocations)
        .set(data)
        .where(eq(timeOffAllocations.id, id))
        .returning();

    return updated || null;
}

export async function deleteAllocation(id) {
    const [deleted] = await db
        .delete(timeOffAllocations)
        .where(eq(timeOffAllocations.id, id))
        .returning();

    return deleted || null;
}

export async function updateAllocationStatus(id, status, approvedByUserId) {
    const [updated] = await db
        .update(timeOffAllocations)
        .set({
            status,
            approvedBy: approvedByUserId,
            approvedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(timeOffAllocations.id, id))
        .returning();

    return updated || null;
}

export async function findActiveApprovedAllocation(employeeId, typeId, targetDate) {
    const [allocation] = await db
        .select()
        .from(timeOffAllocations)
        .where(
            and(
                eq(timeOffAllocations.employeeId, employeeId),
                eq(timeOffAllocations.typeId, typeId),
                eq(timeOffAllocations.status, 'APPROVED'),
                lte(timeOffAllocations.validityStart, targetDate),
                or(
                    isNull(timeOffAllocations.validityEnd),
                    gte(timeOffAllocations.validityEnd, targetDate),
                ),
                sql`CAST(${timeOffAllocations.totalDays} AS NUMERIC) > CAST(${timeOffAllocations.usedDays} AS NUMERIC)`,
            ),
        )
        .orderBy(desc(timeOffAllocations.validityStart))
        .limit(1);

    return allocation || null;
}

/**
 * Export for Dev 4: Leave balances summary grouped by leave type
 * @param {string} employeeId
 * @param {string} [asOfDate]
 */
export async function findEmployeeBalances(employeeId, asOfDate) {
    const targetDate = asOfDate || new Date().toISOString().split('T')[0];

    const records = await db
        .select({
            allocationId: timeOffAllocations.id,
            typeId: timeOffTypes.id,
            typeName: timeOffTypes.name,
            typeCode: timeOffTypes.code,
            paidTimeOff: timeOffTypes.paidTimeOff,
            totalDays: timeOffAllocations.totalDays,
            usedDays: timeOffAllocations.usedDays,
            validityStart: timeOffAllocations.validityStart,
            validityEnd: timeOffAllocations.validityEnd,
        })
        .from(timeOffAllocations)
        .innerJoin(timeOffTypes, eq(timeOffAllocations.typeId, timeOffTypes.id))
        .where(
            and(
                eq(timeOffAllocations.employeeId, employeeId),
                eq(timeOffAllocations.status, 'APPROVED'),
                lte(timeOffAllocations.validityStart, targetDate),
                or(
                    isNull(timeOffAllocations.validityEnd),
                    gte(timeOffAllocations.validityEnd, targetDate),
                ),
            ),
        );

    // Group by leave type
    const grouped = {};
    for (const item of records) {
        const key = item.typeId;
        if (!grouped[key]) {
            grouped[key] = {
                typeId: item.typeId,
                typeName: item.typeName,
                typeCode: item.typeCode,
                paidTimeOff: item.paidTimeOff,
                totalDays: 0,
                usedDays: 0,
                remainingDays: 0,
                allocations: [],
            };
        }

        const total = parseFloat(item.totalDays || 0);
        const used = parseFloat(item.usedDays || 0);
        const remaining = Number(Math.max(0, total - used).toFixed(2));

        grouped[key].totalDays = Number((grouped[key].totalDays + total).toFixed(2));
        grouped[key].usedDays = Number((grouped[key].usedDays + used).toFixed(2));
        grouped[key].remainingDays = Number((grouped[key].remainingDays + remaining).toFixed(2));
        grouped[key].allocations.push({
            id: item.allocationId,
            totalDays: total,
            usedDays: used,
            remainingDays: remaining,
            validityStart: item.validityStart,
            validityEnd: item.validityEnd,
        });
    }

    return Object.values(grouped);
}
