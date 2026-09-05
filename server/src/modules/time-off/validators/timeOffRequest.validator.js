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

export const createRequestValidator = [
    body('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    body('typeId').isUUID().withMessage('typeId must be a valid UUID'),
    body('startDate')
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('startDate must be in YYYY-MM-DD format'),
    body('endDate')
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('endDate must be in YYYY-MM-DD format')
        .custom((endDate, { req }) => {
            if (endDate && req.body.startDate) {
                if (endDate < req.body.startDate) {
                    throw new Error('endDate must be on or after startDate');
                }
            }
            return true;
        }),
    body('numberOfDays')
        .optional({ nullable: true })
        .isFloat({ min: 0.5 })
        .withMessage('numberOfDays must be at least 0.5'),
    body('reason').optional({ nullable: true }).isString().withMessage('reason must be a string'),
    validateRequest,
];

export const updateRequestValidator = [
    param('id').isUUID().withMessage('Valid request UUID is required'),
    body('startDate')
        .optional()
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('startDate must be in YYYY-MM-DD format'),
    body('endDate')
        .optional()
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('endDate must be in YYYY-MM-DD format')
        .custom((endDate, { req }) => {
            if (endDate && req.body.startDate) {
                if (endDate < req.body.startDate) {
                    throw new Error('endDate must be on or after startDate');
                }
            }
            return true;
        }),
    body('numberOfDays')
        .optional()
        .isFloat({ min: 0.5 })
        .withMessage('numberOfDays must be at least 0.5'),
    body('reason').optional({ nullable: true }).isString().withMessage('reason must be a string'),
    validateRequest,
];

export const requestIdParamValidator = [
    param('id').isUUID().withMessage('Valid request UUID is required'),
    validateRequest,
];

export const refuseRequestValidator = [
    param('id').isUUID().withMessage('Valid request UUID is required'),
    body('reviewNotes')
        .optional({ nullable: true })
        .isString()
        .withMessage('reviewNotes must be a string'),
    validateRequest,
];

export const listRequestsValidator = [
    query('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    query('typeId').optional().isUUID().withMessage('typeId must be a valid UUID'),
    query('status')
        .optional()
        .toUpperCase()
        .isIn(['PENDING', 'APPROVED', 'REFUSED', 'CANCELLED'])
        .withMessage('status must be one of PENDING, APPROVED, REFUSED, CANCELLED'),
    query('startDate')
        .optional()
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('startDate must be in YYYY-MM-DD format'),
    query('endDate')
        .optional()
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('endDate must be in YYYY-MM-DD format'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
];
