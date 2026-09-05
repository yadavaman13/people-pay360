import * as payslipService from '../services/payslip.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAllPayslips(req, res, next) {
    try {
        const { payrunId, employeeId, status, page, limit } = req.query;
        const result = await payslipService.listPayslips(
            {
                payrunId,
                employeeId,
                status,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
            },
            req.user,
        );

        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payslips retrieved successfully',
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error) {
        next(error);
    }
}

export async function getPayslipById(req, res, next) {
    try {
        const payslip = await payslipService.getPayslipById(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payslip retrieved successfully',
            data: payslip,
        });
    } catch (error) {
        next(error);
    }
}

export async function getPayslipLines(req, res, next) {
    try {
        const lines = await payslipService.getPayslipLines(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payslip breakdown lines retrieved successfully',
            data: lines,
        });
    } catch (error) {
        next(error);
    }
}

export async function updatePayslip(req, res, next) {
    try {
        const updated = await payslipService.updatePayslip(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payslip updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function deletePayslip(req, res, next) {
    try {
        const deleted = await payslipService.deletePayslip(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payslip deleted successfully',
            data: deleted,
        });
    } catch (error) {
        next(error);
    }
}

export async function recomputePayslip(req, res, next) {
    try {
        const recomputed = await payslipService.recomputeSinglePayslip(
            req.params.id,
            req.user?.id || null,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Payslip recomputed successfully with fresh attendance and rule evaluations',
            data: recomputed,
        });
    } catch (error) {
        next(error);
    }
}
