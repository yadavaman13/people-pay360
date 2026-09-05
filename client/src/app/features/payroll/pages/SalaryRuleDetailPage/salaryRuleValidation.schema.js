/**
 * Validation schema and payload transformation for Salary Rule Form (SCR-PAY-009)
 */

export const CATEGORY_OPTIONS = [
    { value: 'BASIC', label: 'Basic' },
    { value: 'ALLOWANCE', label: 'Allowance' },
    { value: 'GROSS', label: 'Gross' },
    { value: 'DEDUCTION', label: 'Deduction' },
    { value: 'NET', label: 'Net' },
    { value: 'OTHER', label: 'Other' },
];

export const COMPUTATION_TYPE_OPTIONS = [
    { value: 'PERCENTAGE', label: 'Percentage of Base' },
    { value: 'FIXED', label: 'Fixed Amount' },
    { value: 'FORMULA', label: 'Formula / Mathematical Expression' },
];

export const COMMON_BASE_CODES = [
    { value: 'WAGE', label: 'WAGE (Contract Monthly Base Wage)' },
    { value: 'BASIC', label: 'BASIC (Basic Salary)' },
    { value: 'GROSS', label: 'GROSS (Gross Salary Subtotal)' },
];

/**
 * Validates salary rule form data
 * @param {object} formData
 * @returns {{ isValid: boolean, errors: Record<string, string> }}
 */
export function validateSalaryRuleForm(formData) {
    const errors = {};

    // 1. Rule Name
    if (!formData.name || !formData.name.trim()) {
        errors.name = 'Rule name is required';
    } else if (formData.name.trim().length < 2) {
        errors.name = 'Rule name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
        errors.name = 'Rule name cannot exceed 100 characters';
    }

    // 2. Code
    if (!formData.code || !formData.code.trim()) {
        errors.code = 'Rule code is required';
    } else {
        const trimmedCode = formData.code.trim();
        const codeRegex = /^[A-Z0-9_]+$/;
        if (!codeRegex.test(trimmedCode)) {
            errors.code = 'Code must contain only uppercase letters, numbers, and underscores';
        }
    }

    // 3. Category
    if (!formData.category) {
        errors.category = 'Category must be selected';
    }

    // 4. Sequence Order
    if (
        formData.sequenceOrder === undefined ||
        formData.sequenceOrder === null ||
        String(formData.sequenceOrder).trim() === ''
    ) {
        errors.sequenceOrder = 'Sequence order is required';
    } else {
        const seq = Number(formData.sequenceOrder);
        if (!Number.isInteger(seq) || seq < 1) {
            errors.sequenceOrder = 'Sequence must be a positive integer (e.g. 1, 10, 20)';
        }
    }

    // 5. Structure ID
    if (!formData.structureId) {
        errors.structureId = 'Salary structure must be selected';
    }

    // 6. Computation Type & Specific Fields
    if (!formData.computationType) {
        errors.computationType = 'Computation type is required';
    } else if (formData.computationType === 'FIXED') {
        if (
            formData.fixedAmount === undefined ||
            formData.fixedAmount === null ||
            String(formData.fixedAmount).trim() === ''
        ) {
            errors.fixedAmount = 'Fixed amount is required';
        } else {
            const amount = Number(formData.fixedAmount);
            if (isNaN(amount) || amount < 0) {
                errors.fixedAmount = 'Fixed amount must be a non-negative number';
            }
        }
    } else if (formData.computationType === 'PERCENTAGE') {
        if (!formData.percentageBaseCode || !formData.percentageBaseCode.trim()) {
            errors.percentageBaseCode = 'Base code is required (e.g. WAGE, BASIC)';
        }
        if (
            formData.percentageRate === undefined ||
            formData.percentageRate === null ||
            String(formData.percentageRate).trim() === ''
        ) {
            errors.percentageRate = 'Percentage rate is required';
        } else {
            const rate = Number(formData.percentageRate);
            if (isNaN(rate) || rate < 0) {
                errors.percentageRate = 'Percentage rate must be a non-negative number';
            }
        }
    } else if (formData.computationType === 'FORMULA') {
        if (!formData.formulaExpression || !formData.formulaExpression.trim()) {
            errors.formulaExpression = 'Formula expression is required';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Transforms form data into clean API payload based on computation type
 * @param {object} formData
 * @returns {object} Clean API payload
 */
export function buildSalaryRulePayload(formData) {
    const payload = {
        structureId: formData.structureId,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        category: formData.category,
        sequenceOrder: Number(formData.sequenceOrder),
        computationType: formData.computationType,
        isActive: formData.isActive !== false,
    };

    if (formData.computationType === 'FIXED') {
        payload.fixedAmount = Number(formData.fixedAmount).toFixed(2);
        payload.percentageBaseCode = null;
        payload.percentageRate = null;
        payload.formulaExpression = null;
    } else if (formData.computationType === 'PERCENTAGE') {
        payload.fixedAmount = null;
        payload.percentageBaseCode = formData.percentageBaseCode.trim().toUpperCase();
        payload.percentageRate = Number(formData.percentageRate).toFixed(4);
        payload.formulaExpression = null;
    } else if (formData.computationType === 'FORMULA') {
        payload.fixedAmount = null;
        payload.percentageBaseCode = null;
        payload.percentageRate = null;
        payload.formulaExpression = formData.formulaExpression.trim();
    }

    return payload;
}
