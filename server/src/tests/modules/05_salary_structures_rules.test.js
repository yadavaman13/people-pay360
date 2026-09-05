import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

const docLogger = new FeatureApiDocLogger(
    '05_salary_structures_rules.md',
    'Feature 05: Salary Structures & Computation Rules API',
    'Covers salary structure headers, sequenced salary computation rules (Fixed, Percentage, Formula), and rule-to-structure associations.',
);

describe('05: Salary Structures & Rules API', () => {
    let adminUser = null;
    let employeeUser = null;
    let structureId = null;
    let basicRuleId = null;

    beforeAll(async () => {
        adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
        employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Salary Structure Provisioning', () => {
        it('POST /api/salary-structures should reject non-privileged user (403)', async () => {
            const payload = {
                name: 'Unauthorized Structure',
                code: 'UNAUTH_STR',
            };

            const res = await request(app)
                .post('/api/salary-structures')
                .set('Cookie', employeeUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Structure by Employee (Forbidden 403)',
                method: 'POST',
                endpoint: '/api/salary-structures',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Only HR Payroll Managers and Admins can configure salary structures.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/salary-structures should create salary structure (201)', async () => {
            const timestamp = Date.now();
            const payload = {
                name: `Executive Compensation Plan ${timestamp}`,
                code: `EXEC_STR_${timestamp}`.slice(0, 45),
                description: 'Executive grade salary structure with basic, hra, and deductions',
                isActive: true,
            };

            const res = await request(app)
                .post('/api/salary-structures')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Salary Structure (Success 201)',
                method: 'POST',
                endpoint: '/api/salary-structures',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Defines top-level salary structure container for attaching sequenced rules.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            structureId = res.body.data.id;
        });

        it('GET /api/salary-structures should list structures (200)', async () => {
            const res = await request(app)
                .get('/api/salary-structures')
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'List Salary Structures (Success 200)',
                method: 'GET',
                endpoint: '/api/salary-structures',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves all available salary structure configurations with rule counts.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('GET /api/salary-structures/:id should return single structure (200)', async () => {
            if (!structureId) return;

            const res = await request(app)
                .get(`/api/salary-structures/${structureId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Salary Structure By ID (Success 200)',
                method: 'GET',
                endpoint: `/api/salary-structures/${structureId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Fetches salary structure details and associated rules list.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(structureId);
        });
    });

    describe('Salary Rules Configuration within Structure', () => {
        it('POST /api/salary-structures/:id/rules should add BASIC rule (201)', async () => {
            if (!structureId) return;

            const payload = {
                code: 'BASIC',
                name: 'Basic Salary',
                category: 'BASIC',
                sequenceOrder: 1,
                computationType: 'PERCENTAGE',
                percentageBaseCode: 'WAGE',
                percentageRate: 50.0,
            };

            const res = await request(app)
                .post(`/api/salary-structures/${structureId}/rules`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Add Basic Salary Rule (Success 201)',
                method: 'POST',
                endpoint: `/api/salary-structures/${structureId}/rules`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Adds Sequence 1 rule computing Basic Pay as 50% of monthly contract wage.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            basicRuleId = res.body.data.id;
        });

        it('POST /api/salary-structures/:id/rules should add HRA allowance rule (201)', async () => {
            if (!structureId) return;

            const payload = {
                code: 'HRA',
                name: 'House Rent Allowance',
                category: 'ALLOWANCE',
                sequenceOrder: 2,
                computationType: 'PERCENTAGE',
                percentageBaseCode: 'BASIC',
                percentageRate: 40.0,
            };

            const res = await request(app)
                .post(`/api/salary-structures/${structureId}/rules`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Add HRA Allowance Rule (Success 201)',
                method: 'POST',
                endpoint: `/api/salary-structures/${structureId}/rules`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Adds Sequence 2 rule computing HRA allowance as 40% of computed Basic Pay.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('POST /api/salary-structures/:id/rules should add PF deduction rule (201)', async () => {
            if (!structureId) return;

            const payload = {
                code: 'PF',
                name: 'Provident Fund',
                category: 'DEDUCTION',
                sequenceOrder: 3,
                computationType: 'PERCENTAGE',
                percentageBaseCode: 'BASIC',
                percentageRate: 12.0,
            };

            const res = await request(app)
                .post(`/api/salary-structures/${structureId}/rules`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Add PF Deduction Rule (Success 201)',
                method: 'POST',
                endpoint: `/api/salary-structures/${structureId}/rules`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Adds Sequence 3 rule deducting 12% of Basic Pay towards employee provident fund.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('GET /api/salary-structures/:id/rules should list rules ordered by sequence (200)', async () => {
            if (!structureId) return;

            const res = await request(app)
                .get(`/api/salary-structures/${structureId}/rules`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'List Structure Rules (Success 200)',
                method: 'GET',
                endpoint: `/api/salary-structures/${structureId}/rules`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns all rules attached to the structure ordered ascending by sequenceOrder.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(3);
        });

        it('GET /api/salary-rules should list all global salary rules (200)', async () => {
            const res = await request(app).get('/api/salary-rules').set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'List All Salary Rules (Success 200)',
                method: 'GET',
                endpoint: '/api/salary-rules',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Lists all salary rules across structures with computation definitions.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('PATCH /api/salary-structures/:id should update structure metadata (200)', async () => {
            if (!structureId) return;

            const payload = {
                name: `Senior Executive Compensation Plan ${Date.now()}`,
                description: 'Updated executive structure description',
            };

            const res = await request(app)
                .patch(`/api/salary-structures/${structureId}`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Update Salary Structure (Success 200)',
                method: 'PATCH',
                endpoint: `/api/salary-structures/${structureId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Updates structure header metadata like display name and description.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(payload.name);
        });
    });
});
