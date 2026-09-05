import axios from 'axios';

const payrunApiInstance = axios.create({
    baseURL: '/api/payruns',
    withCredentials: true,
});

const salaryStructureApiInstance = axios.create({
    baseURL: '/api/salary-structures',
    withCredentials: true,
});

/**
 * Fetch all salary structures (e.g. for Wizard dropdown)
 * @param {object} [params={}]
 */
export async function fetchSalaryStructures(params = { isActive: true }) {
    const response = await salaryStructureApiInstance.get('/', { params });
    return response.data;
}

/**
 * Fetch list of payruns with pagination and filtering
 * @param {object} [params={}] - { status, periodStart, periodEnd, structureId, page, limit }
 */
export async function fetchPayruns(params = {}) {
    const response = await payrunApiInstance.get('/', { params });
    return response.data;
}

/**
 * Fetch single payrun by ID
 * @param {string} id
 */
export async function fetchPayrunById(id) {
    const response = await payrunApiInstance.get(`/${id}`);
    return response.data;
}

/**
 * Step 1 Wizard: Validate scope & fetch eligible employee preview
 * @param {object} payload - { salaryStructureId, periodStart, periodEnd }
 */
export async function validatePayrunWizard(payload) {
    const response = await payrunApiInstance.post('/wizard/validate', payload);
    return response.data;
}

/**
 * Step 2 Wizard: Create payrun batch with selected employee roster
 * @param {object} payload - { name, salaryStructureId, periodStart, periodEnd, paymentDate, employeeIds, notes }
 */
export async function createPayrun(payload) {
    const response = await payrunApiInstance.post('/', payload);
    return response.data;
}

/**
 * Delete a DRAFT payrun
 * @param {string} id
 */
export async function deletePayrun(id) {
    const response = await payrunApiInstance.delete(`/${id}`);
    return response.data;
}

/**
 * Compute payroll for a payrun batch
 * @param {string} id
 */
export async function computePayrun(id) {
    const response = await payrunApiInstance.post(`/${id}/compute`);
    return response.data;
}

/**
 * Pre-validation warnings and blockers audit
 * @param {string} id
 */
export async function fetchPayrunWarnings(id) {
    const response = await payrunApiInstance.get(`/${id}/warnings`);
    return response.data;
}

/**
 * Validate a payrun and lock payslips
 * @param {string} id
 * @param {object} [options={}] - { overrideBlockers: boolean }
 */
export async function validatePayrun(id, { overrideBlockers = false } = {}) {
    const response = await payrunApiInstance.post(`/${id}/validate`, { overrideBlockers });
    return response.data;
}

/**
 * Record financial settlement and mark payrun as PAID
 * @param {string} id
 * @param {object} [payload={}] - { paymentDate: string }
 */
export async function markPayrunPaid(id, payload = {}) {
    const response = await payrunApiInstance.post(`/${id}/mark-paid`, payload);
    return response.data;
}

/**
 * Bulk email distribution of payslips to all employees in the payrun
 * @param {string} id
 */
export async function sendPayrunPayslips(id) {
    const response = await payrunApiInstance.post(`/${id}/send-payslips`);
    return response.data;
}
