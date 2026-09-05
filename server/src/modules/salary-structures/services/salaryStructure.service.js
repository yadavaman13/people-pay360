import * as salaryStructureDao from '../../../dao/salaryStructure.dao.js';
import * as salaryRuleDao from '../../../dao/salaryRule.dao.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Salary Structure Service
 */

export async function listSalaryStructures(filter) {
    return salaryStructureDao.findAllStructures(filter);
}

export async function getSalaryStructureById(id) {
    const structure = await salaryStructureDao.findStructureWithRules(id);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }
    return structure;
}

export async function createSalaryStructure(data) {
    const code = data.code.trim().toUpperCase();

    const existing = await salaryStructureDao.findStructureByCode(code);
    if (existing) {
        throw new AppError(`Salary structure with code "${code}" already exists`, 409);
    }

    const created = await salaryStructureDao.createStructure({
        name: data.name.trim(),
        code,
        description: data.description ? data.description.trim() : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
    });

    // If initial rules provided, insert them
    let rules = [];
    if (Array.isArray(data.rules) && data.rules.length > 0) {
        for (const ruleItem of data.rules) {
            const rule = await addRuleToStructure(created.id, ruleItem);
            rules.push(rule);
        }
    }

    return {
        ...created,
        rules,
    };
}

export async function updateSalaryStructure(id, data) {
    const structure = await salaryStructureDao.findStructureById(id);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    if (data.code) {
        const code = data.code.trim().toUpperCase();
        if (code !== structure.code) {
            const existing = await salaryStructureDao.findStructureByCode(code);
            if (existing) {
                throw new AppError(`Salary structure with code "${code}" already exists`, 409);
            }
        }
    }

    const updated = await salaryStructureDao.updateStructure(id, data);
    return updated;
}

export async function deleteSalaryStructure(id) {
    const structure = await salaryStructureDao.findStructureById(id);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    const inContracts = await salaryStructureDao.checkStructureInContracts(id);
    if (inContracts) {
        throw new AppError(
            'Cannot deactivate salary structure: active employment contracts are currently linked to it',
            409,
        );
    }

    const inPayruns = await salaryStructureDao.checkStructureInPayruns(id);
    if (inPayruns) {
        throw new AppError(
            'Cannot deactivate salary structure: ongoing payruns are currently utilizing it',
            409,
        );
    }

    const deleted = await salaryStructureDao.softDeleteStructure(id);
    return deleted;
}

export async function getRulesByStructureId(structureId) {
    const structure = await salaryStructureDao.findStructureById(structureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    return salaryRuleDao.findRulesByStructureId(structureId);
}

export async function addRuleToStructure(structureId, ruleData) {
    const structure = await salaryStructureDao.findStructureById(structureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    const code = ruleData.code.trim().toUpperCase();
    const existingCode = await salaryRuleDao.findRuleByCodeInStructure(structureId, code);
    if (existingCode) {
        throw new AppError(`Rule with code "${code}" already exists in this structure`, 409);
    }

    const sequenceOrder = Number(ruleData.sequenceOrder);
    const existingSeq = await salaryRuleDao.findRuleBySequenceInStructure(
        structureId,
        sequenceOrder,
    );
    if (existingSeq) {
        throw new AppError(
            `Rule with sequence order ${sequenceOrder} already exists in this structure`,
            409,
        );
    }

    validateRuleComputation(ruleData);

    const created = await salaryRuleDao.createRule({
        structureId,
        code,
        name: ruleData.name.trim(),
        category: ruleData.category.trim().toUpperCase(),
        sequenceOrder,
        computationType: ruleData.computationType.trim().toUpperCase(),
        fixedAmount: ruleData.fixedAmount !== undefined ? ruleData.fixedAmount : null,
        percentageBaseCode: ruleData.percentageBaseCode
            ? ruleData.percentageBaseCode.trim().toUpperCase()
            : null,
        percentageRate: ruleData.percentageRate !== undefined ? ruleData.percentageRate : null,
        formulaExpression: ruleData.formulaExpression ? ruleData.formulaExpression.trim() : null,
        isActive: ruleData.isActive !== undefined ? ruleData.isActive : true,
    });

    return created;
}

export async function updateRuleInStructure(structureId, ruleId, data) {
    const structure = await salaryStructureDao.findStructureById(structureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    const rule = await salaryRuleDao.findRuleById(ruleId);
    if (!rule || rule.structureId !== structureId) {
        throw new AppError('Salary rule not found in this structure', 404);
    }

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

    const updated = await salaryRuleDao.updateRule(ruleId, data);
    return updated;
}

export async function removeRuleFromStructure(structureId, ruleId) {
    const structure = await salaryStructureDao.findStructureById(structureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }

    const rule = await salaryRuleDao.findRuleById(ruleId);
    if (!rule || rule.structureId !== structureId) {
        throw new AppError('Salary rule not found in this structure', 404);
    }

    const deleted = await salaryRuleDao.deleteRule(ruleId);
    return deleted;
}

/**
 * Validate computation type specific constraints
 */
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
