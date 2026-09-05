import axios from 'axios';

/**
 * Dashboard API Layer — Pure Axios infrastructure for all /api/dashboard/* endpoints.
 * No React hooks or state updates here. 4-Layer separation enforced.
 */
const dashboardApiInstance = axios.create({
    baseURL: '/api/dashboard',
    withCredentials: true,
});

/**
 * Fetches primary KPI summary metrics.
 * Role-aware: EMPLOYEE gets personal summary; others get org-wide aggregates.
 * @param {object} params - { periodStart, periodEnd, departmentId, employeeType }
 */
export async function fetchDashboardSummary(params = {}) {
    const response = await dashboardApiInstance.get('/summary', { params });
    return response.data;
}

/**
 * Fetches salary expenditure distribution by department.
 * @param {object} params - { periodStart, periodEnd, departmentId, employeeType }
 */
export async function fetchDepartmentSalary(params = {}) {
    const response = await dashboardApiInstance.get('/salary-by-department', { params });
    return response.data;
}

/**
 * Fetches multi-month net & gross payroll progression trends.
 * @param {object} params - { periodStart, periodEnd, departmentId, monthsBack }
 */
export async function fetchNetSalaryTrends(params = {}) {
    const response = await dashboardApiInstance.get('/net-salary-trends', { params });
    return response.data;
}

/**
 * Fetches daily attendance metrics including 14-day breakdown timeline.
 * @param {object} params - { periodStart, periodEnd, departmentId, employeeType }
 */
export async function fetchAttendanceMetrics(params = {}) {
    const response = await dashboardApiInstance.get('/attendance', { params });
    return response.data;
}

/**
 * Fetches time-off leave requests summary, type breakdown, and recent pending list.
 * @param {object} params - { periodStart, periodEnd, departmentId, employeeType }
 */
export async function fetchTimeOffMetrics(params = {}) {
    const response = await dashboardApiInstance.get('/time-off', { params });
    return response.data;
}

/**
 * Fetches headcount, wage commitment, attendance, and leave matrix per department.
 * @param {object} params - { periodStart, periodEnd, departmentId, employeeType }
 */
export async function fetchDepartmentBreakdown(params = {}) {
    const response = await dashboardApiInstance.get('/department-breakdown', { params });
    return response.data;
}

/**
 * Fetches live operational alerts: compliance blockers, contract warnings, payrun status alerts.
 * @param {object} params - { departmentId }
 */
export async function fetchDashboardAlerts(params = {}) {
    const response = await dashboardApiInstance.get('/alerts', { params });
    return response.data;
}
