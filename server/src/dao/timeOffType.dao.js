import { db } from '../config/database.config.js';
import { timeOffTypes, timeOffAllocations, timeOffRequests } from '../db/schema/time_off.schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Time Off Type DAO
 */

export async function findAllTimeOffTypes({ isActive } = {}) {
    const conditions = [];
    if (isActive !== undefined) {
        conditions.push(eq(timeOffTypes.isActive, isActive));
    }

    const query = db.select().from(timeOffTypes);
    if (conditions.length > 0) {
        query.where(and(...conditions));
    }
    return query.orderBy(timeOffTypes.name);
}

export async function findTimeOffTypeById(id) {
    const [type] = await db.select().from(timeOffTypes).where(eq(timeOffTypes.id, id)).limit(1);
    return type || null;
}

export async function findTimeOffTypeByCode(code) {
    const [type] = await db
        .select()
        .from(timeOffTypes)
        .where(eq(timeOffTypes.code, code.toUpperCase()))
        .limit(1);
    return type || null;
}

export async function createTimeOffType(data) {
    const [type] = await db
        .insert(timeOffTypes)
        .values({
            name: data.name.trim(),
            code: data.code.trim().toUpperCase(),
            allocationRequired: data.allocationRequired ?? true,
            requestApprovalRequired: data.requestApprovalRequired ?? true,
            paidTimeOff: data.paidTimeOff ?? true,
            maxDaysPerRequest: data.maxDaysPerRequest ?? null,
            isActive: data.isActive ?? true,
        })
        .returning();
    return type;
}

export async function updateTimeOffType(id, updates) {
    const [updated] = await db
        .update(timeOffTypes)
        .set({
            ...updates,
            updatedAt: new Date(),
        })
        .where(eq(timeOffTypes.id, id))
        .returning();
    return updated || null;
}

export async function softDeleteTimeOffType(id) {
    const [updated] = await db
        .update(timeOffTypes)
        .set({
            isActive: false,
            updatedAt: new Date(),
        })
        .where(eq(timeOffTypes.id, id))
        .returning();
    return updated || null;
}

export async function checkTypeInUse(typeId) {
    const [allocation] = await db
        .select({ id: timeOffAllocations.id })
        .from(timeOffAllocations)
        .where(eq(timeOffAllocations.typeId, typeId))
        .limit(1);

    if (allocation) return true;

    const [request] = await db
        .select({ id: timeOffRequests.id })
        .from(timeOffRequests)
        .where(eq(timeOffRequests.typeId, typeId))
        .limit(1);

    return Boolean(request);
}
