import axios from 'axios';
import { downloadPdfFromApi } from '@/utils/pdfDownload';
import { fetchPayruns, fetchPayrunWarnings as fetchWarningsByPayrun } from './payroll.api';

const payslipApiInstance = axios.create({
    baseURL: '/api/payslips',
    withCredentials: true,
});

/**
 * Fetch paginated payslips with optional payrun, employee, and status filters
 * @param {object} [params={}] - { payrunId, employeeId, status, page, limit }
 */
export async function fetchPayslips(params = {}) {
    const response = await payslipApiInstance.get('/', { params });
    return response.data;
}

/**
 * Fetch all payslips for a given payrun ID
 * @param {string} payrunId
 */
export async function fetchPayslipsByPayrun(payrunId) {
    const response = await payslipApiInstance.get('/', {
        params: { payrunId },
    });
    return response.data;
}

/**
 * Fetch payrun list for period dropdown options
 * @param {object} [params={ limit: 50 }]
 */
export async function fetchPayrunsForDropdown(params = { limit: 50 }) {
    return await fetchPayruns(params);
}

/**
 * Fetch warnings for a specific payrun to cross-reference employee warnings
 * @param {string} payrunId
 */
export async function fetchPayrunWarnings(payrunId) {
    return await fetchWarningsByPayrun(payrunId);
}

/**
 * Fetch detailed payslip by ID
 * @param {string} id
 */
export async function fetchPayslipById(id) {
    const response = await payslipApiInstance.get(`/${id}`);
    return response.data;
}

/**
 * Fetch computed itemized lines for a payslip
 * @param {string} id
 */
export async function fetchPayslipLines(id) {
    const response = await payslipApiInstance.get(`/${id}/lines`);
    return response.data;
}

/**
 * Download payslip PDF directly using browser streaming
 * @param {string} id
 * @param {string} [employeeCode='EMP']
 * @param {string} [period='']
 */
export async function downloadPayslipPdf(id, employeeCode = 'EMP', period = '') {
    const cleanPeriod = period ? period.slice(0, 7) : 'period';
    const filename = `Payslip_${employeeCode}_${cleanPeriod}.pdf`;
    return await downloadPdfFromApi(`/api/payslips/${id}/pdf`, filename);
}

/**
 * Recompute a single employee payslip
 * @param {string} id - Payslip UUID
 */
export async function recomputeSinglePayslip(id) {
    const response = await payslipApiInstance.post(`/${id}/compute`);
    return response.data;
}

/**
 * Returns direct URL for streaming or previewing payslip PDF
 * @param {string} id - Payslip UUID
 * @param {boolean} [inline=true] - true opens in browser, false downloads
 */
export function getPayslipPdfUrl(id, inline = true) {
    return `/api/payslips/${id}/pdf?inline=${inline}`;
}
