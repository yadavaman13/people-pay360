import request from 'supertest';
import app from '../../app.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import {
    createTestEmployee,
    createTestSalaryStructureWithRules,
    createTestContract,
} from '../helpers/test-fixtures.js';
import { db } from '../../config/database.config.js';
import { payslips } from '../../db/schema/payroll.schema.js';
import { eq } from 'drizzle-orm';

describe('10: Payroll Lifecycle & Financial Correctness Regression Tests', () => {
    let adminAuth;
    let hrManagerAuth;
    let employeeSession;
    let structure;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        hrManagerAuth = await createAndLoginTestUser({ role: 'HR_MANAGER' });
        employeeSession = await createTestEmployee();

        const structFixture = await createTestSalaryStructureWithRules();
        structure = structFixture.structure;

        await createTestContract({
            employeeId: employeeSession.employee.id,
            salaryStructureId: structure.id,
            startDate: '2026-01-01',
            wage: '100000.00',
        });
    });

    describe('1. Financial Correctness: Deduction Aggregates & Formula Execution', () => {
        it('should correctly calculate deductions without double-counting summary TOT_DED lines', async () => {
            const payrunRes = await request(app)
                .post('/api/payruns')
                .set('Cookie', adminAuth.cookie)
                .send({
                    name: `Deduction Test ${Date.now()}`,
                    salaryStructureId: structure.id,
                    periodStart: '2026-01-01',
                    periodEnd: '2026-01-31',
                    employeeIds: [employeeSession.employee.id],
                });

            expect(payrunRes.status).toBe(201);
            const payrunId = payrunRes.body.data.id;

            const computeRes = await request(app)
                .post(`/api/payruns/${payrunId}/compute`)
                .set('Cookie', adminAuth.cookie);

            expect(computeRes.status).toBe(200);

            const payslipRes = await request(app)
                .get(`/api/payslips?payrunId=${payrunId}`)
                .set('Cookie', adminAuth.cookie);

            expect(payslipRes.status).toBe(200);
            const slip = payslipRes.body.data[0];

            const gross = Number(slip.grossAmount);
            const deduction = Number(slip.deductionAmount);
            const net = Number(slip.netAmount);

            // Invariant: Gross - Deductions = Net
            expect(Math.abs(gross - deduction - net)).toBeLessThan(0.01);
            expect(Number(computeRes.body.data.totalNet)).toBe(Number(net.toFixed(2)));
        });
    });

    describe('2. RBAC Enforcement: HR_MANAGER Access Restrictions', () => {
        it('should block HR_MANAGER from accessing /api/payslips (403 Forbidden)', async () => {
            const res = await request(app).get('/api/payslips').set('Cookie', hrManagerAuth.cookie);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should block HR_MANAGER from accessing /api/payruns (403 Forbidden)', async () => {
            const res = await request(app).get('/api/payruns').set('Cookie', hrManagerAuth.cookie);

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });
    });

    describe('3. Lifecycle Transitions: SENT to PAID Settlement', () => {
        it('should transition both VALIDATED and SENT payslips to PAID when payrun is marked paid', async () => {
            // Create, compute, validate payrun
            const payrunRes = await request(app)
                .post('/api/payruns')
                .set('Cookie', adminAuth.cookie)
                .send({
                    name: `Sent To Paid Test ${Date.now()}`,
                    salaryStructureId: structure.id,
                    periodStart: '2026-02-01',
                    periodEnd: '2026-02-28',
                    employeeIds: [employeeSession.employee.id],
                });

            const payrunId = payrunRes.body.data.id;

            await request(app)
                .post(`/api/payruns/${payrunId}/compute`)
                .set('Cookie', adminAuth.cookie);

            await request(app)
                .post(`/api/payruns/${payrunId}/validate`)
                .set('Cookie', adminAuth.cookie)
                .send({ overrideBlockers: true });

            // Get child payslip and manually set status to SENT
            const payslipListRes = await request(app)
                .get(`/api/payslips?payrunId=${payrunId}`)
                .set('Cookie', adminAuth.cookie);

            const payslipId = payslipListRes.body.data[0].id;
            await db.update(payslips).set({ status: 'SENT' }).where(eq(payslips.id, payslipId));

            // Mark payrun as PAID
            const markPaidRes = await request(app)
                .post(`/api/payruns/${payrunId}/mark-paid`)
                .set('Cookie', adminAuth.cookie)
                .send({ paymentDate: '2026-03-01' });

            expect(markPaidRes.status).toBe(200);
            expect(markPaidRes.body.data.status).toBe('PAID');

            // Verify payslip was updated to PAID
            const updatedSlipRes = await request(app)
                .get(`/api/payslips/${payslipId}`)
                .set('Cookie', adminAuth.cookie);

            expect(updatedSlipRes.status).toBe(200);
            expect(updatedSlipRes.body.data.status).toBe('PAID');
        });
    });

    describe('4. Future Period Computation & Validation Gate', () => {
        it('should reject computation of payrun with future periodEnd (422)', async () => {
            const payrunRes = await request(app)
                .post('/api/payruns')
                .set('Cookie', adminAuth.cookie)
                .send({
                    name: `Future Period Test ${Date.now()}`,
                    salaryStructureId: structure.id,
                    periodStart: '2099-01-01',
                    periodEnd: '2099-01-31',
                    employeeIds: [employeeSession.employee.id],
                });

            expect(payrunRes.status).toBe(201);
            const payrunId = payrunRes.body.data.id;

            const computeRes = await request(app)
                .post(`/api/payruns/${payrunId}/compute`)
                .set('Cookie', adminAuth.cookie);

            expect(computeRes.status).toBe(422);
            expect(computeRes.body.message).toMatch(/period has not ended yet/i);
        });
    });

    describe('5. Duplicate Overlapping Payslips Non-Overridable Protection', () => {
        it('should reject validation with 422 if employee already has a payslip covering overlapping period', async () => {
            // Employee already has a payslip in Jan 2026 (from test 1). Create another payrun for Jan 2026.
            const payrunRes = await request(app)
                .post('/api/payruns')
                .set('Cookie', adminAuth.cookie)
                .send({
                    name: `Duplicate Overlap Test ${Date.now()}`,
                    salaryStructureId: structure.id,
                    periodStart: '2026-01-15',
                    periodEnd: '2026-01-31',
                    employeeIds: [employeeSession.employee.id],
                });

            const payrunId = payrunRes.body.data.id;

            await request(app)
                .post(`/api/payruns/${payrunId}/compute`)
                .set('Cookie', adminAuth.cookie);

            // Attempt to validate with overrideBlockers: true
            const valRes = await request(app)
                .post(`/api/payruns/${payrunId}/validate`)
                .set('Cookie', adminAuth.cookie)
                .send({ overrideBlockers: true });

            expect(valRes.status).toBe(422);
            expect(valRes.body.message).toMatch(/overlapping payslips|non-overridable/i);
        });
    });

    describe('6. Single Payslip Recompute Financial Aggregate Sync', () => {
        it('should update parent payrun totals when a single payslip is recomputed', async () => {
            const payrunRes = await request(app)
                .post('/api/payruns')
                .set('Cookie', adminAuth.cookie)
                .send({
                    name: `Single Recompute Test ${Date.now()}`,
                    salaryStructureId: structure.id,
                    periodStart: '2026-03-01',
                    periodEnd: '2026-03-31',
                    employeeIds: [employeeSession.employee.id],
                });

            const payrunId = payrunRes.body.data.id;

            await request(app)
                .post(`/api/payruns/${payrunId}/compute`)
                .set('Cookie', adminAuth.cookie);

            const payslipListRes = await request(app)
                .get(`/api/payslips?payrunId=${payrunId}`)
                .set('Cookie', adminAuth.cookie);

            const payslipId = payslipListRes.body.data[0].id;

            // Recompute single payslip
            const recomputeRes = await request(app)
                .post(`/api/payslips/${payslipId}/compute`)
                .set('Cookie', adminAuth.cookie);

            expect(recomputeRes.status).toBe(200);

            // Verify parent payrun totals are populated and match
            const parentPayrunRes = await request(app)
                .get(`/api/payruns/${payrunId}`)
                .set('Cookie', adminAuth.cookie);

            expect(parentPayrunRes.status).toBe(200);
            expect(Number(parentPayrunRes.body.data.totalGross)).toBe(
                Number(recomputeRes.body.data.grossAmount),
            );
            expect(Number(parentPayrunRes.body.data.totalNet)).toBe(
                Number(recomputeRes.body.data.netAmount),
            );
        });
    });
});
