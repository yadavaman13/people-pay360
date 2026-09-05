import { db } from '../config/database.config.js';
import { users } from '../db/schema/users.schema.js';
import { eq, and, lt, desc, asc, ilike, or, count } from 'drizzle-orm';

/**
 * Get user by email
 * @param {string} email
 * @param {boolean} includeDeleted
 */
export async function getUserByEmail(email, includeDeleted = false) {
    const filters = [eq(users.email, email)];
    if (!includeDeleted) {
        filters.push(eq(users.isDeleted, false));
    }
    const [user] = await db
        .select()
        .from(users)
        .where(and(...filters));
    return user || null;
}

/**
 * Get user by ID
 * @param {string} id
 * @param {boolean} includeDeleted
 */
export async function getUserById(id, includeDeleted = false) {
    const filters = [eq(users.id, id)];
    if (!includeDeleted) {
        filters.push(eq(users.isDeleted, false));
    }
    const [user] = await db
        .select()
        .from(users)
        .where(and(...filters));
    return user || null;
}

/**
 * Get user by googleId
 * @param {string} googleId
 * @param {boolean} includeDeleted
 */
export async function getUserByGoogleId(googleId, includeDeleted = false) {
    const filters = [eq(users.googleId, googleId)];
    if (!includeDeleted) {
        filters.push(eq(users.isDeleted, false));
    }
    const [user] = await db
        .select()
        .from(users)
        .where(and(...filters));
    return user || null;
}

/**
 * Create a new user record
 * @param {object} userData
 */
export async function createUser(userData) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
}

/**
 * Update user details
 * @param {string} id
 * @param {object} updates
 */
export async function updateUser(id, updates) {
    const [user] = await db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(users.id, id), eq(users.isDeleted, false)))
        .returning();
    return user || null;
}

/**
 * Soft delete user
 * @param {string} id
 */
export async function softDeleteUser(id) {
    const deletedAt = new Date();
    const recoveryExpiresAt = new Date(deletedAt.getTime() + 15 * 24 * 60 * 60 * 1000); // today + 15 days
    const [user] = await db
        .update(users)
        .set({
            isDeleted: true,
            isActive: false,
            deletedAt: deletedAt,
            recoveryExpiresAt: recoveryExpiresAt,
            updatedAt: new Date(),
        })
        .where(and(eq(users.id, id), eq(users.isDeleted, false)))
        .returning();
    return user || null;
}

/**
 * Hard delete (permanently delete) user by ID
 * @param {string} id
 */
export async function hardDeleteUser(id) {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning();
    return user || null;
}

/**
 * List all users
 * @param {boolean} includeDeleted
 */
export async function listUsers(includeDeleted = false) {
    if (includeDeleted) {
        return db.select().from(users);
    }
    return db.select().from(users).where(eq(users.isDeleted, false));
}

/**
 * List users with pagination, sorting, multi-column search, and filters
 * @param {object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.search='']
 * @param {string} [params.sortBy='createdAt']
 * @param {string} [params.sortDir='desc']
 * @param {string} [params.role]
 * @param {boolean} [params.isActive]
 * @param {boolean} [params.emailVerified]
 * @param {boolean} [params.includeDeleted=false]
 * @returns {Promise<{ users: Array, totalCount: number }>}
 */
export async function listUsersWithPagination({
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortDir = 'desc',
    role,
    isActive,
    emailVerified,
    includeDeleted = false,
} = {}) {
    const conditions = [];

    if (!includeDeleted) {
        conditions.push(eq(users.isDeleted, false));
    }

    if (search && search.trim() !== '') {
        const searchPattern = `%${search.trim()}%`;
        conditions.push(
            or(
                ilike(users.firstName, searchPattern),
                ilike(users.lastName, searchPattern),
                ilike(users.email, searchPattern),
            ),
        );
    }

    if (role) {
        conditions.push(eq(users.role, role));
    }

    if (isActive !== undefined && isActive !== null && isActive !== '') {
        const boolActive = typeof isActive === 'boolean' ? isActive : isActive === 'true';
        conditions.push(eq(users.isActive, boolActive));
    }

    if (emailVerified !== undefined && emailVerified !== null && emailVerified !== '') {
        const boolVerified =
            typeof emailVerified === 'boolean' ? emailVerified : emailVerified === 'true';
        conditions.push(eq(users.emailVerified, boolVerified));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;

    // Whitelist and map sort columns
    const SORT_COLUMN_MAP = {
        firstName: users.firstName,
        lastName: users.lastName,
        fullName: users.firstName,
        email: users.email,
        role: users.role,
        roleName: users.role,
        isActive: users.isActive,
        statusName: users.isActive,
        emailVerified: users.emailVerified,
        verifiedName: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
    };

    const targetCol = SORT_COLUMN_MAP[sortBy] || users.createdAt;
    const isAsc = String(sortDir).toLowerCase() === 'asc';
    const orderByClause = isAsc ? asc(targetCol) : desc(targetCol);

    const [userRecords, [{ total }]] = await Promise.all([
        db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                profileImage: users.profileImage,
                role: users.role,
                isActive: users.isActive,
                isDeleted: users.isDeleted,
                deletedAt: users.deletedAt,
                emailVerified: users.emailVerified,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(whereClause)
            .orderBy(orderByClause)
            .limit(safeLimit)
            .offset(offset),
        db.select({ total: count() }).from(users).where(whereClause),
    ]);

    return {
        users: userRecords,
        totalCount: Number(total),
    };
}

/**
 * Get user by email specifically if they are soft-deleted
 * @param {string} email
 */
export async function getDeletedUserByEmail(email) {
    const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.isDeleted, true)));
    return user || null;
}

/**
 * Recover a soft-deleted user
 * @param {string} id
 */
export async function recoverUser(id) {
    const [user] = await db
        .update(users)
        .set({
            isDeleted: false,
            isActive: true,
            deletedAt: null,
            recoveryExpiresAt: null,
            updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
    return user || null;
}

/**
 * Permanently delete expired soft-deleted users
 * @returns {Promise<Array>} deleted users
 */
export async function deleteExpiredDeletedUsers() {
    const deleted = await db
        .delete(users)
        .where(and(eq(users.isDeleted, true), lt(users.recoveryExpiresAt, new Date())))
        .returning();
    return deleted;
}
