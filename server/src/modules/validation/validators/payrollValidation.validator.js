import { param, body, validationResult } from 'express-validator';
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

export const payrunIdParamValidator = [
    param('id').isUUID().withMessage('Valid Payrun UUID is required'),
    validateRequest,
];

export const validatePayrunValidator = [
    param('id').isUUID().withMessage('Valid Payrun UUID is required'),
    body('allowWarnings')
        .optional()
        .isBoolean()
        .withMessage('allowWarnings must be a boolean flag'),
    body('overrideBlockers')
        .optional()
        .isBoolean()
        .withMessage('overrideBlockers must be a boolean flag'),
    validateRequest,
];
