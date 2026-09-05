import express from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import {
    wizardValidate,
    createPayrun,
    getAllPayruns,
    getPayrunById,
    updatePayrun,
    deletePayrun,
    computePayrun,
    markPayrunAsPaid,
} from '../controllers/payrun.controller.js';
import {
    wizardValidateValidator,
    createPayrunValidator,
    updatePayrunValidator,
    payrunIdParamValidator,
    markPaidValidator,
    listPayrunsValidator,
} from '../validators/payrun.validator.js';
import {
    getPayrunWarnings,
    validatePayrun,
} from '../../validation/controllers/payrollValidation.controller.js';
import { sendPayrunPayslips } from '../../payslips/controllers/payslipDelivery.controller.js';
import { validatePayrunValidator } from '../../validation/validators/payrollValidation.validator.js';

const router = express.Router();

router.use(protect);

// ── Wizard & Batch Creation ──────────────────────────────────────────────────
router.post(
    '/wizard/validate',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    wizardValidateValidator,
    wizardValidate,
);

router.post(
    '/',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    createPayrunValidator,
    createPayrun,
);

router.get(
    '/',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    listPayrunsValidator,
    getAllPayruns,
);

router.get(
    '/:id',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    payrunIdParamValidator,
    getPayrunById,
);

router.patch(
    '/:id',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    updatePayrunValidator,
    updatePayrun,
);

router.delete(
    '/:id',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    payrunIdParamValidator,
    deletePayrun,
);

// ── Lifecycle Actions ────────────────────────────────────────────────────────
router.post(
    '/:id/compute',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    payrunIdParamValidator,
    computePayrun,
);

// Pre-validation warnings audit (Dev 4)
router.get(
    '/:id/warnings',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    payrunIdParamValidator,
    getPayrunWarnings,
);

// Validation lock (Dev 4)
router.post(
    '/:id/validate',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    validatePayrunValidator,
    validatePayrun,
);

// Financial Settlement (Dev 3)
router.post(
    '/:id/mark-paid',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    markPaidValidator,
    markPayrunAsPaid,
);

// Bulk payslips email distribution (Dev 4)
router.post(
    '/:id/send-payslips',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    payrunIdParamValidator,
    sendPayrunPayslips,
);

export default router;
