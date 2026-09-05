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
    '06_payruns_payslips.md',
    'Feature 06: Payroll Batches, Computation Engine & Payslips API',
    'Covers end-to-end payroll processing: 2-step wizard validation, batch execution, salary rule computation, audit warnings, state machine locks, and payslip generation.',
);

describe('06: Payruns & Payslips API', () => {
    let adminUser = null;
    let employeeUser = null;
    let testEmployee = null;
    let salaryStructure = null;
    let activeContract = null;
    let payrunId = null;
    let payslipId = null;

    beforeAll(async () => {
        adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });

        const empFixture = await createTestEmployee({ user: employeeUser.user });
        testEmployee = empFixture.employee;

        const structFixture = await createTestSalaryStructureWithRules();
        salaryStructure = structFixture.structure;

        activeContract = await createTestContract({
            employeeId: testEmployee.id,
            salaryStructureId: salaryStructure.id,
            overrides: {
                wage: '75000.00',
                startDate: '2026-01-01',
                endDate: null,
            },
        });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Payroll Wizard & Batch Creation', () => {
        it('POST /api/payruns/wizard/validate should validate period and eligible employees (200)', async () => {
            const payload = {
                salaryStructureId: salaryStructure.id,
                periodStart: '2026-06-01',
                periodEnd: '2026-06-30',
            };

            const res = await request(app)
                .post('/api/payruns/wizard/validate')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Wizard Step 1: Pre-Run Validation (Success 200)',
                method: 'POST',
                endpoint: '/api/payruns/wizard/validate',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Validates structure readiness and scans eligible employees with active contracts.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('POST /api/payruns should create draft payrun batch (201)', async () => {
            const payload = {
                name: `June 2026 Executive Payroll ${Date.now()}`,
                salaryStructureId: salaryStructure.id,
                periodStart: '2026-06-01',
                periodEnd: '2026-06-30',
                employeeIds: [testEmployee.id],
                notes: 'Regular monthly executive payrun',
            };

            const res = await request(app)
                .post('/api/payruns')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Draft Payrun Batch (Success 201)',
                method: 'POST',
                endpoint: '/api/payruns',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Creates new payrun in DRAFT status and scopes selected employee roster.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            payrunId = res.body.data.id;
        });

        it('GET /api/payruns should list payruns (200)', async () => {
            const res = await request(app).get('/api/payruns').set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'List Payrun Batches (Success 200)',
                method: 'GET',
                endpoint: '/api/payruns',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Lists all payroll batches with lifecycle status filters.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('GET /api/payruns/:id should return single payrun details (200)', async () => {
            if (!payrunId) return;

            const res = await request(app)
                .get(`/api/payruns/${payrunId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Payrun Batch Details (Success 200)',
                method: 'GET',
                endpoint: `/api/payruns/${payrunId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Fetches payrun header with financial totals and employee roster counts.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(payrunId);
        });
    });

    describe('Payroll Calculation Engine & Pre-Validation Audit', () => {
        it('POST /api/payruns/:id/compute should execute rules and generate payslips (200)', async () => {
            if (!payrunId) return;

            const res = await request(app)
                .post(`/api/payruns/${payrunId}/compute`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Execute Payrun Computation Engine (Success 200)',
                method: 'POST',
                endpoint: `/api/payruns/${payrunId}/compute`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Applies ordered salary rules to each employee contract and writes immutable payslip line snapshots.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('GET /api/payruns/:id/warnings should return pre-validation audit check (200)', async () => {
            if (!payrunId) return;

            const res = await request(app)
                .get(`/api/payruns/${payrunId}/warnings`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Pre-Validation Warnings Audit (Success 200)',
                method: 'GET',
                endpoint: `/api/payruns/${payrunId}/warnings`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Audits payrun for zero-wages, unapproved leave overlaps, missing attendance, and blocking anomalies.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('POST /api/payruns/:id/validate should lock payrun into VALIDATED status (200)', async () => {
            if (!payrunId) return;

            const payload = {
                allowWarnings: true,
                overrideBlockers: true,
            };

            const res = await request(app)
                .post(`/api/payruns/${payrunId}/validate`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Validate & Lock Payrun (Success 200)',
                method: 'POST',
                endpoint: `/api/payruns/${payrunId}/validate`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Transitions payrun to VALIDATED state, freezing figures and locking payslips against recomputation.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('POST /api/payruns/:id/mark-paid should mark payrun as PAID (200)', async () => {
            if (!payrunId) return;

            const payload = {
                paymentDate: '2026-06-30',
            };

            const res = await request(app)
                .post(`/api/payruns/${payrunId}/mark-paid`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Mark Payrun as Paid (Success 200)',
                method: 'POST',
                endpoint: `/api/payruns/${payrunId}/mark-paid`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Executes financial settlement, transitioning payrun and payslips to PAID status.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Payslips Inspection & Document Previews', () => {
        it('GET /api/payslips should list generated payslips for the payrun (200)', async () => {
            if (!payrunId) return;

            const res = await request(app)
                .get(`/api/payslips?payrunId=${payrunId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'List Generated Payslips (Success 200)',
                method: 'GET',
                endpoint: `/api/payslips?payrunId=${payrunId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves payslips for the processed batch with gross and net totals.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            payslipId = res.body.data[0].id;
        });

        it('GET /api/payslips/:id should return payslip details (200)', async () => {
            if (!payslipId) return;

            const res = await request(app)
                .get(`/api/payslips/${payslipId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Payslip By ID (Success 200)',
                method: 'GET',
                endpoint: `/api/payslips/${payslipId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns financial summary, employee information, and contract details for the payslip.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(payslipId);
        });

        it('GET /api/payslips/:id/lines should return computed rule line item snapshots (200)', async () => {
            if (!payslipId) return;

            const res = await request(app)
                .get(`/api/payslips/${payslipId}/lines`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Payslip Line Breakdown Items (Success 200)',
                method: 'GET',
                endpoint: `/api/payslips/${payslipId}/lines`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns immutable snapshot lines for each applied salary rule (BASIC, HRA, PF).',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('GET /api/payslips/:id/preview should return rendered HTML preview (200)', async () => {
            if (!payslipId) return;

            const res = await request(app)
                .get(`/api/payslips/${payslipId}/preview`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Preview Payslip HTML (Success 200)',
                method: 'GET',
                endpoint: `/api/payslips/${payslipId}/preview`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: { preview: '[Raw HTML Document String]' },
                notes: 'Returns responsive HTML string formatted for iframe browser preview before PDF printing.',
            });

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/html/);
        });
    });
});
