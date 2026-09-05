import request from 'supertest';
import app from '../../app.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { db } from '../../config/database.config.js';
import { salaryStructures } from '../../db/schema/salary.schema.js';
import { departments } from '../../db/schema/departments.schema.js';

describe('Employee & Contract Core Module Integration Tests', () => {
    let adminAuth = null;
    let employeeAuth = null;
    let testStructure = null;
    let testDepartment = null;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeAuth = await createAndLoginTestUser({
            role: 'EMPLOYEE',
            firstName: 'Jane',
            lastName: 'Doe',
        });

        // Insert test department
        const [dept] = await db
            .insert(departments)
            .values({
                name: 'Engineering',
                code: `ENG_${Date.now()}`,
            })
            .returning();
        testDepartment = dept;

        // Insert test salary structure
        const [structure] = await db
            .insert(salaryStructures)
            .values({
                name: 'Regular Full-Time',
                code: `REG_FT_${Date.now()}`,
                isActive: true,
            })
            .returning();
        testStructure = structure;
    });

    let createdEmployeeId = null;

    describe('1. HRMS User-Driven Employee Profile Onboarding', () => {
        it('allows authenticated user to onboard their own employee profile', async () => {
            const res = await request(app)
                .post('/api/employees')
                .set('Authorization', employeeAuth.authHeader)
                .send({
                    phone: '+919876543210',
                    gender: 'FEMALE',
                    dateOfBirth: '1995-03-20',
                    address: 'Tech Park, Bangalore',
                    hireDate: '2026-01-15',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data.userId).toBe(employeeAuth.user.id);
            expect(res.body.data.firstName).toBe('Jane');
            expect(res.body.data.lastName).toBe('Doe');
            expect(res.body.data.employeeCode).toMatch(/^PP360-JD-2026-\d{4}$/);
            expect(res.body.data.status).toBe('ACTIVE');

            createdEmployeeId = res.body.data.id;
        });

        it('rejects duplicate onboarding for the same user with 409 Conflict', async () => {
            const res = await request(app)
                .post('/api/employees')
                .set('Authorization', employeeAuth.authHeader)
                .send({
                    phone: '+919876543210',
                    gender: 'FEMALE',
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });

        it('allows authenticated user to view their own profile via GET /api/employees/me', async () => {
            const res = await request(app)
                .get('/api/employees/me')
                .set('Authorization', employeeAuth.authHeader);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(createdEmployeeId);
            expect(res.body.data.user).toBeDefined();
        });

        it('allows user to update personal details via PATCH /api/employees/me', async () => {
            const res = await request(app)
                .patch('/api/employees/me')
                .set('Authorization', employeeAuth.authHeader)
                .send({
                    phone: '+919999999999',
                    address: 'Updated Address, Indiranagar',
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.phone).toBe('+919999999999');
            expect(res.body.data.address).toBe('Updated Address, Indiranagar');
        });

        it('ignores organizational attributes when updated by regular EMPLOYEE', async () => {
            const res = await request(app)
                .patch('/api/employees/me')
                .set('Authorization', employeeAuth.authHeader)
                .send({
                    status: 'ARCHIVED',
                });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe('ACTIVE');
        });
    });

    describe('2. Admin Operations & Employee CRUD', () => {
        it('allows Admin to list employees via GET /api/employees', async () => {
            const res = await request(app)
                .get('/api/employees')
                .set('Authorization', adminAuth.authHeader);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data.employees)).toBe(true);
            expect(res.body.data.total).toBeGreaterThanOrEqual(1);
        });

        it('allows Admin to assign department and position to employee', async () => {
            const res = await request(app)
                .patch(`/api/employees/${createdEmployeeId}`)
                .set('Authorization', adminAuth.authHeader)
                .send({
                    departmentId: testDepartment.id,
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.departmentId).toBe(testDepartment.id);
            expect(res.body.data.department?.name).toBe('Engineering');
        });
    });

    describe('3. Employment Contract Management & Overlap Validation', () => {
        let contract1Id = null;
        let draftContractId = null;

        it('allows Admin to create an ACTIVE contract for employee', async () => {
            const res = await request(app)
                .post('/api/contracts')
                .set('Authorization', adminAuth.authHeader)
                .send({
                    employeeId: createdEmployeeId,
                    salaryStructureId: testStructure.id,
                    startDate: '2026-01-01',
                    endDate: '2026-06-30',
                    wage: 60000,
                    status: 'ACTIVE',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('ACTIVE');
            contract1Id = res.body.data.id;
        });

        it('rejects creation of an overlapping ACTIVE contract with 409 Conflict', async () => {
            const res = await request(app)
                .post('/api/contracts')
                .set('Authorization', adminAuth.authHeader)
                .send({
                    employeeId: createdEmployeeId,
                    salaryStructureId: testStructure.id,
                    startDate: '2026-05-01',
                    endDate: '2026-12-31',
                    wage: 65000,
                    status: 'ACTIVE',
                });

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('active contract already covers this date range');
        });

        it('allows creating a non-overlapping DRAFT contract', async () => {
            const res = await request(app)
                .post('/api/contracts')
                .set('Authorization', adminAuth.authHeader)
                .send({
                    employeeId: createdEmployeeId,
                    salaryStructureId: testStructure.id,
                    startDate: '2026-07-01',
                    endDate: '2026-12-31',
                    wage: 70000,
                    status: 'DRAFT',
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('DRAFT');
            draftContractId = res.body.data.id;
        });

        it('allows activating a non-overlapping DRAFT contract', async () => {
            const res = await request(app)
                .post(`/api/contracts/${draftContractId}/activate`)
                .set('Authorization', adminAuth.authHeader);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('ACTIVE');
        });

        it('retrieves applicable contract for a payroll period', async () => {
            const res = await request(app)
                .get(
                    `/api/employees/${createdEmployeeId}/contracts/applicable?periodStart=2026-03-01&periodEnd=2026-03-31`,
                )
                .set('Authorization', adminAuth.authHeader);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(contract1Id);
        });

        it('retrieves second contract when period is in second half of year', async () => {
            const res = await request(app)
                .get(
                    `/api/employees/${createdEmployeeId}/contracts/applicable?periodStart=2026-08-01&periodEnd=2026-08-31`,
                )
                .set('Authorization', adminAuth.authHeader);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(draftContractId);
        });

        it('returns 422 if no active contract covers requested period', async () => {
            const res = await request(app)
                .get(
                    `/api/employees/${createdEmployeeId}/contracts/applicable?periodStart=2025-01-01&periodEnd=2025-01-31`,
                )
                .set('Authorization', adminAuth.authHeader);

            expect(res.status).toBe(422);
            expect(res.body.success).toBe(false);
        });
    });

    describe('4. Payrun Eligibility Resolver (/api/employees/for-payrun)', () => {
        it('resolves roster of active employees matching salary structure for period', async () => {
            const res = await request(app)
                .get(
                    `/api/employees/for-payrun?structureId=${testStructure.id}&periodStart=2026-03-01&periodEnd=2026-03-31`,
                )
                .set('Authorization', adminAuth.authHeader);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);

            const rosterEmployee = res.body.data.find((e) => e.id === createdEmployeeId);
            expect(rosterEmployee).toBeDefined();
            expect(rosterEmployee.eligibilityStatus).toBe('ELIGIBLE');
            // Missing bank account triggers warning note
            expect(rosterEmployee.hasPrimaryBankAccount).toBe(false);
            expect(rosterEmployee.eligibilityNotes).toBe('Missing active primary bank account');
        });
    });

    describe('5. Soft-Delete Employee Record', () => {
        it('allows Admin to archive employee (soft delete)', async () => {
            const res = await request(app)
                .delete(`/api/employees/${createdEmployeeId}`)
                .set('Authorization', adminAuth.authHeader);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('ARCHIVED');
            expect(res.body.data.isActive).toBe(false);
        });
    });
});
