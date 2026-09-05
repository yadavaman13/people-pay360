import axios from 'axios';

const salaryStructureApiInstance = axios.create({
    baseURL: '/api/salary-structures',
    withCredentials: true,
});

/**
 * Fetch list of salary structures with optional search and pagination
 * @param {object} [params={}] - { isActive, search, page, limit }
 * @returns {Promise<object>} API response { success, data, pagination, message }
 */
export async function fetchSalaryStructures(params = {}) {
    const response = await salaryStructureApiInstance.get('/', { params });
    return response.data;
}

/**
 * Fetch a single salary structure by ID
 * @param {string} id - Salary structure UUID
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function fetchSalaryStructureById(id) {
    const response = await salaryStructureApiInstance.get(`/${id}`);
    return response.data;
}

/**
 * Create a new salary structure
 * @param {object} payload - { name, code, description, isActive }
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function createSalaryStructure(payload) {
    const response = await salaryStructureApiInstance.post('/', payload);
    return response.data;
}

/**
 * Update an existing salary structure
 * @param {string} id - Salary structure UUID
 * @param {object} payload - { name, code, description, isActive }
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function updateSalaryStructure(id, payload) {
    const response = await salaryStructureApiInstance.patch(`/${id}`, payload);
    return response.data;
}

/**
 * Delete / deactivate a salary structure
 * @param {string} id - Salary structure UUID
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function deleteSalaryStructure(id) {
    const response = await salaryStructureApiInstance.delete(`/${id}`);
    return response.data;
}
