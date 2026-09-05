import request from 'supertest';
import app from '../../app.js';
import { FeatureApiDocLogger } from '../helpers/md-logger.js';
import { generateTempPassword } from '../../utils/password.utils.js';
import { accountCreatedEmailTemplate } from '../../templates/email.template.js';
import { generateTestUserData, createAndLoginTestUser } from '../helpers/auth-helper.js';

const docLogger = new FeatureApiDocLogger(
    '01_auth_user.md',
    'Feature 01: Authentication & User Administration API',
    'Covers authentication, session cookies, RBAC authorization, and administrative user provisioning.',
);

describe('01: Auth & Admin User Management API', () => {
    let employeeUser = null;
    let adminUser = null;
    let createdUserId = null;

    beforeAll(async () => {
        employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });
        adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
    });

    afterAll(() => {
        docLogger.save();
    });

    describe('Password & Email Utilities', () => {
        it('should generate password of specified length and complexity', () => {
            const pwd = generateTempPassword(10);
            expect(pwd).toHaveLength(10);
            expect(/[A-Z]/.test(pwd)).toBe(true);
            expect(/[a-z]/.test(pwd)).toBe(true);
            expect(/[0-9]/.test(pwd)).toBe(true);
            expect(/[!@#$%^&*()-_=+]/.test(pwd)).toBe(true);
        });

        it('should escape HTML characters in email templates', () => {
            const html = accountCreatedEmailTemplate({
                firstName: '<script>alert(1)</script>John',
                lastName: 'Doe & Co',
                email: 'test<1>@company.com',
                role: 'HR_MANAGER',
                temporaryPassword: 'P@ss<w&r>d!1',
            });
            expect(html).not.toContain('<script>');
            expect(html).toContain('&lt;script&gt;');
            expect(html).toContain('Doe &amp; Co');
        });
    });

    describe('Public Registration Disabled', () => {
        it('POST /api/auth/register should return 410 Gone', async () => {
            const payload = {
                firstName: 'Test',
                lastName: 'User',
                email: 'public_register@company.com',
                password: 'Password123!',
            };

            const res = await request(app).post('/api/auth/register').send(payload);

            docLogger.record({
                scenario: 'Public Registration Disabled (410 Gone)',
                method: 'POST',
                endpoint: '/api/auth/register',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Self-service registration is disabled; users must be created by administrators.',
            });

            expect(res.status).toBe(410);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Authentication Endpoints', () => {
        it('POST /api/auth/login should reject invalid credentials (401)', async () => {
            const payload = {
                email: 'nonexistent@peoplepay360.io',
                password: 'WrongPassword@123',
            };

            const res = await request(app).post('/api/auth/login').send(payload);

            docLogger.record({
                scenario: 'Login with Invalid Credentials (Failure)',
                method: 'POST',
                endpoint: '/api/auth/login',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns 401 when email or password is incorrect.',
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/auth/login should authenticate successfully and set cookie (200)', async () => {
            const testCredentials = generateTestUserData('login_test');
            await createAndLoginTestUser(testCredentials);

            const payload = {
                email: testCredentials.email,
                password: testCredentials.password,
            };

            const res = await request(app).post('/api/auth/login').send(payload);

            docLogger.record({
                scenario: 'User Login (Success)',
                method: 'POST',
                endpoint: '/api/auth/login',
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Authenticates user and returns user profile alongside HTTP-only session cookie.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe(testCredentials.email.toLowerCase());
        });

        it('GET /api/auth/get-me should return 401 when unauthenticated', async () => {
            const res = await request(app).get('/api/auth/get-me');

            docLogger.record({
                scenario: 'Get Current User Unauthenticated (Failure)',
                method: 'GET',
                endpoint: '/api/auth/get-me',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Protected route returns 401 when auth cookie/token is absent.',
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('GET /api/auth/get-me should return active profile (200)', async () => {
            const res = await request(app)
                .get('/api/auth/get-me')
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'Get Current User Profile (Success)',
                method: 'GET',
                endpoint: '/api/auth/get-me',
                headers: { Cookie: 'token=JWT_COOKIE_VALUE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns the currently logged-in user profile details.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe(employeeUser.user.email.toLowerCase());
        });

        it('POST /api/auth/logout should clear session (200)', async () => {
            const logoutUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });

            const res = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', logoutUser.cookie);

            docLogger.record({
                scenario: 'User Logout (Success)',
                method: 'POST',
                endpoint: '/api/auth/logout',
                headers: { Cookie: 'token=JWT_COOKIE_VALUE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Clears authentication cookies and blacklists session token in Redis.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Admin User Provisioning & RBAC', () => {
        it('POST /api/admin/users should return 403 when called by non-admin', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Cookie', employeeUser.cookie)
                .send({
                    firstName: 'Alice',
                    lastName: 'Smith',
                    email: `alice_${Date.now()}@company.com`,
                    role: 'EMPLOYEE',
                });

            docLogger.record({
                scenario: 'Create User by Non-Admin (Forbidden 403)',
                method: 'POST',
                endpoint: '/api/admin/users',
                headers: { Cookie: 'token=EMPLOYEE_COOKIE' },
                requestBody: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    email: 'alice@company.com',
                    role: 'EMPLOYEE',
                },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Non-admin users cannot provision accounts.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/admin/users should provision new user when called by ADMIN (201)', async () => {
            const payload = {
                firstName: 'Clara',
                lastName: 'Oswald',
                email: `clara_${Date.now()}_${Math.floor(Math.random() * 10000)}@peoplepay360.io`,
                role: 'HR_PAYROLL_USER',
            };

            const res = await request(app)
                .post('/api/admin/users')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Admin Create New User (Success 201)',
                method: 'POST',
                endpoint: '/api/admin/users',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Admin provisions new organization user with randomized initial temporary password.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            createdUserId = res.body.user.id;
        });

        it('GET /api/admin/users should list registered users (200)', async () => {
            const res = await request(app).get('/api/admin/users').set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Admin List Users (Success 200)',
                method: 'GET',
                endpoint: '/api/admin/users',
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Lists all organizational accounts with role and status metadata.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.users)).toBe(true);
        });

        it('GET /api/admin/users/:id should return single user details (200)', async () => {
            if (!createdUserId) return;

            const res = await request(app)
                .get(`/api/admin/users/${createdUserId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Admin Get User By ID (Success 200)',
                method: 'GET',
                endpoint: `/api/admin/users/${createdUserId}`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Retrieves user details by unique UUID identifier.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.id).toBe(createdUserId);
        });

        it('PATCH /api/admin/users/:id/role should update role (200)', async () => {
            if (!createdUserId) return;

            const payload = { role: 'HR_PAYROLL_MANAGER' };
            const res = await request(app)
                .patch(`/api/admin/users/${createdUserId}/role`)
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Admin Update User Role (Success 200)',
                method: 'PATCH',
                endpoint: `/api/admin/users/${createdUserId}/role`,
                headers: { Cookie: 'token=ADMIN_COOKIE' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Updates user RBAC role in accordance with authorized hierarchy.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
