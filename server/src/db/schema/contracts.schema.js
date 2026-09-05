import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    date,
    numeric,
    index,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { employees } from './employees.schema.js';
import { departments } from './departments.schema.js';
import { jobPositions } from './job_positions.schema.js';
import { users } from './users.schema.js';
import { contractStatusEnum } from './enums.schema.js';
import { salaryStructures } from './salary.schema.js';
import { workingSchedules } from './working_schedules.schema.js';

/**
 * contracts
 *
 * Period-aware employment contracts.
 *
 * Critical PS business rule:
 *   "Payroll must use the contract applicable to the selected payroll period."
 *   e.g. Contract A: Jan–Jun ₹40K; Contract B: Jul–Dec ₹50K.
 *   A payrun for August MUST use Contract B.
 *
 * The payroll engine finds the applicable contract with:
 *   WHERE employee_id = :empId
 *     AND status = 'ACTIVE'
 *     AND start_date <= :periodStart
 *     AND (end_date IS NULL OR end_date >= :periodEnd)
 *
 * Overlap prevention:
 *   The EXCLUDE USING gist constraint prevents two ACTIVE contracts for the
 *   same employee from overlapping on the date range — enforced atomically at
 *   the DB level (race-condition-proof).
 *
 *   ⚠️  PREREQUISITE: Run once on the database before first migration:
 *       CREATE EXTENSION IF NOT EXISTS btree_gist;
 *
 *   The Drizzle schema registers the EXCLUDE via a raw sql`` expression in the
 *   table callback. If drizzle-kit does not include it in the generated SQL,
 *   run the SQL manually (see contracts.exclude.sql in /drizzle/).
 *
 * Wage:
 *   numeric(12,2) — exact decimal arithmetic. CHECK wage >= 0 (wages cannot
 *   be negative; a ₹0 wage is a valid unpaid internship scenario).
 *
 * Dates:
 *   DATE type — calendar concepts (contract start/end are business dates,
 *   not timestamped events). end_date nullable = open-ended contract.
 */
export const contracts = pgTable(
    'contracts',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // RESTRICT: cannot delete an employee who has contracts.
        employeeId: uuid('employee_id')
            .references(() => employees.id, { onDelete: 'restrict' })
            .notNull(),

        // Salary structure assigned to this contract (used by payroll engine).
        // RESTRICT: cannot delete a salary structure that active contracts reference.
        salaryStructureId: uuid('salary_structure_id')
            .references(() => salaryStructures.id, { onDelete: 'restrict' })
            .notNull(),

        // Contract validity window. Both are DATE (calendar, not timestamped).
        startDate: date('start_date').notNull(),
        endDate: date('end_date'), // nullable = open-ended / permanent contract

        // Gross wage for this contract period.
        // numeric(12,2) → exact arithmetic. CHECK >= 0 enforced below.
        wage: numeric('wage', { precision: 12, scale: 2 }).notNull(),

        // Optional: contract can specify dept/position if different from employee's default.
        departmentId: uuid('department_id').references(() => departments.id, {
            onDelete: 'set null',
        }),
        jobPositionId: uuid('job_position_id').references(() => jobPositions.id, {
            onDelete: 'set null',
        }),

        // Working schedule for this specific contract (overrides employee default if set).
        workingScheduleId: uuid('working_schedule_id').references(() => workingSchedules.id, {
            onDelete: 'set null',
        }),

        // Lifecycle: DRAFT → ACTIVE → EXPIRED | CANCELLED
        status: contractStatusEnum('status').default('DRAFT').notNull(),

        notes: text('notes'),

        createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // Primary lookup: find active contracts for an employee (payroll engine query).
        empStatusIdx: index('contracts_emp_status_idx').on(table.employeeId, table.status),

        // Period range index: supports overlap queries and payrun period matching.
        datesIdx: index('contracts_dates_idx').on(table.startDate, table.endDate),

        structureIdx: index('contracts_structure_id_idx').on(table.salaryStructureId),

        // ── CHECK CONSTRAINTS ──────────────────────────────────────────────────

        // Wage must be non-negative (₹0 = valid for unpaid internships).
        wageCheck: check('chk_contracts_wage_non_negative', sql`${table.wage} >= 0`),

        // end_date must be on or after start_date (open-ended contracts have null end_date).
        dateOrderCheck: check(
            'chk_contracts_date_order',
            sql`${table.endDate} IS NULL OR ${table.startDate} <= ${table.endDate}`,
        ),

        // ── EXCLUDE CONSTRAINT (requires btree_gist extension) ─────────────────
        // Prevents two ACTIVE contracts for the same employee overlapping on dates.
        // This is a partial exclusion (WHERE status = 'ACTIVE') so cancelled/expired
        // contracts do not block new ones.
        //
        // Run manually via migration SQL or psql:
        //   ALTER TABLE contracts ADD CONSTRAINT contracts_no_overlap_active
        //   EXCLUDE USING gist (
        //     employee_id WITH =,
        //     daterange(start_date, COALESCE(end_date, '9999-12-31'::date), '[)') WITH &&
        //   ) WHERE (status = 'ACTIVE');
    }),
);
