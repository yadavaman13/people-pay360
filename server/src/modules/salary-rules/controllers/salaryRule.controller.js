import * as salaryRuleService from '../services/salaryRule.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAllSalaryRules(req, res, next) {
    try {
        const { structureId, category, isActive, page, limit } = req.query;
        const result = await salaryRuleService.listSalaryRules({
            structureId,
            category,
            isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });

        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary rules retrieved successfully',
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
}

export async function getSalaryRuleById(req, res, next) {
    try {
        const rule = await salaryRuleService.getSalaryRuleById(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary rule retrieved successfully',
            data: rule,
        });
    } catch (error) {
        next(error);
    }
}

export async function createSalaryRule(req, res, next) {
    try {
        const created = await salaryRuleService.createSalaryRule(req.body);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Salary rule created successfully',
            data: created,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateSalaryRule(req, res, next) {
    try {
        const updated = await salaryRuleService.updateSalaryRule(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary rule updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteSalaryRule(req, res, next) {
    try {
        const deleted = await salaryRuleService.deleteSalaryRule(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary rule deleted successfully',
            data: deleted,
        });
    } catch (error) {
        next(error);
    }
}
