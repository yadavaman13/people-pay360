import { Router } from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as allocationController from '../controllers/allocation.controller.js';
import {
    createAllocationValidator,
    updateAllocationValidator,
    allocationIdParamValidator,
    listAllocationsValidator,
} from '../validators/allocation.validator.js';

const router = Router();

router.use(protect);

router
    .route('/')
    .get(listAllocationsValidator, allocationController.getAllAllocations)
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        createAllocationValidator,
        allocationController.createAllocation,
    );

router.route('/balance').get(allocationController.getLeaveBalance);

router.route('/balance/:employeeId').get(allocationController.getLeaveBalance);

router
    .route('/:id/approve')
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        allocationIdParamValidator,
        allocationController.approveAllocation,
    );

router
    .route('/:id/refuse')
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        allocationIdParamValidator,
        allocationController.refuseAllocation,
    );

router
    .route('/:id')
    .get(allocationIdParamValidator, allocationController.getAllocationById)
    .patch(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        updateAllocationValidator,
        allocationController.updateAllocation,
    )
    .delete(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        allocationIdParamValidator,
        allocationController.deleteAllocation,
    );

export default router;
