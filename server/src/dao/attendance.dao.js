import { db } from '../config/database.config.js';
import { attendanceRecords, attendancePunches } from '../db/schema/attendance.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { users } from '../db/schema/users.schema.js';
import { eq, and, gte, lte, desc, sql, count, inArray, or, ilike } from 'drizzle-orm';

/**
 * Attendance DAO
 */

/**
 * Find attendance records with filtering and pagination
 * @param {object} params
 */
export async function findAttendanceList({
    employeeId,
    dateFrom,
    dateTo,
    status,
    excludeHr = false,
    search,
    page = 1,
    limit = 50,
} = {}) {
    const conditions = [];

    if (employeeId) {
        conditions.push(eq(attendanceRecords.employeeId, employeeId));
    }
    if (dateFrom) {
        conditions.push(gte(attendanceRecords.attendanceDate, dateFrom));
    }
    if (dateTo) {
        conditions.push(lte(attendanceRecords.attendanceDate, dateTo));
    }
    if (status) {
        conditions.push(eq(attendanceRecords.status, status));
    }
    if (excludeHr) {
        conditions.push(eq(users.role, 'EMPLOYEE'));
    }
    if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        conditions.push(
            or(
                ilike(employees.firstName, term),
                ilike(employees.lastName, term),
                ilike(employees.employeeCode, term),
                sql`concat(${employees.firstName}, ' ', ${employees.lastName}) ILIKE ${term}`,
                sql`CAST(${attendanceRecords.attendanceDate} AS TEXT) ILIKE ${term}`,
                ilike(attendanceRecords.notes, term),
            ),
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 50);
    const offset = (pageNum - 1) * limitNum;

    const needsJoin = excludeHr || Boolean(search && search.trim());

    const countQuery = needsJoin
        ? db
              .select({ totalCount: count() })
              .from(attendanceRecords)
              .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
              .leftJoin(users, eq(employees.userId, users.id))
              .where(whereClause)
        : db.select({ totalCount: count() }).from(attendanceRecords).where(whereClause);

    const [records, [{ totalCount }]] = await Promise.all([
        db
            .select({
                id: attendanceRecords.id,
                employeeId: attendanceRecords.employeeId,
                attendanceDate: attendanceRecords.attendanceDate,
                checkInTime: attendanceRecords.checkInTime,
                checkOutTime: attendanceRecords.checkOutTime,
                workedHours: attendanceRecords.workedHours,
                status: attendanceRecords.status,
                isManuallyCorrected: attendanceRecords.isManuallyCorrected,
                correctedBy: attendanceRecords.correctedBy,
                correctionReason: attendanceRecords.correctionReason,
                notes: attendanceRecords.notes,
                createdAt: attendanceRecords.createdAt,
                updatedAt: attendanceRecords.updatedAt,
                employee: {
                    id: employees.id,
                    employeeCode: employees.employeeCode,
                    firstName: employees.firstName,
                    lastName: employees.lastName,
                    email: employees.email,
                    profileImage: users.profileImage,
                },
            })
            .from(attendanceRecords)
            .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
            .leftJoin(users, eq(employees.userId, users.id))
            .where(whereClause)
            .orderBy(desc(attendanceRecords.attendanceDate), desc(attendanceRecords.checkInTime))
            .limit(limitNum)
            .offset(offset),

        countQuery,
    ]);

    let enrichedRecords = records;
    if (records.length > 0) {
        const recordIds = records.map((r) => r.id);
        const punches = await db
            .select()
            .from(attendancePunches)
            .where(inArray(attendancePunches.attendanceRecordId, recordIds))
            .orderBy(attendancePunches.checkInTime);

        const punchMap = new Map();
        for (const p of punches) {
            if (!punchMap.has(p.attendanceRecordId)) {
                punchMap.set(p.attendanceRecordId, []);
            }
            punchMap.get(p.attendanceRecordId).push(p);
        }

        enrichedRecords = records.map((rec) => {
            const recPunches = punchMap.get(rec.id) || [];
            const activePunch = recPunches.find((p) => p.checkOutTime === null) || null;
            return {
                ...rec,
                isCurrentlyCheckedIn: Boolean(activePunch),
                activePunch,
                punches: recPunches,
            };
        });
    }

    return {
        records: enrichedRecords,
        total: Number(totalCount),
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(Number(totalCount) / limitNum),
    };
}

/**
 * Find single attendance record by ID
 * @param {string} id
 */
export async function findAttendanceById(id) {
    const [record] = await db
        .select({
            id: attendanceRecords.id,
            employeeId: attendanceRecords.employeeId,
            attendanceDate: attendanceRecords.attendanceDate,
            checkInTime: attendanceRecords.checkInTime,
            checkOutTime: attendanceRecords.checkOutTime,
            workedHours: attendanceRecords.workedHours,
            status: attendanceRecords.status,
            isManuallyCorrected: attendanceRecords.isManuallyCorrected,
            correctedBy: attendanceRecords.correctedBy,
            correctionReason: attendanceRecords.correctionReason,
            notes: attendanceRecords.notes,
            createdAt: attendanceRecords.createdAt,
            updatedAt: attendanceRecords.updatedAt,
            employee: {
                id: employees.id,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                email: employees.email,
                profileImage: users.profileImage,
                workingScheduleId: employees.workingScheduleId,
            },
        })
        .from(attendanceRecords)
        .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .leftJoin(users, eq(employees.userId, users.id))
        .where(eq(attendanceRecords.id, id))
        .limit(1);

    if (!record) return null;

    const punches = await db
        .select()
        .from(attendancePunches)
        .where(eq(attendancePunches.attendanceRecordId, id))
        .orderBy(attendancePunches.checkInTime);

    const activePunch = punches.find((p) => p.checkOutTime === null) || null;

    return {
        ...record,
        isCurrentlyCheckedIn: Boolean(activePunch),
        activePunch,
        punches,
    };
}

/**
 * Find attendance record by employee and specific date
 * @param {string} employeeId
 * @param {string} date - 'YYYY-MM-DD'
 */
export async function findAttendanceByDate(employeeId, date) {
    const [record] = await db
        .select()
        .from(attendanceRecords)
        .where(
            and(
                eq(attendanceRecords.employeeId, employeeId),
                eq(attendanceRecords.attendanceDate, date),
            ),
        )
        .limit(1);

    if (!record) return null;

    const punches = await db
        .select()
        .from(attendancePunches)
        .where(eq(attendancePunches.attendanceRecordId, record.id))
        .orderBy(attendancePunches.checkInTime);

    const activePunch = punches.find((p) => p.checkOutTime === null) || null;

    return {
        ...record,
        isCurrentlyCheckedIn: Boolean(activePunch),
        activePunch,
        punches,
    };
}

/**
 * Find open attendance record for an employee today (checked in, not checked out)
 * @param {string} employeeId
 * @param {string} date - 'YYYY-MM-DD'
 */
export async function findOpenAttendance(employeeId, date) {
    const [record] = await db
        .select()
        .from(attendanceRecords)
        .where(
            and(
                eq(attendanceRecords.employeeId, employeeId),
                eq(attendanceRecords.attendanceDate, date),
                sql`${attendanceRecords.checkOutTime} IS NULL`,
            ),
        )
        .limit(1);

    return record || null;
}

/**
 * Find active punch (checkOutTime IS NULL) for an attendance record
 * @param {string} attendanceRecordId
 */
export async function findActivePunch(attendanceRecordId) {
    const [punch] = await db
        .select()
        .from(attendancePunches)
        .where(
            and(
                eq(attendancePunches.attendanceRecordId, attendanceRecordId),
                sql`${attendancePunches.checkOutTime} IS NULL`,
            ),
        )
        .limit(1);

    return punch || null;
}

/**
 * Get all punches for an attendance record ordered by checkInTime ASC
 * @param {string} attendanceRecordId
 */
export async function findPunchesByRecordId(attendanceRecordId) {
    return db
        .select()
        .from(attendancePunches)
        .where(eq(attendancePunches.attendanceRecordId, attendanceRecordId))
        .orderBy(attendancePunches.checkInTime);
}

/**
 * Create a new punch in attendance_punches
 * @param {object} param0
 */
export async function createPunch({ attendanceRecordId, checkInTime, notes }) {
    const [punch] = await db
        .insert(attendancePunches)
        .values({
            attendanceRecordId,
            checkInTime: checkInTime ?? new Date(),
            notes: notes ?? null,
        })
        .returning();

    return punch;
}

/**
 * Update an existing punch in attendance_punches
 * @param {string} punchId
 * @param {object} param1
 */
export async function updatePunch(punchId, { checkOutTime, workedHours, notes }) {
    const updates = {
        checkOutTime: checkOutTime ?? new Date(),
        workedHours: workedHours !== undefined ? String(workedHours) : undefined,
        updatedAt: new Date(),
    };

    if (notes !== undefined) {
        updates.notes = notes;
    }

    const [punch] = await db
        .update(attendancePunches)
        .set(updates)
        .where(eq(attendancePunches.id, punchId))
        .returning();

    return punch || null;
}

/**
 * Delete a punch from attendance_punches
 * @param {string} punchId
 */
export async function deletePunch(punchId) {
    const [deleted] = await db
        .delete(attendancePunches)
        .where(eq(attendancePunches.id, punchId))
        .returning();

    return deleted || null;
}

/**
 * Create a new check-in attendance record
 * @param {object} data
 */
export async function createCheckIn(data) {
    const [record] = await db
        .insert(attendanceRecords)
        .values({
            employeeId: data.employeeId,
            attendanceDate: data.attendanceDate,
            checkInTime: data.checkInTime ?? new Date(),
            status: data.status ?? 'PRESENT',
            notes: data.notes ?? null,
        })
        .returning();

    return record;
}

/**
 * Update check-out information on attendance record
 * @param {string} id
 * @param {object} data
 */
export async function updateCheckOut(id, { checkOutTime, workedHours, status, notes }) {
    const updates = {
        checkOutTime: checkOutTime ?? new Date(),
        workedHours: workedHours !== undefined ? String(workedHours) : undefined,
        status: status ?? undefined,
        updatedAt: new Date(),
    };

    if (notes !== undefined) {
        updates.notes = notes;
    }

    const [record] = await db
        .update(attendanceRecords)
        .set(updates)
        .where(eq(attendanceRecords.id, id))
        .returning();

    return record || null;
}

/**
 * Update attendance record fields (generic helper)
 * @param {string} id
 * @param {object} updates
 */
export async function updateAttendanceRecord(id, updates) {
    const [record] = await db
        .update(attendanceRecords)
        .set({
            ...updates,
            updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, id))
        .returning();

    return record || null;
}

/**
 * Manual correction by HR
 * @param {string} id
 * @param {object} correctionData
 */
export async function manualCorrect(id, correctionData) {
    const updates = {
        ...correctionData,
        isManuallyCorrected: true,
        updatedAt: new Date(),
    };

    if (correctionData.workedHours !== undefined) {
        updates.workedHours = String(correctionData.workedHours);
    }

    const [record] = await db
        .update(attendanceRecords)
        .set(updates)
        .where(eq(attendanceRecords.id, id))
        .returning();

    return record || null;
}

/**
 * Delete an attendance record (cascades to child attendance_punches)
 * @param {string} id
 */
export async function deleteAttendance(id) {
    const [deleted] = await db
        .delete(attendanceRecords)
        .where(eq(attendanceRecords.id, id))
        .returning();

    return deleted || null;
}

/**
 * Export for Dev 3 (Payroll Engine) and Dev 4 (Dashboard):
 * Get all attendance records for an employee within a period
 * @param {string} employeeId
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd - 'YYYY-MM-DD'
 */
export async function getAttendanceForPeriod(employeeId, periodStart, periodEnd) {
    return db
        .select()
        .from(attendanceRecords)
        .where(
            and(
                eq(attendanceRecords.employeeId, employeeId),
                gte(attendanceRecords.attendanceDate, periodStart),
                lte(attendanceRecords.attendanceDate, periodEnd),
            ),
        )
        .orderBy(attendanceRecords.attendanceDate);
}

/**
 * Export for Dev 4 (Dashboard summary metrics)
 * @param {object} [filter={}]
 */
export async function getSummaryStats({ dateFrom, dateTo, employeeId, excludeHr = false } = {}) {
    const conditions = [];
    if (employeeId) conditions.push(eq(attendanceRecords.employeeId, employeeId));
    if (dateFrom) conditions.push(gte(attendanceRecords.attendanceDate, dateFrom));
    if (dateTo) conditions.push(lte(attendanceRecords.attendanceDate, dateTo));
    if (excludeHr) conditions.push(eq(users.role, 'EMPLOYEE'));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Status breakdown grouped by status
    const statsQuery = db
        .select({
            status: attendanceRecords.status,
            count: count(),
            totalWorkedHours: sql`COALESCE(SUM(CAST(${attendanceRecords.workedHours} AS NUMERIC)), 0)`,
        })
        .from(attendanceRecords);

    if (excludeHr) {
        statsQuery
            .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
            .leftJoin(users, eq(employees.userId, users.id));
    }

    const stats = await statsQuery.where(whereClause).groupBy(attendanceRecords.status);

    const missingCheckoutConditions = [
        sql`${attendanceRecords.checkOutTime} IS NULL`,
        sql`${attendanceRecords.checkInTime} IS NOT NULL`,
    ];
    if (excludeHr) {
        missingCheckoutConditions.push(eq(users.role, 'EMPLOYEE'));
    }

    const missingCheckoutQuery = db.select({ count: count() }).from(attendanceRecords);

    if (excludeHr) {
        missingCheckoutQuery
            .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
            .leftJoin(users, eq(employees.userId, users.id));
    }

    const [missingCheckoutRow] = await missingCheckoutQuery.where(
        and(...missingCheckoutConditions),
    );

    const missingCheckoutCount = Number(missingCheckoutRow?.count ?? 0);

    return { stats, missingCheckoutCount };
}

/**
 * Find all open (un-checked-out) punch sessions from past dates (before the given date string).
 * Used by the stale checkout resolver to auto-close forgotten punches.
 * @param {string} beforeDate - 'YYYY-MM-DD' — only dates strictly before this are fetched
 * @returns {Array} rows with punch + parent attendanceRecord + employee info
 */
export async function findAllOpenPunchesBeforeDate(beforeDate) {
    // Join attendance_punches → attendance_records → employees → users
    const rows = await db
        .select({
            punch: {
                id: attendancePunches.id,
                attendanceRecordId: attendancePunches.attendanceRecordId,
                checkInTime: attendancePunches.checkInTime,
                checkOutTime: attendancePunches.checkOutTime,
                workedHours: attendancePunches.workedHours,
                notes: attendancePunches.notes,
            },
            record: {
                id: attendanceRecords.id,
                employeeId: attendanceRecords.employeeId,
                attendanceDate: attendanceRecords.attendanceDate,
                checkInTime: attendanceRecords.checkInTime,
                checkOutTime: attendanceRecords.checkOutTime,
                workedHours: attendanceRecords.workedHours,
                status: attendanceRecords.status,
                notes: attendanceRecords.notes,
            },
            employee: {
                id: employees.id,
                firstName: employees.firstName,
                lastName: employees.lastName,
                employeeCode: employees.employeeCode,
                workingScheduleId: employees.workingScheduleId,
            },
        })
        .from(attendancePunches)
        .innerJoin(
            attendanceRecords,
            eq(attendancePunches.attendanceRecordId, attendanceRecords.id),
        )
        .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .leftJoin(users, eq(employees.userId, users.id))
        .where(
            and(
                sql`${attendancePunches.checkOutTime} IS NULL`,
                sql`${attendanceRecords.attendanceDate} < ${beforeDate}`,
            ),
        )
        .orderBy(attendanceRecords.attendanceDate, attendancePunches.checkInTime);

    return rows;
}
