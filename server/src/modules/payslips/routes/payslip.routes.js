import express from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import {
    getAllPayslips,
    getPayslipById,
    getPayslipLines,
    updatePayslip,
    deletePayslip,
    recomputePayslip,
} from '../controllers/payslip.controller.js';
import {
    generatePayslipPdf,
    previewPayslipHtml,
} from '../controllers/payslipDocument.controller.js';
import { sendSinglePayslip } from '../controllers/payslipDelivery.controller.js';
import {
    payslipIdParamValidator,
    listPayslipsValidator,
    updatePayslipValidator,
    pdfViewQueryValidator,
} from '../validators/payslip.validator.js';

const router = express.Router();

router.use(protect);

// ── Dev 3: Payslip Management & Calculation ──────────────────────────────────
router.get('/', listPayslipsValidator, getAllPayslips);

router.get('/:id', payslipIdParamValidator, getPayslipById);

router.get('/:id/lines', payslipIdParamValidator, getPayslipLines);

router.patch(
    '/:id',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    updatePayslipValidator,
    updatePayslip,
);

router.delete(
    '/:id',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    payslipIdParamValidator,
    deletePayslip,
);

router.post(
    '/:id/compute',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    payslipIdParamValidator,
    recomputePayslip,
);

// ── Dev 4: Payslip Document Rendering & Email Distribution ────────────────────
router.get('/:id/pdf', pdfViewQueryValidator, generatePayslipPdf);

router.get('/:id/preview', payslipIdParamValidator, previewPayslipHtml);

router.post(
    '/:id/send',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    payslipIdParamValidator,
    sendSinglePayslip,
);

export default router;
