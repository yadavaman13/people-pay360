import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    numeric,
    integer,
    index,
    uniqueIndex,
    check,
    sql,
} from 'drizzle-orm/pg-core';
import { ruleCategoryEnum, computationTypeEnum } from './enums.schema.js';

/**
 * salary_structures
 *
 * Master configuration container for a salary structure template.
 * Group of ordered salary rules that define earnings, allowances, deductions, and net pay.
 * Assigned to contracts and executed during payruns.
 */
export const salaryStructures = pgTable(
    'salary_structures',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // Display name (e.g. 'Regular Monthly Structure', 'Internship Stipend')
        name: text('name').notNull(),

        // Unique identifier code (e.g. 'MONTHLY_REG', 'INTERN_STD')
        code: text('code').unique().notNull(),

        description: text('description'),

        // Soft-delete flag
        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        nameIdx: index('salary_structures_name_idx').on(table.name),
        codeIdx: index('salary_structures_code_idx').on(table.code),
        isActiveIdx: index('salary_structures_is_active_idx').on(table.isActive),
    }),
);

/**
 * salary_rules
 *
 * Ordered, executable rule definitions within a salary structure.
 *
 * Critical Engine Invariants:
 *  1. Rules execute strictly by `sequence_order ASC`.
 *  2. Later rules depend on earlier outputs (e.g. PF depends on BASIC, GROSS depends on BASIC + ALLOWANCES).
 *  3. `UNIQUE(structure_id, sequence_order)` guarantees no execution order collisions.
 *  4. `UNIQUE(structure_id, code)` guarantees unique variable references in formulas.
 */
export const salaryRules = pgTable(
    'salary_rules',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // RESTRICT: cannot delete a salary structure with rules attached
        structureId: uuid('structure_id')
            .references(() => salaryStructures.id, { onDelete: 'restrict' })
            .notNull(),

        // Variable code used in formula references (e.g. 'BASIC', 'HRA', 'PF', 'GROSS')
        code: text('code').notNull(),

        // Human-readable line item name (e.g. 'Basic Salary', 'House Rent Allowance')
        name: text('name').notNull(),

        // Category determines rule role in computation:
        // BASIC | ALLOWANCE | GROSS | DEDUCTION | NET | OTHER
        category: ruleCategoryEnum('category').notNull(),

        // Execution order within structure (1, 2, 3...) — strictly ascending
        sequenceOrder: integer('sequence_order').notNull(),

        // Computation mechanism: FIXED | PERCENTAGE | FORMULA
        computationType: computationTypeEnum('computation_type').notNull(),

        // Used when computationType = 'FIXED'
        fixedAmount: numeric('fixed_amount', { precision: 12, scale: 2 }),

        // Used when computationType = 'PERCENTAGE' (code of the reference base, e.g. 'BASIC')
        percentageBaseCode: text('percentage_base_code'),

        // Used when computationType = 'PERCENTAGE' (e.g. 12.0000 for 12%)
        percentageRate: numeric('percentage_rate', { precision: 7, scale: 4 }),

        // Used when computationType = 'FORMULA' (e.g. 'basic * 0.20 + hra')
        formulaExpression: text('formula_expression'),

        // Soft-delete flag
        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        // Guarantees unique execution order per structure
        structSeqUniqueIdx: uniqueIndex('salary_rules_struct_seq_unique_idx').on(
            table.structureId,
            table.sequenceOrder,
        ),

        // Guarantees unique code identifier per structure
        structCodeUniqueIdx: uniqueIndex('salary_rules_struct_code_unique_idx').on(
            table.structureId,
            table.code,
        ),

        structIdIdx: index('salary_rules_structure_id_idx').on(table.structureId),
        categoryIdx: index('salary_rules_category_idx').on(table.category),
        isActiveIdx: index('salary_rules_is_active_idx').on(table.isActive),

        // CHECK constraints
        sequencePositiveCheck: check(
            'chk_rules_sequence_positive',
            sql`${table.sequenceOrder} > 0`,
        ),
        fixedAmountCheck: check(
            'chk_rules_fixed_amount_non_negative',
            sql`${table.fixedAmount} IS NULL OR ${table.fixedAmount} >= 0`,
        ),
        percentageRateCheck: check(
            'chk_rules_percentage_rate_non_negative',
            sql`${table.percentageRate} IS NULL OR ${table.percentageRate} >= 0`,
        ),
    }),
);
