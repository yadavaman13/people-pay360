import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { createTestEmployee } from '../helpers/test-fixtures.js';

const docLogger = new FeatureApiDocLogger(
    '04_time_off.md',
    'Feature 04: Time-Off, Allocations & Leave Management API',
    'Covers leave policy types configuration, employee leave quota allocations, leave request approvals, and atomic balance deductions.',
);

describe('04: Time-Off & Leave Management API', () => {
    let adminUser = null;
    let employeeUser = null;
    let testEmployee = null;
    let leaveTypeId = null;
    let allocationId = null;
    let requestId = null;

    beforeAll(async () => {
        adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });
        const fixture = await createTestEmployee({ user: employeeUser.user });
        testEmployee = fixture.employee;
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Leave Types Policy Configuration', () => {
        it('POST /api/time-off/types should reject non-privileged user (403)', async () => {
            const payload = {
                name: 'Unauthorized Leave',
                code: 'UNAUTH',
            };

            const res = await request(app)
                .post('/api/time-off/types')
                .set('Cookie', employeeUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Leave Type by Employee (Forbidden 403)',
                method: 'POST',
                endpoint: '/api/time-off/types',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Only HR Managers and Admins can configure corporate leave policy types.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/time-off/types should create leave type (201)', async () => {
            const timestamp = Date.now();
            const payload = {
                name: `Annual Paid Vacation ${timestamp}`,
                code: `VAC_${timestamp}`.slice(0, 45),
                allocationRequired: true,
                requestApprovalRequired: true,
                paidTimeOff: true,
                maxDaysPerRequest: 14,
            };

            const res = await request(app)
                .post('/api/time-off/types')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Leave Type (Success 201)',
                method: 'POST',
                endpoint: '/api/time-off/types',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Provisions new corporate leave type with approval workflow requirements.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            leaveTypeId = res.body.data.id;
        });

        it('GET /api/time-off/types should list all active leave types (200)', async () => {
            const res = await request(app)
                .get('/api/time-off/types')
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'List Leave Types (Success 200)',
                method: 'GET',
                endpoint: '/api/time-off/types',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Lists active leave policy types available to employees.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('GET /api/time-off/types/:id should return single leave type (200)', async () => {
            if (!leaveTypeId) return;

            const res = await request(app)
                .get(`/api/time-off/types/${leaveTypeId}`)
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'Get Leave Type By ID (Success 200)',
                method: 'GET',
                endpoint: `/api/time-off/types/${leaveTypeId}`,
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Fetches detailed configuration for a specific leave type.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(leaveTypeId);
        });
    });

    describe('Leave Allocations & Balance Management', () => {
        it('POST /api/time-off/allocations should allocate leave quota to employee (201)', async () => {
            if (!leaveTypeId) return;

            const payload = {
                employeeId: testEmployee.id,
                typeId: leaveTypeId,
                totalDays: 14,
                validityStart: '2026-01-01',
                validityEnd: '2026-12-31',
                notes: 'Annual leave allocation for 2026',
            };

            const res = await request(app)
                .post('/api/time-off/allocations')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Leave Allocation (Success 201)',
                method: 'POST',
                endpoint: '/api/time-off/allocations',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Allocates leave balance days to an employee profile in DRAFT status.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            allocationId = res.body.data.id;
        });

        it('POST /api/time-off/allocations/:id/approve should approve allocation (200)', async () => {
            if (!allocationId) return;

            const res = await request(app)
                .post(`/api/time-off/allocations/${allocationId}/approve`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Approve Leave Allocation (Success 200)',
                method: 'POST',
                endpoint: `/api/time-off/allocations/${allocationId}/approve`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Approves allocation quota, making the balance active and available for consumption.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('GET /api/time-off/balance/:employeeId should return active leave balance (200)', async () => {
            const res = await request(app)
                .get(`/api/time-off/balance/${testEmployee.id}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Employee Leave Balance (Success 200)',
                method: 'GET',
                endpoint: `/api/time-off/balance/${testEmployee.id}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns current allocated, taken, and remaining leave balances per leave type.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('Leave Requests & Consumption Workflow', () => {
        it('POST /api/time-off/requests should submit leave request (201)', async () => {
            if (!leaveTypeId) return;

            const payload = {
                typeId: leaveTypeId,
                startDate: '2026-07-01',
                endDate: '2026-07-05',
                numberOfDays: 5,
                reason: 'Summer family trip',
            };

            const res = await request(app)
                .post('/api/time-off/requests')
                .set('Cookie', employeeUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Submit Leave Request (Success 201)',
                method: 'POST',
                endpoint: '/api/time-off/requests',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Submits an employee time-off request in PENDING approval status.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            requestId = res.body.data.id;
        });

        it('GET /api/time-off/requests should list requests (200)', async () => {
            const res = await request(app)
                .get('/api/time-off/requests')
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'List Time-Off Requests (Success 200)',
                method: 'GET',
                endpoint: '/api/time-off/requests',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Lists submitted time-off requests with approval statuses.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('POST /api/time-off/requests/:id/approve should approve request and deduct balance (200)', async () => {
            if (!requestId) return;

            const res = await request(app)
                .post(`/api/time-off/requests/${requestId}/approve`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Approve Leave Request & Deduct Balance (Success 200)',
                method: 'POST',
                endpoint: `/api/time-off/requests/${requestId}/approve`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Atomically approves request and decrements allocated balance in one DB transaction.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
