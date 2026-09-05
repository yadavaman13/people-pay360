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

export const wizardValidateValidator = [
    body('salaryStructureId').isUUID().withMessage('Valid salaryStructureId UUID is required'),
    body('periodStart')
        .isISO8601()
        .withMessage('periodStart must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('periodEnd')
        .isISO8601()
        .withMessage('periodEnd must be a valid ISO8601 date (YYYY-MM-DD)')
        .custom((end, { req }) => {
            if (req.body.periodStart && end < req.body.periodStart) {
                throw new Error('periodEnd must be on or after periodStart');
            }
            return true;
        }),
    validateRequest,
];

export const createPayrunValidator = [
    body('salaryStructureId').isUUID().withMessage('Valid salaryStructureId UUID is required'),
    body('periodStart')
        .isISO8601()
        .withMessage('periodStart must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('periodEnd')
        .isISO8601()
        .withMessage('periodEnd must be a valid ISO8601 date (YYYY-MM-DD)')
        .custom((end, { req }) => {
            if (req.body.periodStart && end < req.body.periodStart) {
                throw new Error('periodEnd must be on or after periodStart');
            }
            return true;
        }),
    body('employeeIds')
        .isArray({ min: 1 })
        .withMessage('employeeIds must be a non-empty array of UUIDs'),
    body('employeeIds.*').isUUID().withMessage('Each employeeId must be a valid UUID'),
    body('name').optional().trim().notEmpty().withMessage('Payrun name cannot be empty'),
    body('paymentDate')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('paymentDate must be a valid date (YYYY-MM-DD)'),
    body('notes').optional({ nullable: true }).isString(),
    validateRequest,
];

export const updatePayrunValidator = [
    param('id').isUUID().withMessage('Valid payrun UUID is required'),
    body('name').optional().trim().notEmpty().withMessage('Payrun name cannot be empty'),
    body('paymentDate')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('paymentDate must be a valid date (YYYY-MM-DD)'),
    body('notes').optional({ nullable: true }).isString(),
    validateRequest,
];

export const payrunIdParamValidator = [
    param('id').isUUID().withMessage('Valid payrun UUID is required'),
    validateRequest,
];

export const markPaidValidator = [
    param('id').isUUID().withMessage('Valid payrun UUID is required'),
    body('paymentDate')
        .optional()
        .isISO8601()
        .withMessage('paymentDate must be a valid date (YYYY-MM-DD)'),
    validateRequest,
];

export const listPayrunsValidator = [
    query('status')
        .optional()
        .trim()
        .toUpperCase()
        .isIn(['DRAFT', 'COMPUTING', 'COMPUTED', 'VALIDATED', 'PAID', 'ARCHIVED'])
        .withMessage('Invalid status filter'),
    query('periodStart').optional().isISO8601(),
    query('periodEnd').optional().isISO8601(),
    query('structureId').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
];
