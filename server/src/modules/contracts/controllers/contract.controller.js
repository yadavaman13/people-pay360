import * as contractService from '../services/contract.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

/**
 * Contract Controller — CRUD & Status Transitions
 */

/**
 * Create a new contract
 */
export async function createContract(req, res, next) {
    try {
        const contract = await contractService.createContract(req.body, req.user);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Contract created successfully',
            data: contract,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * List contracts with filtering and pagination
 */
export async function listContracts(req, res, next) {
    try {
        const result = await contractService.listContracts(req.query);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Contracts fetched successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get contract by ID with joins
 */
export async function getContract(req, res, next) {
    try {
        const contract = await contractService.getContractById(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Contract fetched successfully',
            data: contract,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update contract
 */
export async function updateContract(req, res, next) {
    try {
        const updated = await contractService.updateContract(req.params.id, req.body, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Contract updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Activate a DRAFT contract
 */
export async function activateContract(req, res, next) {
    try {
        const activated = await contractService.activateContract(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Contract activated successfully',
            data: activated,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Cancel a contract
 */
export async function cancelContract(req, res, next) {
    try {
        const cancelled = await contractService.cancelContract(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Contract cancelled successfully',
            data: cancelled,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete a DRAFT contract (admin only, no payslips)
 */
export async function deleteContract(req, res, next) {
    try {
        const result = await contractService.deleteContract(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Contract deleted successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}
