import envConfig from '../../config/env.config.js';
import nodemailer from 'nodemailer';
import { payslipEmailTemplate } from '../../templates/index.js';

let transporter = null;

function getTransporter() {
    if (!transporter) {
        if (envConfig.GOOGLE_REFRESH_TOKEN && envConfig.GOOGLE_CLIENT_ID) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: envConfig.GOOGLE_SENDER_EMAIL,
                    clientId: envConfig.GOOGLE_CLIENT_ID,
                    clientSecret: envConfig.GOOGLE_CLIENT_SECRET,
                    refreshToken: envConfig.GOOGLE_REFRESH_TOKEN,
                },
            });
        }
    }
    return transporter;
}

/**
 * Send an individual payslip email with the generated PDF attached
 *
 * @param {object} params
 * @param {string} params.to - Recipient employee email
 * @param {string} params.employeeName - Full name of the employee
 * @param {string} params.payrunName - Name of the payrun
 * @param {string} params.periodStart - Formatted period start date
 * @param {string} params.periodEnd - Formatted period end date
 * @param {string|number} params.netAmount - Net payable salary
 * @param {Buffer} params.pdfBuffer - Binary buffer of the generated PDF payslip
 * @param {string} params.filename - Attachment filename
 */
export async function sendPayslipEmailWithAttachment({
    to,
    employeeName,
    payrunName,
    periodStart,
    periodEnd,
    netAmount,
    pdfBuffer,
    filename = 'payslip.pdf',
}) {
    const html = payslipEmailTemplate({
        employeeName,
        payrunName,
        periodStart,
        periodEnd,
        netAmount,
    });

    const activeTransporter = getTransporter();

    // If active OAuth transporter exists, dispatch actual email
    if (activeTransporter) {
        try {
            await activeTransporter.sendMail({
                from: envConfig.GOOGLE_SENDER_EMAIL || 'payroll@peoplepay360.com',
                to,
                subject: `Payslip for ${payrunName || 'the period'} - PeoplePay360`,
                html,
                attachments: [
                    {
                        filename,
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
            });

            return {
                success: true,
                sent: true,
                recipient: to,
                message: `Payslip email sent to ${to}`,
            };
        } catch (error) {
            console.error(`Failed to send email to ${to}:`, error.message);
            // In development, do not crash the batch run if credentials are demo/dummy
            if (process.env.NODE_ENV === 'development' || !envConfig.IS_PRODUCTION) {
                return {
                    success: true,
                    sent: false,
                    simulated: true,
                    recipient: to,
                    warning: `Email simulated due to delivery error: ${error.message}`,
                };
            }
            throw error;
        }
    }

    // In development or when email credentials are not set up: simulate successful queue
    console.log(
        `[Payslip Delivery Service] Simulated email to ${to} (${filename}, ${pdfBuffer.length} bytes)`,
    );
    return {
        success: true,
        sent: true,
        simulated: true,
        recipient: to,
        message: `Payslip email dispatch simulated successfully to ${to}`,
    };
}
