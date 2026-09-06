import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import {
    createTestSalaryStructureWithRules,
    createTestSchedule,
} from '../helpers/test-fixtures.js';
import { emailDispatchTracker } from '../../utils/email.utils.js';
import { imageUploadTracker } from '../../services/image.service.js';

const docLogger = new FeatureApiDocLogger(
    '03_employees_contracts.md',
    'Feature 03: Employees Master Data & Contracts API',
    'Covers employee profile management, bank accounts, period-aware employment contracts, and contract overlap prevention.',
);

describe('03: Employees & Contracts API', () => {
    let adminAuth;
    let hrAuth;
    let employeeAuth;
    let createdEmployee;
    let createdContract;
    let testStructure;
    let testSchedule;

    beforeAll(async () => {
        adminAuth = await createAndLoginTestUser({ role: 'ADMIN' });
        hrAuth = await createAndLoginTestUser({ role: 'HR_MANAGER' });
        employeeAuth = await createAndLoginTestUser({ role: 'EMPLOYEE' });

        const structureFixture = await createTestSalaryStructureWithRules();
        testStructure = structureFixture.structure;

        const scheduleFixture = await createTestSchedule();
        testSchedule = scheduleFixture.schedule;
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('POST /api/employees', () => {
        it('should create an employee record with primary bank account (201)', async () => {
            const employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });

            const payload = {
                userId: employeeUser.user.id,
                firstName: 'Aarav',
                lastName: 'Patel',
                email: employeeUser.user.email,
                phone: '+919876543210',
                gender: 'MALE',
                dateOfBirth: '1995-05-15',
                hireDate: '2026-01-10',
                workingScheduleId: testSchedule.id,
                bankAccount: {
                    bankName: 'HDFC Bank',
                    accountNumber: `987654321${Date.now().toString().slice(-4)}`,
                    accountHolderName: 'Aarav Patel',
                    ifscCode: 'HDFC0001234',
                    accountType: 'SAVINGS',
                },
            };

            const res = await request(app)
                .post('/api/employees')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Employee Profile with Bank Account (Success)',
                method: 'POST',
                endpoint: '/api/employees',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Creates master employee record and links primary bank account atomically.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.employeeCode).toBeDefined();
            createdEmployee = res.body.data;

            const welcomeEmailCall = emailDispatchTracker.history.find(
                (e) => e.toEmail === payload.email,
            );
            expect(welcomeEmailCall).toBeDefined();
            expect(welcomeEmailCall.employeeCode).toBe(res.body.data.employeeCode);
            expect(welcomeEmailCall.tempPassword).toBeDefined();
            expect(typeof welcomeEmailCall.tempPassword).toBe('string');
        });

        it('should return 422 when validation fails on invalid date', async () => {
            const res = await request(app)
                .post('/api/employees')
                .set('Cookie', adminAuth.cookie)
                .send({ dateOfBirth: 'invalid-date' });

            docLogger.record({
                scenario: 'Create Employee (Validation Failure)',
                method: 'POST',
                endpoint: '/api/employees',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Validates ISO 8601 date formats and UUID types.',
            });

            expect([400, 422]).toContain(res.status);
            expect(res.body.success).toBe(false);
        });

        it('should allow HR/Admin to onboard new employee with name and email without passing userId (201)', async () => {
            const uniqueEmail = `newhire_${Date.now()}@company.com`;
            const payload = {
                firstName: 'Siddharth',
                lastName: 'Nair',
                email: uniqueEmail,
                phone: '+919123456780',
                gender: 'MALE',
                dateOfBirth: '1992-08-20',
                hireDate: '2026-02-01',
                workingScheduleId: testSchedule.id,
                bankAccount: {
                    bankName: 'ICICI Bank',
                    accountNumber: `11223344${Date.now().toString().slice(-4)}`,
                    accountHolderName: 'Siddharth Nair',
                    ifscCode: 'ICIC0001234',
                    accountType: 'SAVINGS',
                },
            };

            const res = await request(app)
                .post('/api/employees')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.firstName).toBe('Siddharth');
            expect(res.body.data.email).toBe(uniqueEmail);
            expect(res.body.data.employeeCode).toBeDefined();

            // Duplicate email creation should return 409
            const dupRes = await request(app)
                .post('/api/employees')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            expect(dupRes.status).toBe(409);
        });

        it('should create an employee with avatar attachment and trigger welcome email (201)', async () => {
            const uniqueEmail = `avatarhire_${Date.now()}@company.com`;
            const res = await request(app)
                .post('/api/employees')
                .set('Cookie', adminAuth.cookie)
                .field('firstName', 'Rohan')
                .field('lastName', 'Mehta')
                .field('email', uniqueEmail)
                .field('phone', '+919988776655')
                .field('gender', 'MALE')
                .field('hireDate', '2026-03-01')
                .field('workingScheduleId', testSchedule.id)
                .attach('avatar', Buffer.from('fake image content'), 'avatar.png');

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.profileImage).toContain('mock_uploaded_avatar.jpg');
            expect(imageUploadTracker.uploads.length).toBeGreaterThanOrEqual(1);

            const emailCall = emailDispatchTracker.history.find((e) => e.toEmail === uniqueEmail);
            expect(emailCall).toBeDefined();
            expect(emailCall.tempPassword).toBeDefined();
        });

        it('should dispatch welcome email via POST /api/employees/:id/send-welcome-email (200)', async () => {
            emailDispatchTracker.clear();
            const res = await request(app)
                .post(`/api/employees/${createdEmployee.id}/send-welcome-email`)
                .set('Cookie', adminAuth.cookie);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(emailDispatchTracker.history.length).toBe(1);
            expect(emailDispatchTracker.history[0].toEmail).toBe(createdEmployee.email);
            expect(emailDispatchTracker.history[0].tempPassword).toBeDefined();
        });
    });

    describe('GET /api/employees', () => {
        it('should list employees with pagination (200)', async () => {
            const res = await request(app)
                .get('/api/employees?page=1&limit=10')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Employees',
                method: 'GET',
                endpoint: '/api/employees',
                queryParams: { page: '1', limit: '10' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves employees directory with bank account and schedule info.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('GET /api/employees/for-payrun', () => {
        it('should return eligible employees for a payrun period (200)', async () => {
            const res = await request(app)
                .get(
                    `/api/employees/for-payrun?structureId=${testStructure.id}&periodStart=2026-01-01&periodEnd=2026-01-31`,
                )
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Employees For Payrun Wizard',
                method: 'GET',
                endpoint: '/api/employees/for-payrun',
                queryParams: {
                    structureId: testStructure.id,
                    periodStart: '2026-01-01',
                    periodEnd: '2026-01-31',
                },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Evaluates employee contract eligibility for the payrun batch.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('POST /api/contracts', () => {
        it('should create an employment contract in DRAFT state (201)', async () => {
            const payload = {
                employeeId: createdEmployee.id,
                salaryStructureId: testStructure.id,
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                wage: '75000.00',
                status: 'DRAFT',
            };

            const res = await request(app)
                .post('/api/contracts')
                .set('Cookie', adminAuth.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Create Employment Contract (Draft)',
                method: 'POST',
                endpoint: '/api/contracts',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Creates a contract record linked to employee and salary structure.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.status).toBe('DRAFT');
            createdContract = res.body.data;
        });

        it('POST /api/contracts/:id/activate should activate contract (200)', async () => {
            const res = await request(app)
                .post(`/api/contracts/${createdContract.id}/activate`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Activate Employment Contract',
                method: 'POST',
                endpoint: `/api/contracts/:id/activate`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Transitions contract to ACTIVE state and verifies no overlapping active contracts.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.status).toBe('ACTIVE');
        });
    });

    describe('GET /api/employees/:id/contracts/applicable', () => {
        it('should resolve period-applicable contract (BR-005) (200)', async () => {
            const res = await request(app)
                .get(
                    `/api/employees/${createdEmployee.id}/contracts/applicable?periodStart=2026-06-01&periodEnd=2026-06-30`,
                )
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Resolve Period-Applicable Contract',
                method: 'GET',
                endpoint: `/api/employees/:id/contracts/applicable`,
                queryParams: { periodStart: '2026-06-01', periodEnd: '2026-06-30' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Finds contract matching employee and validity period for payroll calculation.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(createdContract.id);
        });
    });

    describe('GET /api/contracts', () => {
        it('should list all contracts with filters (200)', async () => {
            const res = await request(app)
                .get('/api/contracts?page=1&limit=10')
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'List Contracts',
                method: 'GET',
                endpoint: '/api/contracts',
                queryParams: { page: '1', limit: '10' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves contract records with wage and status information.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
        });
    });

    describe('GET /api/contracts/:id', () => {
        it('should fetch single contract details (200)', async () => {
            const res = await request(app)
                .get(`/api/contracts/${createdContract.id}`)
                .set('Cookie', adminAuth.cookie);

            docLogger.record({
                scenario: 'Get Contract Details',
                method: 'GET',
                endpoint: `/api/contracts/:id`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves comprehensive contract configuration.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(createdContract.id);
        });
    });
});
