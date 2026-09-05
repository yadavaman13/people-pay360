import { body, param, query, validationResult } from 'express-validator';
import { sendResponse } from '../../../utils/response.utlis.js';

export function validateRequest(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendResponse({
            res,
            statusCode: 422,
            message: errors.array()[0].msg,
            success: false,
            errors: errors.array(),
        });
    }
    next();
}

export const payslipIdParamValidator = [
    param('id').isUUID().withMessage('Valid Payslip UUID is required'),
    validateRequest,
];

export const payrunIdParamValidator = [
    param('id').isUUID().withMessage('Valid Payrun UUID is required'),
    validateRequest,
];

export const pdfViewQueryValidator = [
    param('id').isUUID().withMessage('Valid Payslip UUID is required'),
    query('inline')
        .optional()
        .isBoolean()
        .withMessage('inline query parameter must be a boolean (true/false)'),
    validateRequest,
];

export const listPayslipsValidator = [
    query('payrunId').optional().isUUID().withMessage('payrunId must be a valid UUID'),
    query('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    query('status')
        .optional()
        .trim()
        .toUpperCase()
        .isIn(['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'SENT'])
        .withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
];

export const updatePayslipValidator = [
    param('id').isUUID().withMessage('Valid payslip UUID is required'),
    body('workedDays')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('workedDays must be a non-negative number'),
    body('grossAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('grossAmount must be non-negative'),
    body('deductionAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('deductionAmount must be non-negative'),
    body('netAmount').optional().isFloat({ min: 0 }).withMessage('netAmount must be non-negative'),
    validateRequest,
];
