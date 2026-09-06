import * as employeeDao from '../../../dao/employee.dao.js';
import * as bankAccountDao from '../../../dao/bankAccount.dao.js';
import {
    getUserById,
    getUserByEmail,
    createUser,
    recoverUser,
    updateUser,
} from '../../../dao/user.dao.js';
import { uploadImageOnImageKit } from '../../../services/image.service.js';
import { generateEmployeeCode } from '../../../utils/employeeCode.utils.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Employee Service — Business Logic for Employee Management & Self-Service
 */

/**
 * Onboard/Create an employee profile.
 * Can be called by an authenticated user for self-onboarding,
 * or by Admin/HR on behalf of a new or registered user.
 *
 * @param {object} data
 * @param {object} authenticatedUser
 */
export async function createEmployeeProfile(data, authenticatedUser) {
    const userRole = (authenticatedUser.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(userRole);

    let targetUserId = null;
    let targetUser = null;

    if (data.userId) {
        // 1. Explicit userId provided by privileged caller or linking flow
        targetUser = await getUserById(data.userId);
        if (!targetUser) {
            throw new AppError('Target user account does not exist', 404);
        }
        if (!targetUser.isActive) {
            throw new AppError('Cannot create employee profile for an inactive user account', 400);
        }
        const existingEmployee = await employeeDao.findEmployeeByUserId(data.userId);
        if (existingEmployee) {
            throw new AppError(
                'An employee profile is already registered for this user account',
                409,
            );
        }
        targetUserId = targetUser.id;
    } else if (!isPrivileged) {
        // 2. Regular user self-onboarding: only allowed for their own account
        targetUserId = authenticatedUser.id;
        targetUser = await getUserById(targetUserId);
        if (!targetUser) {
            throw new AppError('Target user account does not exist', 404);
        }
        if (!targetUser.isActive) {
            throw new AppError('Cannot create employee profile for an inactive user account', 400);
        }
        const existingEmployee = await employeeDao.findEmployeeByUserId(targetUserId);
        if (existingEmployee) {
            throw new AppError(
                'An employee profile is already registered for this user account',
                409,
            );
        }
    } else {
        // 3. Privileged user creating new employee profile without explicit userId
        const email = (data.email || '').toLowerCase().trim();
        if (email) {
            // Check if employee with this email already exists
            const existingEmpByEmail = await employeeDao.findEmployeeByEmail(email);
            if (existingEmpByEmail) {
                throw new AppError('An employee with this email address already exists', 409);
            }

            // Check if a user account exists with this email
            const existingUser = await getUserByEmail(email, true);
            if (existingUser) {
                if (existingUser.isDeleted) {
                    await recoverUser(existingUser.id);
                }
                const existingEmpForUser = await employeeDao.findEmployeeByUserId(existingUser.id);
                if (existingEmpForUser) {
                    throw new AppError(
                        'An employee profile is already registered for this user account',
                        409,
                    );
                }
                targetUser = existingUser;
                targetUserId = existingUser.id;
            } else {
                // Auto-provision user account for new employee
                try {
                    const newUser = await createUser({
                        firstName: (data.firstName || 'Employee').trim(),
                        lastName: (data.lastName || '').trim(),
                        email,
                        role: 'EMPLOYEE',
                        isActive: true,
                        emailVerified: false,
                    });
                    targetUser = newUser;
                    targetUserId = newUser.id;
                } catch (err) {
                    console.warn(
                        'Could not auto-provision user account for employee:',
                        err.message,
                    );
                    targetUserId = null;
                }
            }
        }
    }

    const firstName = (data.firstName || targetUser?.firstName || '').trim();
    const lastName = (data.lastName || targetUser?.lastName || '').trim();
    const email = (data.email || targetUser?.email || '').toLowerCase().trim();

    if (!firstName) {
        throw new AppError('First name is required', 422);
    }
    if (!email) {
        throw new AppError('Email is required', 422);
    }

    // 4. Generate unique employeeCode
    const hireDate = data.hireDate || new Date().toISOString().split('T')[0];
    const year = new Date(hireDate).getFullYear();
    const maxSeq = await employeeDao.getMaxEmployeeSequence(year);
    const sequenceNumber = maxSeq + 1;

    const employeeCode = generateEmployeeCode({
        firstName,
        lastName,
        email,
        year,
        sequenceNumber,
    });

    // 5. Construct employee record
    const newEmployeeData = {
        userId: targetUserId,
        employeeCode,
        firstName,
        lastName,
        email,
        phone: data.phone || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth || null,
        address: data.address || null,
        profileImage:
            data.profileImage ||
            targetUser?.profileImage ||
            'https://ik.imagekit.io/2bzzjhgkg/defaul_profile_image.jpeg',
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
                'An employee record with this user account, code, or email already exists',
                409,
            );
        }
        throw err;
    }

    // 6. Handle primary bank account creation atomically if provided
    const bankData = data.bankAccount || {
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountHolderName: data.accountHolderName || `${firstName} ${lastName}`.trim(),
        ifscCode: data.ifscCode,
        accountType: data.accountType || 'SAVINGS',
    };

    if (bankData.bankName && bankData.accountNumber) {
        try {
            await bankAccountDao.createBankAccount({
                employeeId: createdEmployee.id,
                bankName: bankData.bankName,
                accountNumber: bankData.accountNumber,
                accountHolderName: bankData.accountHolderName || `${firstName} ${lastName}`.trim(),
                ifscCode: bankData.ifscCode || null,
                accountType: (bankData.accountType || 'SAVINGS').toUpperCase(),
                isPrimary: true,
                isActive: true,
            });
        } catch (bankErr) {
            console.warn('Failed to auto-create bank account for employee:', bankErr.message);
        }
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
        'profileImage',
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

/**
 * Upload employee avatar to ImageKit and update employee profileImage
 * @param {string} id
 * @param {object} file
 * @param {object} authenticatedUser
 */
export async function uploadEmployeeAvatar(id, file, authenticatedUser) {
    const employee = await employeeDao.findEmployeeById(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    const uploaded = await uploadImageOnImageKit({ image: file });
    const imageUrl = uploaded.url;

    await employeeDao.updateEmployee(id, { profileImage: imageUrl });

    if (employee.userId) {
        await updateUser(employee.userId, { profileImage: imageUrl });
    }

    return {
        imageUrl,
        employee: await employeeDao.findEmployeeWithJoins(id),
    };
}
