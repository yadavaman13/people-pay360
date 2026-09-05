import {
    getPayslipByIdWithDetails,
    getPayslipsByPayrunId,
    updatePayslipSentStatus,
    updateBulkPayslipsSentStatus,
} from '../../../dao/payslipDocument.dao.js';
import { getPayrunById } from '../../../dao/payrollValidation.dao.js';
import { makePDF } from '../../../services/pdf/index.pdf.service.js';
import { payslipTemplate } from '../../../templates/index.js';
import { sendPayslipEmailWithAttachment } from '../../../services/mail/payslipDelivery.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

/**
 * POST /api/payruns/:id/send-payslips
 * Bulk email distribution of payslips to all employees in a payrun
 */
export async function sendPayrunPayslips(req, res, next) {
    try {
        const { id: payrunId } = req.params;

        const payrun = await getPayrunById(payrunId);
        if (!payrun) {
            return sendResponse({
                res,
                statusCode: 404,
                message: 'Payrun not found',
                success: false,
            });
        }

        // Business Rule: Distribution requires VALIDATED or PAID state
        if (!['VALIDATED', 'PAID'].includes(payrun.status)) {
            return sendResponse({
                res,
                statusCode: 400,
                message: `Cannot distribute payslips for a payrun in "${payrun.status}" status. The payrun must be VALIDATED or PAID before sending.`,
                success: false,
            });
        }

        const payslipRoster = await getPayslipsByPayrunId(payrunId);
        if (payslipRoster.length === 0) {
            return sendResponse({
                res,
                statusCode: 400,
                message: 'No payslips found in this payrun to distribute',
                success: false,
            });
        }

        const results = {
            total: payslipRoster.length,
            sent: 0,
            failed: 0,
            successfulPayslipIds: [],
            errors: [],
        };

        // Process dispatch sequentially or in bounded chunks to prevent CPU/memory exhaustion
        for (const item of payslipRoster) {
            try {
                // Fetch full lines breakdown for accurate PDF
                const fullPayslip = await getPayslipByIdWithDetails(item.id);
                if (!fullPayslip || !fullPayslip.email) {
                    results.failed++;
                    results.errors.push({
                        payslipId: item.id,
                        employeeCode: item.employeeCode,
                        error: 'Employee has no email address on record',
                    });
                    continue;
                }

                // Render PDF
                const html = payslipTemplate(fullPayslip);
                const pdfBuffer = await makePDF({ html });

                const periodStr = fullPayslip.periodStart
                    ? fullPayslip.periodStart.slice(0, 7)
                    : 'period';
                const filename = `Payslip_${fullPayslip.employeeCode}_${periodStr}.pdf`;

                // Dispatch Email
                await sendPayslipEmailWithAttachment({
                    to: fullPayslip.email,
                    employeeName: `${fullPayslip.firstName} ${fullPayslip.lastName}`.trim(),
                    payrunName: fullPayslip.payrunName,
                    periodStart: fullPayslip.periodStart,
                    periodEnd: fullPayslip.periodEnd,
                    netAmount: fullPayslip.netAmount,
                    pdfBuffer,
                    filename,
                });

                results.sent++;
                results.successfulPayslipIds.push(item.id);
            } catch (err) {
                console.error(`Failed to deliver payslip ${item.id}:`, err);
                results.failed++;
                results.errors.push({
                    payslipId: item.id,
                    employeeCode: item.employeeCode,
                    error: err.message || String(err),
                });
            }
        }

        // Batch update status to SENT for successful dispatches
        if (results.successfulPayslipIds.length > 0) {
            await updateBulkPayslipsSentStatus(results.successfulPayslipIds);
        }

        return sendResponse({
            res,
            statusCode: 200,
            message: `Payslip bulk email distribution completed: ${results.sent} sent, ${results.failed} failed`,
            success: true,
            data: {
                total: results.total,
                sent: results.sent,
                failed: results.failed,
                errors: results.errors,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/payslips/:id/send
 * Dispatches an individual payslip email to an employee
 */
export async function sendSinglePayslip(req, res, next) {
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

        if (!payslip.email) {
            return sendResponse({
                res,
                statusCode: 400,
                message: 'Employee does not have an email address configured',
                success: false,
            });
        }

        // Render PDF
        const html = payslipTemplate(payslip);
        const pdfBuffer = await makePDF({ html });

        const periodStr = payslip.periodStart ? payslip.periodStart.slice(0, 7) : 'period';
        const filename = `Payslip_${payslip.employeeCode}_${periodStr}.pdf`;

        // Send Email
        await sendPayslipEmailWithAttachment({
            to: payslip.email,
            employeeName: `${payslip.firstName} ${payslip.lastName}`.trim(),
            payrunName: payslip.payrunName,
            periodStart: payslip.periodStart,
            periodEnd: payslip.periodEnd,
            netAmount: payslip.netAmount,
            pdfBuffer,
            filename,
        });

        // Update status
        const updated = await updatePayslipSentStatus(payslipId);

        return sendResponse({
            res,
            statusCode: 200,
            message: `Payslip successfully sent to ${payslip.email}`,
            success: true,
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}
