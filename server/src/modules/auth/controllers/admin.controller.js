import * as userService from '../services/user.service.js';
import { cleanupExpiredDeletedUsers } from '../services/cleanup.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

/**
 * List all users (Admin only)
 */
export async function adminListUsers(req, res, next) {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';
        const rawUsers = await userService.adminListUsers(includeDeleted);

        const users = rawUsers.map((user) => ({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            isDeleted: user.isDeleted,
            deletedAt: user.deletedAt,
            emailVerified: user.emailVerified,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }));

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Users retrieved successfully',
            success: true,
            users,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get a specific user details by ID (Admin only)
 */
export async function adminGetUserById(req, res, next) {
    try {
        const user = await userService.adminGetUserById(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            message: 'User retrieved successfully',
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                isDeleted: user.isDeleted,
                deletedAt: user.deletedAt,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update a user's role (Admin only)
 */
export async function adminUpdateRole(req, res, next) {
    try {
        const { role } = req.body;
        const updatedUser = await userService.adminUpdateRole(req.params.id, role);
        return sendResponse({
            res,
            statusCode: 200,
            message: 'User role updated successfully',
            success: true,
            user: {
                id: updatedUser.id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                emailVerified: updatedUser.emailVerified,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Toggle a user's active status (Admin only)
 */
export async function adminUpdateStatus(req, res, next) {
    try {
        const { isActive } = req.body;
        const updatedUser = await userService.adminUpdateStatus(req.params.id, isActive);
        return sendResponse({
            res,
            statusCode: 200,
            message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
            success: true,
            user: {
                id: updatedUser.id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                isActive: updatedUser.isActive,
                emailVerified: updatedUser.emailVerified,
                updatedAt: updatedUser.updatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Soft delete a user by ID (Admin only)
 */
export async function adminDeleteUser(req, res, next) {
    try {
        await userService.adminDeleteUser(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            message: 'User soft-deleted successfully',
            success: true,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Permanently delete expired soft-deleted users (Admin only)
 */
export async function adminCleanupUsers(req, res, next) {
    try {
        const deletedUsers = await cleanupExpiredDeletedUsers();
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: `${deletedUsers.length} expired deleted users permanently cleaned up.`,
            deletedUsers: deletedUsers.map((user) => ({
                id: user.id,
                email: user.email,
                deletedAt: user.deletedAt,
                recoveryExpiresAt: user.recoveryExpiresAt,
            })),
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Create a new user (Admin only)
 */
export async function adminCreateUser(req, res, next) {
    try {
        const { firstName, lastName, email, role } = req.body;
        const { user, emailFailed } = await userService.adminCreateUser({
            firstName,
            lastName,
            email,
            role,
        });

        if (emailFailed) {
            return res.status(502).json({
                success: false,
                emailDeliveryFailed: true,
                message:
                    'User created but credentials email failed to deliver. The user can use password reset.',
                user,
            });
        }

        return sendResponse({
            res,
            statusCode: 201,
            message:
                "User created successfully. Login credentials have been sent to the user's email.",
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
}

export {
    getMe,
    updateProfile,
    changePassword,
    deleteAccount,
    uploadAvatar,
} from './user.controller.js';
