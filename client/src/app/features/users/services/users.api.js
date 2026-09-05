import axios from 'axios';

const adminApiInstance = axios.create({
    baseURL: '/api/admin',
    withCredentials: true,
});

/**
 * Fetch all users (Admin only)
 * @param {boolean} includeDeleted
 */
export async function adminListUsers(includeDeleted = false) {
    const response = await adminApiInstance.get('/users', {
        params: { includeDeleted },
    });
    return response.data;
}

/**
 * Get user by ID (Admin only)
 * @param {string} id
 */
export async function adminGetUserById(id) {
    const response = await adminApiInstance.get(`/users/${id}`);
    return response.data;
}

/**
 * Create a new user with temporary credentials (Admin only)
 * @param {object} param0
 * @param {string} param0.firstName
 * @param {string} param0.lastName
 * @param {string} param0.email
 * @param {string} param0.role
 */
export async function adminCreateUser({ firstName, lastName, email, role }) {
    const response = await adminApiInstance.post('/users', {
        firstName,
        lastName,
        email,
        role,
    });
    return response.data;
}

/**
 * Update a user's role (Admin only)
 * @param {string} id
 * @param {string} role
 */
export async function adminUpdateRole(id, role) {
    const response = await adminApiInstance.patch(`/users/${id}/role`, { role });
    return response.data;
}

/**
 * Soft delete a user (Admin only)
 * @param {string} id
 */
export async function adminDeleteUser(id) {
    const response = await adminApiInstance.delete(`/users/${id}`);
    return response.data;
}
