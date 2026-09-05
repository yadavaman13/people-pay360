import { query, validationResult } from 'express-validator';
import { sendResponse } from '../../../utils/response.utlis.js';

function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendResponse({
            res,
            statusCode: 400,
            message: 'Invalid query parameters',
            success: false,
            errors: errors.array(),
        });
    }
    next();
}

/**
 * Filter validator for dashboard query parameters
 * periodStart, periodEnd, departmentId, employeeType
 */
export const dashboardFilterValidator = [
    query('periodStart')
        .optional()
        .isISO8601()
        .withMessage('periodStart must be a valid ISO8601 date string (YYYY-MM-DD)'),
    query('periodEnd')
        .optional()
        .isISO8601()
        .withMessage('periodEnd must be a valid ISO8601 date string (YYYY-MM-DD)')
        .custom((periodEnd, { req }) => {
            if (req.query.periodStart && periodEnd) {
                if (new Date(periodEnd) < new Date(req.query.periodStart)) {
                    throw new Error('periodEnd cannot be earlier than periodStart');
                }
            }
            return true;
        }),
    query('departmentId').optional().isUUID().withMessage('departmentId must be a valid UUID'),
    query('employeeType').optional().isString().trim().withMessage('employeeType must be a string'),
    validateRequest,
];
