import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { createTestEmployee } from '../helpers/test-fixtures.js';

const docLogger = new FeatureApiDocLogger(
    '05_time_off.md',
    'Feature 05: Leave Policy, Allocations & Time Off Requests API',
    'Covers leave types, balance allocation lifecycles, time-off requests, and atomic balance deduction on approval.',
);

describe('05: Time Off & Leave Management API', () => {
    let adminAuth;
    let employeeSession;
    let createdTypeId;
    let createdAllocationId;
    let createdRequestId;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeSession = await createTestEmployee();
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('POST /api/time-off/types', () => {
        it('should create a new leave type policy (201)', async () => {
            const timestamp = Date.now();
            const payload = {
                name: `Paid Vacation ${timestamp}`,
                code: `VAC_${timestamp.toString().slice(-4)}`,
                allocationRequired: true,
                requestApprovalRequired: true,
                paidTimeOff: true,
                maxDaysPerRequest: 10,
            };

            const res = await request(app)
                .post('/api/time-off/types')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Time Off Type (Policy Master)',
                method: 'POST',
                endpoint: '/api/time-off/types',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Defines leave rule, allocation requirement, and paid/unpaid classification.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            createdTypeId = res.body.data.id;
        });

        it('should list all available leave types (200)', async () => {
            const res = await request(app)
                .get('/api/time-off/types')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Time Off Types',
                method: 'GET',
                endpoint: '/api/time-off/types',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves leave types catalog.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('POST /api/time-off/allocations', () => {
        it('should create a leave allocation in PENDING state (201)', async () => {
            const payload = {
                employeeId: employeeSession.employee.id,
                typeId: createdTypeId,
                totalDays: '15.00',
                validityStart: '2026-01-01',
                validityEnd: '2026-12-31',
                notes: 'Annual leave quota grant',
            };

            const res = await request(app)
                .post('/api/time-off/allocations')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Leave Allocation (Pending)',
                method: 'POST',
                endpoint: '/api/time-off/allocations',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Allocates leave balance budget to employee in PENDING state.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('PENDING');
            createdAllocationId = res.body.data.id;
        });

        it('POST /api/time-off/allocations/:id/approve should approve allocation and make balance available (BR-008) (200)', async () => {
            const res = await request(app)
                .post(`/api/time-off/allocations/${createdAllocationId}/approve`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Approve Leave Allocation (Balance Available)',
                method: 'POST',
                endpoint: `/api/time-off/allocations/:id/approve`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Approved allocation makes leave balance active for consumption.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('APPROVED');
        });
    });

    describe('POST /api/time-off/requests', () => {
        it('should create a leave request for employee (201)', async () => {
            const payload = {
                employeeId: employeeSession.employee.id,
                typeId: createdTypeId,
                startDate: '2026-10-14',
                endDate: '2026-10-16',
                numberOfDays: '3.00',
                reason: 'Family event',
            };

            const res = await request(app)
                .post('/api/time-off/requests')
                .set('Cookie', employeeSession.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Submit Time Off Request',
                method: 'POST',
                endpoint: '/api/time-off/requests',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Submits request in PENDING state for manager/HR approval.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('PENDING');
            createdRequestId = res.body.data.id;
        });

        it('should create a single-day leave request where endDate equals startDate (201)', async () => {
            const payload = {
                employeeId: employeeSession.employee.id,
                typeId: createdTypeId,
                startDate: '2026-10-20',
                endDate: '2026-10-20',
                numberOfDays: '1.00',
                reason: 'Doctor appointment',
            };

            const res = await request(app)
                .post('/api/time-off/requests')
                .set('Cookie', employeeSession.cookie)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('PENDING');
            expect(res.body.data.startDate).toBe('2026-10-20');
            expect(res.body.data.endDate).toBe('2026-10-20');
            expect(Number(res.body.data.numberOfDays)).toBe(1);

            const singleDayId = res.body.data.id;
            const cancelRes = await request(app)
                .post(`/api/time-off/requests/${singleDayId}/cancel`)
                .set('Cookie', employeeSession.cookie);

            expect(cancelRes.status).toBe(200);
            expect(cancelRes.body.success).toBe(true);
            expect(cancelRes.body.data.status).toBe('CANCELLED');
        });

        it('POST /api/time-off/requests/:id/approve should approve request and consume allocation (BR-009) (200)', async () => {
            const res = await request(app)
                .post(`/api/time-off/requests/${createdRequestId}/approve`)
                .set('Cookie', adminAuth.cookie)
                .send({ reviewNotes: 'Approved by HR' });

            docLogger.record({
                scenario: 'Approve Time Off Request (Balance Deducted)',
                method: 'POST',
                endpoint: `/api/time-off/requests/:id/approve`,
                requestBody: { reviewNotes: 'Approved by HR' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Atomically marks request APPROVED and increments allocation used_days balance.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('APPROVED');
        });
    });

    describe('GET /api/time-off/balance', () => {
        it('should return updated leave balance reflecting consumed days (200)', async () => {
            const res = await request(app)
                .get(`/api/time-off/balance?employeeId=${employeeSession.employee.id}`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Leave Balance Summary',
                method: 'GET',
                endpoint: '/api/time-off/balance',
                queryParams: { employeeId: employeeSession.employee.id },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Calculates remaining leave balance (totalDays - usedDays).',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });
});
