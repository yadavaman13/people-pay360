import { body, param, query, validationResult } from 'express-validator';
import { sendResponse } from '../../../utils/response.utlis.js';
import { timeStringToMinutes } from '../../../dao/schedule.dao.js';

/**
 * Common middleware to handle express-validator results
 */
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

/**
 * Validate schedule lines array helper
 */
function validateLinesArray(lines) {
    if (!Array.isArray(lines)) {
        throw new Error('Lines must be an array');
    }

    const seenDays = new Set();
    for (const [index, line] of lines.entries()) {
        const day = Number(line.dayOfWeek);
        if (isNaN(day) || day < 0 || day > 6) {
            throw new Error(
                `Line ${index + 1}: dayOfWeek must be an integer between 0 (Sun) and 6 (Sat)`,
            );
        }
        if (seenDays.has(day)) {
            throw new Error(`Duplicate dayOfWeek ${day} found in schedule lines`);
        }
        seenDays.add(day);

        if (!line.startTime || !line.endTime) {
            throw new Error(`Line ${index + 1}: startTime and endTime are required`);
        }

        const startMins = timeStringToMinutes(line.startTime);
        const endMins = timeStringToMinutes(line.endTime);

        if (startMins >= endMins) {
            throw new Error(`Line ${index + 1}: startTime must be before endTime`);
        }

        const breakMins = Number(line.breakMinutes || 0);
        if (isNaN(breakMins) || breakMins < 0) {
            throw new Error(`Line ${index + 1}: breakMinutes must be a non-negative integer`);
        }

        if (breakMins >= endMins - startMins) {
            throw new Error(
                `Line ${index + 1}: breakMinutes cannot be greater than or equal to shift duration`,
            );
        }
    }
    return true;
}

export const createScheduleValidator = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Schedule name is required')
        .isLength({ max: 100 })
        .withMessage('Schedule name cannot exceed 100 characters'),
    body('description')
        .optional({ nullable: true })
        .isString()
        .withMessage('Description must be a string'),
    body('timezone')
        .optional({ nullable: true })
        .isString()
        .withMessage('Timezone must be a valid string'),
    body('lines')
        .optional({ nullable: true })
        .isArray()
        .withMessage('Lines must be an array')
        .custom((lines) => {
            if (lines) validateLinesArray(lines);
            return true;
        }),
    validateRequest,
];

export const updateScheduleValidator = [
    param('id').isUUID().withMessage('Valid schedule UUID is required'),
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Schedule name cannot be empty')
        .isLength({ max: 100 })
        .withMessage('Schedule name cannot exceed 100 characters'),
    body('description')
        .optional({ nullable: true })
        .isString()
        .withMessage('Description must be a string'),
    body('timezone')
        .optional({ nullable: true })
        .isString()
        .withMessage('Timezone must be a string'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest,
];

export const replaceScheduleLinesValidator = [
    param('id').isUUID().withMessage('Valid schedule UUID is required'),
    body('lines')
        .isArray()
        .withMessage('Lines array is required')
        .custom((lines) => {
            validateLinesArray(lines);
            return true;
        }),
    validateRequest,
];

export const scheduleIdParamValidator = [
    param('id').isUUID().withMessage('Valid schedule UUID is required'),
    validateRequest,
];

export const listSchedulesValidator = [
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),
    validateRequest,
];
