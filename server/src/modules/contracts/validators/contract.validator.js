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
 * Validator for contract creation
 */
export const createContractValidator = [
    body('employeeId')
        .notEmpty()
        .withMessage('employeeId is required')
        .isString()
        .withMessage('employeeId must be a valid string'),
    body('salaryStructureId')
        .notEmpty()
        .withMessage('salaryStructureId is required')
        .isUUID()
        .withMessage('salaryStructureId must be a valid UUID'),
    body('startDate')
        .notEmpty()
        .withMessage('startDate is required')
        .isISO8601()
        .withMessage('startDate must be a valid ISO 8601 date (YYYY-MM-DD)'),
    body('endDate')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('endDate must be a valid ISO 8601 date (YYYY-MM-DD)')
        .custom((value, { req }) => {
            if (req.body?.startDate && value < req.body.startDate) {
                throw new Error('endDate must be on or after startDate');
            }
            return true;
        }),
    body('wage')
        .notEmpty()
        .withMessage('wage is required')
        .isFloat({ min: 0 })
        .withMessage('wage must be a non-negative number'),
    body('departmentId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('departmentId must be a valid UUID'),
    body('jobPositionId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('jobPositionId must be a valid UUID'),
    body('workingScheduleId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('workingScheduleId must be a valid UUID'),
    body('status')
        .optional({ nullable: true, checkFalsy: true })
        .toUpperCase()
        .isIn(['DRAFT', 'ACTIVE', 'CANCELLED', 'EXPIRED'])
        .withMessage('Status must be one of DRAFT, ACTIVE, CANCELLED, EXPIRED'),
    body('maxPunchesPerDay')
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1, max: 20 })
        .withMessage('maxPunchesPerDay must be a positive integer between 1 and 20'),
    body('notes')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('notes must be a valid string'),

    validateRequest,
];

/**
 * Validator for updating contract
 */
export const updateContractValidator = [
    param('id')
        .notEmpty()
        .withMessage('Contract ID is required')
        .isUUID()
        .withMessage('Contract ID must be a valid UUID'),
    body('startDate')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('startDate must be a valid ISO 8601 date (YYYY-MM-DD)'),
    body('endDate')
        .optional({ nullable: true, checkFalsy: true })
        .isISO8601()
        .withMessage('endDate must be a valid ISO 8601 date (YYYY-MM-DD)')
        .custom((value, { req }) => {
            if (req.body?.startDate && value < req.body.startDate) {
                throw new Error('endDate must be on or after startDate');
            }
            return true;
        }),
    body('wage')
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 0 })
        .withMessage('wage must be a non-negative number'),
    body('salaryStructureId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('salaryStructureId must be a valid UUID'),
    body('departmentId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('departmentId must be a valid UUID'),
    body('jobPositionId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('jobPositionId must be a valid UUID'),
    body('workingScheduleId')
        .optional({ nullable: true, checkFalsy: true })
        .isUUID()
        .withMessage('workingScheduleId must be a valid UUID'),
    body('status')
        .optional({ nullable: true, checkFalsy: true })
        .toUpperCase()
        .isIn(['DRAFT', 'ACTIVE', 'CANCELLED', 'EXPIRED'])
        .withMessage('Status must be one of DRAFT, ACTIVE, CANCELLED, EXPIRED'),
    body('maxPunchesPerDay')
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1, max: 20 })
        .withMessage('maxPunchesPerDay must be a positive integer between 1 and 20'),
    body('notes')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .trim()
        .withMessage('notes must be a valid string'),

    validateRequest,
];

/**
 * Validator for contract listing
 */
export const listContractsValidator = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('employeeId').optional().isUUID().withMessage('employeeId must be a valid UUID'),
    query('status')
        .optional()
        .custom((val) => {
            const rawList = Array.isArray(val) ? val : String(val).split(',');
            const statuses = rawList.map((s) => String(s).trim().toUpperCase()).filter(Boolean);
            const valid = ['DRAFT', 'ACTIVE', 'CANCELLED', 'EXPIRED'];
            const allOk = statuses.length > 0 && statuses.every((s) => valid.includes(s));
            if (!allOk) {
                throw new Error('Status must be one or more of DRAFT, ACTIVE, CANCELLED, EXPIRED');
            }
            return true;
        }),
    query('departmentId').optional().isUUID().withMessage('departmentId must be a valid UUID'),
    validateRequest,
];
