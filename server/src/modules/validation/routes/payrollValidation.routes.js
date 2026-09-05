import express from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import { getPayrunWarnings, validatePayrun } from '../controllers/payrollValidation.controller.js';
import { sendPayrunPayslips } from '../../payslips/controllers/payslipDelivery.controller.js';
import {
    payrunIdParamValidator,
    validatePayrunValidator,
} from '../validators/payrollValidation.validator.js';

const router = express.Router();

// Apply auth guard to all validation & delivery routes
router.use(protect);

/**
 * GET /api/payruns/:id/warnings
 * RBAC: HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN
 */
router.get(
    '/:id/warnings',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    payrunIdParamValidator,
    getPayrunWarnings,
);

/**
 * POST /api/payruns/:id/validate
 * RBAC: HR_PAYROLL_MANAGER, ADMIN
 */
router.post(
    '/:id/validate',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    validatePayrunValidator,
    validatePayrun,
);

/**
 * POST /api/payruns/:id/send-payslips
 * RBAC: HR_PAYROLL_MANAGER, ADMIN
 * Bulk email payslips to employees with attached PDF
 */
router.post(
    '/:id/send-payslips',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    payrunIdParamValidator,
    sendPayrunPayslips,
);

export default router;
