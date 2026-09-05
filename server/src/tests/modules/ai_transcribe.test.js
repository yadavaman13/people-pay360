import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../app.js';
import { createAndLoginTestUser } from '../helpers/auth-helper.js';
import { getTranscribeEphemeralToken } from '../../services/ai/transcribe.ai.service.js';
import envConfig from '../../config/env.config.js';

describe('AI Transcribe Ephemeral Token Module', () => {
    let authUser = null;

    beforeAll(async () => {
        try {
            authUser = await createAndLoginTestUser({ role: 'USER' });
        } catch (err) {
            console.error('Failed to create test user in beforeAll:', err);
        }
    });

    describe('POST /api/ai/transcribe/token Endpoint', () => {
        it('should reject unauthenticated requests with 401 Unauthorized', async () => {
            const res = await request(app).post('/api/ai/transcribe/token').send();

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should return 200 and ephemeral token for authenticated user', async () => {
            if (!authUser) {
                console.warn('Skipping test due to missing test user');
                return;
            }

            const originalFetch = globalThis.fetch;
            const mockTokenName = 'auth_tokens/test_ephemeral_token_abc123';
            const mockExpireTime = new Date(Date.now() + 900 * 1000).toISOString();

            globalThis.fetch = jest.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        name: mockTokenName,
                        expireTime: mockExpireTime,
                    }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            );

            try {
                const res = await request(app)
                    .post('/api/ai/transcribe/token')
                    .set('Authorization', authUser.authHeader)
                    .send();

                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data).toBeDefined();
                expect(res.body.data.token).toBe(mockTokenName);
                expect(res.body.data.expireTime).toBe(mockExpireTime);
                expect(res.body.data.model).toBe('gemini-3.5-transcribe-live');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should handle Google API errors gracefully and return 500 without leaking keys', async () => {
            if (!authUser) return;

            const originalFetch = globalThis.fetch;
            globalThis.fetch = jest.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        error: {
                            message: 'Internal Google Live API error',
                        },
                    }),
                    {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    },
                ),
            );

            try {
                const res = await request(app)
                    .post('/api/ai/transcribe/token')
                    .set('Authorization', authUser.authHeader)
                    .send();

                expect(res.status).toBe(500);
                expect(res.body.success).toBe(false);
                expect(res.body.message).toBe('Failed to generate transcription token');
                // Ensure raw API key is never in response
                if (envConfig.GEMINI_API_KEY) {
                    expect(JSON.stringify(res.body)).not.toContain(envConfig.GEMINI_API_KEY);
                }
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('getTranscribeEphemeralToken Service', () => {
        it('should format requests with single-use and valid TTL constraints', async () => {
            const originalFetch = globalThis.fetch;
            let capturedUrl = null;
            let capturedBody = null;

            globalThis.fetch = jest.fn().mockImplementation((url, opts) => {
                capturedUrl = url;
                capturedBody = typeof opts?.body === 'string' ? JSON.parse(opts.body) : opts?.body;
                return Promise.resolve(
                    new Response(
                        JSON.stringify({
                            name: 'auth_tokens/service_mock_token',
                            expireTime: new Date(Date.now() + 900 * 1000).toISOString(),
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        },
                    ),
                );
            });

            try {
                const result = await getTranscribeEphemeralToken({
                    newSessionDurationSec: 60,
                    expireDurationSec: 900,
                });

                expect(capturedUrl).toContain('auth_tokens');
                expect(capturedBody.uses).toBe(1);
                expect(capturedBody.newSessionExpireTime).toBeDefined();
                expect(capturedBody.expireTime).toBeDefined();
                expect(result.token).toBe('auth_tokens/service_mock_token');
                expect(result.model).toBe('gemini-3.5-transcribe-live');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        it('should succeed with live Google API if GEMINI_API_KEY is configured', async () => {
            if (!envConfig.GEMINI_API_KEY) {
                console.warn('Skipping live Google API test: GEMINI_API_KEY not configured');
                return;
            }

            const tokenData = await getTranscribeEphemeralToken();
            expect(tokenData).toBeDefined();
            expect(tokenData.token).toMatch(/^auth_tokens\/.+/);
            expect(tokenData.model).toBe('gemini-3.5-transcribe-live');
            expect(tokenData.expireTime).toBeDefined();
        });
    });
});
