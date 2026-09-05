import { Router } from 'express';
import { protect } from '../../auth/middleware/auth.middleware.js';
import * as departmentDao from '../../../dao/department.dao.js';
import { sendResponse } from '../../../utils/response.utlis.js';

const router = Router();

// Protect all department & job position endpoints
router.use(protect);

/**
 * GET /api/departments
 * List all active company departments
 */
router.get('/', async (req, res, next) => {
    try {
        const departments = await departmentDao.getAllDepartments();
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Departments fetched successfully',
            data: departments,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
