import bcrypt from 'bcryptjs';
import {
    getUserById,
    updateUser,
    softDeleteUser,
    listUsers,
    getUserByEmail,
    getDeletedUserByEmail,
    createUser,
} from '../../../dao/user.dao.js';
import { AppError } from '../utils/appError.js';
import { generateTempPassword } from '../../../utils/password.utils.js';
import { sendEmail } from '../../../services/mail/mail.service.js';
import { accountCreatedEmailTemplate } from '../../../templates/email.template.js';

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
 * List users (Admin helper)
 * @param {boolean} includeDeleted
 */
export async function adminListUsers(includeDeleted = false) {
    return listUsers(includeDeleted);
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
 * @param {object} param0 { firstName, lastName, email, role }
 */
export async function adminCreateUser({ firstName, lastName, email, role }) {
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

    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const user = await createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role,
        emailVerified: true,
        isActive: true,
        isDeleted: false,
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
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
        emailFailed,
    };
}
