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

export const checkInValidator = [
    body('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
    validateRequest,
];

export const checkOutValidator = [
    param('id').isUUID().withMessage('Valid attendance record UUID is required'),
    body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
    validateRequest,
];

export const checkOutSelfValidator = [
    body('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
    validateRequest,
];

export const manualCorrectionValidator = [
    param('id').isUUID().withMessage('Valid attendance record UUID is required'),
    body('correctionReason')
        .trim()
        .notEmpty()
        .withMessage('correctionReason is required for manual corrections'),
    body('checkInTime')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('checkInTime must be a valid ISO8601 timestamp'),
    body('checkOutTime')
        .optional({ nullable: true })
        .isISO8601()
        .withMessage('checkOutTime must be a valid ISO8601 timestamp')
        .custom((checkOutTime, { req }) => {
            if (req.body.checkInTime && checkOutTime) {
                if (new Date(checkOutTime) <= new Date(req.body.checkInTime)) {
                    throw new Error('checkOutTime must be after checkInTime');
                }
            }
            return true;
        }),
    body('workedHours')
        .optional({ nullable: true })
        .isFloat({ min: 0, max: 24 })
        .withMessage('workedHours must be a number between 0 and 24'),
    body('status')
        .optional({ nullable: true })
        .toUpperCase()
        .isIn(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'MANUAL_CORRECTION'])
        .withMessage('status must be one of PRESENT, LATE, ABSENT, HALF_DAY, MANUAL_CORRECTION'),
    body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
    validateRequest,
];

export const attendanceIdParamValidator = [
    param('id').isUUID().withMessage('Valid attendance record UUID is required'),
    validateRequest,
];

export const listAttendanceValidator = [
    query('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    query('dateFrom')
        .optional()
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('dateFrom must be in YYYY-MM-DD format'),
    query('dateTo')
        .optional()
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('dateTo must be in YYYY-MM-DD format'),
    query('status')
        .optional()
        .toUpperCase()
        .isIn(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'MANUAL_CORRECTION'])
        .withMessage('status must be one of PRESENT, LATE, ABSENT, HALF_DAY, MANUAL_CORRECTION'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
];
