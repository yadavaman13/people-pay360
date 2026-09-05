import * as allocationService from '../services/allocation.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAllAllocations(req, res, next) {
    try {
        const result = await allocationService.listAllocations(req.query, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave allocations fetched successfully',
            data: result.allocations,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function getAllocationById(req, res, next) {
    try {
        const allocation = await allocationService.getAllocationById(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave allocation fetched successfully',
            data: allocation,
        });
    } catch (error) {
        next(error);
    }
}

export async function createAllocation(req, res, next) {
    try {
        const created = await allocationService.createAllocation(req.body);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Leave allocation created successfully',
            data: created,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateAllocation(req, res, next) {
    try {
        const updated = await allocationService.updateAllocation(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave allocation updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAllocation(req, res, next) {
    try {
        const result = await allocationService.deleteAllocation(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave allocation deleted successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function approveAllocation(req, res, next) {
    try {
        const approved = await allocationService.approveAllocation(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave allocation approved successfully',
            data: approved,
        });
    } catch (error) {
        next(error);
    }
}

export async function refuseAllocation(req, res, next) {
    try {
        const refused = await allocationService.refuseAllocation(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave allocation refused successfully',
            data: refused,
        });
    } catch (error) {
        next(error);
    }
}

export async function getLeaveBalance(req, res, next) {
    try {
        const employeeId = req.params.employeeId || req.query.employeeId;
        const balances = await allocationService.getLeaveBalance(employeeId, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Leave balances fetched successfully',
            data: balances,
        });
    } catch (error) {
        next(error);
    }
}
