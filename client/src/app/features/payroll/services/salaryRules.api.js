import axios from 'axios';

const salaryRuleApiInstance = axios.create({
    baseURL: '/api/salary-rules',
    withCredentials: true,
});

const salaryStructureApiInstance = axios.create({
    baseURL: '/api/salary-structures',
    withCredentials: true,
});

/**
 * Fetch list of salary rules with filtering and pagination
 * @param {object} [params={}] - { structureId, category, isActive, page, limit }
 * @returns {Promise<object>} API response { success, data, pagination, message }
 */
export async function fetchSalaryRules(params = {}) {
    const response = await salaryRuleApiInstance.get('/', { params });
    return response.data;
}

/**
 * Fetch single salary rule by ID
 * @param {string} id - Salary rule UUID
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function fetchSalaryRuleById(id) {
    const response = await salaryRuleApiInstance.get(`/${id}`);
    return response.data;
}

/**
 * Create a new salary rule
 * @param {object} payload - Rule creation payload
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function createSalaryRule(payload) {
    const response = await salaryRuleApiInstance.post('/', payload);
    return response.data;
}

/**
 * Update an existing salary rule
 * @param {string} id - Salary rule UUID
 * @param {object} payload - Partial update payload
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function updateSalaryRule(id, payload) {
    const response = await salaryRuleApiInstance.patch(`/${id}`, payload);
    return response.data;
}

/**
 * Fetch active salary structures for dropdown filtering
 * @param {object} [params={ isActive: true, limit: 100 }]
 * @returns {Promise<object>} API response { success, data, pagination, message }
 */
export async function fetchSalaryStructures(params = { isActive: true, limit: 100 }) {
    const response = await salaryStructureApiInstance.get('/', { params });
    return response.data;
}

/**
 * Delete a salary rule
 * @param {string} id - Salary rule UUID
 * @returns {Promise<object>} API response { success, data, message }
 */
export async function deleteSalaryRule(id) {
    const response = await salaryRuleApiInstance.delete(`/${id}`);
    return response.data;
}
