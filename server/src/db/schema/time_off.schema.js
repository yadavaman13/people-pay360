import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    date,
    numeric,
    integer,
    index,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { employees } from './employees.schema.js';
import { users } from './users.schema.js';
import { allocationStatusEnum, requestStatusEnum } from './enums.schema.js';

/**
 * time_off_types
 *
 * Policy master for leave categories (e.g., Annual Leave, Sick Leave, Unpaid Leave).
 * Controls whether an employee requires an approved allocation before requesting,
 * whether approval is required, whether it affects payroll (paid vs unpaid),
 * and any per-request limit.
 */
export const timeOffTypes = pgTable(
    'time_off_types',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // Display name of leave type (e.g. 'Paid Time Off', 'Sick Leave')
        name: text('name').notNull(),

        // Unique uppercase code for reports and payroll rule formulas (e.g. 'ANNUAL', 'SICK', 'UNPAID')
        code: text('code').unique().notNull(),

        // When true, employee must have an approved allocation balance before requesting
        allocationRequired: boolean('allocation_required').default(true).notNull(),

        // When true, requests must be approved by HR / manager
        requestApprovalRequired: boolean('request_approval_required').default(true).notNull(),

        // Paid vs Unpaid: unpaid leaves trigger salary deductions in payroll engine
        paidTimeOff: boolean('paid_time_off').default(true).notNull(),

        // Optional cap on consecutive days allowed per single request (null = unlimited)
        maxDaysPerRequest: integer('max_days_per_request'),

        // Soft-delete flag
        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        nameIdx: index('time_off_types_name_idx').on(table.name),
        codeIdx: index('time_off_types_code_idx').on(table.code),
        isActiveIdx: index('time_off_types_is_active_idx').on(table.isActive),
    }),
);

/**
 * time_off_allocations
 *
 * Grants a balance budget of leave days to an employee for a specific leave type.
 * Must be approved by HR before it can be consumed by requests.
 *
 * Atomic transaction rule:
 *   Request approval increments used_days and verifies used_days <= total_days.
 */
export const timeOffAllocations = pgTable(
    'time_off_allocations',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // RESTRICT: cannot delete an employee with allocation history
        employeeId: uuid('employee_id')
            .references(() => employees.id, { onDelete: 'restrict' })
            .notNull(),

        // RESTRICT: cannot delete a leave type with active allocations
        typeId: uuid('type_id')
            .references(() => timeOffTypes.id, { onDelete: 'restrict' })
            .notNull(),

        // Total allocated days granted (numeric supports half-days e.g. 14.5)
        totalDays: numeric('total_days', { precision: 6, scale: 2 }).notNull(),

        // Days consumed by approved requests (starts at 0.00)
        usedDays: numeric('used_days', { precision: 6, scale: 2 }).default('0.00').notNull(),

        // Validity window for this allocation
        validityStart: date('validity_start').notNull(),
        validityEnd: date('validity_end'), // nullable = open-ended

        // Lifecycle: PENDING → APPROVED | REFUSED
        status: allocationStatusEnum('status').default('PENDING').notNull(),

        // HR user who approved/refused this allocation
        approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
        approvedAt: timestamp('approved_at', { withTimezone: true }),

        notes: text('notes'),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        empTypeStatusIdx: index('time_off_allocations_emp_type_status_idx').on(
            table.employeeId,
            table.typeId,
            table.status,
        ),
        empIdIdx: index('time_off_allocations_employee_id_idx').on(table.employeeId),
        typeIdIdx: index('time_off_allocations_type_id_idx').on(table.typeId),
        statusIdx: index('time_off_allocations_status_idx').on(table.status),
        validityIdx: index('time_off_allocations_validity_idx').on(
            table.validityStart,
            table.validityEnd,
        ),

        // CHECK constraints
        totalDaysCheck: check(
            'chk_allocations_total_days_non_negative',
            sql`${table.totalDays} >= 0`,
        ),
        usedDaysCheck: check('chk_allocations_used_days_non_negative', sql`${table.usedDays} >= 0`),
        usedLteTotalCheck: check(
            'chk_allocations_used_lte_total',
            sql`${table.usedDays} <= ${table.totalDays}`,
        ),
        validityOrderCheck: check(
            'chk_allocations_validity_order',
            sql`${table.validityEnd} IS NULL OR ${table.validityStart} <= ${table.validityEnd}`,
        ),
    }),
);

/**
 * time_off_requests
 *
 * Leave requests submitted by employees (or HR on their behalf).
 * When approved, decrements the allocation's remaining balance atomically.
 */
export const timeOffRequests = pgTable(
    'time_off_requests',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // RESTRICT: cannot delete an employee with leave requests
        employeeId: uuid('employee_id')
            .references(() => employees.id, { onDelete: 'restrict' })
            .notNull(),

        // RESTRICT: cannot delete a leave type referenced in requests
        typeId: uuid('type_id')
            .references(() => timeOffTypes.id, { onDelete: 'restrict' })
            .notNull(),

        // Matched allocation from which balance is deducted (nullable if no allocation required)
        allocationId: uuid('allocation_id').references(() => timeOffAllocations.id, {
            onDelete: 'set null',
        }),

        startDate: date('start_date').notNull(),
        endDate: date('end_date').notNull(),

        // Duration in days (e.g. 1.0, 0.5 for half day)
        numberOfDays: numeric('number_of_days', { precision: 6, scale: 2 }).notNull(),

        reason: text('reason'),

        // Lifecycle: PENDING → APPROVED | REFUSED
        status: requestStatusEnum('status').default('PENDING').notNull(),

        reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
        reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
        reviewNotes: text('review_notes'),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        empStatusIdx: index('time_off_requests_emp_status_idx').on(table.employeeId, table.status),
        empIdIdx: index('time_off_requests_employee_id_idx').on(table.employeeId),
        typeIdIdx: index('time_off_requests_type_id_idx').on(table.typeId),
        allocationIdIdx: index('time_off_requests_allocation_id_idx').on(table.allocationId),
        datesIdx: index('time_off_requests_dates_idx').on(table.startDate, table.endDate),
        statusIdx: index('time_off_requests_status_idx').on(table.status),

        // CHECK constraints
        dateOrderCheck: check(
            'chk_time_off_requests_date_order',
            sql`${table.startDate} <= ${table.endDate}`,
        ),
        daysPositiveCheck: check(
            'chk_time_off_requests_days_positive',
            sql`${table.numberOfDays} > 0`,
        ),
    }),
);
