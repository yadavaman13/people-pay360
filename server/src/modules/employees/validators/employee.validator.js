import { body, param, query, validationResult } from 'express-validator';
import { sendResponse } from '../../../utils/response.utlis.js';

/**
 * Common middleware to validate express-validator results
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
 * Validator for employee profile creation (self-onboarding or admin onboarding)
 */
export const createEmployeeProfileValidator = [
    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Phone must be a valid string'),
    body('gender')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Gender must be a valid string'),
    body('dateOfBirth')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('Date of birth must be a valid ISO 8601 date (YYYY-MM-DD)'),
    body('address')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Address must be a valid string'),
    body('hireDate')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('Hire date must be a valid ISO 8601 date (YYYY-MM-DD)'),
    body('notes')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Notes must be a valid string'),
    body('userId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('userId must be a valid UUID'),
    body('departmentId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('departmentId must be a valid UUID'),
    body('jobPositionId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('jobPositionId must be a valid UUID'),
    body('managerId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('managerId must be a valid UUID'),
    body('workingScheduleId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('workingScheduleId must be a valid UUID'),
    validateRequest,
];

/**
 * Validator for updating employee profile
 */
export const updateEmployeeValidator = [
    param('id').optional().isUUID().withMessage('Employee ID must be a valid UUID'),
    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Phone must be a valid string'),
    body('gender')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Gender must be a valid string'),
    body('dateOfBirth')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('Date of birth must be a valid ISO 8601 date (YYYY-MM-DD)'),
    body('address')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Address must be a valid string'),
    body('hireDate')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('Hire date must be a valid ISO 8601 date (YYYY-MM-DD)'),
    body('terminationDate')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('Termination date must be a valid ISO 8601 date (YYYY-MM-DD)'),
    body('departmentId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('departmentId must be a valid UUID'),
    body('jobPositionId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('jobPositionId must be a valid UUID'),
    body('managerId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('managerId must be a valid UUID'),
    body('workingScheduleId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('workingScheduleId must be a valid UUID'),
    body('status')
        .optional({ nullable: true, checkFalsy: true })
        .toUpperCase()
        .isIn(['DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'])
        .withMessage('Status must be one of DRAFT, ACTIVE, SUSPENDED, ARCHIVED'),
    body('notes')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('Notes must be a valid string'),
    validateRequest,
];

/**
 * Validator for employee list filtering & pagination
 */
export const listEmployeesValidator = [
    query('page')
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('status')
        .optional({ nullable: true, checkFalsy: true })
        .toUpperCase()
        .isIn(['DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'])
        .withMessage('Status must be one of DRAFT, ACTIVE, SUSPENDED, ARCHIVED'),
    query('departmentId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('departmentId must be a valid UUID'),
    query('isActive')
        .optional({ nullable: true, checkFalsy: true })
        .isBoolean()
        .withMessage('isActive must be a boolean'),
    query('search').optional({ nullable: true, checkFalsy: true }).isString().trim(),
    validateRequest,
];

/**
 * Validator for /for-payrun roster resolution
 */
export const forPayrunValidator = [
    query('structureId')
        .notEmpty()
        .withMessage('structureId is required')
        .isUUID()
        .withMessage('structureId must be a valid UUID'),
    query('periodStart')
        .notEmpty()
        .withMessage('periodStart is required')
        .isISO8601()
        .withMessage('periodStart must be a valid ISO 8601 date (YYYY-MM-DD)'),
    query('periodEnd')
        .notEmpty()
        .withMessage('periodEnd is required')
        .isISO8601()
        .withMessage('periodEnd must be a valid ISO 8601 date (YYYY-MM-DD)')
        .custom((value, { req }) => {
            if (req.query?.periodStart && value < req.query.periodStart) {
                throw new Error('periodEnd must be on or after periodStart');
            }
            return true;
        }),
    validateRequest,
];

/**
 * Validator for applicable contract resolution
 */
export const applicableContractValidator = [
    param('id')
        .notEmpty()
        .withMessage('Employee ID is required')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),
    query('periodStart')
        .notEmpty()
        .withMessage('periodStart is required')
        .isISO8601()
        .withMessage('periodStart must be a valid ISO 8601 date (YYYY-MM-DD)'),
    query('periodEnd')
        .notEmpty()
        .withMessage('periodEnd is required')
        .isISO8601()
        .withMessage('periodEnd must be a valid ISO 8601 date (YYYY-MM-DD)')
        .custom((value, { req }) => {
            if (req.query?.periodStart && value < req.query.periodStart) {
                throw new Error('periodEnd must be on or after periodStart');
            }
            return true;
        }),
    validateRequest,
];

/**
 * Validator for GET /api/employees/:id/attendance query params
 */
export const listEmployeeAttendanceValidator = [
    query('dateFrom')
        .optional()
        .isISO8601()
        .withMessage('dateFrom must be a valid ISO 8601 date (YYYY-MM-DD)'),
    query('dateTo')
        .optional()
        .isISO8601()
        .withMessage('dateTo must be a valid ISO 8601 date (YYYY-MM-DD)'),
    query('status')
        .optional()
        .toUpperCase()
        .isIn(['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE'])
        .withMessage('status must be one of PRESENT, ABSENT, HALF_DAY, LATE, ON_LEAVE'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .withMessage('page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 200 })
        .toInt()
        .withMessage('limit must be between 1 and 200'),
    validateRequest,
];

/**
 * Validator for GET /api/employees/:id/time-off query params
 */
export const listEmployeeTimeOffValidator = [
    query('status')
        .optional()
        .toUpperCase()
        .isIn(['PENDING', 'APPROVED', 'REFUSED', 'CANCELLED'])
        .withMessage('status must be one of PENDING, APPROVED, REFUSED, CANCELLED'),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('startDate must be a valid ISO 8601 date (YYYY-MM-DD)'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('endDate must be a valid ISO 8601 date (YYYY-MM-DD)'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .withMessage('page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 200 })
        .toInt()
        .withMessage('limit must be between 1 and 200'),
    validateRequest,
];

/**
 * Validator for GET /api/employees/:id/allocations query params
 */
export const listEmployeeAllocationsValidator = [
    query('status')
        .optional()
        .toUpperCase()
        .isIn(['PENDING', 'APPROVED', 'REFUSED', 'EXPIRED'])
        .withMessage('status must be one of PENDING, APPROVED, REFUSED, EXPIRED'),
    query('page')
        .optional()
        .isInt({ min: 1 })
        .toInt()
        .withMessage('page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 200 })
        .toInt()
        .withMessage('limit must be between 1 and 200'),
    validateRequest,
];
