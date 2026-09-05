import express from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import {
    generatePayslipPdf,
    previewPayslipHtml,
} from '../controllers/payslipDocument.controller.js';
import { sendSinglePayslip } from '../controllers/payslipDelivery.controller.js';
import { payslipIdParamValidator, pdfViewQueryValidator } from '../validators/payslip.validator.js';

const router = express.Router();

// Apply auth guard to all payslip document routes
router.use(protect);

/**
 * GET /api/payslips/:id/pdf
 * Access: Employee (own payslip) or HR+ (any)
 */
router.get('/:id/pdf', pdfViewQueryValidator, generatePayslipPdf);

/**
 * GET /api/payslips/:id/preview
 * Access: Employee (own payslip) or HR+ (any)
 */
router.get('/:id/preview', payslipIdParamValidator, previewPayslipHtml);

/**
 * POST /api/payslips/:id/send
 * RBAC: HR_PAYROLL_MANAGER, ADMIN
 */
router.post(
    '/:id/send',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    payslipIdParamValidator,
    sendSinglePayslip,
);

export default router;
