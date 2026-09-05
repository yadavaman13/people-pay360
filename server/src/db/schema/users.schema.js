import { pgTable, uuid, text, boolean, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Hierarchy (highest → lowest privilege):
 *   ADMIN > HR_PAYROLL_MANAGER > HR_PAYROLL_USER > HR_MANAGER > EMPLOYEE
 *
 * IMPORTANT — Downstream alignment (must match everywhere):
 *   Express validators : .toUpperCase().isIn(['EMPLOYEE', 'HR_MANAGER', ...])
 *   RBAC route guards  : restrictTo('ADMIN'), restrictTo('HR_PAYROLL_MANAGER')
 *   DAO queries        : { role: 'EMPLOYEE' }
 *   Seed file          : role: 'ADMIN'
 *   Client dropdowns   : <option value="EMPLOYEE">Employee</option>
 */
export const roleEnum = pgEnum('role_enum', [
    'EMPLOYEE',
    'HR_MANAGER',
    'HR_PAYROLL_USER',
    'HR_PAYROLL_MANAGER',
    'ADMIN',
]);

export const users = pgTable(
    'users',
    {
        id: uuid('id').defaultRandom().primaryKey(),

        firstName: text('first_name').notNull(),
        lastName: text('last_name').notNull(),
        email: text('email').unique().notNull(),
        password: text('password'),
        profileImage: text('profile_image').default(
            'https://ik.imagekit.io/2bzzjhgkg/defaul_profile_image.jpeg',
        ),

        // Default role is EMPLOYEE — the lowest-privilege authenticated role.
        // Auth signup creates EMPLOYEE; Admin promotes to HR roles.
        role: roleEnum('role').default('EMPLOYEE').notNull(),

        emailVerified: boolean('email_verified').default(false).notNull(),
        isActive: boolean('is_active').default(true).notNull(),

        // Soft-delete: 15-day recovery window for local accounts.
        isDeleted: boolean('is_deleted').default(false).notNull(),
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
        recoveryExpiresAt: timestamp('recovery_expires_at', { withTimezone: true }),

        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => {
        return {
            emailIdx: index('users_email_idx').on(table.email),
            roleIdx: index('users_role_idx').on(table.role),
            isDeletedIdx: index('users_is_deleted_idx').on(table.isDeleted),
            deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
            recoveryExpiresAtIdx: index('users_recovery_expires_at_idx').on(
                table.recoveryExpiresAt,
            ),
        };
    },
);
