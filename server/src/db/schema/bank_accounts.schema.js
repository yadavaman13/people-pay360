import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { employees } from './employees.schema.js';
import { bankAccountTypeEnum } from './enums.schema.js';

/**
 * bank_accounts
 *
 * 1:N with employees — an employee can have multiple bank accounts,
 * but only ONE can be marked as primary+active at any time.
 *
 * Why 1:N instead of a single column on employees?
 *   - Employees sometimes change banks mid-year.
 *   - Historical payslips reference whichever account was primary at the time.
 *   - Payroll warning: "missing bank details" = no active primary account.
 *
 * Constraint design:
 *   - UNIQUE(employee_id, account_number) — same employee cannot register the
 *     same account twice.
 *   - Partial UNIQUE index on (employee_id) WHERE is_primary = TRUE AND is_active = TRUE
 *     — enforces exactly one active primary account per employee at DB level.
 *     This is stronger than an app-level check (atomic, race-condition-proof).
 *
 * FK: RESTRICT on employee delete — never silently orphan bank accounts.
 */
export const bankAccounts = pgTable(
    'bank_accounts',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // RESTRICT: cannot delete an employee who has bank accounts on record.
        employeeId: uuid('employee_id')
            .references(() => employees.id, { onDelete: 'restrict' })
            .notNull(),

        bankName: text('bank_name').notNull(),

        // Store full account number — encrypted at the application layer before insert.
        accountNumber: text('account_number').notNull(),

        accountHolderName: text('account_holder_name').notNull(),

        // Indian Financial System Code (11 characters, e.g. 'HDFC0001234').
        ifscCode: text('ifsc_code').notNull(),

        accountType: bankAccountTypeEnum('account_type').default('SAVINGS').notNull(),

        // Payroll uses the active primary account for salary credit.
        // Enforced as a partial unique index below.
        isPrimary: boolean('is_primary').default(false).notNull(),

        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // Standard lookup index for employee's accounts.
        empIdIdx: index('bank_accounts_employee_id_idx').on(table.employeeId),

        // UNIQUE: same employee cannot register the same account number twice.
        empAccountUniqueIdx: uniqueIndex('bank_accounts_emp_account_unique_idx').on(
            table.employeeId,
            table.accountNumber,
        ),

        // PARTIAL UNIQUE: only one active primary account per employee.
        // This is the DB-level enforcement that makes the payroll warning reliable.
        // The WHERE clause makes it a partial index — only rows where both
        // is_primary=TRUE AND is_active=TRUE count toward the uniqueness check.
        onePrimaryActiveIdx: uniqueIndex('bank_accounts_one_primary_active_idx')
            .on(table.employeeId)
            .where(sql`${table.isPrimary} = TRUE AND ${table.isActive} = TRUE`),
    }),
);
