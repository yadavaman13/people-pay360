import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

const docLogger = new FeatureApiDocLogger(
    '02_schedules.md',
    'Feature 02: Working Schedules & Shift Planning API',
    'Covers working schedule definitions, daily shift line slots, weekly working hours calculations, and schedule lifecycle management.',
);

describe('02: Working Schedules API', () => {
    let adminUser = null;
    let employeeUser = null;
    let createdScheduleId = null;

    beforeAll(async () => {
        adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Schedule Authorization & Validation', () => {
        it('POST /api/working-schedules should reject non-privileged user (403)', async () => {
            const payload = {
                name: 'Unauthorized Schedule',
            };

            const res = await request(app)
                .post('/api/working-schedules')
                .set('Cookie', employeeUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Schedule by Employee (Forbidden 403)',
                method: 'POST',
                endpoint: '/api/working-schedules',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Only HR Managers and Admins are authorized to configure working schedules.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/working-schedules should return 422 on missing required fields', async () => {
            const invalidPayload = {
                description: 'Schedule without name',
            };

            const res = await request(app)
                .post('/api/working-schedules')
                .set('Cookie', adminUser.cookie)
                .send(invalidPayload);

            docLogger.record({
                scenario: 'Create Schedule Validation Failure (422)',
                method: 'POST',
                endpoint: '/api/working-schedules',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: invalidPayload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns 422 unprocessable entity when required name field is missing.',
            });

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Schedule CRUD Operations', () => {
        it('POST /api/working-schedules should create schedule with shift lines (201)', async () => {
            const payload = {
                name: `Standard 40h Shift ${Date.now()}`,
                description: 'Standard Monday through Friday 40-hour weekly schedule',
                timezone: 'Asia/Kolkata',
                lines: [
                    { dayOfWeek: 1, startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
                    { dayOfWeek: 2, startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
                    { dayOfWeek: 3, startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
                    { dayOfWeek: 4, startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
                    { dayOfWeek: 5, startTime: '09:00:00', endTime: '18:00:00', breakMinutes: 60 },
                ],
            };

            const res = await request(app)
                .post('/api/working-schedules')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Working Schedule with Lines (Success 201)',
                method: 'POST',
                endpoint: '/api/working-schedules',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Creates new schedule header and associates 5 daily shift lines.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.id).toBeDefined();
            createdScheduleId = res.body.data.id;
        });

        it('GET /api/working-schedules should list all schedules (200)', async () => {
            const res = await request(app)
                .get('/api/working-schedules')
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'List Working Schedules (Success 200)',
                method: 'GET',
                endpoint: '/api/working-schedules',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves all organization working schedules.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('GET /api/working-schedules/:id should fetch schedule with lines (200)', async () => {
            if (!createdScheduleId) return;

            const res = await request(app)
                .get(`/api/working-schedules/${createdScheduleId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Working Schedule By ID (Success 200)',
                method: 'GET',
                endpoint: `/api/working-schedules/${createdScheduleId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Fetches single working schedule including all configured schedule lines.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(createdScheduleId);
            expect(Array.isArray(res.body.data.lines)).toBe(true);
        });

        it('GET /api/working-schedules/:id/weekly-hours should calculate weekly hours (200)', async () => {
            if (!createdScheduleId) return;

            const res = await request(app)
                .get(`/api/working-schedules/${createdScheduleId}/weekly-hours`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Calculate Weekly Working Hours (Success 200)',
                method: 'GET',
                endpoint: `/api/working-schedules/${createdScheduleId}/weekly-hours`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Computes total net weekly working hours by summing shift lines less break minutes.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.weeklyHours).toBeDefined();
            expect(Number(res.body.data.weeklyHours)).toBe(40);
        });

        it('PUT /api/working-schedules/:id/lines should replace shift lines (200)', async () => {
            if (!createdScheduleId) return;

            const replacementPayload = {
                lines: [
                    { dayOfWeek: 1, startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
                    { dayOfWeek: 2, startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
                    { dayOfWeek: 3, startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
                    { dayOfWeek: 4, startTime: '10:00:00', endTime: '19:00:00', breakMinutes: 60 },
                ],
            };

            const res = await request(app)
                .put(`/api/working-schedules/${createdScheduleId}/lines`)
                .set('Cookie', adminUser.cookie)
                .send(replacementPayload);

            docLogger.record({
                scenario: 'Replace Schedule Shift Lines (Success 200)',
                method: 'PUT',
                endpoint: `/api/working-schedules/${createdScheduleId}/lines`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: replacementPayload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Atomically replaces all recurring daily shift lines for the schedule.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('PATCH /api/working-schedules/:id should update schedule details (200)', async () => {
            if (!createdScheduleId) return;

            const updatePayload = {
                name: `Updated 32h Flexible Schedule ${Date.now()}`,
                description: 'Updated 4-day work week description',
            };

            const res = await request(app)
                .patch(`/api/working-schedules/${createdScheduleId}`)
                .set('Cookie', adminUser.cookie)
                .send(updatePayload);

            docLogger.record({
                scenario: 'Update Working Schedule (Success 200)',
                method: 'PATCH',
                endpoint: `/api/working-schedules/${createdScheduleId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: updatePayload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Updates schedule metadata such as name, timezone, or description.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(updatePayload.name);
        });

        it('DELETE /api/working-schedules/:id should deactivate schedule (200)', async () => {
            if (!createdScheduleId) return;

            const res = await request(app)
                .delete(`/api/working-schedules/${createdScheduleId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Deactivate Working Schedule (Success 200)',
                method: 'DELETE',
                endpoint: `/api/working-schedules/${createdScheduleId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Soft-deactivates or deletes working schedule when not referenced by active contracts.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
