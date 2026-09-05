import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

const docLogger = new FeatureApiDocLogger(
    '02_schedules.md',
    'Feature 02: Working Schedules & Shift Management API',
    'Covers working schedule templates, day-wise shift definitions, weekly hours calculation, and lines replacement.',
);

describe('02: Working Schedules & Shift Management API', () => {
    let adminAuth;
    let employeeAuth;
    let createdScheduleId;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeAuth = await createAndLoginTestUser({ role: 'EMPLOYEE' });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('POST /api/working-schedules', () => {
        it('should return 403 when called by regular EMPLOYEE', async () => {
            const res = await request(app)
                .post('/api/working-schedules')
                .set('Cookie', employeeAuth.cookie)
                .send({
                    name: 'Unauthorized Schedule',
                    timezone: 'Asia/Kolkata',
                });

            docLogger.record({
                scenario: 'Create Working Schedule (Unauthorized Employee)',
                method: 'POST',
                endpoint: '/api/working-schedules',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Employees cannot configure organization working schedules.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should create a new working schedule with shift lines when called by ADMIN (201)', async () => {
            const payload = {
                name: `Standard 40h Office Shift ${Date.now()}`,
                description: 'Standard 40 hours per week schedule (Monday-Friday)',
                timezone: 'Asia/Kolkata',
                lines: [
                    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
                    { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
                    { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
                    { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
                    { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
                ],
            };

            const res = await request(app)
                .post('/api/working-schedules')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Working Schedule with Shift Lines (Success)',
                method: 'POST',
                endpoint: '/api/working-schedules',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Creates master schedule and day-wise shift definitions atomically.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.name).toBe(payload.name);
            createdScheduleId = res.body.data.id;
        });

        it('should return 400 when validation fails on invalid dayOfWeek or time', async () => {
            const invalidPayload = {
                name: 'Bad Schedule',
                lines: [{ dayOfWeek: 8, startTime: 'invalid-time', endTime: '09:00' }],
            };

            const res = await request(app)
                .post('/api/working-schedules')
                .set('Cookie', adminAuth.cookie)
                .send(invalidPayload);

            docLogger.record({
                scenario: 'Create Schedule (Validation Error)',
                method: 'POST',
                endpoint: '/api/working-schedules',
                requestBody: invalidPayload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Validates day of week (1-7) and time formats (HH:mm).',
            });

            expect([400, 422]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/working-schedules', () => {
        it('should list all working schedules (200)', async () => {
            const res = await request(app)
                .get('/api/working-schedules?page=1&limit=10')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Working Schedules',
                method: 'GET',
                endpoint: '/api/working-schedules',
                queryParams: { page: '1', limit: '10' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves all active schedules with lines count.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/working-schedules/:id', () => {
        it('should return a schedule by ID with populated lines (200)', async () => {
            const res = await request(app)
                .get(`/api/working-schedules/${createdScheduleId}`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Schedule By ID',
                method: 'GET',
                endpoint: `/api/working-schedules/:id`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns schedule master and its associated day lines.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(createdScheduleId);
            expect(Array.isArray(res.body.data.lines)).toBe(true);
        });

        it('should return 404 for non-existent schedule UUID', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const res = await request(app)
                .get(`/api/working-schedules/${fakeId}`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Schedule (Not Found)',
                method: 'GET',
                endpoint: `/api/working-schedules/:id`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns 404 when schedule ID is not found.',
            });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });
    });

    describe('GET /api/working-schedules/:id/weekly-hours', () => {
        it('should calculate total weekly hours from schedule lines (200)', async () => {
            const res = await request(app)
                .get(`/api/working-schedules/${createdScheduleId}/weekly-hours`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Calculate Weekly Working Hours (BR-007)',
                method: 'GET',
                endpoint: `/api/working-schedules/:id/weekly-hours`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Calculates net worked hours per week by subtracting breaks from shift durations.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.weeklyHours).toBeDefined();
            // 5 days * (8 hours - 1 hour break = 7 hours) = 35 hours
            expect(res.body.data.weeklyHours).toBe(35);
        });
    });

    describe('PUT /api/working-schedules/:id/lines', () => {
        it('should atomically replace schedule lines (200)', async () => {
            const newLines = [
                { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
                { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
                { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
                { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
                { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', breakMinutes: 60 },
            ];

            const res = await request(app)
                .put(`/api/working-schedules/${createdScheduleId}/lines`)
                .set('Cookie', adminAuth.cookie)
                .send({ lines: newLines });

            docLogger.record({
                scenario: 'Replace Schedule Lines',
                method: 'PUT',
                endpoint: `/api/working-schedules/:id/lines`,
                requestBody: { lines: newLines },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Replaces all shift lines in a single atomic transaction.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.lines.length).toBe(5);
        });
    });

    describe('PATCH /api/working-schedules/:id', () => {
        it('should update schedule metadata (200)', async () => {
            const updatedName = `Updated 40h Office Shift ${Date.now()}`;
            const res = await request(app)
                .patch(`/api/working-schedules/${createdScheduleId}`)
                .set('Cookie', adminAuth.cookie)
                .send({ name: updatedName });

            docLogger.record({
                scenario: 'Update Schedule Metadata',
                method: 'PATCH',
                endpoint: `/api/working-schedules/:id`,
                requestBody: { name: updatedName },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Updates schedule header details.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(updatedName);
        });
    });

    describe('DELETE /api/working-schedules/:id', () => {
        it('should soft-delete or remove schedule (200)', async () => {
            const res = await request(app)
                .delete(`/api/working-schedules/${createdScheduleId}`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Delete Schedule',
                method: 'DELETE',
                endpoint: `/api/working-schedules/:id`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Deactivates or deletes working schedule.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
