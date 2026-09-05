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
        it('should return 410 Gone for public registration', async () => {
            const res = await request(app).post('/api/auth/register').send({
                email: 'public@example.com',
                password: 'Password@123',
            });

            docLogger.record({
                scenario: 'Public Registration Attempt',
                method: 'POST',
                endpoint: '/api/auth/register',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'HRMS enterprise policies disable public self-registration. Admin provisioning required.',
            });

            expect(res.status).toBe(410);
            expect(res.body.success).toBe(false);
        });
    });

    describe('Authentication Endpoints', () => {
        it('POST /api/auth/login should reject invalid credentials (401)', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: employeeUser.user.email,
                password: 'WrongPassword@999',
            });

            docLogger.record({
                scenario: 'Login with Invalid Password',
                method: 'POST',
                endpoint: '/api/auth/login',
                requestBody: { email: employeeUser.user.email, password: '***' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Authentication rejection for invalid password.',
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/auth/login should authenticate successfully and set cookie (200)', async () => {
            const res = await request(app).post('/api/auth/login').send({
                email: employeeUser.user.email,
                password: employeeUser.rawPassword,
            });

            docLogger.record({
                scenario: 'Login Success (Session Cookie Issued)',
                method: 'POST',
                endpoint: '/api/auth/login',
                requestBody: { email: employeeUser.user.email, password: '***' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Sets HTTP-only JWT token cookie upon successful authentication.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user || res.body.data?.user).toBeDefined();
            expect(res.headers['set-cookie']).toBeDefined();
        });

        it('GET /api/auth/get-me should return 401 when unauthenticated', async () => {
            const res = await request(app).get('/api/auth/get-me');

            docLogger.record({
                scenario: 'Get Profile Unauthenticated',
                method: 'GET',
                endpoint: '/api/auth/get-me',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Protected session endpoints return 401 when session cookie is absent.',
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('GET /api/auth/get-me should return active profile (200)', async () => {
            const res = await request(app)
                .get('/api/auth/get-me')
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'Get Current Authenticated Profile',
                method: 'GET',
                endpoint: '/api/auth/get-me',
                headers: { Cookie: 'token=JWT_SESSION_TOKEN' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Returns current authenticated user identity record.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const profile = res.body.user || res.body.data?.user;
            expect(profile.email).toBe(employeeUser.user.email);
        });

        it('POST /api/auth/logout should clear session (200)', async () => {
            const res = await request(app)
                .post('/api/auth/logout')
                .set('Cookie', employeeUser.cookie);

            docLogger.record({
                scenario: 'Logout Session',
                method: 'POST',
                endpoint: '/api/auth/logout',
                headers: { Cookie: 'token=JWT_SESSION_TOKEN' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Terminates user session and blacklists token.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Admin User Provisioning & RBAC', () => {
        it('POST /api/admin/users should return 403 when called by non-admin', async () => {
            const nonAdmin = await createAndLoginTestUser({ role: 'EMPLOYEE' });
            const res = await request(app)
                .post('/api/admin/users')
                .set('Cookie', nonAdmin.cookie)
                .send({
                    firstName: 'Unauthorized',
                    lastName: 'Attempt',
                    email: `unauth_${Date.now()}@company.com`,
                    role: 'HR_MANAGER',
                });

            docLogger.record({
                scenario: 'Admin User Creation by Non-Admin (Forbidden)',
                method: 'POST',
                endpoint: '/api/admin/users',
                statusCode: res.status,
                responseBody: res.body,
                notes: 'RBAC restriction prevents regular employees from provisioning user accounts.',
            });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('POST /api/admin/users should provision new user when called by ADMIN (201)', async () => {
            const payload = {
                firstName: 'Hr',
                lastName: 'Specialist',
                email: `hr_specialist_${Date.now()}@company.com`,
                role: 'HR_PAYROLL_USER',
            };

            const res = await request(app)
                .post('/api/admin/users')
                .set('Cookie', adminUser.cookie)
                .send(payload);

            docLogger.record({
                scenario: 'Admin Provisions New HR User',
                method: 'POST',
                endpoint: '/api/admin/users',
                headers: { Cookie: 'token=ADMIN_JWT_SESSION' },
                requestBody: payload,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'ADMIN provisions a new user with auto-generated temporary password and welcome email.',
            });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            const created = res.body.user || res.body.data;
            expect(created.email).toBe(payload.email);
            expect(created.role).toBe('HR_PAYROLL_USER');
            createdUserId = created.id;
        });

        it('GET /api/admin/users should list registered users (200)', async () => {
            const res = await request(app)
                .get('/api/admin/users?page=1&limit=10')
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'List System Users',
                method: 'GET',
                endpoint: '/api/admin/users',
                queryParams: { page: '1', limit: '10' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Paginated user management directory.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const list = res.body.users || res.body.data;
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBeGreaterThan(0);
        });

        it('GET /api/admin/users/:id should return single user details (200)', async () => {
            const res = await request(app)
                .get(`/api/admin/users/${createdUserId}`)
                .set('Cookie', adminUser.cookie);

            docLogger.record({
                scenario: 'Get Single User Details',
                method: 'GET',
                endpoint: `/api/admin/users/:id`,
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Fetches detailed profile information for a specific user ID.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const single = res.body.user || res.body.data;
            expect(single.id).toBe(createdUserId);
        });

        it('PATCH /api/admin/users/:id/role should update role (200)', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${createdUserId}/role`)
                .set('Cookie', adminUser.cookie)
                .send({ role: 'HR_PAYROLL_MANAGER' });

            docLogger.record({
                scenario: 'Admin Updates User Role',
                method: 'PATCH',
                endpoint: `/api/admin/users/:id/role`,
                requestBody: { role: 'HR_PAYROLL_MANAGER' },
                statusCode: res.status,
                responseBody: res.body,
                notes: 'Promotes user to HR_PAYROLL_MANAGER and invalidates cache.',
            });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            const updated = res.body.user || res.body.data;
            expect(updated.role).toBe('HR_PAYROLL_MANAGER');
        });
    });
});
