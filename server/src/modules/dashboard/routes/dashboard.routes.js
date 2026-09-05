import express from 'express';
import { protect } from '../../auth/middleware/auth.middleware.js';
import {
    getSummary,
    getDepartmentSalary,
    getSalaryTrends,
    getAttendance,
    getTimeOff,
    getDepartmentBreakdownMatrix,
    getAlerts,
} from '../controllers/dashboard.controller.js';
import { dashboardFilterValidator } from '../validators/dashboard.validator.js';

const router = express.Router();

// Apply auth protection to all dashboard endpoints
router.use(protect);

/**
 * GET /api/dashboard/summary
 * Primary operational & financial KPI metrics
 */
router.get('/summary', dashboardFilterValidator, getSummary);

/**
 * GET /api/dashboard/salary-by-department
 * Salary expenditure distribution across departments
 */
router.get('/salary-by-department', dashboardFilterValidator, getDepartmentSalary);

/**
 * GET /api/dashboard/net-salary-trends
 * Multi-month net & gross payroll progression trends
 */
router.get('/net-salary-trends', dashboardFilterValidator, getSalaryTrends);

/**
 * GET /api/dashboard/attendance
 * Daily presence, overtime, exceptions & coverage
 */
router.get('/attendance', dashboardFilterValidator, getAttendance);

/**
 * GET /api/dashboard/time-off
 * Approved leave days, pending requests & allocation consumption
 */
router.get('/time-off', dashboardFilterValidator, getTimeOff);

/**
 * GET /api/dashboard/department-breakdown
 * Headcount, wage commitment, attendance & leave matrix per department
 */
router.get('/department-breakdown', dashboardFilterValidator, getDepartmentBreakdownMatrix);

/**
 * GET /api/dashboard/alerts
 * Live operational alerts (compliance, contract, attendance, payruns)
 */
router.get('/alerts', getAlerts);

export default router;
