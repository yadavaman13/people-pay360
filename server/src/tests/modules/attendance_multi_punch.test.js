import request from 'supertest';
import app from '../../app.js';
import { db, pool } from '../../config/database.config.js';
import { users } from '../../db/schema/users.schema.js';
import { employees } from '../../db/schema/employees.schema.js';
import { attendanceRecords, attendancePunches } from '../../db/schema/attendance.schema.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { calculateWorkedDays } from '../../modules/payslips/services/salaryEngine.service.js';
import { eq } from 'drizzle-orm';

describe('Multi-Punch Attendance Lifecycle', () => {
    let testUser = null;
    let testEmployee = null;

    beforeAll(async () => {
        testUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });

        const [emp] = await db
            .insert(employees)
            .values({
                userId: testUser.user.id,
                employeeCode: `EMP_TEST_${Date.now()}`,
                firstName: 'MultiPunch',
                lastName: 'Tester',
                email: testUser.user.email,
                hireDate: '2026-01-01',
                isActive: true,
            })
            .returning();

        testEmployee = emp;
    });

    afterAll(async () => {
        try {
            if (testEmployee) {
                // Remove attendance punches and records
                const records = await db
                    .select({ id: attendanceRecords.id })
                    .from(attendanceRecords)
                    .where(eq(attendanceRecords.employeeId, testEmployee.id));

                for (const r of records) {
                    await db
                        .delete(attendancePunches)
                        .where(eq(attendancePunches.attendanceRecordId, r.id));
                }

                await db
                    .delete(attendanceRecords)
                    .where(eq(attendanceRecords.employeeId, testEmployee.id));

                await db.delete(employees).where(eq(employees.id, testEmployee.id));
            }

            if (testUser?.user?.id) {
                await db.delete(users).where(eq(users.id, testUser.user.id));
            }
        } catch (err) {
            console.warn('Cleanup error:', err);
        }
    });

    it('Step 1: Should check in for the first time today, creating attendance record and first punch', async () => {
        const res = await request(app)
            .post('/api/attendance/check-in')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Morning punch 1' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();

        const record = res.body.data;
        expect(record.employeeId).toBe(testEmployee.id);
        expect(record.checkInTime).toBeDefined();
        expect(record.checkOutTime).toBeNull();
        expect(record.isCurrentlyCheckedIn).toBe(true);
        expect(record.punches).toHaveLength(1);
        expect(record.punches[0].notes).toBe('Morning punch 1');
        expect(record.punches[0].checkOutTime).toBeNull();
    });

    it('Step 2: Should reject second check-in with 409 while session 1 is still open', async () => {
        const res = await request(app)
            .post('/api/attendance/check-in')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Attempt double check-in' });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('active check-in session');
    });

    it('Step 3: Should successfully check out session 1 using self-service /api/attendance/check-out', async () => {
        const res = await request(app)
            .post('/api/attendance/check-out')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Lunch break checkout' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const record = res.body.data;
        expect(record.checkOutTime).not.toBeNull();
        expect(record.isCurrentlyCheckedIn).toBe(false);
        expect(record.punches).toHaveLength(1);
        expect(record.punches[0].checkOutTime).not.toBeNull();
    });

    it('Step 4: Should allow checking in a second time on the same day (session 2)', async () => {
        const res = await request(app)
            .post('/api/attendance/check-in')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Afternoon punch 2' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const record = res.body.data;
        expect(record.checkOutTime).toBeNull(); // Reset to null because employee is active again
        expect(record.isCurrentlyCheckedIn).toBe(true);
        expect(record.punches).toHaveLength(2);
        expect(record.punches[1].notes).toBe('Afternoon punch 2');
        expect(record.punches[1].checkOutTime).toBeNull();
    });

    it('Step 5: Should fetch today live status from GET /api/attendance/today', async () => {
        const res = await request(app)
            .get('/api/attendance/today')
            .set('Authorization', testUser.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.hasAttendanceToday).toBe(true);
        expect(res.body.data.isCurrentlyCheckedIn).toBe(true);
        expect(res.body.data.activePunch).toBeDefined();
        expect(res.body.data.punches).toHaveLength(2);
    });

    it('Step 6: Should check out session 2 and recalculate cumulative daily worked hours', async () => {
        const res = await request(app)
            .post('/api/attendance/check-out')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'End of day checkout' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const record = res.body.data;
        expect(record.checkOutTime).not.toBeNull();
        expect(record.isCurrentlyCheckedIn).toBe(false);
        expect(record.punches).toHaveLength(2);
        expect(record.punches[0].checkOutTime).not.toBeNull();
        expect(record.punches[1].checkOutTime).not.toBeNull();

        // Verify salary engine calculates exactly 1 day (or 0.5 if half-day) and NOT 2 days
        const workedDays = calculateWorkedDays([record]);
        expect(workedDays).toBeLessThanOrEqual(1.0);
    });
});
