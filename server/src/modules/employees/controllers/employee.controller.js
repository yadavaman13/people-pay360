import * as employeeService from '../services/employee.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

/**
 * Employee Controller — Core Handlers
 */

/**
 * Get current authenticated user's employee profile
 */
export async function getMe(req, res, next) {
    try {
        const employee = await employeeService.getEmployeeByUserId(req.user.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Employee profile fetched successfully',
            data: employee,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update current authenticated user's own employee personal details
 */
export async function updateMe(req, res, next) {
    try {
        const currentEmployee = await employeeService.getEmployeeByUserId(req.user.id);
        const updated = await employeeService.updateEmployeeProfile(
            currentEmployee.id,
            req.body,
            req.user,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Employee profile updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Onboard / create employee profile (self-onboarding or admin onboarding)
 */
export async function createEmployeeProfile(req, res, next) {
    try {
        const employee = await employeeService.createEmployeeProfile(req.body, req.user);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Employee profile created successfully',
            data: employee,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * List employees with filtering and pagination (HR / Admin)
 */
export async function listEmployees(req, res, next) {
    try {
        const result = await employeeService.listEmployees(req.query);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Employees fetched successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get single employee by ID
 */
export async function getEmployee(req, res, next) {
    try {
        const employee = await employeeService.getEmployeeById(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Employee profile fetched successfully',
            data: employee,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update employee by ID
 */
export async function updateEmployee(req, res, next) {
    try {
        const updated = await employeeService.updateEmployeeProfile(
            req.params.id,
            req.body,
            req.user,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Employee profile updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Soft delete (archive) employee
 */
export async function deleteEmployee(req, res, next) {
    try {
        const result = await employeeService.deleteEmployee(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Employee profile archived successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Payrun roster resolver for Step 2 wizard
 */
export async function getEmployeesForPayrun(req, res, next) {
    try {
        const { structureId, periodStart, periodEnd } = req.query;
        const roster = await employeeService.getEmployeesForPayrun(
            structureId,
            periodStart,
            periodEnd,
        );
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Eligible employees for payrun fetched successfully',
            data: roster,
        });
    } catch (error) {
        next(error);
    }
}
