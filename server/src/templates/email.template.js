import { escapeHtml } from './utils/escapeHtml.js';

const baseStyles = `font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafafb; padding: 20px; color: #111827; margin: 0;`;
const cardStyles = `max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);`;
const headerStyles = `background-color: #111827; color: #ffffff; padding: 30px; text-align: center;`;
const titleStyles = `margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;`;
const contentStyles = `padding: 40px 30px; text-align: left;`;
const textStyles = `font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #374151;`;
const buttonStyles = `display: inline-block; padding: 14px 32px; background-color: #111827; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;`;
const linkFallbackStyles = `font-size: 13px; color: #6b7280; margin-top: 20px; word-break: break-all; line-height: 1.5;`;
const footerStyles = `padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; background-color: #f3f4f6;`;
const noteStyles = `font-size: 14px; color: #6b7280; margin-top: 30px; line-height: 1.5;`;
const otpBoxStyles = `display: block; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827; background-color: #f3f4f6; padding: 16px 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 24px auto; text-align: center; width: max-content;`;

const emailStyles = `
  body { ${baseStyles} }
  .container { ${cardStyles} }
  .header { ${headerStyles} }
  .header h1 { ${titleStyles} }
  .content { ${contentStyles} }
  .content p { ${textStyles} }
  .btn-wrapper { text-align: center; margin: 40px 0; }
  .btn { ${buttonStyles} }
  .link-fallback { ${linkFallbackStyles} }
  .footer { ${footerStyles} }
  .note { ${noteStyles} }
  .otp-box { ${otpBoxStyles} }
`;

export const otpEmailTemplate = (otp) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Verification Code</title>
      <style>
        ${emailStyles}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PeoplePay360 </h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for choosing PeoplePay360 . Please use the following one-time password (OTP) code to complete your email verification process:</p>
          <div class="otp-box">${otp}</div>
          <p>This verification code is valid for 10 minutes. For security reasons, please do not share this OTP with anyone.</p>
          <p class="note">If you did not request this code, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PeoplePay360 . All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const forgotPasswordOtpEmailTemplate = (otp) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        ${emailStyles}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PeoplePay360 </h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to reset the password for your PeoplePay360  account. Use the following one-time password (OTP) code to complete the reset process:</p>
          <div class="otp-box">${otp}</div>
          <p>This code expires in 10 minutes. If you did not make this request, your account is still secure and you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PeoplePay360 . All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const recoverAccountOtpEmailTemplate = (otp) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recover Your Account</title>
      <style>
        ${emailStyles}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PeoplePay360 </h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We received a request to recover your deleted PeoplePay360  account. Use the following one-time password (OTP) code to reactivate your account:</p>
          <div class="otp-box">${otp}</div>
          <p>This code expires in 10 minutes. Once verified, your account and all associated data will be fully recovered.</p>
          <p class="note">If you did not initiate this recovery process, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PeoplePay360 . All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const accountRecoveredEmailTemplate = () => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Successfully Recovered</title>
      <style>
        ${emailStyles}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PeoplePay360 </h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>We are pleased to inform you that your PeoplePay360  account associated with this email address has been successfully recovered and reactivated.</p>
          <p>You can now log in using your password.</p>
          <p class="note">If you did not initiate this action, please contact support immediately.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PeoplePay360 . All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const accountCreatedEmailTemplate = ({
    firstName,
    lastName,
    email,
    role,
    temporaryPassword,
}) => {
    const roleLabels = {
        EMPLOYEE: 'Employee',
        HR_MANAGER: 'HR Manager',
        HR_PAYROLL_USER: 'HR Payroll User',
        HR_PAYROLL_MANAGER: 'HR Payroll Manager',
        ADMIN: 'Administrator',
    };

    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);
    const safeEmail = escapeHtml(email);
    const safeRole = escapeHtml(roleLabels[role] || role);
    const safePassword = escapeHtml(temporaryPassword);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to PeoplePay360 — Your Account Details</title>
      <style>
        ${emailStyles}
        .cred-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .cred-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 15px; }
        .cred-table td.label { font-weight: 600; color: #374151; width: 40%; }
        .cred-table td.val { color: #111827; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PeoplePay360</h1>
        </div>
        <div class="content">
          <p>Hello ${safeFirstName} ${safeLastName},</p>
          <p>Your PeoplePay360 account has been created by an administrator. Here are your account details and login credentials:</p>
          
          <table class="cred-table">
            <tr>
              <td class="label">Login Email:</td>
              <td class="val">${safeEmail}</td>
            </tr>
            <tr>
              <td class="label">Assigned Role:</td>
              <td class="val">${safeRole}</td>
            </tr>
          </table>

          <p style="margin-bottom: 8px; font-weight: 600; color: #374151;">Temporary Password:</p>
          <div class="otp-box" style="font-size: 24px; letter-spacing: 2px;">${safePassword}</div>

          <p>Please use these credentials to log in to your account.</p>
          <p class="note"><strong>Security Notice:</strong> This is a temporary password. For your security, you are strongly advised to change your password immediately after logging in.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PeoplePay360. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const payslipEmailTemplate = ({
    employeeName,
    payrunName,
    periodStart,
    periodEnd,
    netAmount,
}) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Payslip is Ready - PeoplePay360</title>
      <style>
        ${emailStyles}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PeoplePay360</h1>
        </div>
        <div class="content">
          <p>Dear ${employeeName || 'Employee'},</p>
          <p>Your payslip for <strong>${payrunName || 'the pay period'}</strong> (${periodStart || ''} to ${periodEnd || ''}) has been finalized and processed.</p>
          <div class="otp-box" style="font-size: 22px; letter-spacing: 1px; font-family: inherit;">Net Pay: ₹${netAmount || '0.00'}</div>
          <p>Your official salary slip has been attached to this email as a PDF document for your records.</p>
          <p class="note">If you have any discrepancies or questions regarding your salary computation or tax deductions, please reach out to your HR/Payroll department.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PeoplePay360. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const timeOffDecisionEmailTemplate = ({
    employeeName,
    status,
    typeName,
    startDate,
    endDate,
    numberOfDays,
    reviewNotes,
}) => {
    const isApproved = status === 'APPROVED';
    const statusColor = isApproved ? '#15803d' : '#b91c1c';
    const statusBg = isApproved ? '#dcfce7' : '#fee2e2';
    const statusLabel = isApproved ? 'APPROVED' : 'REFUSED';

    const safeName = escapeHtml(employeeName || 'Employee');
    const safeType = escapeHtml(typeName || 'Time Off');
    const safeStart = escapeHtml(String(startDate || ''));
    const safeEnd = escapeHtml(String(endDate || ''));
    const safeDays = escapeHtml(String(numberOfDays || '0'));
    const safeNotes = reviewNotes ? escapeHtml(reviewNotes) : null;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Time Off Request ${statusLabel} - PeoplePay360</title>
      <style>
        ${emailStyles}
        .cred-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .cred-table td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 15px; }
        .cred-table td.label { font-weight: 600; color: #374151; width: 40%; }
        .cred-table td.val { color: #111827; }
        .status-pill {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.5px;
          background-color: ${statusBg};
          color: ${statusColor};
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PeoplePay360</h1>
        </div>
        <div class="content">
          <p>Dear ${safeName},</p>
          <p>Your time off request has been reviewed by your management/HR team. Here is the official decision:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <span class="status-pill">${statusLabel}</span>
          </div>

          <table class="cred-table">
            <tr>
              <td class="label">Leave Type:</td>
              <td class="val">${safeType}</td>
            </tr>
            <tr>
              <td class="label">Duration:</td>
              <td class="val"><strong>${safeDays} Days</strong></td>
            </tr>
            <tr>
              <td class="label">Period:</td>
              <td class="val">${safeStart} to ${safeEnd}</td>
            </tr>
            ${
                safeNotes
                    ? `<tr>
              <td class="label">Review Notes:</td>
              <td class="val">${safeNotes}</td>
            </tr>`
                    : ''
            }
          </table>

          <p>${
              isApproved
                  ? 'Your requested time off dates have been officially scheduled and your leave balance has been updated.'
                  : 'If you have any questions or require additional details regarding this refusal, please speak with your reporting manager or HR department.'
          }</p>

          <p class="note">You can view your current leave balances and request history at any time through the PeoplePay360 portal.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} PeoplePay360. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
