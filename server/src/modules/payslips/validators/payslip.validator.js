import { param, query, validationResult } from 'express-validator';
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
