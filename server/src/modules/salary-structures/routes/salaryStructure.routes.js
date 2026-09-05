import express from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import {
    getAllSalaryStructures,
    getSalaryStructureById,
    createSalaryStructure,
    updateSalaryStructure,
    deleteSalaryStructure,
    getStructureRules,
    addRuleToStructure,
    updateRuleInStructure,
    removeRuleFromStructure,
} from '../controllers/salaryStructure.controller.js';
import {
    createSalaryStructureValidator,
    updateSalaryStructureValidator,
    structureIdParamValidator,
    ruleIdParamValidator,
    listSalaryStructuresValidator,
    addRuleToStructureValidator,
    updateRuleInStructureValidator,
} from '../validators/salaryStructure.validator.js';

const router = express.Router();

router.use(protect);

// ── Structure routes ──────────────────────────────────────────────────────────
router.get('/', listSalaryStructuresValidator, getAllSalaryStructures);
router.post(
    '/',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    createSalaryStructureValidator,
    createSalaryStructure,
);
router.get('/:id', structureIdParamValidator, getSalaryStructureById);
router.patch(
    '/:id',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    updateSalaryStructureValidator,
    updateSalaryStructure,
);
router.delete(
    '/:id',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    structureIdParamValidator,
    deleteSalaryStructure,
);

// ── Nested rule routes ────────────────────────────────────────────────────────
router.get('/:id/rules', structureIdParamValidator, getStructureRules);
router.post(
    '/:id/rules',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    addRuleToStructureValidator,
    addRuleToStructure,
);
router.patch(
    '/:id/rules/:ruleId',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    updateRuleInStructureValidator,
    updateRuleInStructure,
);
router.delete(
    '/:id/rules/:ruleId',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    ruleIdParamValidator,
    removeRuleFromStructure,
);

export default router;
