import {
    pgTable,
    uuid,
    text,
    boolean,
    timestamp,
    index,
} from 'drizzle-orm/pg-core';
import { departments } from './departments.schema.js';

/**
 * job_positions
 *
 * Master table for job roles/titles within the organisation.
 * Linked to a department so payroll and HR can filter by position.
 *
 * Soft-deletable — never hard-delete a position referenced by active contracts or employees.
 */
export const jobPositions = pgTable(
    'job_positions',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        // e.g. 'Senior Software Engineer', 'HR Business Partner'
        title: text('title').notNull(),

        // Short code for reports (e.g. 'SWE-SR', 'HRM-I'). Unique across org.
        code: text('code').unique(),

        departmentId: uuid('department_id').references(() => departments.id, {
            onDelete: 'set null',
        }),

        description: text('description'),

        isActive: boolean('is_active').default(true).notNull(),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => ({
        titleIdx: index('job_positions_title_idx').on(table.title),
        deptIdx: index('job_positions_dept_id_idx').on(table.departmentId),
        isActiveIdx: index('job_positions_is_active_idx').on(table.isActive),
    }),
);
