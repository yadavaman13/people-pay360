import * as timeOffTypeService from '../services/timeOffType.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAllTypes(req, res, next) {
    try {
        const { isActive } = req.query;
        const types = await timeOffTypeService.listTimeOffTypes({
            isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        });
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave types fetched successfully',
            data: types,
        });
    } catch (error) {
        next(error);
    }
}

export async function getTypeById(req, res, next) {
    try {
        const type = await timeOffTypeService.getTimeOffTypeById(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave type fetched successfully',
            data: type,
        });
    } catch (error) {
        next(error);
    }
}

export async function createType(req, res, next) {
    try {
        const created = await timeOffTypeService.createTimeOffType(req.body);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Leave type created successfully',
            data: created,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateType(req, res, next) {
    try {
        const updated = await timeOffTypeService.updateTimeOffType(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave type updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteType(req, res, next) {
    try {
        const result = await timeOffTypeService.deleteTimeOffType(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave type deactivated successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}
