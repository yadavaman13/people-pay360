import axios from 'axios';

const employeeApi = axios.create({
    baseURL: '/api/employees',
    withCredentials: true,
});

const auxApi = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

/**
 * ============================================================================
 * EMPLOYEE SERVICE LAYER (Pure Network Requests via Axios)
 * ============================================================================
 */

/**
 * Fetch paginated & filtered list of employees
 * @param {object} [params={}] { page, limit, search, status, departmentId, isActive }
 */
export async function fetchEmployees(params = {}) {
    const cleanedParams = {};
    Object.entries(params).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined && val !== 'all') {
            cleanedParams[key] = val;
        }
    });
    const response = await employeeApi.get('/', { params: cleanedParams });
    return response.data;
}

/**
 * Get single employee by ID with full relational joins
 * @param {string} id
 */
export async function fetchEmployeeById(id) {
    const response = await employeeApi.get(`/${id}`);
    return response.data;
}

/**
 * Create a new employee profile
 * @param {object} data
 */
export async function createEmployee(data) {
    const response = await employeeApi.post('/', data);
    return response.data;
}

/**
 * Update employee profile
 * @param {string} id
 * @param {object} data
 */
export async function updateEmployee(id, data) {
    const response = await employeeApi.patch(`/${id}`, data);
    return response.data;
}

/**
 * Upload employee profile avatar image
 * @param {string} id
 * @param {File} file
 */
export async function uploadEmployeeAvatar(id, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await employeeApi.patch(`/${id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
}

/**
 * Soft delete (archive) employee
 * @param {string} id
 */
export async function deleteEmployee(id) {
    const response = await employeeApi.delete(`/${id}`);
    return response.data;
}

/**
 * Fetch current authenticated user's employee profile
 */
export async function fetchMe() {
    const response = await employeeApi.get('/me');
    return response.data;
}

/**
 * Update current authenticated user's personal details
 * @param {object} data
 */
export async function updateMe(data) {
    const response = await employeeApi.patch('/me', data);
    return response.data;
}

/**
 * ============================================================================
 * SMART BUTTONS & RELATED SUB-RESOURCES
 * ============================================================================
 */

/**
 * Get all contracts for an employee (Contract history)
 * @param {string} id
 */
export async function fetchEmployeeContracts(id) {
    const response = await employeeApi.get(`/${id}/contracts`);
    return response.data;
}

/**
 * Get current active contract for an employee
 * @param {string} id
 */
export async function fetchActiveContract(id) {
    const response = await employeeApi.get(`/${id}/contracts/active`);
    return response.data;
}

/**
 * Get applicable contract for an employee in a specific payroll period
 * @param {string} id
 * @param {object} params { periodStart, periodEnd }
 */
export async function fetchApplicableContract(id, params = {}) {
    const response = await employeeApi.get(`/${id}/contracts/applicable`, { params });
    return response.data;
}

/**
 * Get attendance records for an employee
 * @param {string} id
 * @param {object} [params={}] { dateFrom, dateTo, status, page, limit }
 */
export async function fetchEmployeeAttendance(id, params = {}) {
    const response = await employeeApi.get(`/${id}/attendance`, { params });
    return response.data;
}

/**
 * Get time-off requests for an employee
 * @param {string} id
 * @param {object} [params={}] { status, startDate, endDate, page, limit }
 */
export async function fetchEmployeeTimeOff(id, params = {}) {
    const response = await employeeApi.get(`/${id}/time-off`, { params });
    return response.data;
}

/**
 * Get leave allocations for an employee
 * @param {string} id
 * @param {object} [params={}] { status, page, limit }
 */
export async function fetchEmployeeAllocations(id, params = {}) {
    const response = await employeeApi.get(`/${id}/allocations`, { params });
    return response.data;
}

/**
 * Payrun roster resolver for Step 2 wizard
 * @param {object} params { structureId, periodStart, periodEnd }
 */
export async function fetchEmployeesForPayrun(params = {}) {
    const response = await employeeApi.get('/for-payrun', { params });
    return response.data;
}

/**
 * Get bank accounts for an employee
 * @param {string} id
 */
export async function fetchEmployeeBankAccounts(id) {
    const response = await employeeApi.get(`/${id}/bank-accounts`);
    return response.data;
}

/**
 * Add bank account for an employee
 * @param {string} id
 * @param {object} data { bankName, accountNumber, accountHolderName, ifscCode, accountType, isPrimary }
 */
export async function addEmployeeBankAccount(id, data) {
    const response = await employeeApi.post(`/${id}/bank-accounts`, data);
    return response.data;
}

/**
 * Set an account as the primary bank account
 * @param {string} id
 * @param {string} accountId
 */
export async function setPrimaryBankAccount(id, accountId) {
    const response = await employeeApi.patch(`/${id}/bank-accounts/${accountId}/primary`);
    return response.data;
}

/**
 * Delete a bank account
 * @param {string} id
 * @param {string} accountId
 */
export async function deleteBankAccount(id, accountId) {
    const response = await employeeApi.delete(`/${id}/bank-accounts/${accountId}`);
    return response.data;
}

/**
 * ============================================================================
 * METADATA HELPERS (Dropdowns & Lookups)
 * ============================================================================
 */

/**
 * Fetch all active company departments
 */
export async function fetchDepartments() {
    const response = await auxApi.get('/departments');
    return response.data;
}

/**
 * Fetch all active job positions (optionally filtered by departmentId)
 * @param {string} [departmentId]
 */
export async function fetchJobPositions(departmentId) {
    const params = departmentId ? { departmentId } : {};
    const response = await auxApi.get('/job-positions', { params });
    return response.data;
}

/**
 * Fetch all active working schedules
 */
export async function fetchWorkingSchedules() {
    const response = await auxApi.get('/working-schedules');
    return response.data;
}

/**
 * Fetch available user accounts for employee linking
 */
export async function fetchUnassignedUsers() {
    try {
        const response = await auxApi.get('/admin/users');
        return response.data;
    } catch {
        return { users: [] };
    }
}
