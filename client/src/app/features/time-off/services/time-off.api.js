import axios from 'axios';

const timeOffApi = axios.create({
    baseURL: '/api/time-off',
    withCredentials: true,
});

/**
 * ============================================================================
 * TIME OFF API SERVICES (Pure Axios Network Requests)
 * ============================================================================
 */

// ─── Leave Requests ─────────────────────────────────────────────────────────

export async function fetchRequests(params = {}) {
    const cleanedParams = {};
    Object.entries(params).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined && val !== 'ALL') {
            cleanedParams[key] = val;
        }
    });
    const response = await timeOffApi.get('/requests', { params: cleanedParams });
    return response.data;
}

export async function fetchRequestById(id) {
    const response = await timeOffApi.get(`/requests/${id}`);
    return response.data;
}

export async function createRequest(payload) {
    const response = await timeOffApi.post('/requests', payload);
    return response.data;
}

export async function approveRequest(id, reviewNotes = '') {
    const response = await timeOffApi.post(`/requests/${id}/approve`, {
        reviewNotes: reviewNotes?.trim() || undefined,
    });
    return response.data;
}

export async function refuseRequest(id, reviewNotes = '') {
    const response = await timeOffApi.post(`/requests/${id}/refuse`, {
        reviewNotes: reviewNotes?.trim() || undefined,
    });
    return response.data;
}

export async function cancelRequest(id) {
    const response = await timeOffApi.post(`/requests/${id}/cancel`);
    return response.data;
}

export async function updateRequest(id, payload) {
    const response = await timeOffApi.patch(`/requests/${id}`, payload);
    return response.data;
}

export async function deleteRequest(id) {
    const response = await timeOffApi.delete(`/requests/${id}`);
    return response.data;
}

// ─── Leave Allocations ──────────────────────────────────────────────────────

export async function fetchAllocations(params = {}) {
    const cleanedParams = {};
    Object.entries(params).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined && val !== 'ALL') {
            cleanedParams[key] = val;
        }
    });
    const response = await timeOffApi.get('/allocations', { params: cleanedParams });
    return response.data;
}

export async function fetchAllocationById(id) {
    const response = await timeOffApi.get(`/allocations/${id}`);
    return response.data;
}

export async function createAllocation(payload) {
    const response = await timeOffApi.post('/allocations', payload);
    return response.data;
}

export async function approveAllocation(id) {
    const response = await timeOffApi.post(`/allocations/${id}/approve`);
    return response.data;
}

export async function refuseAllocation(id) {
    const response = await timeOffApi.post(`/allocations/${id}/refuse`);
    return response.data;
}

export async function updateAllocation(id, payload) {
    const response = await timeOffApi.patch(`/allocations/${id}`, payload);
    return response.data;
}

export async function deleteAllocation(id) {
    const response = await timeOffApi.delete(`/allocations/${id}`);
    return response.data;
}

// ─── Time Off Types ─────────────────────────────────────────────────────────

export async function fetchTimeOffTypes(params = {}) {
    const cleanedParams = {};
    Object.entries(params).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined && val !== 'ALL') {
            cleanedParams[key] = val;
        }
    });
    const response = await timeOffApi.get('/types', { params: cleanedParams });
    return response.data;
}

export async function fetchTimeOffTypeById(id) {
    const response = await timeOffApi.get(`/types/${id}`);
    return response.data;
}

export async function createTimeOffType(payload) {
    const response = await timeOffApi.post('/types', payload);
    return response.data;
}

export async function updateTimeOffType(id, payload) {
    const response = await timeOffApi.patch(`/types/${id}`, payload);
    return response.data;
}

export async function deleteTimeOffType(id) {
    const response = await timeOffApi.delete(`/types/${id}`);
    return response.data;
}

// ─── Balances ───────────────────────────────────────────────────────────────

export async function fetchLeaveBalance(employeeId = null) {
    const url = employeeId ? `/balance/${employeeId}` : '/balance';
    const response = await timeOffApi.get(url);
    return response.data;
}
