import bcrypt from 'bcryptjs';
import {
    getUserById,
    updateUser,
    softDeleteUser,
    listUsersWithPagination,
    getUserByEmail,
    getDeletedUserByEmail,
    createUser,
} from '../../../dao/user.dao.js';
import { db } from '../../../config/database.config.js';
import { users } from '../../../db/schema/users.schema.js';
import { employees } from '../../../db/schema/employees.schema.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import { generateEmployeeCode } from '../../../utils/employeeCode.utils.js';
import { AppError } from '../utils/appError.js';
import { generateTempPassword } from '../../../utils/password.utils.js';
import { sendEmail } from '../../../services/mail/mail.service.js';
import { accountCreatedEmailTemplate } from '../../../templates/email.template.js';
import redis from '../../../config/cache.config.js';

/**
 * Update current user profile
 * @param {string} userId
 * @param {object} updates name, email
 * @returns {object} updated user
 */
export async function updateProfile(userId, { email, firstName, lastName, profileImage }) {
    const updates = {};
    if (email) updates.email = email;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;

    const user = await updateUser(userId, updates);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    return user;
}

/**
 * Change current user password
 * @param {string} userId
 * @param {object} param1 currentPassword, newPassword
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
    const user = await getUserById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new AppError('Current password is incorrect', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await updateUser(userId, { password: hashedPassword });
}

/**
 * Soft delete own user account
 * @param {string} userId
 */
export async function deleteAccount(userId, password) {
    const user = await getUserById(userId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError('Incorrect password', 400);
    }

    const deletedUser = await softDeleteUser(userId);
    if (!deletedUser) {
        throw new AppError('User not found or already deleted', 404);
    }
    return deletedUser;
}

/**
 * Get user by id (Admin helper)
 * @param {string} id
 */
export async function adminGetUserById(id) {
    const user = await getUserById(id, true);
    if (!user) {
        throw new AppError('User not found', 404);
    }
    return user;
}

/**
 * List users with pagination and search (Admin helper)
 * @param {object} [params]
 */
export async function adminListUsers(params = {}) {
    return listUsersWithPagination(params);
}

/**
 * Change a user's role (Admin helper)
 * @param {string} targetUserId
 * @param {string} newRole
 */
export async function adminUpdateRole(targetUserId, newRole) {
    const formattedRole = newRole ? String(newRole).toUpperCase() : 'EMPLOYEE';
    const user = await updateUser(targetUserId, { role: formattedRole });
    if (!user) {
        throw new AppError('User not found', 404);
    }
    return user;
}

/**
 * Toggle a user's active status (Admin helper).
 * Invalidates Redis cache per Playbook Rule #3.
 * @param {string} targetUserId
 * @param {boolean} isActive
 */
export async function adminUpdateStatus(targetUserId, isActive) {
    const user = await getUserById(targetUserId);
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const updated = await updateUser(targetUserId, { isActive });
    if (!updated) {
        throw new AppError('Failed to update user status', 500);
    }

    // Invalidate Redis cache so next request picks up the updated isActive flag
    await redis.del('user:' + targetUserId);

    return updated;
}

/**
 * Soft delete user by ID (Admin helper)
 * @param {string} targetUserId
 */
export async function adminDeleteUser(targetUserId) {
    const user = await softDeleteUser(targetUserId);
    if (!user) {
        throw new AppError('User not found or already deleted', 404);
    }
    return user;
}

/**
 * Create user account by Admin
 * @param {object} param0 { firstName, lastName, email, role, createdBy }
 */
export async function adminCreateUser({ firstName, lastName, email, role, createdBy }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate active user
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
        throw new AppError('Email is already registered', 409);
    }

    // Check duplicate soft-deleted user
    const deletedUser = await getDeletedUserByEmail(normalizedEmail);
    if (deletedUser) {
        throw new AppError('Email belongs to a deleted account. Use account recovery.', 409);
    }

    // Check duplicate employee email
    const existingEmployee = await employeeDao.findEmployeeByEmail(normalizedEmail);
    if (existingEmployee) {
        throw new AppError('An employee with this email is already registered', 409);
    }

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const hireDate = new Date().toISOString().split('T')[0];
    const year = new Date(hireDate).getFullYear();

    const { user, employee } = await db.transaction(async (tx) => {
        const [newUser] = await tx
            .insert(users)
            .values({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role,
                emailVerified: true,
                isActive: true,
                isDeleted: false,
            })
            .returning();

        const maxSeq = await employeeDao.getMaxEmployeeSequence(year, 'PP360', tx);
        const sequenceNumber = maxSeq + 1;

        const employeeCode = generateEmployeeCode({
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            year,
            sequenceNumber,
        });

        const [newEmployee] = await tx
            .insert(employees)
            .values({
                userId: newUser.id,
                employeeCode,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                profileImage:
                    newUser.profileImage ||
                    'https://ik.imagekit.io/2bzzjhgkg/defaul_profile_image.jpeg',
                hireDate,
                status: 'ACTIVE',
                isActive: true,
                createdBy: createdBy || newUser.id,
            })
            .returning();

        return { user: newUser, employee: newEmployee };
    });

    let emailFailed = false;
    try {
        await sendEmail({
            to: normalizedEmail,
            subject: 'Welcome to PeoplePay360 — Your Account Details',
            html: accountCreatedEmailTemplate({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                temporaryPassword: tempPassword,
            }),
        });
    } catch (err) {
        console.error('Failed to send account creation email:', err);
        emailFailed = true;
    }

    return {
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            employeeId: employee.id,
            employeeCode: employee.employeeCode,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
        employee,
        emailFailed,
    };
}
