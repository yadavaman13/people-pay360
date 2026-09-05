import request from 'supertest';
import app from '../../app.js';
import { db } from '../../config/database.config.js';
import { users } from '../../db/schema/users.schema.js';
import { employees } from '../../db/schema/employees.schema.js';
import { contracts } from '../../db/schema/contracts.schema.js';
import { salaryStructures } from '../../db/schema/salary.schema.js';
import { attendanceRecords, attendancePunches } from '../../db/schema/attendance.schema.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { eq } from 'drizzle-orm';

describe('Contract-Based Attendance Daily Punch Limit', () => {
    let testUser = null;
    let testEmployee = null;
    let testStructure = null;
    let testContract = null;

    beforeAll(async () => {
        testUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });

        const [emp] = await db
            .insert(employees)
            .values({
                userId: testUser.user.id,
                employeeCode: `EMP_LIMIT_${Date.now()}`,
                firstName: 'PunchLimit',
                lastName: 'Tester',
                email: testUser.user.email,
                hireDate: '2026-01-01',
                isActive: true,
            })
            .returning();
        testEmployee = emp;

        const [structure] = await db
            .insert(salaryStructures)
            .values({
                name: `Test Structure ${Date.now()}`,
                code: `STR_${Date.now()}`,
                isActive: true,
            })
            .returning();
        testStructure = structure;

        // Create contract with maxPunchesPerDay: 3
        const [contract] = await db
            .insert(contracts)
            .values({
                employeeId: testEmployee.id,
                salaryStructureId: testStructure.id,
                startDate: '2026-01-01',
                endDate: null,
                wage: '50000.00',
                status: 'ACTIVE',
                maxPunchesPerDay: 3,
            })
            .returning();
        testContract = contract;
    });

    afterAll(async () => {
        try {
            if (testEmployee) {
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

                if (testContract) {
                    await db.delete(contracts).where(eq(contracts.id, testContract.id));
                }

                await db.delete(employees).where(eq(employees.id, testEmployee.id));
            }

            if (testStructure) {
                await db.delete(salaryStructures).where(eq(salaryStructures.id, testStructure.id));
            }

            if (testUser?.user?.id) {
                await db.delete(users).where(eq(users.id, testUser.user.id));
            }
        } catch (err) {
            console.warn('Cleanup error in punch limit test:', err);
        }
    });

    it('Punch 1: Check in and check out', async () => {
        const inRes = await request(app)
            .post('/api/attendance/check-in')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Punch 1 in' });
        expect(inRes.status).toBe(201);
        expect(inRes.body.data.punches).toHaveLength(1);

        const outRes = await request(app)
            .post('/api/attendance/check-out')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Punch 1 out' });
        expect(outRes.status).toBe(200);
    });

    it('Punch 2: Check in and check out', async () => {
        const inRes = await request(app)
            .post('/api/attendance/check-in')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Punch 2 in' });
        expect(inRes.status).toBe(201);
        expect(inRes.body.data.punches).toHaveLength(2);

        const outRes = await request(app)
            .post('/api/attendance/check-out')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Punch 2 out' });
        expect(outRes.status).toBe(200);
    });

    it('Punch 3: Check in and check out (reaches contract max of 3)', async () => {
        const inRes = await request(app)
            .post('/api/attendance/check-in')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Punch 3 in' });
        expect(inRes.status).toBe(201);
        expect(inRes.body.data.punches).toHaveLength(3);

        const outRes = await request(app)
            .post('/api/attendance/check-out')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Punch 3 out' });
        expect(outRes.status).toBe(200);
    });

    it('Punch 4: Attempting check-in beyond maxPunchesPerDay (3) should be rejected with 403', async () => {
        const res = await request(app)
            .post('/api/attendance/check-in')
            .set('Authorization', testUser.authHeader)
            .send({ notes: 'Punch 4 attempt' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Daily punch limit reached');
        expect(res.body.message).toContain('3');
    });

    it('GET /api/attendance/today should report canCheckIn: false and remainingPunches: 0', async () => {
        const res = await request(app)
            .get('/api/attendance/today')
            .set('Authorization', testUser.authHeader);

        expect(res.status).toBe(200);
        expect(res.body.data.hasAttendanceToday).toBe(true);
        expect(res.body.data.maxPunchesPerDay).toBe(3);
        expect(res.body.data.punchesUsed).toBe(3);
        expect(res.body.data.remainingPunches).toBe(0);
        expect(res.body.data.canCheckIn).toBe(false);
    });
});
