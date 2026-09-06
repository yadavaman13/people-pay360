import { db } from '../config/database.config.js';
import { timeOffRequests, timeOffAllocations, timeOffTypes } from '../db/schema/time_off.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { eq, and, desc, count, gte, lte, not } from 'drizzle-orm';
import { AppError } from '../utils/appError.js';

/**
 * Time Off Request DAO
 */

export async function findAllRequests({
    employeeId,
    typeId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
} = {}) {
    const conditions = [];

    if (employeeId) conditions.push(eq(timeOffRequests.employeeId, employeeId));
    if (typeId) conditions.push(eq(timeOffRequests.typeId, typeId));
    if (status) conditions.push(eq(timeOffRequests.status, status));
    if (startDate) conditions.push(gte(timeOffRequests.endDate, startDate));
    if (endDate) conditions.push(lte(timeOffRequests.startDate, endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (Math.max(1, page) - 1) * limit;

    const [requests, [{ totalCount }]] = await Promise.all([
        db
            .select({
                id: timeOffRequests.id,
                employeeId: timeOffRequests.employeeId,
                typeId: timeOffRequests.typeId,
                allocationId: timeOffRequests.allocationId,
                startDate: timeOffRequests.startDate,
                endDate: timeOffRequests.endDate,
                numberOfDays: timeOffRequests.numberOfDays,
                reason: timeOffRequests.reason,
                status: timeOffRequests.status,
                reviewedBy: timeOffRequests.reviewedBy,
                reviewedAt: timeOffRequests.reviewedAt,
                reviewNotes: timeOffRequests.reviewNotes,
                createdAt: timeOffRequests.createdAt,
                updatedAt: timeOffRequests.updatedAt,
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
                },
            })
            .from(timeOffRequests)
            .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
            .leftJoin(timeOffTypes, eq(timeOffRequests.typeId, timeOffTypes.id))
            .where(whereClause)
            .orderBy(desc(timeOffRequests.createdAt))
            .limit(limit)
            .offset(offset),

        db.select({ totalCount: count() }).from(timeOffRequests).where(whereClause),
    ]);

    return {
        requests,
        total: Number(totalCount),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(totalCount) / limit),
    };
}

export async function findRequestById(id) {
    const [request] = await db
        .select({
            id: timeOffRequests.id,
            employeeId: timeOffRequests.employeeId,
            typeId: timeOffRequests.typeId,
            allocationId: timeOffRequests.allocationId,
            startDate: timeOffRequests.startDate,
            endDate: timeOffRequests.endDate,
            numberOfDays: timeOffRequests.numberOfDays,
            reason: timeOffRequests.reason,
            status: timeOffRequests.status,
            reviewedBy: timeOffRequests.reviewedBy,
            reviewedAt: timeOffRequests.reviewedAt,
            reviewNotes: timeOffRequests.reviewNotes,
            createdAt: timeOffRequests.createdAt,
            updatedAt: timeOffRequests.updatedAt,
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
        .from(timeOffRequests)
        .leftJoin(employees, eq(timeOffRequests.employeeId, employees.id))
        .leftJoin(timeOffTypes, eq(timeOffRequests.typeId, timeOffTypes.id))
        .where(eq(timeOffRequests.id, id))
        .limit(1);

    return request || null;
}

export async function hasOverlappingApprovedRequests(employeeId, startDate, endDate, excludeId) {
    const conditions = [
        eq(timeOffRequests.employeeId, employeeId),
        eq(timeOffRequests.status, 'APPROVED'),
        lte(timeOffRequests.startDate, endDate),
        gte(timeOffRequests.endDate, startDate),
    ];

    if (excludeId) {
        conditions.push(not(eq(timeOffRequests.id, excludeId)));
    }

    const [overlapping] = await db
        .select({ id: timeOffRequests.id })
        .from(timeOffRequests)
        .where(and(...conditions))
        .limit(1);

    return Boolean(overlapping);
}

export async function createRequest(data) {
    const [created] = await db
        .insert(timeOffRequests)
        .values({
            employeeId: data.employeeId,
            typeId: data.typeId,
            allocationId: data.allocationId ?? null,
            startDate: data.startDate,
            endDate: data.endDate,
            numberOfDays: String(data.numberOfDays),
            reason: data.reason ?? null,
            status: 'PENDING',
        })
        .returning();

    return created;
}

export async function updateRequest(id, updates) {
    const data = { ...updates, updatedAt: new Date() };
    if (data.numberOfDays !== undefined) {
        data.numberOfDays = String(data.numberOfDays);
    }

    const [updated] = await db
        .update(timeOffRequests)
        .set(data)
        .where(eq(timeOffRequests.id, id))
        .returning();

    return updated || null;
}

export async function deleteRequest(id) {
    const [deleted] = await db
        .delete(timeOffRequests)
        .where(eq(timeOffRequests.id, id))
        .returning();

    return deleted || null;
}

/**
 * Approve leave request atomically:
 * Updates allocation balance and request status in a single DB transaction.
 * @param {string} requestId
 * @param {string} reviewedByUserId
 * @param {string} [reviewNotes]
 */
export async function approveRequestAtomic(requestId, reviewedByUserId, reviewNotes) {
    return db.transaction(async (tx) => {
        // 1. Lock and load request
        const [request] = await tx
            .select()
            .from(timeOffRequests)
            .where(eq(timeOffRequests.id, requestId))
            .limit(1);

        if (!request) {
            throw new AppError('Time off request not found', 404);
        }

        if (request.status !== 'PENDING') {
            throw new AppError(`Cannot approve a request with status ${request.status}`, 409);
        }

        // 2. Load type to check if allocation required
        const [type] = await tx
            .select()
            .from(timeOffTypes)
            .where(eq(timeOffTypes.id, request.typeId))
            .limit(1);

        if (!type) {
            throw new AppError('Associated leave type not found', 404);
        }

        let updatedAllocation = null;

        // 3. Deduct from allocation if required or linked
        if (type.allocationRequired || request.allocationId) {
            if (!request.allocationId) {
                throw new AppError('No allocation attached to this leave request', 409);
            }

            const [allocation] = await tx
                .select()
                .from(timeOffAllocations)
                .where(eq(timeOffAllocations.id, request.allocationId))
                .limit(1);

            if (!allocation) {
                throw new AppError('Allocated leave balance not found', 404);
            }

            if (allocation.status !== 'APPROVED') {
                throw new AppError('Cannot consume from an unapproved leave allocation', 409);
            }

            const currentUsed = parseFloat(allocation.usedDays || 0);
            const totalDays = parseFloat(allocation.totalDays || 0);
            const requestedDays = parseFloat(request.numberOfDays || 0);
            const newUsed = Number((currentUsed + requestedDays).toFixed(2));

            if (newUsed > totalDays) {
                throw new AppError(
                    `Insufficient leave balance. Available: ${(totalDays - currentUsed).toFixed(2)} days, Requested: ${requestedDays} days`,
                    409,
                );
            }

            const [savedAllocation] = await tx
                .update(timeOffAllocations)
                .set({
                    usedDays: String(newUsed),
                    updatedAt: new Date(),
                })
                .where(eq(timeOffAllocations.id, allocation.id))
                .returning();

            updatedAllocation = savedAllocation;
        }

        // 4. Update request status
        const [approvedRequest] = await tx
            .update(timeOffRequests)
            .set({
                status: 'APPROVED',
                reviewedBy: reviewedByUserId,
                reviewNotes: reviewNotes || request.reviewNotes,
                reviewedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(timeOffRequests.id, requestId))
            .returning();

        return {
            request: approvedRequest,
            allocation: updatedAllocation,
        };
    });
}

/**
 * Refuse leave request
 * @param {string} requestId
 * @param {string} reviewedByUserId
 * @param {string} reviewNotes
 */
export async function refuseRequest(requestId, reviewedByUserId, reviewNotes) {
    const [request] = await db
        .select()
        .from(timeOffRequests)
        .where(eq(timeOffRequests.id, requestId))
        .limit(1);

    if (!request) {
        throw new AppError('Time off request not found', 404);
    }

    if (request.status !== 'PENDING') {
        throw new AppError(`Cannot refuse a request with status ${request.status}`, 409);
    }

    const [refused] = await db
        .update(timeOffRequests)
        .set({
            status: 'REFUSED',
            reviewedBy: reviewedByUserId,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || request.reviewNotes,
            updatedAt: new Date(),
        })
        .where(eq(timeOffRequests.id, requestId))
        .returning();

    return refused;
}

/**
 * Cancel an approved request atomically:
 * Restores allocation balance and sets request status to CANCELLED.
 * @param {string} requestId
 * @param {string} cancelledByUserId
 */
export async function cancelRequestAtomic(requestId, cancelledByUserId) {
    return db.transaction(async (tx) => {
        const [request] = await tx
            .select()
            .from(timeOffRequests)
            .where(eq(timeOffRequests.id, requestId))
            .limit(1);

        if (!request) {
            throw new AppError('Time off request not found', 404);
        }

        if (request.status !== 'PENDING' && request.status !== 'APPROVED') {
            throw new AppError(
                `Cannot cancel a request with status ${request.status}. Only PENDING or APPROVED requests can be cancelled.`,
                409,
            );
        }

        let restoredAllocation = null;

        // Restore allocation balance if linked and request was APPROVED
        if (request.status === 'APPROVED' && request.allocationId) {
            const [allocation] = await tx
                .select()
                .from(timeOffAllocations)
                .where(eq(timeOffAllocations.id, request.allocationId))
                .limit(1);

            if (allocation) {
                const currentUsed = parseFloat(allocation.usedDays || 0);
                const requestDays = parseFloat(request.numberOfDays || 0);
                const restoredUsed = Number(Math.max(0, currentUsed - requestDays).toFixed(2));

                const [savedAlloc] = await tx
                    .update(timeOffAllocations)
                    .set({
                        usedDays: String(restoredUsed),
                        updatedAt: new Date(),
                    })
                    .where(eq(timeOffAllocations.id, allocation.id))
                    .returning();

                restoredAllocation = savedAlloc;
            }
        }

        const [cancelledRequest] = await tx
            .update(timeOffRequests)
            .set({
                status: 'CANCELLED',
                reviewedBy: cancelledByUserId,
                reviewedAt: new Date(),
                reviewNotes: request.reviewNotes
                    ? `${request.reviewNotes} (CANCELLED)`
                    : 'CANCELLED',
                updatedAt: new Date(),
            })
            .where(eq(timeOffRequests.id, requestId))
            .returning();

        return {
            request: cancelledRequest,
            allocation: restoredAllocation,
        };
    });
}

/**
 * Export for Dev 3 (Salary Engine) & Dev 4:
 * Get approved time off requests for employee during period
 * @param {string} employeeId
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd - 'YYYY-MM-DD'
 */
export async function getApprovedTimeOff(employeeId, periodStart, periodEnd) {
    return db
        .select({
            id: timeOffRequests.id,
            employeeId: timeOffRequests.employeeId,
            typeId: timeOffRequests.typeId,
            startDate: timeOffRequests.startDate,
            endDate: timeOffRequests.endDate,
            numberOfDays: timeOffRequests.numberOfDays,
            reason: timeOffRequests.reason,
            status: timeOffRequests.status,
            timeOffType: {
                id: timeOffTypes.id,
                name: timeOffTypes.name,
                code: timeOffTypes.code,
                paidTimeOff: timeOffTypes.paidTimeOff,
            },
        })
        .from(timeOffRequests)
        .innerJoin(timeOffTypes, eq(timeOffRequests.typeId, timeOffTypes.id))
        .where(
            and(
                eq(timeOffRequests.employeeId, employeeId),
                eq(timeOffRequests.status, 'APPROVED'),
                lte(timeOffRequests.startDate, periodEnd),
                gte(timeOffRequests.endDate, periodStart),
            ),
        )
        .orderBy(timeOffRequests.startDate);
}
