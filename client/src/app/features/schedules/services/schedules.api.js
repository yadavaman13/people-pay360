import axios from 'axios';

const schedulesApiInstance = axios.create({
    baseURL: '/api/working-schedules',
    withCredentials: true,
});

/**
 * Fetch all working schedules
 * @param {object} [params={}] - { isActive, page, limit }
 */
export async function fetchSchedules(params = {}) {
    const response = await schedulesApiInstance.get('/', { params });
    return response.data;
}

/**
 * Fetch a single schedule by ID (includes lines[] and weeklyHours)
 * @param {string} id
 */
export async function fetchScheduleById(id) {
    const response = await schedulesApiInstance.get(`/${id}`);
    return response.data;
}

/**
 * Fetch calculated weekly hours for a schedule (BR-007)
 * @param {string} id
 */
export async function fetchWeeklyHours(id) {
    const response = await schedulesApiInstance.get(`/${id}/weekly-hours`);
    return response.data;
}

/**
 * Create a new working schedule with optional shift lines
 * @param {object} payload - { name, description, timezone, lines[] }
 */
export async function createSchedule(payload) {
    const response = await schedulesApiInstance.post('/', payload);
    return response.data;
}

/**
 * Update schedule metadata (name, description, timezone, isActive)
 * @param {string} id
 * @param {object} payload - partial schedule fields
 */
export async function updateSchedule(id, payload) {
    const response = await schedulesApiInstance.patch(`/${id}`, payload);
    return response.data;
}

/**
 * Replace all shift lines atomically for a schedule
 * @param {string} id
 * @param {Array<{dayOfWeek, startTime, endTime, breakMinutes}>} lines
 */
export async function replaceScheduleLines(id, lines) {
    const response = await schedulesApiInstance.put(`/${id}/lines`, { lines });
    return response.data;
}

/**
 * Soft-delete (deactivate) a working schedule
 * @param {string} id
 */
export async function deleteSchedule(id) {
    const response = await schedulesApiInstance.delete(`/${id}`);
    return response.data;
}
