import * as timeOffRequestService from '../services/timeOffRequest.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAllRequests(req, res, next) {
    try {
        const result = await timeOffRequestService.listRequests(req.query, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time off requests fetched successfully',
            data: result.requests,
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

export async function getRequestById(req, res, next) {
    try {
        const request = await timeOffRequestService.getRequestById(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time off request fetched successfully',
            data: request,
        });
    } catch (error) {
        next(error);
    }
}

export async function createRequest(req, res, next) {
    try {
        const created = await timeOffRequestService.createRequest(req.body, req.user);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Time off request submitted successfully',
            data: created,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateRequest(req, res, next) {
    try {
        const updated = await timeOffRequestService.updateRequest(
            req.params.id,
            req.body,
            req.user,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time off request updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteRequest(req, res, next) {
    try {
        const result = await timeOffRequestService.deleteRequest(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time off request deleted successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function approveRequest(req, res, next) {
    try {
        const result = await timeOffRequestService.approveRequest(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time off request approved and balance deducted successfully',
            data: result.request,
            allocation: result.allocation,
        });
    } catch (error) {
        next(error);
    }
}

export async function refuseRequest(req, res, next) {
    try {
        const refused = await timeOffRequestService.refuseRequest(
            req.params.id,
            req.user,
            req.body.reviewNotes,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time off request refused successfully',
            data: refused,
        });
    } catch (error) {
        next(error);
    }
}

export async function cancelRequest(req, res, next) {
    try {
        const result = await timeOffRequestService.cancelRequest(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Time off request cancelled and balance restored successfully',
            data: result.request,
            allocation: result.allocation,
        });
    } catch (error) {
        next(error);
    }
}
