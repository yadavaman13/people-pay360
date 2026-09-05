import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

const docLogger = new FeatureApiDocLogger(
    '09_dashboard.md',
    'Feature 09: Live Operational Payroll & HR Dashboard API',
    'Covers executive KPI summaries, department salary expenditures, monthly net salary trends, attendance metrics, leave overviews, department operational breakdown, and operational alert diagnostics.',
);

describe('09: Live Operational Payroll Dashboard API', () => {
    let adminAuth;
    let hrAuth;
    let employeeAuth;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        hrAuth = await createAndLoginTestUser({ role: 'HR_MANAGER' });
        employeeAuth = await createAndLoginTestUser({ role: 'EMPLOYEE' });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Authentication Guard', () => {
        it('should return 401 Unauthorized for unauthenticated requests', async () => {
            const res = await request(app).get('/api/dashboard/summary');

            docLogger.record({
                scenario: 'Dashboard Unauthenticated Access (Unauthorized)',
                method: 'GET',
                endpoint: '/api/dashboard/summary',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'All dashboard endpoints require valid session authentication.',
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/dashboard/summary', () => {
        it('should return 200 with live summary KPIs for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Dashboard Summary (ADMIN)',
                method: 'GET',
                endpoint: '/api/dashboard/summary',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves live executive KPI cards across workforce, payroll, attendance, leave, and payruns.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.workforce).toBeDefined();
            expect(res.body.data.payroll).toBeDefined();
            expect(res.body.data.attendance).toBeDefined();
            expect(res.body.data.timeOff).toBeDefined();
            expect(res.body.data.payruns).toBeDefined();
            expect(res.body.data.payroll.payrollAccessRestricted).toBe(false);
        });

        it('should return 200 for HR_MANAGER with payroll figures restricted (BR-002)', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary')
                .set('Cookie', hrAuth.cookie);

            docLogger.record({
                scenario: 'Get Dashboard Summary (HR_MANAGER - BR-002 Privacy Guard)',
                method: 'GET',
                endpoint: '/api/dashboard/summary',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Enforces BR-002: HR Manager can view staffing, attendance, and leave, but sensitive payroll totals are redacted.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.payroll.payrollAccessRestricted).toBe(true);
        });

        it('should return 200 for EMPLOYEE scoped to personal statistics (BR-001)', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary')
                .set('Cookie', employeeAuth.cookie);

            docLogger.record({
                scenario: 'Get Dashboard Summary (EMPLOYEE Self-Service)',
                method: 'GET',
                endpoint: '/api/dashboard/summary',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Enforces BR-001: Scopes metrics to employee own personal records.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.payroll).toBeDefined();
            expect(res.body.data.timeOff).toBeDefined();
            expect(res.body.data.attendance).toBeDefined();
        });

        it('should handle date range filters without errors', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary?periodStart=2026-01-01&periodEnd=2026-12-31')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Dashboard Summary with Date Range Filters',
                method: 'GET',
                endpoint: '/api/dashboard/summary',
                queryParams: { periodStart: '2026-01-01', periodEnd: '2026-12-31' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Filters live database metrics within specified calendar boundaries.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should return 400 for invalid date query params', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary?periodStart=not-a-date')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Dashboard Summary (Invalid Query Date Error)',
                method: 'GET',
                endpoint: '/api/dashboard/summary',
                queryParams: { periodStart: 'not-a-date' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Validates date formats (YYYY-MM-DD).',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/dashboard/salary-by-department', () => {
        it('should return 200 with department salary metrics for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/salary-by-department')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Salary Cost by Department',
                method: 'GET',
                endpoint: '/api/dashboard/salary-by-department',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Aggregates total gross salary, net salary, and headcount grouped by department.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should enforce BR-002: return 403 Forbidden for HR_MANAGER', async () => {
            const res = await request(app)
                .get('/api/dashboard/salary-by-department')
                .set('Cookie', hrAuth.cookie);

            docLogger.record({
                scenario: 'Salary Cost by Department (Forbidden for HR_MANAGER)',
                method: 'GET',
                endpoint: '/api/dashboard/salary-by-department',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Enforces BR-002: HR Manager cannot access payroll cost breakdown.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/dashboard/net-salary-trends', () => {
        it('should return 200 with multi-month trends for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/net-salary-trends?months=6')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Monthly Net Salary Trends',
                method: 'GET',
                endpoint: '/api/dashboard/net-salary-trends',
                queryParams: { months: '6' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Produces time-series data for monthly net pay, gross pay, deductions, and headcount.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should enforce BR-002: return 403 for HR_MANAGER', async () => {
            const res = await request(app)
                .get('/api/dashboard/net-salary-trends')
                .set('Cookie', hrAuth.cookie);

            docLogger.record({
                scenario: 'Net Salary Trends (Forbidden for HR_MANAGER)',
                method: 'GET',
                endpoint: '/api/dashboard/net-salary-trends',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Enforces BR-002 privacy restriction.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/dashboard/attendance', () => {
        it('should return 200 with attendance breakdown for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/attendance')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Attendance Quality Overview',
                method: 'GET',
                endpoint: '/api/dashboard/attendance',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Aggregates present, late, absent, half-day, missing checkouts, and attendance rate.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.summary.presentCount).toBeDefined();
            expect(res.body.data.summary.lateCount).toBeDefined();
            expect(res.body.data.summary.absentCount).toBeDefined();
        });

        it('should return 200 for HR_MANAGER', async () => {
            const res = await request(app)
                .get('/api/dashboard/attendance')
                .set('Cookie', hrAuth.cookie);

            docLogger.record({
                scenario: 'Get Attendance Overview (HR_MANAGER Allowed)',
                method: 'GET',
                endpoint: '/api/dashboard/attendance',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'HR Managers have full operational access to attendance metrics.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('GET /api/dashboard/time-off', () => {
        it('should return 200 with time off metrics and types for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/time-off')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Time Off & Leave Overview',
                method: 'GET',
                endpoint: '/api/dashboard/time-off',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Aggregates approved leave days, pending requests, and breakdown by leave type.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.summary.approvedDays).toBeDefined();
            expect(res.body.data.summary.pendingCount).toBeDefined();
            expect(Array.isArray(res.body.data.byType)).toBe(true);
        });
    });

    describe('GET /api/dashboard/department-breakdown', () => {
        it('should return 200 with operational matrix for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/department-breakdown')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Department Operational Matrix',
                method: 'GET',
                endpoint: '/api/dashboard/department-breakdown',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Combines headcount, salary expenditure, average salary, and leave days taken by department.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return 200 for HR_MANAGER with salary columns redacted per BR-002', async () => {
            const res = await request(app)
                .get('/api/dashboard/department-breakdown')
                .set('Cookie', hrAuth.cookie);

            docLogger.record({
                scenario: 'Get Department Matrix (HR_MANAGER Redacted)',
                method: 'GET',
                endpoint: '/api/dashboard/department-breakdown',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Redacts salary expenditures and averages while preserving staffing and leave metrics.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            if (res.body.data.length > 0) {
                expect(res.body.data[0].totalWageExpense).toBe('[RESTRICTED]');
                expect(res.body.data[0].averageSalary).toBe('[RESTRICTED]');
            }
        });

        it('should return 403 Forbidden for EMPLOYEE', async () => {
            const res = await request(app)
                .get('/api/dashboard/department-breakdown')
                .set('Cookie', employeeAuth.cookie);

            docLogger.record({
                scenario: 'Department Matrix (Forbidden for EMPLOYEE)',
                method: 'GET',
                endpoint: '/api/dashboard/department-breakdown',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Department operational matrix is restricted to HR and Admin roles.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/dashboard/alerts', () => {
        it('should return 200 with active alerts list for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/alerts')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Operational Alerts Diagnostic Center',
                method: 'GET',
                endpoint: '/api/dashboard/alerts',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Surfaces pending payroll actions, missing bank accounts, expiring contracts, and open shifts.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
});
