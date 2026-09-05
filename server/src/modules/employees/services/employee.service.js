import * as employeeDao from '../../../dao/employee.dao.js';
import { getUserById } from '../../../dao/user.dao.js';
import { generateEmployeeCode } from '../../../utils/employeeCode.utils.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Employee Service — Business Logic for Employee Management & Self-Service
 */

/**
 * Onboard/Create an employee profile.
 * Can be called by an authenticated user for self-onboarding,
 * or by Admin/HR on behalf of a registered user.
 *
 * @param {object} data
 * @param {object} authenticatedUser
 */
export async function createEmployeeProfile(data, authenticatedUser) {
    const userRole = (authenticatedUser.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'HR_MANAGER'].includes(userRole);

    let targetUserId = authenticatedUser.id;
    if (isPrivileged && data.userId) {
        targetUserId = data.userId;
    }

    // 1. Verify target user exists and is active
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
        throw new AppError('Target user account does not exist', 404);
    }
    if (!targetUser.isActive) {
        throw new AppError('Cannot create employee profile for an inactive user account', 400);
    }

    // 2. Enforce 1:1 constraint — check if an employee profile already exists
    const existingEmployee = await employeeDao.findEmployeeByUserId(targetUserId);
    if (existingEmployee) {
        throw new AppError('An employee profile is already registered for this user account', 409);
    }

    // 3. Generate unique employeeCode
    const hireDate = data.hireDate || new Date().toISOString().split('T')[0];
    const year = new Date(hireDate).getFullYear();
    const maxSeq = await employeeDao.getMaxEmployeeSequence(year);
    const sequenceNumber = maxSeq + 1;

    const employeeCode = generateEmployeeCode({
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        year,
        sequenceNumber,
    });

    // 4. Construct employee record
    const newEmployeeData = {
        userId: targetUserId,
        employeeCode,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
        phone: data.phone || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth || null,
        address: data.address || null,
        hireDate,
        departmentId: isPrivileged ? data.departmentId || null : null,
        jobPositionId: isPrivileged ? data.jobPositionId || null : null,
        managerId: isPrivileged ? data.managerId || null : null,
        workingScheduleId: isPrivileged ? data.workingScheduleId || null : null,
        status: isPrivileged && data.status ? data.status.toUpperCase() : 'ACTIVE',
        isActive: true,
        notes: data.notes || null,
        createdBy: authenticatedUser.id,
    };

    let createdEmployee;
    try {
        createdEmployee = await employeeDao.createEmployee(newEmployeeData);
    } catch (err) {
        if (err.code === '23505') {
            throw new AppError(
                'An employee record with this user account or code already exists',
                409,
            );
        }
        throw err;
    }

    // Return enriched profile
    return employeeDao.findEmployeeWithJoins(createdEmployee.id);
}

/**
 * Get current user's employee profile (/api/employees/me)
 * @param {string} userId
 */
export async function getEmployeeByUserId(userId) {
    const employee = await employeeDao.findEmployeeWithJoinsByUserId(userId);
    if (!employee) {
        throw new AppError('No employee profile found for this user account', 404);
    }
    return employee;
}

/**
 * Get employee profile by ID with joins
 * @param {string} id
 * @param {object} authenticatedUser
 */
export async function getEmployeeById(id, authenticatedUser) {
    const employee = await employeeDao.findEmployeeWithJoins(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    const userRole = (authenticatedUser.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(
        userRole,
    );

    // Regular employee can only view their own employee profile
    if (!isPrivileged && employee.userId !== authenticatedUser.id) {
        throw new AppError('You do not have permission to view this employee profile', 403);
    }

    return employee;
}

/**
 * Update employee profile
 * @param {string} id
 * @param {object} updateData
 * @param {object} authenticatedUser
 */
export async function updateEmployeeProfile(id, updateData, authenticatedUser) {
    const employee = await employeeDao.findEmployeeById(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    const userRole = (authenticatedUser.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'HR_MANAGER'].includes(userRole);

    // Regular EMPLOYEE can only update their own personal info
    if (!isPrivileged) {
        if (employee.userId !== authenticatedUser.id) {
            throw new AppError('You do not have permission to update this employee profile', 403);
        }

        const allowedPersonalFields = ['phone', 'gender', 'dateOfBirth', 'address', 'notes'];
        const sanitized = {};
        for (const field of allowedPersonalFields) {
            if (updateData[field] !== undefined) {
                sanitized[field] = updateData[field];
            }
        }

        if (Object.keys(sanitized).length === 0) {
            return employeeDao.findEmployeeWithJoins(id);
        }

        await employeeDao.updateEmployee(id, sanitized);
        return employeeDao.findEmployeeWithJoins(id);
    }

    // HR_MANAGER / ADMIN can update job and organizational attributes
    const allowedFields = [
        'phone',
        'gender',
        'dateOfBirth',
        'address',
        'hireDate',
        'terminationDate',
        'departmentId',
        'jobPositionId',
        'managerId',
        'workingScheduleId',
        'status',
        'notes',
    ];

    const sanitized = {};
    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            sanitized[field] =
                field === 'status' && updateData[field]
                    ? updateData[field].toUpperCase()
                    : updateData[field];
        }
    }

    await employeeDao.updateEmployee(id, sanitized);
    return employeeDao.findEmployeeWithJoins(id);
}

/**
 * Soft delete employee
 * @param {string} id
 */
export async function deleteEmployee(id) {
    const employee = await employeeDao.findEmployeeById(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    const archived = await employeeDao.softDeleteEmployee(id);
    return {
        id: archived.id,
        employeeCode: archived.employeeCode,
        status: archived.status,
        isActive: archived.isActive,
    };
}

/**
 * Filter and list employees
 * @param {object} queryParams
 */
export async function listEmployees(queryParams) {
    return employeeDao.findEmployeesWithFilters(queryParams);
}

/**
 * Payrun roster resolver for Step 2 wizard
 * @param {string} structureId
 * @param {string} periodStart
 * @param {string} periodEnd
 */
export async function getEmployeesForPayrun(structureId, periodStart, periodEnd) {
    return employeeDao.getEmployeesForPayrun(structureId, periodStart, periodEnd);
}
