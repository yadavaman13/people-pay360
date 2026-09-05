import axios from 'axios';

const contractsApiInstance = axios.create({
    baseURL: '/api',
    withCredentials: true,
});

/**
 * List all contracts with optional pagination, search, and status filters.
 * @param {object} [params={}]
 */
export async function listContracts(params = {}) {
    const response = await contractsApiInstance.get('/contracts', { params });
    return response.data;
}

/**
 * Get contract details by ID.
 * @param {string} id
 */
export async function getContractById(id) {
    const response = await contractsApiInstance.get(`/contracts/${id}`);
    return response.data;
}

/**
 * Create a new contract.
 * @param {object} data
 */
export async function createContract(data) {
    const response = await contractsApiInstance.post('/contracts', data);
    return response.data;
}

/**
 * Update an existing contract.
 * @param {string} id
 * @param {object} data
 */
export async function updateContract(id, data) {
    const response = await contractsApiInstance.patch(`/contracts/${id}`, data);
    return response.data;
}

/**
 * Delete a draft contract.
 * @param {string} id
 */
export async function deleteContract(id) {
    const response = await contractsApiInstance.delete(`/contracts/${id}`);
    return response.data;
}

/**
 * Activate a draft contract.
 * @param {string} id
 */
export async function activateContract(id) {
    const response = await contractsApiInstance.post(`/contracts/${id}/activate`);
    return response.data;
}

/**
 * Cancel an active or draft contract.
 * @param {string} id
 */
export async function cancelContract(id) {
    const response = await contractsApiInstance.post(`/contracts/${id}/cancel`);
    return response.data;
}

/**
 * Get all contracts for an employee.
 * @param {string} employeeId
 * @param {object} [params={}]
 */
export async function getEmployeeContracts(employeeId, params = {}) {
    const response = await contractsApiInstance.get(`/employees/${employeeId}/contracts`, {
        params,
    });
    return response.data;
}

/**
 * Get active contract for an employee.
 * @param {string} employeeId
 */
export async function getActiveContract(employeeId) {
    const response = await contractsApiInstance.get(`/employees/${employeeId}/contracts/active`);
    return response.data;
}

/**
 * Get applicable contract for an employee during a given payrun period.
 * @param {string} employeeId
 * @param {object} [params={}]
 */
export async function getApplicableContract(employeeId, params = {}) {
    const response = await contractsApiInstance.get(
        `/employees/${employeeId}/contracts/applicable`,
        { params },
    );
    return response.data;
}

/**
 * List all available salary structures.
 */
export async function listSalaryStructures() {
    const response = await contractsApiInstance.get('/salary-structures');
    return response.data;
}

/**
 * List all available working schedules.
 */
export async function listWorkingSchedules() {
    const response = await contractsApiInstance.get('/working-schedules');
    return response.data;
}

/**
 * Search active employees for the contract employee picker.
 * @param {string} [query='']
 */
export async function searchEmployees(query = '') {
    const response = await contractsApiInstance.get('/employees', {
        params: { search: query, limit: 20 },
    });
    return response.data;
}
