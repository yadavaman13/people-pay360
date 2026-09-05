import { Router } from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as timeOffTypeController from '../controllers/timeOffType.controller.js';
import {
    createTimeOffTypeValidator,
    updateTimeOffTypeValidator,
    typeIdParamValidator,
    listTimeOffTypesValidator,
} from '../validators/timeOffType.validator.js';

const router = Router();

router.use(protect);

router
    .route('/')
    .get(listTimeOffTypesValidator, timeOffTypeController.getAllTypes)
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        createTimeOffTypeValidator,
        timeOffTypeController.createType,
    );

router
    .route('/:id')
    .get(typeIdParamValidator, timeOffTypeController.getTypeById)
    .patch(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        updateTimeOffTypeValidator,
        timeOffTypeController.updateType,
    )
    .delete(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        typeIdParamValidator,
        timeOffTypeController.deleteType,
    );

export default router;
