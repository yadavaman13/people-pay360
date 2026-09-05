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

export const createSalaryStructureValidator = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Structure name is required')
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters'),
    body('code')
        .trim()
        .notEmpty()
        .withMessage('Structure code is required')
        .isLength({ max: 50 })
        .withMessage('Code cannot exceed 50 characters'),
    body('description')
        .optional({ nullable: true })
        .isString()
        .withMessage('Description must be a string'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest,
];

export const updateSalaryStructureValidator = [
    param('id').isUUID().withMessage('Valid structure UUID is required'),
    body('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Structure name cannot be empty')
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters'),
    body('code')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Structure code cannot be empty')
        .isLength({ max: 50 })
        .withMessage('Code cannot exceed 50 characters'),
    body('description')
        .optional({ nullable: true })
        .isString()
        .withMessage('Description must be a string'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest,
];

export const structureIdParamValidator = [
    param('id').isUUID().withMessage('Valid structure UUID is required'),
    validateRequest,
];

export const ruleIdParamValidator = [
    param('id').isUUID().withMessage('Valid structure UUID is required'),
    param('ruleId').isUUID().withMessage('Valid rule UUID is required'),
    validateRequest,
];

export const listSalaryStructuresValidator = [
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),
    query('search').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    validateRequest,
];

export const addRuleToStructureValidator = [
    param('id').isUUID().withMessage('Valid structure UUID is required'),
    body('code').trim().notEmpty().withMessage('Rule code is required'),
    body('name').trim().notEmpty().withMessage('Rule name is required'),
    body('category')
        .trim()
        .toUpperCase()
        .isIn(['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET', 'OTHER'])
        .withMessage('Category must be one of: BASIC, ALLOWANCE, GROSS, DEDUCTION, NET, OTHER'),
    body('sequenceOrder').isInt({ min: 1 }).withMessage('sequenceOrder must be a positive integer'),
    body('computationType')
        .trim()
        .toUpperCase()
        .isIn(['FIXED', 'PERCENTAGE', 'FORMULA'])
        .withMessage('computationType must be FIXED, PERCENTAGE, or FORMULA'),
    body('fixedAmount')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('fixedAmount must be a non-negative number'),
    body('percentageBaseCode').optional({ nullable: true }).isString().trim(),
    body('percentageRate')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('percentageRate must be a non-negative number'),
    body('formulaExpression').optional({ nullable: true }).isString().trim(),
    validateRequest,
];

export const updateRuleInStructureValidator = [
    param('id').isUUID().withMessage('Valid structure UUID is required'),
    param('ruleId').isUUID().withMessage('Valid rule UUID is required'),
    body('code').optional().trim().notEmpty().withMessage('Rule code cannot be empty'),
    body('name').optional().trim().notEmpty().withMessage('Rule name cannot be empty'),
    body('category')
        .optional()
        .trim()
        .toUpperCase()
        .isIn(['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET', 'OTHER'])
        .withMessage('Category must be one of: BASIC, ALLOWANCE, GROSS, DEDUCTION, NET, OTHER'),
    body('sequenceOrder')
        .optional()
        .isInt({ min: 1 })
        .withMessage('sequenceOrder must be a positive integer'),
    body('computationType')
        .optional()
        .trim()
        .toUpperCase()
        .isIn(['FIXED', 'PERCENTAGE', 'FORMULA'])
        .withMessage('computationType must be FIXED, PERCENTAGE, or FORMULA'),
    body('fixedAmount')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('fixedAmount must be a non-negative number'),
    body('percentageBaseCode').optional({ nullable: true }).isString().trim(),
    body('percentageRate')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('percentageRate must be a non-negative number'),
    body('formulaExpression').optional({ nullable: true }).isString().trim(),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validateRequest,
];
