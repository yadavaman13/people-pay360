import { Router } from 'express';
import { protect } from '../../auth/middleware/auth.middleware.js';
import * as departmentDao from '../../../dao/department.dao.js';
import { sendResponse } from '../../../utils/response.utlis.js';

const router = Router();

// Protect all job position endpoints
router.use(protect);

/**
 * GET /api/job-positions
 * List all active job positions (optionally filtered by ?departmentId=...)
 */
router.get('/', async (req, res, next) => {
    try {
        const { departmentId } = req.query;
        const positions = await departmentDao.getAllJobPositions(departmentId || null);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Job positions fetched successfully',
            data: positions,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
