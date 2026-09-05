import express from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import {
    getAllSalaryRules,
    getSalaryRuleById,
    createSalaryRule,
    updateSalaryRule,
    deleteSalaryRule,
} from '../controllers/salaryRule.controller.js';
import {
    createSalaryRuleValidator,
    updateSalaryRuleValidator,
    ruleIdParamValidator,
    listSalaryRulesValidator,
} from '../validators/salaryRule.validator.js';

const router = express.Router();

router.use(protect);

router.get('/', listSalaryRulesValidator, getAllSalaryRules);
router.post(
    '/',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    createSalaryRuleValidator,
    createSalaryRule,
);
router.get('/:id', ruleIdParamValidator, getSalaryRuleById);
router.patch(
    '/:id',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    updateSalaryRuleValidator,
    updateSalaryRule,
);
router.delete(
    '/:id',
    restrictTo('HR_PAYROLL_MANAGER', 'ADMIN'),
    ruleIdParamValidator,
    deleteSalaryRule,
);

export default router;
