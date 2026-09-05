import cron from 'node-cron';
import { cleanupExpiredDeletedUsers } from '../modules/auth/services/cleanup.service.js';

cron.schedule(
    '0 0 * * *', // min hr every-day-of-month every-month every-day-of-the-week   (executes everyday at 12:00 AM)
    async () => {
        try {
            console.log('[Cron] Starting expired users cleanup...');
            const deleted = await cleanupExpiredDeletedUsers();
            console.log(`[Cron] Cleanup complete. Permanently deleted ${deleted.length} users.`);
        } catch (error) {
            console.error('[Cron] Cleanup failed with error:', error);
        }
    },
    {
        timezone: 'Asia/Kolkata',
    },
);
