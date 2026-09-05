import axios from 'axios';
import { downloadPdfFromApi } from '@/utils/pdfDownload';

const payslipApiInstance = axios.create({
    baseURL: '/api/payslips',
    withCredentials: true,
});

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
