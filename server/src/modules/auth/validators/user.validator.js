import { body, query, validationResult } from 'express-validator';
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

export const adminListUsersQueryValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be an integer greater than or equal to 1'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be an integer between 1 and 100'),
    query('search')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search term cannot exceed 100 characters'),
    query('sortBy')
        .optional()
        .isIn([
            'firstName',
            'lastName',
            'fullName',
            'email',
            'role',
            'roleName',
            'isActive',
            'statusName',
            'emailVerified',
            'verifiedName',
            'createdAt',
            'updatedAt',
        ])
        .withMessage('Invalid sortBy field'),
    query('sortDir')
        .optional()
        .isIn(['asc', 'desc', 'ASC', 'DESC'])
        .withMessage('sortDir must be asc or desc'),
    query('role')
        .optional()
        .toUpperCase()
        .isIn(['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'])
        .withMessage('Role must be a valid PeoplePay360 role'),
    query('isActive')
        .optional()
        .isIn(['true', 'false', true, false])
        .withMessage('isActive must be a boolean'),
    query('emailVerified')
        .optional()
        .isIn(['true', 'false', true, false])
        .withMessage('emailVerified must be a boolean'),
    query('includeDeleted')
        .optional()
        .isIn(['true', 'false', true, false])
        .withMessage('includeDeleted must be a boolean'),
    validateRequest,
];
