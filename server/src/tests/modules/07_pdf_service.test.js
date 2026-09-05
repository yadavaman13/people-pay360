import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

const docLogger = new FeatureApiDocLogger(
    '07_pdf_service.md',
    'Feature 07: PDF Generation & Document Rendering Service API',
    'Covers arbitrary HTML to PDF rendering, sample invoice generation and HTML styling previews, and payment receipt document streaming.',
);

describe('07: PDF Generation & Document Service API', () => {
    let adminUser = null;

    beforeAll(async () => {
        adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Arbitrary HTML to PDF Rendering', () => {
        it('POST /api/pdf/render should render HTML to PDF buffer (200)', async () => {
            const payload = {
                html: '<!DOCTYPE html><html><body><h1>Sample HR Policy</h1><p>Document generated dynamically.</p></body></html>',
                options: {
                    format: 'A4',
                    printBackground: true,
                },
            };

            const res = await request(app)
                .post('/api/pdf/render')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Render Custom HTML to PDF (Success 200)',
                method: 'POST',
                endpoint: '/api/pdf/render',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: '<Binary PDF stream (application/pdf)>',
                notes: 'Converts arbitrary HTML into a high-fidelity PDF stream with formatting options.',
            });

            expect(res.status).toBe(200);
            expect(res.header['content-type']).toMatch(/application\/pdf/);
            expect(res.body).toBeInstanceOf(Buffer);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('POST /api/pdf/render should return 400 when html is missing (400)', async () => {
            const payload = {
                options: { format: 'A4' },
            };

            const res = await request(app)
                .post('/api/pdf/render')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Render HTML to PDF Missing Body (Error 400)',
                method: 'POST',
                endpoint: '/api/pdf/render',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Validates that the html payload string is strictly required.',
            });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('HTML content is required');
        });
    });

    describe('Invoice & Receipt Document Streaming', () => {
        const testInvoiceId = 'INV-2026-TEST';
        const testReceiptId = 'REC-2026-TEST';

        it('GET /api/pdf/invoice/:id should stream compiled invoice PDF (200)', async () => {
            const res = await request(app)
                .get(`/api/pdf/invoice/${testInvoiceId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Stream Invoice PDF (Success 200)',
                method: 'GET',
                endpoint: `/api/pdf/invoice/${testInvoiceId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: '<Binary PDF stream (application/pdf)>',
                notes: 'Streams pre-styled enterprise invoice PDF attachment.',
            });

            expect(res.status).toBe(200);
            expect(res.header['content-type']).toMatch(/application\/pdf/);
            expect(res.body).toBeInstanceOf(Buffer);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('GET /api/pdf/invoice/:id/preview should return raw HTML preview (200)', async () => {
            const res = await request(app)
                .get(`/api/pdf/invoice/${testInvoiceId}/preview`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Preview Invoice Template HTML (Success 200)',
                method: 'GET',
                endpoint: `/api/pdf/invoice/${testInvoiceId}/preview`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: '<!DOCTYPE html><html>... (HTML Preview)</html>',
                notes: 'Returns raw compiled HTML for browser dev preview and styling inspection.',
            });

            expect(res.status).toBe(200);
            expect(res.header['content-type']).toMatch(/text\/html/);
            expect(typeof res.text).toBe('string');
            expect(res.text).toContain('PeoplePay360');
        });

        it('GET /api/pdf/receipt/:id should stream payment receipt PDF (200)', async () => {
            const res = await request(app)
                .get(`/api/pdf/receipt/${testReceiptId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Stream Payment Receipt PDF (Success 200)',
                method: 'GET',
                endpoint: `/api/pdf/receipt/${testReceiptId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: '<Binary PDF stream (application/pdf)>',
                notes: 'Streams verified payment receipt PDF document.',
            });

            expect(res.status).toBe(200);
            expect(res.header['content-type']).toMatch(/application\/pdf/);
            expect(res.body).toBeInstanceOf(Buffer);
            expect(res.body.length).toBeGreaterThan(0);
        });
    });
});
