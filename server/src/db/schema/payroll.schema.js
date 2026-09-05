import {
    pgTable,
    uuid,
    text,
    timestamp,
    date,
    numeric,
    integer,
    index,
    uniqueIndex,
    check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.schema.js';
import { employees } from './employees.schema.js';
import { contracts } from './contracts.schema.js';
import { salaryStructures, salaryRules } from './salary.schema.js';
import {
    payrunStatusEnum,
    payslipStatusEnum,
    eligibilityStatusEnum,
    selectionStatusEnum,
    ruleCategoryEnum,
    computationTypeEnum,
} from './enums.schema.js';

/**
 * payruns
 *
 * Payroll batch execution header generated from the 2-step wizard.
 * Lifecycle: DRAFT → COMPUTING → COMPUTED → VALIDATED → PAID → ARCHIVED
 *
 * Denormalized aggregate fields (totalGross, totalDeductions, totalNet, totalEmployees)
 * are populated upon batch calculation completion and drive the live dashboard.
 */
export const payruns = pgTable(
    'payruns',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // e.g. 'September 2026 Regular Payroll'
        name: text('name').notNull(),

        // Salary structure template governing this batch execution
        structureId: uuid('structure_id')
            .references(() => salaryStructures.id, { onDelete: 'restrict' })
            .notNull(),

        // Payroll accounting period boundaries
        periodStart: date('period_start').notNull(),
        periodEnd: date('period_end').notNull(),

        // Date when disbursements are settled
        paymentDate: date('payment_date'),

        // Batch lifecycle status
        status: payrunStatusEnum('status').default('DRAFT').notNull(),

        // Aggregates for dashboard performance & reporting
        totalEmployees: integer('total_employees').default(0).notNull(),
        totalGross: numeric('total_gross', { precision: 14, scale: 2 }).default('0.00').notNull(),
        totalDeductions: numeric('total_deductions', { precision: 14, scale: 2 })
            .default('0.00')
            .notNull(),
        totalNet: numeric('total_net', { precision: 14, scale: 2 }).default('0.00').notNull(),

        // Lifecycle milestone audit timestamps
        computedAt: timestamp('computed_at', { withTimezone: true }),
        validatedAt: timestamp('validated_at', { withTimezone: true }),
        paidAt: timestamp('paid_at', { withTimezone: true }),

        // User attribution audit trails
        createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
        validatedBy: uuid('validated_by').references(() => users.id, { onDelete: 'set null' }),
        paidBy: uuid('paid_by').references(() => users.id, { onDelete: 'set null' }),

        notes: text('notes'),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        statusIdx: index('payruns_status_idx').on(table.status),
        periodIdx: index('payruns_period_idx').on(table.periodStart, table.periodEnd),
        structureIdIdx: index('payruns_structure_id_idx').on(table.structureId),
        createdByIdx: index('payruns_created_by_idx').on(table.createdBy),

        // CHECK constraints
        periodOrderCheck: check(
            'chk_payruns_period_order',
            sql`${table.periodStart} <= ${table.periodEnd}`,
        ),
        totalGrossCheck: check(
            'chk_payruns_total_gross_non_negative',
            sql`${table.totalGross} >= 0`,
        ),
        totalDeductionsCheck: check(
            'chk_payruns_total_deductions_non_negative',
            sql`${table.totalDeductions} >= 0`,
        ),
        totalNetCheck: check('chk_payruns_total_net_non_negative', sql`${table.totalNet} >= 0`),
    }),
);

/**
 * payrun_employees
 *
 * Step 2 Wizard Employee Selection Scope:
 * Captures the snapshot of eligible and explicitly selected employees for a payrun.
 */
export const payrunEmployees = pgTable(
    'payrun_employees',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // CASCADE: removing a payrun removes its employee selection roster
        payrunId: uuid('payrun_id')
            .references(() => payruns.id, { onDelete: 'cascade' })
            .notNull(),

        // RESTRICT: cannot delete an employee while referenced in payrun selections
        employeeId: uuid('employee_id')
            .references(() => employees.id, { onDelete: 'restrict' })
            .notNull(),

        // Applicable contract resolved for the employee at selection time
        contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),

        // Qualification state evaluated by payroll engine
        eligibilityStatus: eligibilityStatusEnum('eligibility_status')
            .default('ELIGIBLE')
            .notNull(),

        // Explicit user inclusion/exclusion toggle
        selectionStatus: selectionStatusEnum('selection_status').default('SELECTED').notNull(),

        // Warning notes (e.g. 'Missing active primary bank account', 'Contract expiring')
        notes: text('notes'),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // Prevent duplicate employee entries within the same payrun
        payrunEmpUniqueIdx: uniqueIndex('payrun_employees_unique_idx').on(
            table.payrunId,
            table.employeeId,
        ),
        payrunIdIdx: index('payrun_employees_payrun_id_idx').on(table.payrunId),
        empIdIdx: index('payrun_employees_employee_id_idx').on(table.employeeId),
        contractIdIdx: index('payrun_employees_contract_id_idx').on(table.contractId),
    }),
);

/**
 * payslips
 *
 * Per-employee financial output record for a specific payrun.
 * Lifecycle: DRAFT → COMPUTED → VALIDATED → PAID → SENT
 *
 * Recompute is permitted in DRAFT and COMPUTED states.
 * Once VALIDATED, PAID, or SENT, the payslip is locked and immutable.
 */
export const payslips = pgTable(
    'payslips',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // RESTRICT: cannot delete payrun with computed historical payslips
        payrunId: uuid('payrun_id')
            .references(() => payruns.id, { onDelete: 'restrict' })
            .notNull(),

        // RESTRICT: cannot delete employee with historical payslips
        employeeId: uuid('employee_id')
            .references(() => employees.id, { onDelete: 'restrict' })
            .notNull(),

        // Period-applicable contract snapshot
        contractId: uuid('contract_id').references(() => contracts.id, { onDelete: 'set null' }),

        // Salary structure utilized
        structureId: uuid('structure_id').references(() => salaryStructures.id, {
            onDelete: 'set null',
        }),

        // Contract wage frozen at compute time
        contractWageSnapshot: numeric('contract_wage_snapshot', { precision: 12, scale: 2 }),

        // Period coverage dates
        periodStart: date('period_start').notNull(),
        periodEnd: date('period_end').notNull(),

        // Actual billable/worked days in period
        workedDays: numeric('worked_days', { precision: 6, scale: 2 }),

        // Computed financial totals (always non-negative)
        grossAmount: numeric('gross_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),
        deductionAmount: numeric('deduction_amount', { precision: 12, scale: 2 })
            .default('0.00')
            .notNull(),
        netAmount: numeric('net_amount', { precision: 12, scale: 2 }).default('0.00').notNull(),

        // Lifecycle status
        status: payslipStatusEnum('status').default('DRAFT').notNull(),

        // Rendered PDF artifact download link
        pdfUrl: text('pdf_url'),

        // Distribution timestamps
        emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
        computedAt: timestamp('computed_at', { withTimezone: true }),
        validatedAt: timestamp('validated_at', { withTimezone: true }),
        paidAt: timestamp('paid_at', { withTimezone: true }),
        sentAt: timestamp('sent_at', { withTimezone: true }),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // Strictly one payslip per employee per payrun
        payrunEmpUniqueIdx: uniqueIndex('payslips_payrun_emp_unique_idx').on(
            table.payrunId,
            table.employeeId,
        ),
        payrunIdIdx: index('payslips_payrun_id_idx').on(table.payrunId),
        empStatusIdx: index('payslips_emp_status_idx').on(table.employeeId, table.status),
        contractIdIdx: index('payslips_contract_id_idx').on(table.contractId),
        periodIdx: index('payslips_period_idx').on(table.periodStart, table.periodEnd),

        // CHECK constraints
        grossNonNegativeCheck: check(
            'chk_payslips_gross_non_negative',
            sql`${table.grossAmount} >= 0`,
        ),
        deductionNonNegativeCheck: check(
            'chk_payslips_deduction_non_negative',
            sql`${table.deductionAmount} >= 0`,
        ),
        netNonNegativeCheck: check('chk_payslips_net_non_negative', sql`${table.netAmount} >= 0`),
        periodOrderCheck: check(
            'chk_payslips_period_order',
            sql`${table.periodStart} <= ${table.periodEnd}`,
        ),
    }),
);

/**
 * payslip_lines
 *
 * Granular calculation line item audit trail.
 * Holds an exact historical snapshot of the salary rule configuration used
 * during payroll calculation, along with the computed numerical amount.
 *
 * Invariant:
 *  - These rows are WRITE-ONCE and IMMUTABLE.
 *  - Recomputing a payslip deletes existing lines and inserts newly computed ones.
 *  - Intentionally NO `updated_at` column.
 */
export const payslipLines = pgTable(
    'payslip_lines',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // CASCADE: Deleting or resetting a payslip clears its breakdown lines
        payslipId: uuid('payslip_id')
            .references(() => payslips.id, { onDelete: 'cascade' })
            .notNull(),

        // Reference to original rule (SET NULL if the master rule is later removed)
        salaryRuleId: uuid('salary_rule_id').references(() => salaryRules.id, {
            onDelete: 'set null',
        }),

        // ── FROZEN CONFIGURATION SNAPSHOTS ──────────────────────────────────
        code: text('code').notNull(),
        name: text('name').notNull(),
        category: ruleCategoryEnum('category').notNull(),
        sequenceOrder: integer('sequence_order').notNull(),
        computationType: computationTypeEnum('computation_type').notNull(),
        fixedAmount: numeric('fixed_amount', { precision: 12, scale: 2 }),
        percentageBaseCode: text('percentage_base_code'),
        percentageRate: numeric('percentage_rate', { precision: 7, scale: 4 }),
        formulaExpression: text('formula_expression'),

        // ── COMPUTATION RESULT ──────────────────────────────────────────────
        // Computed positive monetary value for this line item
        amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        payslipIdIdx: index('payslip_lines_payslip_id_idx').on(table.payslipId),
        salaryRuleIdIdx: index('payslip_lines_salary_rule_id_idx').on(table.salaryRuleId),
        codeIdx: index('payslip_lines_code_idx').on(table.code),
        categoryIdx: index('payslip_lines_category_idx').on(table.category),
        payslipSeqIdx: index('payslip_lines_payslip_seq_idx').on(
            table.payslipId,
            table.sequenceOrder,
        ),
    }),
);
