import { Router } from 'express';
import timeOffTypeRouter from './timeOffType.routes.js';
import allocationRouter from './allocation.routes.js';
import timeOffRequestRouter from './timeOffRequest.routes.js';
import { getLeaveBalance } from '../controllers/allocation.controller.js';
import { protect } from '../../auth/middleware/auth.middleware.js';

const router = Router();

router.use('/types', timeOffTypeRouter);
router.use('/allocations', allocationRouter);
router.use('/requests', timeOffRequestRouter);

// Convenient alias for leave balance
router.get('/balance', protect, getLeaveBalance);
router.get('/balance/:employeeId', protect, getLeaveBalance);

export default router;
