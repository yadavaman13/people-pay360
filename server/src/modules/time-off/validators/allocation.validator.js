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

export const createAllocationValidator = [
    body('employeeId').isUUID().withMessage('Valid employeeId UUID is required'),
    body('typeId').isUUID().withMessage('Valid typeId UUID is required'),
    body('totalDays').isFloat({ min: 0.5 }).withMessage('totalDays must be at least 0.5'),
    body('validityStart')
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('validityStart must be a valid date in YYYY-MM-DD format'),
    body('validityEnd')
        .optional({ nullable: true })
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('validityEnd must be a valid date in YYYY-MM-DD format')
        .custom((validityEnd, { req }) => {
            if (validityEnd && req.body.validityStart) {
                if (validityEnd < req.body.validityStart) {
                    throw new Error('validityEnd must be on or after validityStart');
                }
            }
            return true;
        }),
    body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
    validateRequest,
];

export const updateAllocationValidator = [
    param('id').isUUID().withMessage('Valid allocation UUID is required'),
    body('totalDays')
        .optional()
        .isFloat({ min: 0.5 })
        .withMessage('totalDays must be at least 0.5'),
    body('validityStart')
        .optional()
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('validityStart must be in YYYY-MM-DD format'),
    body('validityEnd')
        .optional({ nullable: true })
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('validityEnd must be in YYYY-MM-DD format')
        .custom((validityEnd, { req }) => {
            if (validityEnd && req.body.validityStart) {
                if (validityEnd < req.body.validityStart) {
                    throw new Error('validityEnd must be on or after validityStart');
                }
            }
            return true;
        }),
    body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
    validateRequest,
];

export const allocationIdParamValidator = [
    param('id').isUUID().withMessage('Valid allocation UUID is required'),
    validateRequest,
];

export const listAllocationsValidator = [
    query('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    query('typeId').optional().isUUID().withMessage('typeId must be a valid UUID'),
    query('status')
        .optional()
        .toUpperCase()
        .isIn(['PENDING', 'APPROVED', 'REFUSED'])
        .withMessage('status must be one of PENDING, APPROVED, REFUSED'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
];
