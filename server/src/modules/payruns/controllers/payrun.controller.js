import * as payrunService from '../services/payrun.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function wizardValidate(req, res, next) {
    try {
        const result = await payrunService.validateWizardScope(req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payrun wizard validation completed successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function createPayrun(req, res, next) {
    try {
        const created = await payrunService.createPayrun(req.body, req.user?.id || null);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Payrun created successfully',
            data: created,
        });
    } catch (error) {
        next(error);
    }
}

export async function getAllPayruns(req, res, next) {
    try {
        const { status, periodStart, periodEnd, structureId, page, limit } = req.query;
        const result = await payrunService.listPayruns({
            status,
            periodStart,
            periodEnd,
            structureId,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20,
        });

        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payruns fetched successfully',
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
}

export async function getPayrunById(req, res, next) {
    try {
        const payrun = await payrunService.getPayrunById(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payrun fetched successfully',
            data: payrun,
        });
    } catch (error) {
        next(error);
    }
}

export async function updatePayrun(req, res, next) {
    try {
        const updated = await payrunService.updatePayrun(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payrun updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function deletePayrun(req, res, next) {
    try {
        const deleted = await payrunService.deletePayrun(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payrun deleted successfully',
            data: deleted,
        });
    } catch (error) {
        next(error);
    }
}

export async function computePayrun(req, res, next) {
    try {
        const result = await payrunService.computePayrun(req.params.id, req.user?.id || null);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payrun computed successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function markPayrunAsPaid(req, res, next) {
    try {
        const { paymentDate } = req.body;
        const updated = await payrunService.markPayrunAsPaid(
            req.params.id,
            req.user?.id || null,
            paymentDate,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payrun marked as paid successfully. Financial settlement recorded.',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}
