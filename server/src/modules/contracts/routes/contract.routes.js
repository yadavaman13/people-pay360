import { Router } from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as contractController from '../controllers/contract.controller.js';
import {
    createContractValidator,
    updateContractValidator,
    listContractsValidator,
} from '../validators/contract.validator.js';

const router = Router();

// Protect all contract endpoints
router.use(protect);

router
    .route('/')
    .get(
        restrictTo('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'),
        listContractsValidator,
        contractController.listContracts,
    )
    .post(
        restrictTo('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'),
        createContractValidator,
        contractController.createContract,
    );

// Status transition actions
router.post(
    '/:id/activate',
    restrictTo('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'),
    contractController.activateContract,
);

router.post(
    '/:id/cancel',
    restrictTo('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'),
    contractController.cancelContract,
);

router
    .route('/:id')
    .get(contractController.getContract)
    .patch(
        restrictTo('ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'),
        updateContractValidator,
        contractController.updateContract,
    )
    .delete(restrictTo('ADMIN'), contractController.deleteContract);

export default router;
