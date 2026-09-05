import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    time,
    smallint,
    index,
    uniqueIndex,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * working_schedules
 *
 * Master table defining a recurring weekly work pattern.
 * Assigned to employees (and optionally overridden by contracts).
 *
 * Two-table design:
 *   working_schedules  → header (name, timezone, active flag)
 *   schedule_lines     → per-day-of-week slots (start_time, end_time, break_minutes)
 *
 * Why this split?
 *   - A schedule might have different hours on different days (Mon-Thu 9-6, Fri 9-5).
 *   - Weekly hours are CALCULATED from lines, not manually entered (PS requirement).
 *   - Easy to add/remove specific day slots without touching the header.
 *
 * TIME type (not TIMESTAMPTZ) for start_time / end_time:
 *   These represent recurring daily slots ("09:00 every Monday"), not calendar moments.
 *   Using TIMESTAMPTZ would require anchoring to a specific date, which is wrong here.
 */
export const workingSchedules = pgTable(
    'working_schedules',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        name: text('name').notNull(),
        description: text('description'),

        // IANA timezone identifier (e.g. 'Asia/Kolkata', 'UTC').
        // Used when computing actual check-in/out times against schedule slots.
        timezone: text('timezone').default('Asia/Kolkata').notNull(),

        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        nameIdx: index('working_schedules_name_idx').on(table.name),
        isActiveIdx: index('working_schedules_is_active_idx').on(table.isActive),
    }),
);

/**
 * schedule_lines
 *
 * Individual day-of-week time slots within a working schedule.
 *
 * Constraints:
 *   - UNIQUE(schedule_id, day_of_week) — one slot per day per schedule.
 *   - CHECK(day_of_week BETWEEN 0 AND 6) — 0=Sunday … 6=Saturday (ISO-compatible).
 *   - CHECK(start_time < end_time) — start must precede end (no overnight shifts in MVP).
 *   - CHECK(break_minutes >= 0) — cannot have negative break time.
 *
 * Weekly hours calculation (done in service layer):
 *   SUM((end_time - start_time - break_minutes) FOR each active schedule_line)
 */
export const scheduleLines = pgTable(
    'schedule_lines',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // CASCADE: deleting a schedule removes all its day slots cleanly.
        scheduleId: uuid('schedule_id')
            .references(() => workingSchedules.id, { onDelete: 'cascade' })
            .notNull(),

        // 0 = Sunday, 1 = Monday, … 6 = Saturday (matches JS Date.getDay()).
        dayOfWeek: smallint('day_of_week').notNull(),

        // TIME type — recurring daily slots, not anchored to a calendar date.
        startTime: time('start_time').notNull(),
        endTime: time('end_time').notNull(),

        // Break duration in minutes (e.g. 60 for 1-hour lunch).
        breakMinutes: smallint('break_minutes').default(0).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // One slot per day per schedule.
        schedDayUniqueIdx: uniqueIndex('schedule_lines_sched_day_idx').on(
            table.scheduleId,
            table.dayOfWeek,
        ),

        scheduleIdIdx: index('schedule_lines_schedule_id_idx').on(table.scheduleId),

        // DB-level CHECK constraints (enforce business rules at storage layer).
        dayOfWeekCheck: check('chk_day_of_week_range', sql`${table.dayOfWeek} BETWEEN 0 AND 6`),
        timeOrderCheck: check(
            'chk_schedule_time_order',
            sql`${table.startTime} < ${table.endTime}`,
        ),
        breakMinutesCheck: check('chk_break_minutes_non_negative', sql`${table.breakMinutes} >= 0`),
    }),
);
