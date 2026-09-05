import { body, validationResult } from 'express-validator';
import { sendResponse } from '../../../utils/response.utlis.js';

function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendResponse({
            res,
            statusCode: 400,
            message: 'Validation failed',
            success: false,
            errors: errors.array(),
        });
    }
    next();
}

export const updateProfileValidator = [
    body('firstName').optional().trim().notEmpty().withMessage('First Name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last Name cannot be empty'),
    body('email').optional().trim().isEmail().withMessage('A valid email is required'),
    body('profileImage')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Profile image path cannot be empty'),
    validateRequest,
];

export const adminUpdateRoleValidator = [
    body('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .toUpperCase()
        .isIn(['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'])
        .withMessage('Role must be a valid PeoplePay360 role'),
    validateRequest,
];

export const adminUpdateStatusValidator = [
    body('isActive')
        .notEmpty()
        .withMessage('isActive is required')
        .isBoolean()
        .withMessage('isActive must be a boolean (true or false)')
        .toBoolean(),
    validateRequest,
];

export const adminCreateUserValidator = [
    body('firstName').trim().notEmpty().withMessage('First Name is required'),
    body('lastName').trim().notEmpty().withMessage('Last Name is required'),
    body('email').trim().isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .toUpperCase()
        .isIn(['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'])
        .withMessage('Role must be a valid PeoplePay360 role'),
    // Security: explicitly reject sensitive fields from body
    body('password').not().exists().withMessage('Password must not be provided'),
    body('isActive').not().exists().withMessage('isActive must not be provided'),
    body('emailVerified').not().exists().withMessage('emailVerified must not be provided'),
    validateRequest,
];

export const deleteAccountValidator = [
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest,
];
