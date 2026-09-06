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
        .isIn(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'MANUAL_CORRECTION', 'MISSING_CHECKOUT'])
        .withMessage(
            'status must be one of PRESENT, LATE, ABSENT, HALF_DAY, MANUAL_CORRECTION, MISSING_CHECKOUT',
        ),
    body('notes').optional({ nullable: true }).isString().withMessage('notes must be a string'),
    validateRequest,
];

export const attendanceIdParamValidator = [
    param('id').isUUID().withMessage('Valid attendance record UUID is required'),
    validateRequest,
];

export const listAttendanceValidator = [
    query('employeeId')
        .optional({ checkFalsy: true })
        .custom((val) => {
            if (val === 'me') return true;
            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(val)) {
                throw new Error('employeeId must be a valid UUID or "me"');
            }
            return true;
        }),
    query('scope').optional({ checkFalsy: true }).isString().withMessage('scope must be a string'),
    query('excludeHr').optional().toBoolean(),
    query('search').optional({ checkFalsy: true }).isString().trim(),
    query('dateFrom')
        .optional({ checkFalsy: true })
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('dateFrom must be in YYYY-MM-DD format'),
    query('dateTo')
        .optional({ checkFalsy: true })
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('dateTo must be in YYYY-MM-DD format'),
    query('status')
        .optional({ checkFalsy: true })
        .toUpperCase()
        .isIn(['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'MANUAL_CORRECTION', 'MISSING_CHECKOUT'])
        .withMessage(
            'status must be one of PRESENT, LATE, ABSENT, HALF_DAY, MANUAL_CORRECTION, MISSING_CHECKOUT',
        ),
    query('page').optional({ checkFalsy: true }).isInt({ min: 1 }).toInt(),
    query('limit').optional({ checkFalsy: true }).isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
];
