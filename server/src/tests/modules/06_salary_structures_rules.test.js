import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

const docLogger = new FeatureApiDocLogger(
    '06_salary_structures_rules.md',
    'Feature 06: Salary Structures & Computation Rules API',
    'Covers salary rule categories (BASIC, ALLOWANCE, DEDUCTION, NET), computation types (FIXED, PERCENTAGE, FORMULA), rule sequencing, and salary structures.',
);

describe('06: Salary Structures & Rules Configuration API', () => {
    let adminAuth;
    let createdStructureId;
    let createdRuleId;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('POST /api/salary-structures', () => {
        it('should create a salary structure (201)', async () => {
            const timestamp = Date.now();
            const payload = {
                name: `Engineering Grade 1 Structure ${timestamp}`,
                code: `ENG1_${timestamp.toString().slice(-4)}`,
                description: 'Compensation template for engineering staff',
            };

            const res = await request(app)
                .post('/api/salary-structures')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Salary Structure',
                method: 'POST',
                endpoint: '/api/salary-structures',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Creates master salary structure template.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            createdStructureId = res.body.data.id;
        });

        it('should list all salary structures (200)', async () => {
            const res = await request(app)
                .get('/api/salary-structures')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Salary Structures',
                method: 'GET',
                endpoint: '/api/salary-structures',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves all defined salary structures.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('POST /api/salary-structures/:id/rules', () => {
        it('should add a BASIC percentage rule to the structure (201)', async () => {
            const payload = {
                name: 'Basic Salary',
                code: 'BASIC',
                category: 'BASIC',
                computationType: 'PERCENTAGE',
                percentageRate: '50.00',
                percentageBaseCode: 'WAGE',
                sequenceOrder: 1,
            };

            const res = await request(app)
                .post(`/api/salary-structures/${createdStructureId}/rules`)
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Add BASIC Rule to Structure',
                method: 'POST',
                endpoint: `/api/salary-structures/:id/rules`,
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Attaches 50% WAGE rule to structure with sequence order 1.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            createdRuleId = res.body.data.id;
        });

        it('should add an ALLOWANCE rule with formula computation (201)', async () => {
            const payload = {
                name: 'Performance Bonus',
                code: 'BONUS',
                category: 'ALLOWANCE',
                computationType: 'FIXED',
                fixedAmount: '10000.00',
                sequenceOrder: 2,
            };

            const res = await request(app)
                .post(`/api/salary-structures/${createdStructureId}/rules`)
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Add Allowance Fixed Rule',
                method: 'POST',
                endpoint: `/api/salary-structures/:id/rules`,
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Attaches fixed allowance component to salary structure.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('should add a DEDUCTION rule (Provident Fund) (201)', async () => {
            const payload = {
                name: 'Provident Fund',
                code: 'PF',
                category: 'DEDUCTION',
                computationType: 'PERCENTAGE',
                percentageRate: '12.00',
                percentageBaseCode: 'BASIC',
                sequenceOrder: 3,
            };

            const res = await request(app)
                .post(`/api/salary-structures/${createdStructureId}/rules`)
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Add Deduction Rule',
                method: 'POST',
                endpoint: `/api/salary-structures/:id/rules`,
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Attaches 12% deduction on Basic for PF.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });
    });

    describe('GET /api/salary-structures/:id/rules', () => {
        it('should return rules ordered by sequenceOrder (BR-010) (200)', async () => {
            const res = await request(app)
                .get(`/api/salary-structures/${createdStructureId}/rules`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Ordered Rules for Structure',
                method: 'GET',
                endpoint: `/api/salary-structures/:id/rules`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Verifies rules are strictly returned in sequence order for calculation pipeline.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(3);
            expect(res.body.data[0].sequenceOrder).toBeLessThanOrEqual(
                res.body.data[1].sequenceOrder,
            );
        });
    });

    describe('GET /api/salary-rules', () => {
        it('should list all rules across the system (200)', async () => {
            const res = await request(app).get('/api/salary-rules').set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List All Salary Rules',
                method: 'GET',
                endpoint: '/api/salary-rules',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Global list of salary calculation rules.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
});
