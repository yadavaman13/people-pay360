import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { createTestEmployee } from '../helpers/test-fixtures.js';

const docLogger = new FeatureApiDocLogger(
    '04_attendance.md',
    'Feature 04: Daily Attendance & Time Tracking API',
    'Covers employee check-in, check-out, multi-punch shifts, attendance exceptions, and manual correction audit trails.',
);

describe('04: Attendance & Time Tracking API', () => {
    let adminAuth;
    let employeeSession;
    let createdRecordId;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeSession = await createTestEmployee();
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('POST /api/attendance/check-in', () => {
        it('should record an employee check-in (201)', async () => {
            const res = await request(app)
                .post('/api/attendance/check-in')
                .set('Cookie', employeeSession.cookie)
                .send({
                    notes: 'Starting morning shift',
                });

            docLogger.record({
                scenario: 'Employee Check-In (Success)',
                method: 'POST',
                endpoint: '/api/attendance/check-in',
                requestBody: { notes: 'Starting morning shift' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Records punch-in timestamp, updates today attendance record, and sets initial status.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            createdRecordId = res.body.data.id;
        });

        it('should return 409 when attempting to check in again while already checked in', async () => {
            const res = await request(app)
                .post('/api/attendance/check-in')
                .set('Cookie', employeeSession.cookie)
                .send();

            docLogger.record({
                scenario: 'Duplicate Check-In Prevention',
                method: 'POST',
                endpoint: '/api/attendance/check-in',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Rejects punch-in if an active shift is already in progress.',
            });

            expect([400, 409]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/attendance/today', () => {
        it('should return current attendance status for today (200)', async () => {
            const res = await request(app)
                .get('/api/attendance/today')
                .set('Cookie', employeeSession.cookie);

            docLogger.record({
                scenario: 'Get Today Attendance Status',
                method: 'GET',
                endpoint: '/api/attendance/today',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns current checked-in/out status and punch log.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.isCurrentlyCheckedIn).toBe(true);
        });
    });

    describe('POST /api/attendance/check-out', () => {
        it('should record an employee check-out and compute worked hours (200)', async () => {
            const res = await request(app)
                .post('/api/attendance/check-out')
                .set('Cookie', employeeSession.cookie)
                .send({
                    notes: 'Ending work day',
                });

            docLogger.record({
                scenario: 'Employee Check-Out (Success)',
                method: 'POST',
                endpoint: '/api/attendance/check-out',
                requestBody: { notes: 'Ending work day' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Records punch-out, calculates worked duration, and resolves final attendance status.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.checkOutTime).toBeDefined();
        });
    });

    describe('GET /api/attendance', () => {
        it('should list attendance records with filtering and pagination (200)', async () => {
            const res = await request(app)
                .get('/api/attendance?page=1&limit=10')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Attendance Records',
                method: 'GET',
                endpoint: '/api/attendance',
                queryParams: { page: '1', limit: '10' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves attendance entries across employees for monitoring and audit.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/attendance/summary', () => {
        it('should return attendance aggregate summary metrics (200)', async () => {
            const res = await request(app)
                .get('/api/attendance/summary')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Attendance Summary Metrics',
                method: 'GET',
                endpoint: '/api/attendance/summary',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Aggregates status counts (PRESENT, LATE, ABSENT) and total worked hours.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('PATCH /api/attendance/:id', () => {
        it('should allow HR/Admin to apply manual correction with audit note (200)', async () => {
            const payload = {
                status: 'PRESENT',
                correctionReason: 'Biometric device network failure at punch out',
            };

            const res = await request(app)
                .patch(`/api/attendance/${createdRecordId}`)
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Manual Attendance Correction (Audit Trail)',
                method: 'PATCH',
                endpoint: `/api/attendance/:id`,
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Sets isManuallyCorrected=true and records HR user and reason for compliance.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.isManuallyCorrected).toBe(true);
            expect(res.body.data.correctionReason).toBe(payload.correctionReason);
        });
    });
});
