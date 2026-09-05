import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { createTestEmployee } from '../helpers/test-fixtures.js';

const docLogger = new FeatureApiDocLogger(
    '03_attendance.md',
    'Feature 03: Attendance Tracking & Clock-In/Out API',
    'Covers employee real-time check-in and check-out, working hours calculation, summary metrics, and HR manual attendance corrections.',
);

describe('03: Attendance Tracking API', () => {
    let adminUser = null;
    let employeeUser = null;
    let testEmployee = null;
    let attendanceRecordId = null;

    beforeAll(async () => {
        adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });
        const fixture = await createTestEmployee({ user: employeeUser.user });
        testEmployee = fixture.employee;
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Attendance Check-In & Check-Out Lifecycle', () => {
        it('POST /api/attendance/check-in should check in active employee (201)', async () => {
            const payload = {
                notes: 'Morning clock-in from web portal',
            };

            const res = await request(app)
                .post('/api/attendance/check-in')
                .set('Cookie', employeeUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Employee Check-In (Success 201)',
                method: 'POST',
                endpoint: '/api/attendance/check-in',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Records timestamped check-in event for the authenticated employee.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.id).toBeDefined();
            attendanceRecordId = res.body.data.id;
        });

        it('POST /api/attendance/check-in should reject duplicate check-in for same date (409)', async () => {
            const payload = {
                notes: 'Duplicate check-in attempt',
            };

            const res = await request(app)
                .post('/api/attendance/check-in')
                .set('Cookie', employeeUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Duplicate Check-In Conflict (409)',
                method: 'POST',
                endpoint: '/api/attendance/check-in',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Prevents multiple open check-in events on the same calendar date.',
            });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/attendance/:id/check-out should record checkout and calculate hours (200)', async () => {
            if (!attendanceRecordId) return;

            const payload = {
                notes: 'End of day checkout',
            };

            const res = await request(app)
                .post(`/api/attendance/${attendanceRecordId}/check-out`)
                .set('Cookie', employeeUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Employee Check-Out (Success 200)',
                method: 'POST',
                endpoint: `/api/attendance/${attendanceRecordId}/check-out`,
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Records checkout timestamp, calculates net worked hours, and closes daily record.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.checkOutTime).toBeDefined();
        });
    });

    describe('Attendance Queries & Administrative Operations', () => {
        it('GET /api/attendance should list attendance records (200)', async () => {
            const res = await request(app)
                .get('/api/attendance')
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'List Attendance Records (Success 200)',
                method: 'GET',
                endpoint: '/api/attendance',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves attendance records with pagination and filtering options.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('GET /api/attendance/summary should return organization metrics for HR (200)', async () => {
            const res = await request(app)
                .get('/api/attendance/summary')
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Attendance Summary Stats (Success 200)',
                method: 'GET',
                endpoint: '/api/attendance/summary',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns organizational metrics: present count, late arrivals, missing checkouts.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });

        it('GET /api/attendance/:id should return single record details (200)', async () => {
            if (!attendanceRecordId) return;

            const res = await request(app)
                .get(`/api/attendance/${attendanceRecordId}`)
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'Get Attendance Record By ID (Success 200)',
                method: 'GET',
                endpoint: `/api/attendance/${attendanceRecordId}`,
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves complete attendance details including check-in/out timestamps and worked hours.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(attendanceRecordId);
        });

        it('PATCH /api/attendance/:id should allow HR manual correction (200)', async () => {
            if (!attendanceRecordId) return;

            const payload = {
                correctionReason: 'Biometric device network failure at exit gate',
                workedHours: 8.5,
                status: 'PRESENT',
            };

            const res = await request(app)
                .patch(`/api/attendance/${attendanceRecordId}`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'HR Manual Attendance Correction (Success 200)',
                method: 'PATCH',
                endpoint: `/api/attendance/${attendanceRecordId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Allows HR managers to adjust times and attach mandatory audit correction reasons.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.correctionReason).toBe(payload.correctionReason);
        });

        it('DELETE /api/attendance/:id should delete attendance record (200)', async () => {
            if (!attendanceRecordId) return;

            const res = await request(app)
                .delete(`/api/attendance/${attendanceRecordId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Delete Attendance Record (Success 200)',
                method: 'DELETE',
                endpoint: `/api/attendance/${attendanceRecordId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Permits authorized HR to delete erroneous attendance records.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
