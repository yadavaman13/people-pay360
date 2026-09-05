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
    '08_pdf_delivery.md',
    'Feature 08: Chromium-Free PDF Generation & Payslip Email Delivery API',
    'Covers arbitrary HTML rendering, invoice/receipt document generation, payslip PDF compilation (html-pdf-lite), inline previews, single email delivery, and bulk email distribution.',
);

describe('08: PDF Generation & Document Delivery API', () => {
    let adminAuth;
    let employeeSession;
    let testPayrunId;
    let testPayslipId;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeSession = await createTestEmployee();

        const structFixture = await createTestSalaryStructureWithRules();
        await createTestContract({
            employeeId: employeeSession.employee.id,
            salaryStructureId: structFixture.structure.id,
            startDate: '2026-01-01',
            wage: '90000.00',
        });

        // Create, compute, and validate a payrun to get a valid payslip for PDF/email testing
        const payrunRes = await request(app)
            .post('/api/payruns')
            .set('Cookie', adminAuth.cookie)
            .send({
                name: `Doc Test Payrun ${Date.now()}`,
                salaryStructureId: structFixture.structure.id,
                periodStart: '2026-01-01',
                periodEnd: '2026-01-31',
                employeeIds: [employeeSession.employee.id],
            });

        testPayrunId = payrunRes.body.data.id;

        await request(app)
            .post(`/api/payruns/${testPayrunId}/compute`)
            .set('Cookie', adminAuth.cookie);

        await request(app)
            .post(`/api/payruns/${testPayrunId}/validate`)
            .set('Cookie', adminAuth.cookie)
            .send({ overrideBlockers: true });

        const payslipsRes = await request(app)
            .get(`/api/payslips?payrunId=${testPayrunId}`)
            .set('Cookie', adminAuth.cookie);

        testPayslipId = payslipsRes.body.data[0].id;
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Arbitrary HTML to PDF Rendering', () => {
        it('POST /api/pdf/render should render HTML to PDF buffer (200)', async () => {
            const payload = {
                html: '<html><body><h1>PeoplePay360 System Report</h1><p>Enterprise Payroll Operational Summary.</p></body></html>',
                filename: 'system-report.pdf',
            };

            const res = await request(app).post('/api/pdf/render').send(payload);

            docLogger.record({
                scenario: 'Arbitrary HTML to PDF Render',
                method: 'POST',
                endpoint: '/api/pdf/render',
                requestBody: payload,
                statusCode: res.status,
                responseBody: { type: 'Buffer', length: res.body?.length || 0 },
                notes: 'Compiles lightweight PDF buffer using html-pdf-lite.',
            });

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/pdf');
        });

        it('POST /api/pdf/render should return 400 when html is missing', async () => {
            const res = await request(app).post('/api/pdf/render').send({});

            docLogger.record({
                scenario: 'HTML to PDF Render (Missing Payload Error)',
                method: 'POST',
                endpoint: '/api/pdf/render',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Rejects requests without valid HTML markup.',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });

    describe('System Invoice & Receipt Streaming', () => {
        it('GET /api/pdf/invoice/:id should stream compiled invoice PDF (200)', async () => {
            const res = await request(app).get('/api/pdf/invoice/INV-2026-DOC');

            docLogger.record({
                scenario: 'Stream Invoice PDF Document',
                method: 'GET',
                endpoint: '/api/pdf/invoice/:id',
                statusCode: res.status,
                responseBody: { type: 'Buffer' },
                notes: 'Generates branded invoice with dynamic items and tax totals.',
            });

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/pdf');
        });

        it('GET /api/pdf/invoice/:id/preview should return raw HTML preview (200)', async () => {
            const res = await request(app).get('/api/pdf/invoice/INV-2026-DOC/preview');

            docLogger.record({
                scenario: 'Preview Invoice HTML',
                method: 'GET',
                endpoint: '/api/pdf/invoice/:id/preview',
                statusCode: res.status,
                responseBody: '<HTML markup>',
                notes: 'Returns HTML preview for in-browser client inspection.',
            });

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/html');
        });
    });

    describe('Payslip PDF Generation & Browser Preview', () => {
        it('GET /api/payslips/:id/preview should return payslip HTML preview (200)', async () => {
            const res = await request(app)
                .get(`/api/payslips/${testPayslipId}/preview`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Preview Payslip HTML Document',
                method: 'GET',
                endpoint: `/api/payslips/:id/preview`,
                statusCode: res.status,
                responseBody: '<HTML Payslip Preview>',
                notes: 'Renders complete monochrome payslip layout with employee, company, earnings, deductions, and net pay.',
            });

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/html');
            expect(res.text).toContain('PAYSLIP');
        });

        it('GET /api/payslips/:id/pdf should stream compiled payslip PDF (200)', async () => {
            const res = await request(app)
                .get(`/api/payslips/${testPayslipId}/pdf?inline=true`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Stream Payslip PDF Document',
                method: 'GET',
                endpoint: `/api/payslips/:id/pdf`,
                queryParams: { inline: 'true' },
                statusCode: res.status,
                responseBody: { type: 'Buffer' },
                notes: 'Streams Chromium-free compiled payslip PDF for browser rendering or attachment download.',
            });

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('application/pdf');
        });
    });

    describe('Payslip Email Delivery', () => {
        it('POST /api/payslips/:id/send should dispatch single payslip email to employee (200)', async () => {
            const res = await request(app)
                .post(`/api/payslips/${testPayslipId}/send`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Send Single Payslip Email',
                method: 'POST',
                endpoint: `/api/payslips/:id/send`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Generates payslip PDF in memory and sends email with attachment via transactional mail service.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('POST /api/payruns/:id/send-payslips should bulk email all payslips in payrun (200)', async () => {
            const res = await request(app)
                .post(`/api/payruns/${testPayrunId}/send-payslips`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Bulk Email Payslips for Payrun Batch',
                method: 'POST',
                endpoint: `/api/payruns/:id/send-payslips`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Iterates through payrun employees, generates PDFs, and dispatches bulk emails with delivery summary.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.sent).toBeDefined();
        });
    });
});
