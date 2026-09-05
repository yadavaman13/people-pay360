import { body, param, query, validationResult } from 'express-validator';
import { sendResponse } from '../../../utils/response.utlis.js';

export function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const firstError = errors.array()[0];
        return sendResponse({
            res,
            statusCode: 422,
            message: firstError.msg,
            success: false,
            errors: errors.array(),
        });
    }
    next();
}

export const createTimeOffTypeValidator = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Leave type name is required')
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters'),
    body('code')
        .trim()
        .notEmpty()
        .withMessage('Code is required')
        .toUpperCase()
        .matches(/^[A-Z0-9_]+$/)
        .withMessage('Code must contain only uppercase letters, numbers, and underscores')
        .isLength({ max: 50 })
        .withMessage('Code cannot exceed 50 characters'),
    body('allocationRequired')
        .optional()
        .isBoolean()
        .withMessage('allocationRequired must be a boolean'),
    body('requestApprovalRequired')
        .optional()
        .isBoolean()
        .withMessage('requestApprovalRequired must be a boolean'),
    body('paidTimeOff').optional().isBoolean().withMessage('paidTimeOff must be a boolean'),
    body('maxDaysPerRequest')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('maxDaysPerRequest must be a positive integer'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest,
];

export const updateTimeOffTypeValidator = [
    param('id').isUUID().withMessage('Valid leave type UUID is required'),
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Name cannot be empty')
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters'),
    body('allocationRequired')
        .optional()
        .isBoolean()
        .withMessage('allocationRequired must be a boolean'),
    body('requestApprovalRequired')
        .optional()
        .isBoolean()
        .withMessage('requestApprovalRequired must be a boolean'),
    body('paidTimeOff').optional().isBoolean().withMessage('paidTimeOff must be a boolean'),
    body('maxDaysPerRequest')
        .optional({ nullable: true })
        .isInt({ min: 1 })
        .withMessage('maxDaysPerRequest must be a positive integer'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest,
];

export const typeIdParamValidator = [
    param('id').isUUID().withMessage('Valid leave type UUID is required'),
    validateRequest,
];

export const listTimeOffTypesValidator = [
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),
    validateRequest,
];
