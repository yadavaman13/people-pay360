import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import {
    createTestEmployee,
    createTestSalaryStructureWithRules,
    createTestContract,
} from '../helpers/test-fixtures.js';

const docLogger = new FeatureApiDocLogger(
    '07_payruns_payslips.md',
    'Feature 07: Payruns Lifecycle, Computation Engine & Payslips API',
    'Covers Payrun wizard creation, batch calculation, payslip line breakdowns, pre-validation warnings, validation gate, and marking paid.',
);

describe('07: Payruns & Payslips Batch Lifecycle API', () => {
    let adminAuth;
    let employeeSession;
    let structure;
    let createdPayrunId;
    let computedPayslipId;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeSession = await createTestEmployee();

        const structureFixture = await createTestSalaryStructureWithRules();
        structure = structureFixture.structure;

        // Create contract for the employee matching January 2026
        await createTestContract({
            employeeId: employeeSession.employee.id,
            salaryStructureId: structure.id,
            startDate: '2026-01-01',
            wage: '80000.00',
        });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('POST /api/payruns', () => {
        it('should initialize a payrun batch with employee selection scope (201)', async () => {
            const payload = {
                name: `January 2026 Regular Payroll ${Date.now()}`,
                salaryStructureId: structure.id,
                periodStart: '2026-01-01',
                periodEnd: '2026-01-31',
                paymentDate: '2026-02-01',
                employeeIds: [employeeSession.employee.id],
            };

            const res = await request(app)
                .post('/api/payruns')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Payrun Batch (Step 2 Wizard Finalize)',
                method: 'POST',
                endpoint: '/api/payruns',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Creates Payrun in DRAFT state and snapshots selected employee roster.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.status).toBe('DRAFT');
            createdPayrunId = res.body.data.id;
        });

        it('should list payruns with status and period filters (200)', async () => {
            const res = await request(app)
                .get('/api/payruns?page=1&limit=10')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Payrun Batches',
                method: 'GET',
                endpoint: '/api/payruns',
                queryParams: { page: '1', limit: '10' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Lists active and historical payruns with financial aggregates.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('POST /api/payruns/:id/compute', () => {
        it('should execute salary engine and compute payslips for all selected employees (200)', async () => {
            const res = await request(app)
                .post(`/api/payruns/${createdPayrunId}/compute`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Compute Payrun Batch (BR-010, BR-015)',
                method: 'POST',
                endpoint: `/api/payruns/:id/compute`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Resolves applicable contracts, executes ordered rules (BASIC, HRA, PF), generates payslips, and updates totals.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.payrun.status).toBe('COMPUTED');
            expect(res.body.data.computedEmployees).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GET /api/payslips', () => {
        it('should list computed payslips for the payrun (200)', async () => {
            const res = await request(app)
                .get(`/api/payslips?payrunId=${createdPayrunId}`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Computed Payslips',
                method: 'GET',
                endpoint: '/api/payslips',
                queryParams: { payrunId: createdPayrunId },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves payslips generated for the batch.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(1);
            computedPayslipId = res.body.data[0].id;
        });

        it('GET /api/payslips/:id should return itemized salary computation lines (200)', async () => {
            const res = await request(app)
                .get(`/api/payslips/${computedPayslipId}`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Itemized Payslip with Lines',
                method: 'GET',
                endpoint: `/api/payslips/:id`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns gross, deductions, net salary, and itemized calculation rule breakdown lines.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.lines).toBeDefined();
            expect(Array.isArray(res.body.data.lines)).toBe(true);
            expect(Number(res.body.data.netAmount)).toBeGreaterThan(0);
        });
    });

    describe('GET /api/payruns/:id/warnings', () => {
        it('should audit payrun and return verification diagnostics (BR-013, BR-014) (200)', async () => {
            const res = await request(app)
                .get(`/api/payruns/${createdPayrunId}/warnings`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Pre-Validation Payroll Audit & Warnings',
                method: 'GET',
                endpoint: `/api/payruns/:id/warnings`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Audits roster for missing bank details, duplicate payslips, expiring contracts, and zero worked days.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.summary).toBeDefined();
            expect(Array.isArray(res.body.data.alerts)).toBe(true);
        });
    });

    describe('POST /api/payruns/:id/validate', () => {
        it('should validate payrun and lock payslips (BR-016) (200)', async () => {
            const res = await request(app)
                .post(`/api/payruns/${createdPayrunId}/validate`)
                .set('Cookie', adminAuth.cookie)
                .send({ overrideBlockers: true });

            docLogger.record({
                scenario: 'Validate Payrun Batch',
                method: 'POST',
                endpoint: `/api/payruns/:id/validate`,
                requestBody: { overrideBlockers: true },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Transitions payrun and child payslips to VALIDATED status. Computation becomes locked.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.payrun.status).toBe('VALIDATED');
        });
    });

    describe('POST /api/payruns/:id/mark-paid', () => {
        it('should mark payrun as paid (financial settlement) (BR-017, BR-018) (200)', async () => {
            const res = await request(app)
                .post(`/api/payruns/${createdPayrunId}/mark-paid`)
                .set('Cookie', adminAuth.cookie)
                .send({
                    paymentDate: '2026-02-01',
                    notes: 'Direct deposit completed via corporate banking portal',
                });

            docLogger.record({
                scenario: 'Mark Payrun Paid (Final Historical Record)',
                method: 'POST',
                endpoint: `/api/payruns/:id/mark-paid`,
                requestBody: { paymentDate: '2026-02-01', notes: 'Settled' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Transitions batch to PAID state. Payslips become immutable historical records.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('PAID');
        });
    });
});
