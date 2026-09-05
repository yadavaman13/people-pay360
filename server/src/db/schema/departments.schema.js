import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * departments
 *
 * Master table for company departments.
 * Soft-deletable via is_active flag — never hard-delete a department that
 * has employees or historical contracts referencing it.
 *
 * Self-referencing parent_id supports org-chart hierarchies (e.g. Engineering → Frontend).
 * manager_id is a deferred FK to employees (set after employees table is created).
 */
export const departments = pgTable(
    'departments',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        name: text('name').notNull(),

        // Short human-readable code used in reports (e.g. 'ENG', 'HR', 'FIN')
        code: text('code').unique(),

        description: text('description'),

        // Self-referencing: supports department hierarchy (nullable = root dept)
        parentId: uuid('parent_id'),
        // NOTE: parentId.references(() => departments.id) is declared in
        // relations/schema.js to avoid circular definition. Raw FK in migration.

        // The department's designated manager (FK → employees.id)
        // Set via ALTER TABLE after employees table is created to avoid circular dependency.
        managerId: uuid('manager_id'),

        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        nameIdx: index('departments_name_idx').on(table.name),
        isActiveIdx: index('departments_is_active_idx').on(table.isActive),
        parentIdIdx: index('departments_parent_id_idx').on(table.parentId),
    }),
);
