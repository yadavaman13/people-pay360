import { Router } from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as employeeController from '../controllers/employee.controller.js';
import * as employeeRelatedController from '../controllers/employeeRelated.controller.js';
import {
    createEmployeeProfileValidator,
    updateEmployeeValidator,
    listEmployeesValidator,
    forPayrunValidator,
    applicableContractValidator,
    listEmployeeAttendanceValidator,
    listEmployeeTimeOffValidator,
    listEmployeeAllocationsValidator,
} from '../validators/employee.validator.js';

const router = Router();

// Protect all employee endpoints
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ROUTES (must precede /:id)
// ─────────────────────────────────────────────────────────────────────────────

// Self-service employee profile
router
    .route('/me')
    .get(employeeController.getMe)
    .patch(updateEmployeeValidator, employeeController.updateMe);

// Payrun roster resolver for Step 2 wizard
router.get(
    '/for-payrun',
    restrictTo('HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    forPayrunValidator,
    employeeController.getEmployeesForPayrun,
);

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router
    .route('/')
    .get(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        listEmployeesValidator,
        employeeController.listEmployees,
    )
    .post(createEmployeeProfileValidator, employeeController.createEmployeeProfile);

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE RELATED SUB-RESOURCES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/:id/contracts', employeeRelatedController.getEmployeeContracts);
router.get('/:id/contracts/active', employeeRelatedController.getActiveContract);
router.get(
    '/:id/contracts/applicable',
    applicableContractValidator,
    employeeRelatedController.getApplicableContract,
);
router.get(
    '/:id/attendance',
    listEmployeeAttendanceValidator,
    employeeRelatedController.getEmployeeAttendance,
);
router.get(
    '/:id/time-off',
    listEmployeeTimeOffValidator,
    employeeRelatedController.getEmployeeTimeOff,
);
router.get(
    '/:id/allocations',
    listEmployeeAllocationsValidator,
    employeeRelatedController.getEmployeeAllocations,
);

// ─────────────────────────────────────────────────────────────────────────────
// PARAMETERIZED /:id ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router
    .route('/:id')
    .get(employeeController.getEmployee)
    .patch(updateEmployeeValidator, employeeController.updateEmployee)
    .delete(restrictTo('ADMIN', 'HR_MANAGER'), employeeController.deleteEmployee);

export default router;
