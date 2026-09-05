import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    date,
    numeric,
    index,
    uniqueIndex,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { employees } from './employees.schema.js';
import { users } from './users.schema.js';
import { attendanceStatusEnum } from './enums.schema.js';

/**
 * attendance_records
 *
 * Tracks actual work events (check-in / check-out) per employee per calendar day.
 *
 * Key design decisions:
 *
 * 1. attendance_date is DATE (not TIMESTAMPTZ):
 *    Represents the calendar day of work. The actual moments of arrival/departure
 *    are captured by check_in_time / check_out_time (both TIMESTAMPTZ).
 *
 * 2. UNIQUE(employee_id, attendance_date):
 *    Enforces one attendance record per employee per day at DB level.
 *    This prevents double check-ins and is the correct collision prevention
 *    strategy for standard single-shift operation (MVP).
 *
 *    Future multi-shift: Replace with EXCLUDE USING gist on tstzrange(check_in, check_out).
 *
 * 3. CHECK(check_out_time IS NULL OR check_in_time < check_out_time):
 *    Enforces row-level time integrity (cannot check out before checking in).
 *    check_out_time is nullable — represents an "open" shift (employee hasn't left yet
 *    or forgot to check out — triggers MISSING_CHECKOUT warning on dashboard).
 *
 * 4. worked_hours as numeric(5,2) — computed and stored by service on checkout.
 *    Formula: (check_out_time - check_in_time) in hours, minus break time.
 *    Not a generated column — avoids Drizzle version compatibility constraints
 *    and allows manual correction by HR (is_manually_corrected = TRUE).
 *
 * 5. Manual correction audit trail:
 *    is_manually_corrected + corrected_by + correction_reason allow HR to
 *    fix missing/wrong check-ins without losing the audit trace.
 */
export const attendanceRecords = pgTable(
    'attendance_records',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // RESTRICT: cannot delete an employee with attendance history.
        employeeId: uuid('employee_id')
            .references(() => employees.id, { onDelete: 'restrict' })
            .notNull(),

        // Calendar date of this attendance record.
        // DATE — timezone-independent business date.
        attendanceDate: date('attendance_date').notNull(),

        // Actual moments of arrival and departure (TIMESTAMPTZ — real events).
        checkInTime: timestamp('check_in_time', { withTimezone: true }),
        checkOutTime: timestamp('check_out_time', { withTimezone: true }),

        // Computed by service on checkout: (check_out - check_in) hours - break.
        // numeric(5,2) supports up to 999.99 hours (no practical overflow).
        workedHours: numeric('worked_hours', { precision: 5, scale: 2 }),

        // Derived status — set by service based on schedule comparison:
        //   PRESENT, LATE, ABSENT, HALF_DAY, MANUAL_CORRECTION
        status: attendanceStatusEnum('status').default('ABSENT').notNull(),

        // Manual correction audit trail.
        isManuallyCorrected: boolean('is_manually_corrected').default(false).notNull(),
        correctedBy: uuid('corrected_by').references(() => users.id, {
            onDelete: 'set null',
        }),
        correctionReason: text('correction_reason'),

        notes: text('notes'),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // ── COLLISION PREVENTION ────────────────────────────────────────────────
        // ONE attendance record per employee per calendar day.
        // DB-level uniqueness — no app-level race condition possible.
        empDateUniqueIdx: uniqueIndex('attendance_emp_date_unique_idx').on(
            table.employeeId,
            table.attendanceDate,
        ),

        // ── LOOKUP INDEXES ──────────────────────────────────────────────────────
        // Payroll period query: "get all attendance for employee in Sep 2026"
        empDateIdx: index('attendance_emp_date_idx').on(table.employeeId, table.attendanceDate),

        // Dashboard: "show today's attendance across all employees"
        dateIdx: index('attendance_date_idx').on(table.attendanceDate),

        // Dashboard: filter by status (LATE, ABSENT, etc.)
        statusIdx: index('attendance_status_idx').on(table.status),

        // ── CHECK CONSTRAINTS ────────────────────────────────────────────────────
        // Cannot check out before checking in.
        // Nullable check_out = open shift (employee still at work / forgot checkout).
        timeOrderCheck: check(
            'chk_attendance_time_order',
            sql`${table.checkOutTime} IS NULL OR ${table.checkInTime} < ${table.checkOutTime}`,
        ),

        // worked_hours cannot be negative.
        workedHoursCheck: check(
            'chk_attendance_worked_hours_non_negative',
            sql`${table.workedHours} IS NULL OR ${table.workedHours} >= 0`,
        ),
    }),
);

/**
 * attendance_punches
 *
 * Tracks individual check-in / check-out intervals (punches) per daily attendance record.
 * Enables multiple check-ins and check-outs on the same calendar day (split shifts, lunch, errands).
 *
 * Key constraints:
 * 1. CASCADE on delete: deleting the parent attendance_record cleans up all child punches.
 * 2. Partial unique index: at most ONE open punch (check_out_time IS NULL) per attendance record.
 * 3. check_out_time IS NULL OR check_in_time < check_out_time.
 */
export const attendancePunches = pgTable(
    'attendance_punches',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        attendanceRecordId: uuid('attendance_record_id')
            .references(() => attendanceRecords.id, { onDelete: 'cascade' })
            .notNull(),

        checkInTime: timestamp('check_in_time', { withTimezone: true }).notNull(),
        checkOutTime: timestamp('check_out_time', { withTimezone: true }),

        // Computed for this specific session: (check_out - check_in) in hours
        workedHours: numeric('worked_hours', { precision: 5, scale: 2 }),

        notes: text('notes'),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        recordIdx: index('attendance_punches_record_idx').on(table.attendanceRecordId),

        // Guarantees at most ONE open session per attendance record at any time
        activePunchUniqueIdx: uniqueIndex('attendance_punches_active_unique_idx')
            .on(table.attendanceRecordId)
            .where(sql`${table.checkOutTime} IS NULL`),

        timeOrderCheck: check(
            'chk_punch_time_order',
            sql`${table.checkOutTime} IS NULL OR ${table.checkInTime} < ${table.checkOutTime}`,
        ),

        workedHoursCheck: check(
            'chk_punch_worked_hours_non_negative',
            sql`${table.workedHours} IS NULL OR ${table.workedHours} >= 0`,
        ),
    }),
);
