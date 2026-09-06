import { Router } from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as attendanceController from '../controllers/attendance.controller.js';
import {
    checkInValidator,
    checkOutValidator,
    checkOutSelfValidator,
    manualCorrectionValidator,
    attendanceIdParamValidator,
    listAttendanceValidator,
} from '../validators/attendance.validator.js';

const router = Router();

router.use(protect);

router.route('/').get(listAttendanceValidator, attendanceController.getAttendanceList);

router
    .route('/summary')
    .get(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        attendanceController.getSummaryStats,
    );

router.route('/today').get(attendanceController.getTodayStatus);

router.route('/check-in').post(checkInValidator, attendanceController.checkIn);

router.route('/check-out').post(checkOutSelfValidator, attendanceController.checkOut);

router.route('/:id/check-out').post(checkOutValidator, attendanceController.checkOut);

router
    .route('/resolve-missing-checkouts')
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        attendanceController.resolveStaleCheckouts,
    );

router
    .route('/:id')
    .get(attendanceIdParamValidator, attendanceController.getAttendanceById)
    .patch(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        manualCorrectionValidator,
        attendanceController.manualCorrection,
    )
    .delete(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        attendanceIdParamValidator,
        attendanceController.deleteAttendance,
    );

export default router;
