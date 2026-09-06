import { sendEmail } from '../services/mail/mail.service.js';
import { employeeWelcomeEmailTemplate } from '../templates/email.template.js';

export const emailDispatchTracker = {
    history: [],
    clear() {
        this.history = [];
    },
};

/**
 * Send welcome email to newly created employee containing ID and temporary password
 *
 * @param {string} toEmail - Target employee email address
 * @param {object} details
 * @param {string} [details.employeeId] - Master employee UUID
 * @param {string} [details.employeeCode] - Unique employee code
 * @param {string} [details.employeeName] - Full name of the employee
 * @param {string} details.tempPassword - Generated temporary password
 * @returns {Promise<any>}
 */
export async function sendEmployeeWelcome(
    toEmail,
    { employeeId = '', employeeCode = '', employeeName = '', tempPassword = '' } = {},
) {
    if (!toEmail) {
        throw new Error('Recipient email is required to send employee welcome email');
    }

    emailDispatchTracker.history.push({
        toEmail,
        employeeId,
        employeeCode: employeeCode || employeeId,
        employeeName,
        tempPassword,
    });

    if (process.env.NODE_ENV === 'test' && !process.env.SEND_TEST_EMAILS) {
        return { messageId: 'mock-test-email-id', success: true };
    }

    const html = employeeWelcomeEmailTemplate({
        employeeName,
        employeeId,
        employeeCode: employeeCode || employeeId,
        email: toEmail,
        temporaryPassword: tempPassword,
    });

    const subject = 'Welcome to PeoplePay360 — Your Account Credentials';
    const text = `Welcome to PeoplePay360! Your employee identifier is ${employeeCode || employeeId}. Your temporary password is: ${tempPassword}. Please log in and change your password immediately.`;

    return sendEmail({
        to: toEmail,
        subject,
        html,
        text,
    });
}

export const emailService = {
    sendEmployeeWelcome,
};
