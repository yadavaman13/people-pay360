import request from 'supertest';
import app from '../../app.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

describe('Dev 4: Dashboard Module API Tests', () => {
    let adminAuth;
    let hrAuth;
    let employeeAuth;

    beforeAll(async () => {
        try {
            adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
            hrAuth = await createAndLoginTestUser({ role: 'HR_MANAGER' });
            employeeAuth = await createAndLoginTestUser({ role: 'EMPLOYEE' });
        } catch (err) {
            console.error('Error in beforeAll setting up users:', err);
        }
    });

    describe('1. Authentication Guard', () => {
        it('should return 401 Unauthorized for unauthenticated requests', async () => {
            const res = await request(app).get('/api/dashboard/summary');
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('2. GET /api/dashboard/summary', () => {
        it('should return 200 with live summary KPIs for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary')
                .set('Cookie', adminAuth.cookie);

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

        it('should return 200 for HR_MANAGER with payroll figures restricted', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary')
                .set('Cookie', hrAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.payroll.payrollAccessRestricted).toBe(true);
        });

        it('should return 200 for EMPLOYEE scoped to personal statistics', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary')
                .set('Cookie', employeeAuth.cookie);

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

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should return 400 for invalid date query params', async () => {
            const res = await request(app)
                .get('/api/dashboard/summary?periodStart=not-a-date')
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('3. GET /api/dashboard/salary-by-department', () => {
        it('should return 200 with department salary metrics for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/salary-by-department')
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should enforce BR-002: return 403 Forbidden for HR_MANAGER', async () => {
            const res = await request(app)
                .get('/api/dashboard/salary-by-department')
                .set('Cookie', hrAuth.cookie);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should return 403 Forbidden for EMPLOYEE', async () => {
            const res = await request(app)
                .get('/api/dashboard/salary-by-department')
                .set('Cookie', employeeAuth.cookie);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('4. GET /api/dashboard/net-salary-trends', () => {
        it('should return 200 with multi-month trends for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/net-salary-trends?months=6')
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should enforce BR-002: return 403 for HR_MANAGER', async () => {
            const res = await request(app)
                .get('/api/dashboard/net-salary-trends')
                .set('Cookie', hrAuth.cookie);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('5. GET /api/dashboard/attendance', () => {
        it('should return 200 with attendance breakdown for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/attendance')
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.summary).toBeDefined();
            expect(res.body.data.dailyTimeline).toBeDefined();
        });

        it('should return 200 for HR_MANAGER', async () => {
            const res = await request(app)
                .get('/api/dashboard/attendance')
                .set('Cookie', hrAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('6. GET /api/dashboard/time-off', () => {
        it('should return 200 with time off metrics and types for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/time-off')
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.summary).toBeDefined();
            expect(res.body.data.byType).toBeDefined();
            expect(Array.isArray(res.body.data.byType)).toBe(true);
        });
    });

    describe('7. GET /api/dashboard/department-breakdown', () => {
        it('should return 200 with operational matrix for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/department-breakdown')
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return 200 for HR_MANAGER with salary columns redacted per BR-002', async () => {
            const res = await request(app)
                .get('/api/dashboard/department-breakdown')
                .set('Cookie', hrAuth.cookie);

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

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('8. GET /api/dashboard/alerts', () => {
        it('should return 200 with active alerts list for ADMIN', async () => {
            const res = await request(app)
                .get('/api/dashboard/alerts')
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
});
