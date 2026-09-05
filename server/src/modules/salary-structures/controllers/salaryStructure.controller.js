import * as salaryStructureService from '../services/salaryStructure.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAllSalaryStructures(req, res, next) {
    try {
        const { isActive, search, page, limit } = req.query;
        const result = await salaryStructureService.listSalaryStructures({
            isActive: isActive !== undefined ? Boolean(isActive) : undefined,
            search,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });

        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary structures retrieved successfully',
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
}

export async function getSalaryStructureById(req, res, next) {
    try {
        const structure = await salaryStructureService.getSalaryStructureById(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary structure retrieved successfully',
            data: structure,
        });
    } catch (error) {
        next(error);
    }
}

export async function createSalaryStructure(req, res, next) {
    try {
        const created = await salaryStructureService.createSalaryStructure(req.body);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Salary structure created successfully',
            data: created,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateSalaryStructure(req, res, next) {
    try {
        const updated = await salaryStructureService.updateSalaryStructure(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary structure updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteSalaryStructure(req, res, next) {
    try {
        const deleted = await salaryStructureService.deleteSalaryStructure(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary structure deactivated successfully',
            data: deleted,
        });
    } catch (error) {
        next(error);
    }
}

export async function getStructureRules(req, res, next) {
    try {
        const rules = await salaryStructureService.getRulesByStructureId(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Structure salary rules retrieved successfully',
            data: rules,
        });
    } catch (error) {
        next(error);
    }
}

export async function addRuleToStructure(req, res, next) {
    try {
        const rule = await salaryStructureService.addRuleToStructure(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Salary rule added to structure successfully',
            data: rule,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateRuleInStructure(req, res, next) {
    try {
        const updated = await salaryStructureService.updateRuleInStructure(
            req.params.id,
            req.params.ruleId,
            req.body,
        );
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

export async function removeRuleFromStructure(req, res, next) {
    try {
        const deleted = await salaryStructureService.removeRuleFromStructure(
            req.params.id,
            req.params.ruleId,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Salary rule removed from structure successfully',
            data: deleted,
        });
    } catch (error) {
        next(error);
    }
}
