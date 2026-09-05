import { escapeHtml, formatCurrency, formatDate } from './utils/escapeHtml.js';
import { MONOCHROME_LOGO_SVG, SHARED_PDF_STYLES } from './pdf.template.js';

/**
 * Converts a positive number to Indian Rupees in words
 */
function numberToWords(num) {
    const a = [
        '',
        'One',
        'Two',
        'Three',
        'Four',
        'Five',
        'Six',
        'Seven',
        'Eight',
        'Nine',
        'Ten',
        'Eleven',
        'Twelve',
        'Thirteen',
        'Fourteen',
        'Fifteen',
        'Sixteen',
        'Seventeen',
        'Eighteen',
        'Nineteen',
    ];
    const b = [
        '',
        '',
        'Twenty',
        'Thirty',
        'Forty',
        'Fifty',
        'Sixty',
        'Seventy',
        'Eighty',
        'Ninety',
    ];

    const n = Math.floor(Number(num) || 0);
    if (n === 0) return 'Zero';

    function convert(val) {
        if (val < 20) return a[val];
        if (val < 100) return b[Math.floor(val / 10)] + (val % 10 ? ' ' + a[val % 10] : '');
        if (val < 1000)
            return (
                a[Math.floor(val / 100)] +
                ' Hundred' +
                (val % 100 ? ' and ' + convert(val % 100) : '')
            );
        if (val < 100000)
            return (
                convert(Math.floor(val / 1000)) +
                ' Thousand' +
                (val % 1000 ? ' ' + convert(val % 1000) : '')
            );
        if (val < 10000000)
            return (
                convert(Math.floor(val / 100000)) +
                ' Lakh' +
                (val % 100000 ? ' ' + convert(val % 100000) : '')
            );
        return (
            convert(Math.floor(val / 10000000)) +
            ' Crore' +
            (val % 10000000 ? ' ' + convert(val % 10000000) : '')
        );
    }

    return convert(n) + ' Rupees Only';
}

/**
 * Mask account number for confidentiality (e.g. '••••••••1234')
 */
function maskAccountNumber(acc) {
    if (!acc) return 'N/A';
    const str = String(acc).trim();
    if (str.length <= 4) return str;
    return '•••• ' + str.slice(-4);
}

/**
 * Renders high-fidelity, Chromium-free Payslip HTML
 *
 * @param {object} payslip
 * @returns {string} Fully self-contained HTML
 */
export function payslipTemplate(payslip = {}) {
    const company = {
        name: 'PeoplePay360 Inc.',
        address: 'Tower B, Tech Park, Outer Ring Road, Bangalore - 560103',
        taxId: 'PAN: AAACP1234M | GSTIN: 29AAACP1234M1Z5',
    };

    const periodLabel =
        payslip.periodStart && payslip.periodEnd
            ? `${formatDate(payslip.periodStart)} – ${formatDate(payslip.periodEnd)}`
            : 'Current Period';

    const netWords = numberToWords(payslip.netAmount || 0);

    // Group lines into Earnings and Deductions
    const lines = payslip.lines || [];
    const earnings = lines.filter((l) => ['BASIC', 'ALLOWANCE', 'GROSS'].includes(l.category));
    const deductions = lines.filter((l) => l.category === 'DEDUCTION');

    const maxRows = Math.max(earnings.length, deductions.length, 1);

    // Build side-by-side rows
    let lineRows = '';
    for (let i = 0; i < maxRows; i++) {
        const earn = earnings[i] || null;
        const ded = deductions[i] || null;

        lineRows += `
          <tr>
            <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; font-size: 9.5pt;">${earn ? escapeHtml(earn.name) : ''}</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; font-size: 9.5pt; font-family: monospace; border-right: 1px solid #D1D5DB;">
              ${earn ? formatCurrency(earn.amount, 'INR') : ''}
            </td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; font-size: 9.5pt;">${ded ? escapeHtml(ded.name) : ''}</td>
            <td style="padding: 7px 10px; border-bottom: 1px solid #E5E7EB; text-align: right; font-size: 9.5pt; font-family: monospace;">
              ${ded ? formatCurrency(ded.amount, 'INR') : ''}
            </td>
          </tr>
        `;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${escapeHtml(payslip.employeeCode || '')} - ${escapeHtml(periodLabel)}</title>
  <style>
    ${SHARED_PDF_STYLES}

    .payslip-box {
      border: 1.5px solid #000000;
      padding: 24px;
      margin: 0 auto;
      background: #FFFFFF;
    }

    .payslip-header {
      border-bottom: 2px solid #000000;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }

    .company-title {
      font-size: 16pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #000000;
    }

    .doc-type-badge {
      display: inline-block;
      background: #000000;
      color: #FFFFFF;
      padding: 4px 10px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 4px;
    }

    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    .info-table td {
      padding: 4px 6px;
      vertical-align: top;
      font-size: 9pt;
    }

    .info-label {
      color: #4B5563;
      font-weight: 600;
      width: 18%;
    }

    .info-val {
      color: #000000;
      font-weight: 700;
      width: 32%;
    }

    .salary-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000000;
      margin-bottom: 16px;
    }

    .salary-table th {
      background: #F3F4F6;
      color: #000000;
      font-weight: 700;
      font-size: 9.5pt;
      text-transform: uppercase;
      padding: 8px 10px;
      border-bottom: 1px solid #000000;
    }

    .totals-row td {
      background: #F9FAFB;
      font-weight: 700;
      font-size: 10pt;
      padding: 8px 10px;
      border-top: 1.5px solid #000000;
    }

    .net-banner {
      border: 1.5px solid #000000;
      background: #F9FAFB;
      padding: 12px 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .net-title {
      font-size: 9pt;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
    }

    .net-amount {
      font-size: 16pt;
      font-weight: 800;
      color: #000000;
    }

    .net-words {
      font-size: 8.5pt;
      color: #4B5563;
      font-style: italic;
      margin-top: 2px;
    }

    .footer-note {
      font-size: 8pt;
      color: #6B7280;
      text-align: center;
      margin-top: 20px;
      border-top: 1px dashed #D1D5DB;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <div class="payslip-box">

      <!-- Header Section -->
      <div class="payslip-header">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 60%; vertical-align: top;">
              <div style="display: flex; align-items: center;">
                <div style="margin-right: 12px; display: inline-block;">${MONOCHROME_LOGO_SVG}</div>
                <div style="display: inline-block;">
                  <div class="company-title">${escapeHtml(company.name)}</div>
                  <div style="font-size: 8.5pt; color: #4B5563; margin-top: 2px;">${escapeHtml(company.address)}</div>
                  <div style="font-size: 8pt; color: #6B7280;">${escapeHtml(company.taxId)}</div>
                </div>
              </div>
            </td>
            <td style="width: 40%; vertical-align: top; text-align: right;">
              <div class="doc-type-badge">PAYSLIP</div>
              <div style="font-size: 10pt; font-weight: 700; margin-top: 6px;">${escapeHtml(payslip.payrunName || 'Regular Payrun')}</div>
              <div style="font-size: 8.5pt; color: #4B5563;">Period: ${escapeHtml(periodLabel)}</div>
              <div style="font-size: 8.5pt; color: #4B5563;">Pay Date: ${escapeHtml(formatDate(payslip.payrunPaymentDate || payslip.paidAt || new Date()))}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Employee Information Grid -->
      <table class="info-table" style="background: #FBFBFC; border: 1px solid #E5E7EB; border-radius: 4px; padding: 8px;">
        <tr>
          <td class="info-label">Employee Code:</td>
          <td class="info-val">${escapeHtml(payslip.employeeCode || 'N/A')}</td>
          <td class="info-label">Bank Name:</td>
          <td class="info-val">${escapeHtml(payslip.bankName || 'Direct Credit')}</td>
        </tr>
        <tr>
          <td class="info-label">Employee Name:</td>
          <td class="info-val">${escapeHtml((payslip.firstName || '') + ' ' + (payslip.lastName || ''))}</td>
          <td class="info-label">Account No:</td>
          <td class="info-val" style="font-family: monospace;">${escapeHtml(maskAccountNumber(payslip.accountNumber))}</td>
        </tr>
        <tr>
          <td class="info-label">Department:</td>
          <td class="info-val">${escapeHtml(payslip.departmentName || 'General')}</td>
          <td class="info-label">IFSC Code:</td>
          <td class="info-val" style="font-family: monospace;">${escapeHtml(payslip.ifscCode || 'N/A')}</td>
        </tr>
        <tr>
          <td class="info-label">Designation:</td>
          <td class="info-val">${escapeHtml(payslip.jobTitle || 'Employee')}</td>
          <td class="info-label">Days Worked:</td>
          <td class="info-val">${escapeHtml(payslip.workedDays ? String(payslip.workedDays) : '30')} Days</td>
        </tr>
        <tr>
          <td class="info-label">Date of Joining:</td>
          <td class="info-val">${escapeHtml(formatDate(payslip.hireDate))}</td>
          <td class="info-label">Structure:</td>
          <td class="info-val">${escapeHtml(payslip.structureName || 'Standard Salary')}</td>
        </tr>
      </table>

      <!-- Earnings and Deductions Table -->
      <table class="salary-table">
        <thead>
          <tr>
            <th style="width: 32%; text-align: left;">Earnings</th>
            <th style="width: 18%; text-align: right; border-right: 1px solid #000000;">Amount</th>
            <th style="width: 32%; text-align: left;">Deductions</th>
            <th style="width: 18%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows}
          <tr class="totals-row">
            <td>Gross Earnings</td>
            <td style="text-align: right; border-right: 1px solid #D1D5DB; font-family: monospace;">${formatCurrency(payslip.grossAmount || 0, 'INR')}</td>
            <td>Total Deductions</td>
            <td style="text-align: right; font-family: monospace;">${formatCurrency(payslip.deductionAmount || 0, 'INR')}</td>
          </tr>
        </tbody>
      </table>

      <!-- Net Pay Highlight Banner -->
      <table style="width: 100%; border: 1.5px solid #000000; background: #F9FAFB; padding: 10px; margin-bottom: 16px;">
        <tr>
          <td style="width: 60%; vertical-align: middle;">
            <div class="net-title">Net Take-Home Salary</div>
            <div class="net-words">${escapeHtml(netWords)}</div>
          </td>
          <td style="width: 40%; text-align: right; vertical-align: middle;">
            <div class="net-amount">${formatCurrency(payslip.netAmount || 0, 'INR')}</div>
            <div style="font-size: 8pt; color: #10B981; font-weight: 700;">CONFIRMED & PROCESSED</div>
          </td>
        </tr>
      </table>

      <!-- Footer & Audit Trail -->
      <div class="footer-note">
        This is a system-generated electronic payslip verified by PeoplePay360 HR & Payroll Engine.<br>
        Generated on ${formatDate(new Date())} | Payslip ID: ${escapeHtml(payslip.id || '')}
      </div>

    </div>
  </div>
</body>
</html>
  `.trim();
}
