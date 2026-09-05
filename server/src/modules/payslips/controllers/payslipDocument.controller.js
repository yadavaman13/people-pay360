import { getPayslipByIdWithDetails } from '../../../dao/payslipDocument.dao.js';
import { makePDF } from '../../../services/pdf/index.pdf.service.js';
import { payslipTemplate } from '../../../templates/index.js';
import { sendResponse, sendPdfResponse } from '../../../utils/response.utlis.js';

/**
 * Check if the requesting user has permission to view this specific payslip
 *
 * @param {object} user - Authenticated user object from req.user
 * @param {object} payslip - Payslip record
 * @returns {boolean}
 */
function canAccessPayslip(user, payslip) {
    if (!user) return false;
    // HR and Admins can view any payslip
    if (['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(user.role)) {
        return true;
    }
    // An employee can view their own payslip
    if (user.role === 'EMPLOYEE' && payslip.email && user.email) {
        return user.email.toLowerCase() === payslip.email.toLowerCase();
    }
    return false;
}

/**
 * GET /api/payslips/:id/pdf
 * Generates and streams Chromium-free Payslip PDF
 */
export async function generatePayslipPdf(req, res, next) {
    try {
        const { id: payslipId } = req.params;
        const isInline = req.query.inline === 'true' || req.query.inline === true;

        const payslip = await getPayslipByIdWithDetails(payslipId);
        if (!payslip) {
            return sendResponse({
                res,
                statusCode: 404,
                message: 'Payslip not found',
                success: false,
            });
        }

        // Access check
        if (!canAccessPayslip(req.user, payslip)) {
            return sendResponse({
                res,
                statusCode: 403,
                message: 'Access denied: You are not authorized to view this payslip',
                success: false,
            });
        }

        // Render HTML
        const html = payslipTemplate(payslip);

        // Generate PDF Buffer via html-pdf-lite (Chromium-free)
        const pdfBuffer = await makePDF({
            html,
            options: {
                format: 'A4',
                orientation: 'portrait',
                margin: {
                    top: '15mm',
                    right: '15mm',
                    bottom: '15mm',
                    left: '15mm',
                },
            },
        });

        const empCode = payslip.employeeCode || 'EMP';
        const periodStr = payslip.periodStart ? payslip.periodStart.slice(0, 7) : 'period';
        const filename = `Payslip_${empCode}_${periodStr}.pdf`;

        return sendPdfResponse({
            res,
            pdfBuffer,
            filename,
            isInline,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/payslips/:id/preview
 * Renders raw HTML for fast browser or iframe preview
 */
export async function previewPayslipHtml(req, res, next) {
    try {
        const { id: payslipId } = req.params;

        const payslip = await getPayslipByIdWithDetails(payslipId);
        if (!payslip) {
            return sendResponse({
                res,
                statusCode: 404,
                message: 'Payslip not found',
                success: false,
            });
        }

        if (!canAccessPayslip(req.user, payslip)) {
            return sendResponse({
                res,
                statusCode: 403,
                message: 'Access denied: You are not authorized to view this payslip preview',
                success: false,
            });
        }

        const html = payslipTemplate(payslip);
        res.type('html');
        return res.send(html);
    } catch (error) {
        next(error);
    }
}
