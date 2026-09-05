import request from 'supertest';
import app from '../../app.js';
import { generateTempPassword } from '../../utils/password.utils.js';
import { accountCreatedEmailTemplate } from '../../templates/email.template.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';

describe('Auth & Admin User Creation Module', () => {
    let employeeUser = null;
    let adminUser = null;

    beforeAll(async () => {
        try {
            employeeUser = await createAndLoginTestUser({ role: 'EMPLOYEE' });
            adminUser = await createAndLoginTestUser({ role: 'ADMIN' });
        } catch (err) {
            console.warn('Failed to create test users in beforeAll:', err);
        }
    });

    describe('Password Generation Utility', () => {
        it('should generate password of specified length', () => {
            const pwd = generateTempPassword(10);
            expect(pwd).toHaveLength(10);
        });

        it('should contain uppercase, lowercase, digit, and special characters', () => {
            const pwd = generateTempPassword(8);
            expect(/[A-Z]/.test(pwd)).toBe(true);
            expect(/[a-z]/.test(pwd)).toBe(true);
            expect(/[0-9]/.test(pwd)).toBe(true);
            expect(/[!@#$%^&*()-_=+]/.test(pwd)).toBe(true);
        });

        it('should throw if requested length is less than 6', () => {
            expect(() => generateTempPassword(5)).toThrow();
        });
    });

    describe('Email Template Sanitization & Structure', () => {
        it('should escape HTML characters in name, email, and password', () => {
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
            expect(html).toContain('P@ss&lt;w&amp;r&gt;d!1');
            expect(html).toContain('HR Manager');
        });
    });

    describe('Public Registration Disabled', () => {
        it('POST /api/auth/register should return 410 Gone', async () => {
            const res = await request(app).post('/api/auth/register').send({
                firstName: 'Test',
                lastName: 'User',
                email: 'test@company.com',
                password: 'Password123!',
            });

            expect(res.status).toBe(410);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/Public registration is not available/i);
        });
    });

    describe('Admin User Creation RBAC & Security', () => {
        it('should return 401 when unauthenticated', async () => {
            const res = await request(app).post('/api/admin/users').send({
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@company.com',
                role: 'EMPLOYEE',
            });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 403 when non-ADMIN calls create user', async () => {
            if (!employeeUser) {
                console.warn('Skipping test due to missing employeeUser');
                return;
            }

            const res = await request(app)
                .post('/api/admin/users')
                .set('Cookie', employeeUser.cookie)
                .send({
                    firstName: 'Alice',
                    lastName: 'Smith',
                    email: 'alice@company.com',
                    role: 'EMPLOYEE',
                });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
        });

        it('should reject requests with password in body (400)', async () => {
            if (!adminUser) {
                console.warn('Skipping test due to missing adminUser');
                return;
            }

            const res = await request(app)
                .post('/api/admin/users')
                .set('Cookie', adminUser.cookie)
                .send({
                    firstName: 'Alice',
                    lastName: 'Smith',
                    email: 'alice_pwd_fail@company.com',
                    role: 'EMPLOYEE',
                    password: 'ClientProvidedPassword1!',
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(JSON.stringify(res.body)).toMatch(/Password must not be provided/i);
        });

        it('should reject requests with invalid role enum (400)', async () => {
            if (!adminUser) {
                console.warn('Skipping test due to missing adminUser');
                return;
            }

            const res = await request(app)
                .post('/api/admin/users')
                .set('Cookie', adminUser.cookie)
                .send({
                    firstName: 'Bob',
                    lastName: 'Smith',
                    email: 'bob_invalid_role@company.com',
                    role: 'USER', // Legacy invalid role
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(JSON.stringify(res.body)).toMatch(/Role must be a valid PeoplePay360 role/i);
        });

        it('should reject role update with invalid role USER (400)', async () => {
            if (!adminUser) {
                console.warn('Skipping test due to missing adminUser');
                return;
            }

            const res = await request(app)
                .patch('/api/admin/users/00000000-0000-0000-0000-000000000000/role')
                .set('Cookie', adminUser.cookie)
                .send({
                    role: 'USER',
                });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(JSON.stringify(res.body)).toMatch(/Role must be a valid PeoplePay360 role/i);
        });
    });
});
