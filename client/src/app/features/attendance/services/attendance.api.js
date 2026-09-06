import axios from 'axios';

/**
 * Pure Axios API Client for Attendance & Time Tracking
 * Adheres strictly to Layer 4 (API Layer) of the 4-Layer Architecture.
 */
export const attendanceApi = axios.create({
    baseURL: '/api/attendance',
    withCredentials: true,
});

/**
 * Fetch paginated attendance records with optional filters
 * @param {Object} params - { page, limit, employeeId, dateFrom, dateTo, status }
 */
export const fetchAttendanceList = async (params = {}) => {
    const cleanParams = Object.entries(params).reduce((acc, [k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
            acc[k] = v;
        }
        return acc;
    }, {});
    const response = await attendanceApi.get('/', { params: cleanParams });
    return response.data;
};

/**
 * Fetch current user's today status & active punch
 */
export const fetchTodayStatus = async () => {
    const response = await attendanceApi.get('/today');
    return response.data;
};

/**
 * Fetch HR summary metrics (Present, Late, Absent, Missing Checkout, etc.)
 * @param {Object} [params={}] - Optional query params like { excludeHr }
 */
export const fetchAttendanceSummary = async (params = {}) => {
    const response = await attendanceApi.get('/summary', { params });
    return response.data;
};

/**
 * Fetch detailed record by ID with full punches timeline and audit trail
 * @param {string} id - Attendance record UUID
 */
export const fetchAttendanceById = async (id) => {
    const response = await attendanceApi.get(`/${id}`);
    return response.data;
};

/**
 * Employee check-in punch
 * @param {Object} data - { employeeId?: string, notes?: string }
 */
export const punchCheckIn = async (data = {}) => {
    const response = await attendanceApi.post('/check-in', data);
    return response.data;
};

/**
 * Employee self check-out punch
 * @param {Object} data - { notes?: string }
 */
export const punchCheckOut = async (data = {}) => {
    const response = await attendanceApi.post('/check-out', data);
    return response.data;
};

/**
 * HR force check-out on specific unclosed attendance record
 * @param {string} id - Attendance record UUID
 * @param {Object} data - { notes?: string }
 */
export const forceCheckOut = async (id, data = {}) => {
    const response = await attendanceApi.post(`/${id}/check-out`, data);
    return response.data;
};

/**
 * HR manual correction of an attendance record
 * @param {string} id - Attendance record UUID
 * @param {Object} data - { correctionReason, checkInTime, checkOutTime, status, workedHours, notes }
 */
export const correctAttendance = async (id, data) => {
    const response = await attendanceApi.patch(`/${id}`, data);
    return response.data;
};

/**
 * HR delete attendance record
 * @param {string} id - Attendance record UUID
 */
export const deleteAttendance = async (id) => {
    const response = await attendanceApi.delete(`/${id}`);
    return response.data;
};

/**
 * Helper to fetch employee list for HR filter dropdown
 */
export const fetchEmployeesList = async () => {
    try {
        const response = await axios.get('/api/employees', {
            params: { limit: 100, page: 1 },
            withCredentials: true,
        });
        const raw = response.data?.data;
        // Handle all common response shapes
        const list = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.employees)
              ? raw.employees
              : Array.isArray(raw?.data)
                ? raw.data
                : [];
        return { data: list };
    } catch {
        return { data: [] };
    }
};

/**
 * HR / Admin: batch-resolve all open punch sessions from past dates.
 * Returns { resolved, skipped, total, details }
 */
export const resolveMissingCheckouts = async () => {
    const response = await attendanceApi.post('/resolve-missing-checkouts');
    return response.data;
};
