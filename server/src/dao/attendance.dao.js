import { db } from '../config/database.config.js';
import { attendanceRecords } from '../db/schema/attendance.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';

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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (Math.max(1, page) - 1) * limit;

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
                },
            })
            .from(attendanceRecords)
            .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
            .where(whereClause)
            .orderBy(desc(attendanceRecords.attendanceDate), desc(attendanceRecords.checkInTime))
            .limit(limit)
            .offset(offset),

        db.select({ totalCount: count() }).from(attendanceRecords).where(whereClause),
    ]);

    return {
        records,
        total: Number(totalCount),
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(Number(totalCount) / limit),
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
                workingScheduleId: employees.workingScheduleId,
            },
        })
        .from(attendanceRecords)
        .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(eq(attendanceRecords.id, id))
        .limit(1);

    return record || null;
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

    return record || null;
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
 * Delete an attendance record
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
export async function getSummaryStats({ dateFrom, dateTo, employeeId } = {}) {
    const conditions = [];
    if (employeeId) conditions.push(eq(attendanceRecords.employeeId, employeeId));
    if (dateFrom) conditions.push(gte(attendanceRecords.attendanceDate, dateFrom));
    if (dateTo) conditions.push(lte(attendanceRecords.attendanceDate, dateTo));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const stats = await db
        .select({
            status: attendanceRecords.status,
            count: count(),
            totalWorkedHours: sql`COALESCE(SUM(CAST(${attendanceRecords.workedHours} AS NUMERIC)), 0)`,
        })
        .from(attendanceRecords)
        .where(whereClause)
        .groupBy(attendanceRecords.status);

    return stats;
}
