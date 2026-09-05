import { Router } from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as scheduleController from '../controllers/schedule.controller.js';
import {
    createScheduleValidator,
    updateScheduleValidator,
    replaceScheduleLinesValidator,
    scheduleIdParamValidator,
    listSchedulesValidator,
} from '../validators/schedule.validator.js';

const router = Router();

// All schedule routes require authentication
router.use(protect);

router
    .route('/')
    .get(listSchedulesValidator, scheduleController.getAllSchedules)
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        createScheduleValidator,
        scheduleController.createSchedule,
    );

router.route('/:id/weekly-hours').get(scheduleIdParamValidator, scheduleController.getWeeklyHours);

router
    .route('/:id/lines')
    .put(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        replaceScheduleLinesValidator,
        scheduleController.replaceScheduleLines,
    );

router
    .route('/:id')
    .get(scheduleIdParamValidator, scheduleController.getScheduleById)
    .patch(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        updateScheduleValidator,
        scheduleController.updateSchedule,
    )
    .delete(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        scheduleIdParamValidator,
        scheduleController.deleteSchedule,
    );

export default router;
