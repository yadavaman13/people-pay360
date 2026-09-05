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
    const response = await attendanceApi.get('/', { params });
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
 */
export const fetchAttendanceSummary = async () => {
    const response = await attendanceApi.get('/summary');
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
            params: { limit: 100 },
            withCredentials: true,
        });
        const list = Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data?.data?.employees)
              ? response.data.data.employees
              : [];
        return { data: list };
    } catch {
        return { data: [] };
    }
};
