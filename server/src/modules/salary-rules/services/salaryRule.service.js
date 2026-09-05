import * as salaryRuleDao from '../../../dao/salaryRule.dao.js';
import * as salaryStructureDao from '../../../dao/salaryStructure.dao.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Salary Rule Service (Standalone CRUD)
 */

export async function listSalaryRules(filter) {
    return salaryRuleDao.findAllRules(filter);
}

export async function getSalaryRuleById(id) {
    const rule = await salaryRuleDao.findRuleById(id);
    if (!rule) {
        throw new AppError('Salary rule not found', 404);
    }
    return rule;
}

export async function createSalaryRule(data) {
    const structure = await salaryStructureDao.findStructureById(data.structureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    const code = data.code.trim().toUpperCase();
    const existingCode = await salaryRuleDao.findRuleByCodeInStructure(data.structureId, code);
    if (existingCode) {
        throw new AppError(`Rule with code "${code}" already exists in this structure`, 409);
    }

    const sequenceOrder = Number(data.sequenceOrder);
    const existingSeq = await salaryRuleDao.findRuleBySequenceInStructure(
        data.structureId,
        sequenceOrder,
    );
    if (existingSeq) {
        throw new AppError(
            `Rule with sequence order ${sequenceOrder} already exists in this structure`,
            409,
        );
    }

    validateRuleComputation(data);

    const created = await salaryRuleDao.createRule({
        structureId: data.structureId,
        code,
        name: data.name.trim(),
        category: data.category.trim().toUpperCase(),
        sequenceOrder,
        computationType: data.computationType.trim().toUpperCase(),
        fixedAmount: data.fixedAmount !== undefined ? data.fixedAmount : null,
        percentageBaseCode: data.percentageBaseCode
            ? data.percentageBaseCode.trim().toUpperCase()
            : null,
        percentageRate: data.percentageRate !== undefined ? data.percentageRate : null,
        formulaExpression: data.formulaExpression ? data.formulaExpression.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
    });

    return created;
}

export async function updateSalaryRule(id, data) {
    const rule = await salaryRuleDao.findRuleById(id);
    if (!rule) {
        throw new AppError('Salary rule not found', 404);
    }

    const structureId = rule.structureId;

    if (data.code) {
        const code = data.code.trim().toUpperCase();
        if (code !== rule.code) {
            const existingCode = await salaryRuleDao.findRuleByCodeInStructure(structureId, code);
            if (existingCode) {
                throw new AppError(
                    `Rule with code "${code}" already exists in this structure`,
                    409,
                );
            }
        }
    }

    if (data.sequenceOrder !== undefined) {
        const seq = Number(data.sequenceOrder);
        if (seq !== rule.sequenceOrder) {
            const existingSeq = await salaryRuleDao.findRuleBySequenceInStructure(structureId, seq);
            if (existingSeq) {
                throw new AppError(
                    `Rule with sequence order ${seq} already exists in this structure`,
                    409,
                );
            }
        }
    }

    const merged = { ...rule, ...data };
    validateRuleComputation(merged);

    const updated = await salaryRuleDao.updateRule(id, data);
    return updated;
}

export async function deleteSalaryRule(id) {
    const rule = await salaryRuleDao.findRuleById(id);
    if (!rule) {
        throw new AppError('Salary rule not found', 404);
    }

    const deleted = await salaryRuleDao.deleteRule(id);
    return deleted;
}

function validateRuleComputation(ruleData) {
    const compType = (ruleData.computationType || '').toUpperCase();

    if (compType === 'FIXED') {
        if (ruleData.fixedAmount === undefined || ruleData.fixedAmount === null) {
            throw new AppError('fixedAmount is required for FIXED computation type', 422);
        }
        if (Number(ruleData.fixedAmount) < 0) {
            throw new AppError('fixedAmount must be non-negative', 422);
        }
    } else if (compType === 'PERCENTAGE') {
        if (!ruleData.percentageBaseCode) {
            throw new AppError(
                'percentageBaseCode is required for PERCENTAGE computation type',
                422,
            );
        }
        if (ruleData.percentageRate === undefined || ruleData.percentageRate === null) {
            throw new AppError('percentageRate is required for PERCENTAGE computation type', 422);
        }
        if (Number(ruleData.percentageRate) < 0) {
            throw new AppError('percentageRate must be non-negative', 422);
        }
    } else if (compType === 'FORMULA') {
        if (!ruleData.formulaExpression || !ruleData.formulaExpression.trim()) {
            throw new AppError('formulaExpression is required for FORMULA computation type', 422);
        }
    } else {
        throw new AppError(`Invalid computationType: ${ruleData.computationType}`, 422);
    }
}
