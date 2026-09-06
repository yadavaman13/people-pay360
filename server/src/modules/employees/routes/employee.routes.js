import { Router } from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as employeeController from '../controllers/employee.controller.js';

const upload = multer({ storage: multer.memoryStorage() });
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
        restrictTo('HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        listEmployeesValidator,
        employeeController.listEmployees,
    )
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        upload.single('avatar'),
        createEmployeeProfileValidator,
        employeeController.createEmployeeProfile,
    );

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
router.get('/:id/bank-accounts', employeeRelatedController.getEmployeeBankAccounts);
router.post('/:id/bank-accounts', employeeRelatedController.createEmployeeBankAccount);
router.patch(
    '/:id/bank-accounts/:accountId/primary',
    employeeRelatedController.setPrimaryBankAccount,
);
router.delete('/:id/bank-accounts/:accountId', employeeRelatedController.deleteBankAccount);

// ─────────────────────────────────────────────────────────────────────────────
// PARAMETERIZED /:id ROUTES
// ─────────────────────────────────────────────────────────────────────────────

router.post(
    '/:id/send-welcome-email',
    restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    employeeController.sendWelcomeEmail,
);

router.patch(
    '/:id/avatar',
    restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
    upload.single('avatar'),
    employeeController.uploadEmployeeAvatar,
);

router
    .route('/:id')
    .get(employeeController.getEmployee)
    .patch(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        updateEmployeeValidator,
        employeeController.updateEmployee,
    )
    .delete(restrictTo('ADMIN', 'HR_MANAGER'), employeeController.deleteEmployee);

export default router;
