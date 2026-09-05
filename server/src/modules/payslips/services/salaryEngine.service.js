import { evaluate } from 'mathjs';
import { AppError } from '../../../utils/appError.js';

/**
 * Salary Computation Engine
 */

/**
 * Calculate calendar days between periodStart and periodEnd (inclusive)
 * @param {string} periodStart - 'YYYY-MM-DD'
 * @param {string} periodEnd - 'YYYY-MM-DD'
 */
export function calculateCalendarDays(periodStart, periodEnd) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate worked days from attendance records
 * @param {Array<object>} attendanceData
 */
export function calculateWorkedDays(attendanceData = []) {
    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        return 0;
    }

    return attendanceData.reduce((total, record) => {
        if (record.status === 'HALF_DAY') return total + 0.5;
        if (record.status === 'ABSENT') return total;
        return total + 1;
    }, 0);
}

/**
 * Calculate unpaid leave days from approved time off requests
 * @param {Array<object>} timeOffData
 */
export function calculateUnpaidLeaveDays(timeOffData = []) {
    if (!Array.isArray(timeOffData) || timeOffData.length === 0) {
        return 0;
    }

    return timeOffData
        .filter((req) => req.timeOffType && req.timeOffType.paidTimeOff === false)
        .reduce((total, req) => total + parseFloat(req.numberOfDays || 0), 0);
}

/**
 * Safely evaluate formula expression using mathjs
 * @param {string} expression
 * @param {object} context
 */
export function evaluateFormula(expression, context) {
    if (!expression || typeof expression !== 'string') {
        throw new AppError('Formula expression is missing or invalid', 422);
    }

    try {
        // Evaluate expression using context variables
        const result = evaluate(expression, context);

        if (typeof result !== 'number' || isNaN(result)) {
            throw new AppError(
                `Formula "${expression}" did not produce a valid number result`,
                422,
            );
        }

        // Monetary amounts cannot be negative in rule evaluations
        return Number(Math.max(0, result).toFixed(2));
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(`Formula evaluation failed for "${expression}": ${err.message}`, 422);
    }
}

/**
 * Execute a single salary rule against the computation context
 * @param {object} rule
 * @param {object} context
 */
export function executeRule(rule, context) {
    const compType = rule.computationType.toUpperCase();

    switch (compType) {
        case 'FIXED': {
            const amount = parseFloat(rule.fixedAmount || 0);
            return Number(Math.max(0, amount).toFixed(2));
        }

        case 'PERCENTAGE': {
            const baseCode = (rule.percentageBaseCode || '').trim().toUpperCase();
            if (!baseCode) {
                throw new AppError(
                    `Rule "${rule.code}" has PERCENTAGE type but missing percentageBaseCode`,
                    422,
                );
            }

            const baseValue = context[baseCode];
            if (baseValue === undefined || baseValue === null) {
                throw new AppError(
                    `Rule "${rule.code}" references unknown base code "${baseCode}" in computation context`,
                    422,
                );
            }

            const rate = parseFloat(rule.percentageRate || 0);
            const amount = (parseFloat(baseValue) * rate) / 100;
            return Number(Math.max(0, amount).toFixed(2));
        }

        case 'FORMULA': {
            return evaluateFormula(rule.formulaExpression, context);
        }

        default:
            throw new AppError(`Unsupported computation type: ${rule.computationType}`, 422);
    }
}

/**
 * Compute payslip for an employee based on contract, attendance, time-off, and rules
 *
 * @param {object} params
 * @param {object} params.employee
 * @param {object} params.contract
 * @param {object} params.payrun
 * @param {Array<object>} params.attendanceData
 * @param {Array<object>} params.timeOffData
 * @param {Array<object>} params.rules
 */
export function computePayslip({
    employee,
    contract,
    payrun,
    attendanceData = [],
    timeOffData = [],
    rules = [],
}) {
    if (!contract || !contract.wage) {
        throw new AppError(
            `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) has no active contract wage`,
            422,
        );
    }

    if (!rules || rules.length === 0) {
        throw new AppError('Cannot compute payslip with zero salary rules', 422);
    }

    const wage = parseFloat(contract.wage);
    const periodDays = calculateCalendarDays(payrun.periodStart, payrun.periodEnd);
    const workedDays = calculateWorkedDays(attendanceData);
    const unpaidLeaveDays = calculateUnpaidLeaveDays(timeOffData);

    // Initial context available to rules
    const context = {
        WAGE: wage,
        CONTRACT_WAGE: wage,
        PERIOD_DAYS: periodDays,
        WORKED_DAYS: workedDays,
        UNPAID_LEAVE_DAYS: unpaidLeaveDays,
        EMPLOYEE_ID: employee.id,
    };

    const lines = [];

    // Sort rules strictly by sequenceOrder ASC
    const sortedRules = [...rules].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    for (const rule of sortedRules) {
        const amount = executeRule(rule, context);

        // Store into context for subsequent rules to reference
        context[rule.code] = amount;

        lines.push({
            salaryRuleId: rule.id,
            code: rule.code,
            name: rule.name,
            category: rule.category,
            sequenceOrder: rule.sequenceOrder,
            computationType: rule.computationType,
            fixedAmount: rule.fixedAmount,
            percentageBaseCode: rule.percentageBaseCode,
            percentageRate: rule.percentageRate,
            formulaExpression: rule.formulaExpression,
            amount,
        });
    }

    // Determine gross, deductions, net
    const grossLine = lines.find((l) => l.category === 'GROSS');
    const netLine = lines.find((l) => l.category === 'NET');

    const grossAmount = grossLine
        ? grossLine.amount
        : lines
              .filter((l) => ['BASIC', 'ALLOWANCE'].includes(l.category))
              .reduce((sum, l) => sum + l.amount, 0);

    const deductionAmount = lines
        .filter((l) => l.category === 'DEDUCTION')
        .reduce((sum, l) => sum + l.amount, 0);

    const netAmount = netLine ? netLine.amount : Math.max(0, grossAmount - deductionAmount);

    return {
        lines,
        grossAmount: Number(grossAmount.toFixed(2)),
        deductionAmount: Number(deductionAmount.toFixed(2)),
        netAmount: Number(netAmount.toFixed(2)),
        workedDays,
        contractWageSnapshot: wage,
    };
}
