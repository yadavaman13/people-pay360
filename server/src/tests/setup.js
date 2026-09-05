import { pool } from '../config/database.config.js';
import redis from '../config/cache.config.js';

beforeEach(async () => {
    try {
        if (redis && redis.status === 'ready') {
            await Promise.race([
                (async () => {
                    const keys = await redis.keys('ratelimit:*');
                    if (keys.length > 0) {
                        await redis.del(...keys);
                    }
                })(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redis cleanup timeout')), 500),
                ),
            ]);
        }
    } catch {
        // Ignore cache cleanup errors in testing
    }
});

afterAll(async () => {
    // Brief pause between test files; pool and redis remain alive for sequential test suites
    await new Promise((resolve) => setTimeout(resolve, 100));
});
