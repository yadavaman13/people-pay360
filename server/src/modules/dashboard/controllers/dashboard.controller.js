import {
    getDashboardSummary,
    getSalaryByDepartment,
    getNetSalaryTrends,
    getAttendanceMetrics,
    getTimeOffMetrics,
    getDepartmentBreakdown,
    getDashboardAlerts,
} from '../../../dao/dashboard.dao.js';
import { findEmployeeByUserId } from '../../../dao/employee.dao.js';
import { sendResponse } from '../../../utils/response.utlis.js';

/**
 * Extract common filter parameters from query
 */
async function extractFilters(req) {
    const { periodStart, periodEnd, departmentId, employeeType } = req.query;
    const userRole = req.user?.role ? String(req.user.role).toUpperCase() : 'EMPLOYEE';

    let employeeId = null;
    if (userRole === 'EMPLOYEE' && req.user?.id) {
        const emp = await findEmployeeByUserId(req.user.id);
        employeeId = emp?.id || null;
    }

    return {
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        departmentId: departmentId || null,
        employeeType: employeeType || null,
        userRole,
        employeeId,
    };
}

/**
 * GET /api/dashboard/summary
 * Primary high-level KPI cards
 */
export async function getSummary(req, res, next) {
    try {
        const filters = await extractFilters(req);
        const data = await getDashboardSummary(filters);

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Dashboard summary retrieved successfully',
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error in getSummary dashboard controller:', error);
        return sendResponse({
            res,
            statusCode: 500,
            message: 'Failed to retrieve dashboard summary',
            success: false,
            error: error.message,
        });
    }
}

/**
 * GET /api/dashboard/salary-by-department
 * Salary expenditure distribution across departments
 * RBAC: ADMIN, HR_PAYROLL_MANAGER, HR_PAYROLL_USER (Blocked for HR_MANAGER per BR-002)
 */
export async function getDepartmentSalary(req, res, next) {
    try {
        const userRole = req.user?.role ? String(req.user.role).toUpperCase() : '';
        if (userRole === 'HR_MANAGER' || userRole === 'EMPLOYEE') {
            return sendResponse({
                res,
                statusCode: 403,
                message: 'Access to payroll salary expenditure is restricted for this role.',
                success: false,
            });
        }

        const filters = await extractFilters(req);
        const data = await getSalaryByDepartment(filters);

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Salary expenditure by department retrieved successfully',
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error in getDepartmentSalary controller:', error);
        return sendResponse({
            res,
            statusCode: 500,
            message: 'Failed to retrieve salary by department',
            success: false,
            error: error.message,
        });
    }
}

/**
 * GET /api/dashboard/net-salary-trends
 * Multi-month historical progression of net & gross payroll
 * RBAC: ADMIN, HR_PAYROLL_MANAGER, HR_PAYROLL_USER (Blocked for HR_MANAGER per BR-002)
 */
export async function getSalaryTrends(req, res, next) {
    try {
        const userRole = req.user?.role ? String(req.user.role).toUpperCase() : '';
        if (userRole === 'HR_MANAGER' || userRole === 'EMPLOYEE') {
            return sendResponse({
                res,
                statusCode: 403,
                message: 'Access to payroll salary trends is restricted for this role.',
                success: false,
            });
        }

        const filters = await extractFilters(req);
        const monthsBack = req.query.months ? parseInt(req.query.months, 10) : 6;
        const data = await getNetSalaryTrends({ ...filters, monthsBack });

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Net salary trends retrieved successfully',
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error in getSalaryTrends controller:', error);
        return sendResponse({
            res,
            statusCode: 500,
            message: 'Failed to retrieve net salary trends',
            success: false,
            error: error.message,
        });
    }
}

/**
 * GET /api/dashboard/attendance
 * Presence, lates, absents, missing checkouts, manual corrections
 */
export async function getAttendance(req, res, next) {
    try {
        const filters = await extractFilters(req);
        const data = await getAttendanceMetrics(filters);

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Attendance metrics retrieved successfully',
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error in getAttendance dashboard controller:', error);
        return sendResponse({
            res,
            statusCode: 500,
            message: 'Failed to retrieve attendance metrics',
            success: false,
            error: error.message,
        });
    }
}

/**
 * GET /api/dashboard/time-off
 * Approved leave days, pending requests, breakdown by leave type
 */
export async function getTimeOff(req, res, next) {
    try {
        const filters = await extractFilters(req);
        const data = await getTimeOffMetrics(filters);

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Time off metrics retrieved successfully',
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error in getTimeOff dashboard controller:', error);
        return sendResponse({
            res,
            statusCode: 500,
            message: 'Failed to retrieve time off metrics',
            success: false,
            error: error.message,
        });
    }
}

/**
 * GET /api/dashboard/department-breakdown
 * Comprehensive operational matrix per department
 */
export async function getDepartmentBreakdownMatrix(req, res, next) {
    try {
        const userRole = req.user?.role ? String(req.user.role).toUpperCase() : '';
        if (userRole === 'EMPLOYEE') {
            return sendResponse({
                res,
                statusCode: 403,
                message: 'Employees cannot access department-wide metrics.',
                success: false,
            });
        }

        const filters = await extractFilters(req);
        let data = await getDepartmentBreakdown(filters);

        // Per BR-002, redact sensitive financial metrics for HR_MANAGER
        if (userRole === 'HR_MANAGER') {
            data = data.map((item) => ({
                ...item,
                totalWageExpense: '[RESTRICTED]',
                averageSalary: '[RESTRICTED]',
            }));
        }

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Department breakdown retrieved successfully',
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error in getDepartmentBreakdownMatrix controller:', error);
        return sendResponse({
            res,
            statusCode: 500,
            message: 'Failed to retrieve department breakdown',
            success: false,
            error: error.message,
        });
    }
}

/**
 * GET /api/dashboard/alerts
 * Live operational warnings across modules
 */
export async function getAlerts(req, res, next) {
    try {
        const filters = await extractFilters(req);
        const data = await getDashboardAlerts(filters);

        return sendResponse({
            res,
            statusCode: 200,
            message: 'Dashboard alerts retrieved successfully',
            success: true,
            data,
        });
    } catch (error) {
        console.error('Error in getAlerts dashboard controller:', error);
        return sendResponse({
            res,
            statusCode: 500,
            message: 'Failed to retrieve dashboard alerts',
            success: false,
            error: error.message,
        });
    }
}
