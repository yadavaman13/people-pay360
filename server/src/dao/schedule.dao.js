import { db } from '../config/database.config.js';
import { workingSchedules, scheduleLines } from '../db/schema/working_schedules.schema.js';
import { eq, and, asc } from 'drizzle-orm';
import { checkScheduleInEmployees } from './employee.dao.js';
import { checkScheduleInContracts } from './contract.dao.js';

/**
 * Helper to convert 'HH:mm' or 'HH:mm:ss' to total minutes from midnight
 * @param {string} timeStr
 * @returns {number}
 */
export function timeStringToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Compute weekly hours dynamically from an array of schedule lines
 * @param {Array<{startTime: string, endTime: string, breakMinutes: number}>} lines
 * @returns {number}
 */
export function computeWeeklyHoursFromLines(lines = []) {
    const totalMinutes = lines.reduce((acc, line) => {
        const start = timeStringToMinutes(line.startTime);
        const end = timeStringToMinutes(line.endTime);
        const duration = end - start;
        const breakMins = Number(line.breakMinutes || 0);
        const workedMinutes = Math.max(0, duration - breakMins);
        return acc + workedMinutes;
    }, 0);

    return Number((totalMinutes / 60).toFixed(2));
}

/**
 * Find all working schedules
 * @param {object} [filters={}]
 * @param {boolean} [filters.isActive]
 */
export async function findAllSchedules({ isActive } = {}) {
    const conditions = [];
    if (isActive !== undefined) {
        conditions.push(eq(workingSchedules.isActive, isActive));
    }

    const query = db.select().from(workingSchedules);
    if (conditions.length > 0) {
        query.where(and(...conditions));
    }

    return query.orderBy(workingSchedules.name);
}

/**
 * Find schedule by ID
 * @param {string} id
 */
export async function findScheduleById(id) {
    const [schedule] = await db
        .select()
        .from(workingSchedules)
        .where(eq(workingSchedules.id, id))
        .limit(1);
    return schedule || null;
}

/**
 * Find schedule by exact name
 * @param {string} name
 */
export async function findScheduleByName(name) {
    const [schedule] = await db
        .select()
        .from(workingSchedules)
        .where(eq(workingSchedules.name, name))
        .limit(1);
    return schedule || null;
}

/**
 * Find lines belonging to a schedule, ordered by day of week
 * @param {string} scheduleId
 */
export async function findLinesByScheduleId(scheduleId) {
    return db
        .select()
        .from(scheduleLines)
        .where(eq(scheduleLines.scheduleId, scheduleId))
        .orderBy(asc(scheduleLines.dayOfWeek));
}

/**
 * Find schedule with all its lines and calculated weekly hours
 * @param {string} id
 */
export async function findScheduleWithLines(id) {
    const schedule = await findScheduleById(id);
    if (!schedule) return null;

    const lines = await findLinesByScheduleId(id);
    const weeklyHours = computeWeeklyHoursFromLines(lines);

    return {
        ...schedule,
        lines,
        weeklyHours,
    };
}

/**
 * Create a new working schedule header
 * @param {object} data
 */
export async function createSchedule(data) {
    const [schedule] = await db
        .insert(workingSchedules)
        .values({
            name: data.name,
            description: data.description ?? null,
            timezone: data.timezone ?? 'Asia/Kolkata',
            isActive: data.isActive ?? true,
        })
        .returning();
    return schedule;
}

/**
 * Update schedule header fields
 * @param {string} id
 * @param {object} updates
 */
export async function updateSchedule(id, updates) {
    const [schedule] = await db
        .update(workingSchedules)
        .set({
            ...updates,
            updatedAt: new Date(),
        })
        .where(eq(workingSchedules.id, id))
        .returning();
    return schedule || null;
}

/**
 * Soft delete a schedule
 * @param {string} id
 */
export async function softDeleteSchedule(id) {
    const [schedule] = await db
        .update(workingSchedules)
        .set({
            isActive: false,
            updatedAt: new Date(),
        })
        .where(eq(workingSchedules.id, id))
        .returning();
    return schedule || null;
}

/**
 * Replace all lines for a schedule within an atomic transaction
 * @param {string} scheduleId
 * @param {Array<{dayOfWeek: number, startTime: string, endTime: string, breakMinutes?: number}>} lines
 */
export async function replaceScheduleLines(scheduleId, lines = []) {
    return db.transaction(async (tx) => {
        await tx.delete(scheduleLines).where(eq(scheduleLines.scheduleId, scheduleId));

        if (lines.length === 0) {
            return [];
        }

        const insertedLines = await tx
            .insert(scheduleLines)
            .values(
                lines.map((line) => ({
                    scheduleId,
                    dayOfWeek: Number(line.dayOfWeek),
                    startTime: line.startTime,
                    endTime: line.endTime,
                    breakMinutes: Number(line.breakMinutes || 0),
                })),
            )
            .returning();

        return insertedLines.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
}

/**
 * Calculate weekly hours for a schedule
 * @param {string} scheduleId
 * @returns {Promise<number>}
 */
export async function calculateWeeklyHours(scheduleId) {
    const lines = await findLinesByScheduleId(scheduleId);
    return computeWeeklyHoursFromLines(lines);
}

/**
 * Check if a schedule is referenced by active employees or active contracts
 * @param {string} scheduleId
 * @returns {Promise<boolean>}
 */
export async function checkScheduleInUse(scheduleId) {
    const inEmployees = await checkScheduleInEmployees(scheduleId);
    if (inEmployees) return true;

    const inContracts = await checkScheduleInContracts(scheduleId);
    return inContracts;
}
