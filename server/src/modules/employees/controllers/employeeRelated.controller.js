import * as contractDao from '../../../dao/contract.dao.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import { sendResponse } from '../../../utils/response.utlis.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Employee Related Resources Controller (Contracts, Applicable Period Contract Resolver)
 */

/**
 * Check if the caller is authorized to view the employee's records
 */
function checkEmployeeAccess(targetEmployee, user) {
    const userRole = (user.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(
        userRole,
    );

    if (!isPrivileged && targetEmployee.userId !== user.id) {
        throw new AppError('You do not have permission to view this employee data', 403);
    }
}

/**
 * Get all contracts for an employee (Contract history)
 */
export async function getEmployeeContracts(req, res, next) {
    try {
        const employee = await employeeDao.findEmployeeById(req.params.id);
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        checkEmployeeAccess(employee, req.user);

        const contracts = await contractDao.findContractsByEmployeeId(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Employee contracts fetched successfully',
            data: contracts,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get current active contract for an employee
 */
export async function getActiveContract(req, res, next) {
    try {
        const employee = await employeeDao.findEmployeeById(req.params.id);
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        checkEmployeeAccess(employee, req.user);

        const contract = await contractDao.findActiveContractByEmployee(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Active contract fetched successfully',
            data: contract || null,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get applicable contract for an employee in a specific payroll period
 */
export async function getApplicableContract(req, res, next) {
    try {
        const { periodStart, periodEnd } = req.query;
        const employee = await employeeDao.findEmployeeById(req.params.id);
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        checkEmployeeAccess(employee, req.user);

        let contract;
        try {
            contract = await contractDao.getApplicableContract(
                req.params.id,
                periodStart,
                periodEnd,
            );
        } catch (err) {
            if (err.message && err.message.startsWith('CONFLICT:')) {
                throw new AppError(err.message, 409);
            }
            throw err;
        }

        if (!contract) {
            throw new AppError(
                `No active contract found for employee ${req.params.id} in period ${periodStart} to ${periodEnd}`,
                422,
            );
        }

        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Applicable contract fetched successfully',
            data: contract,
        });
    } catch (error) {
        next(error);
    }
}
