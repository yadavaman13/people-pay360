import * as contractDao from '../../../dao/contract.dao.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import { findStructureById } from '../../../dao/salaryStructure.dao.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Contract Service — Business logic for Employment Contracts
 */

/**
 * Create a new employment contract
 * @param {object} data
 * @param {object} user
 */
export async function createContract(data, user) {
    // 1. Verify employee exists and is active
    const employee = await employeeDao.findEmployeeById(data.employeeId);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }
    if (!employee.isActive) {
        throw new AppError('Cannot create contract for an inactive employee', 400);
    }

    // 2. Verify salary structure exists and is active
    const structure = await findStructureById(data.salaryStructureId);
    if (!structure) {
        throw new AppError('Salary structure not found', 404);
    }
    if (!structure.isActive) {
        throw new AppError('Cannot assign an inactive salary structure', 400);
    }

    const status = data.status ? data.status.toUpperCase() : 'DRAFT';

    // 3. Application-level overlap check for ACTIVE contracts
    if (status === 'ACTIVE') {
        const overlapping = await contractDao.findActiveOverlappingContracts(
            data.employeeId,
            data.startDate,
            data.endDate || null,
        );
        if (overlapping.length > 0) {
            throw new AppError('An active contract already covers this date range', 409);
        }
    }

    const contractData = {
        employeeId: data.employeeId,
        salaryStructureId: data.salaryStructureId,
        startDate: data.startDate,
        endDate: data.endDate || null,
        wage: String(data.wage),
        departmentId: data.departmentId || employee.departmentId || null,
        jobPositionId: data.jobPositionId || employee.jobPositionId || null,
        workingScheduleId: data.workingScheduleId || employee.workingScheduleId || null,
        status,
        maxPunchesPerDay: data.maxPunchesPerDay !== undefined ? Number(data.maxPunchesPerDay) : 3,
        notes: data.notes || null,
        createdBy: user.id,
    };

    let newContract;
    try {
        newContract = await contractDao.createContract(contractData);
    } catch (err) {
        // Catch PostgreSQL EXCLUDE constraint code 23P01 or unique collision
        if (err.code === '23P01' || err.code === '23505') {
            throw new AppError('An active contract already covers this date range', 409);
        }
        throw err;
    }

    return contractDao.findContractWithJoins(newContract.id);
}

/**
 * Get contract by ID with joins
 * @param {string} id
 * @param {object} user
 */
export async function getContractById(id, user) {
    const contract = await contractDao.findContractWithJoins(id);
    if (!contract) {
        throw new AppError('Contract not found', 404);
    }

    const userRole = (user.role || '').toUpperCase();
    const isPrivileged = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(
        userRole,
    );

    // If regular EMPLOYEE, verify employee ownership
    if (!isPrivileged) {
        const employee = await employeeDao.findEmployeeById(contract.employeeId);
        if (!employee || employee.userId !== user.id) {
            throw new AppError('You do not have permission to view this contract', 403);
        }
    }

    return contract;
}

/**
 * Update an existing contract
 * @param {string} id
 * @param {object} updateData
 * @param {object} [_user]
 */
export async function updateContract(id, updateData, _user) {
    const existing = await contractDao.findContractById(id);
    if (!existing) {
        throw new AppError('Contract not found', 404);
    }

    if (updateData.salaryStructureId) {
        const structure = await findStructureById(updateData.salaryStructureId);
        if (!structure || !structure.isActive) {
            throw new AppError('Salary structure not found or is inactive', 400);
        }
    }

    const targetStatus = updateData.status ? updateData.status.toUpperCase() : existing.status;
    const targetStartDate = updateData.startDate || existing.startDate;
    const targetEndDate =
        updateData.endDate !== undefined ? updateData.endDate || null : existing.endDate;

    // Check overlap if target status is ACTIVE
    if (targetStatus === 'ACTIVE') {
        const overlapping = await contractDao.findActiveOverlappingContracts(
            existing.employeeId,
            targetStartDate,
            targetEndDate,
            id,
        );
        if (overlapping.length > 0) {
            throw new AppError('An active contract already covers this date range', 409);
        }
    }

    const sanitized = {};
    const fields = [
        'startDate',
        'endDate',
        'wage',
        'salaryStructureId',
        'departmentId',
        'jobPositionId',
        'workingScheduleId',
        'status',
        'maxPunchesPerDay',
        'notes',
    ];

    for (const f of fields) {
        if (updateData[f] !== undefined) {
            if (f === 'wage') {
                sanitized[f] = String(updateData[f]);
            } else if (f === 'status' && updateData[f]) {
                sanitized[f] = updateData[f].toUpperCase();
            } else if (f === 'maxPunchesPerDay') {
                sanitized[f] = Number(updateData[f]);
            } else {
                sanitized[f] = updateData[f];
            }
        }
    }

    try {
        await contractDao.updateContract(id, sanitized);
    } catch (err) {
        if (err.code === '23P01' || err.code === '23505') {
            throw new AppError('An active contract already covers this date range', 409);
        }
        throw err;
    }

    return contractDao.findContractWithJoins(id);
}

/**
 * Activate a DRAFT contract
 * @param {string} id
 * @param {object} [_user]
 */
export async function activateContract(id, _user) {
    const existing = await contractDao.findContractById(id);
    if (!existing) {
        throw new AppError('Contract not found', 404);
    }

    if (existing.status !== 'DRAFT') {
        throw new AppError(
            `Cannot activate contract with status '${existing.status}'. Only DRAFT contracts can be activated.`,
            400,
        );
    }

    // Verify no active contract overlap
    const overlapping = await contractDao.findActiveOverlappingContracts(
        existing.employeeId,
        existing.startDate,
        existing.endDate,
        id,
    );
    if (overlapping.length > 0) {
        throw new AppError('An active contract already covers this date range', 409);
    }

    try {
        await contractDao.updateContract(id, { status: 'ACTIVE' });
    } catch (err) {
        if (err.code === '23P01' || err.code === '23505') {
            throw new AppError('An active contract already covers this date range', 409);
        }
        throw err;
    }

    return contractDao.findContractWithJoins(id);
}

/**
 * Cancel a contract
 * @param {string} id
 * @param {object} [_user]
 */
export async function cancelContract(id, _user) {
    const existing = await contractDao.findContractById(id);
    if (!existing) {
        throw new AppError('Contract not found', 404);
    }

    if (['CANCELLED', 'EXPIRED'].includes(existing.status)) {
        throw new AppError(`Contract is already ${existing.status}`, 400);
    }

    await contractDao.updateContract(id, { status: 'CANCELLED' });
    return contractDao.findContractWithJoins(id);
}

/**
 * Delete a contract (restricted to DRAFT contracts without payslips)
 * @param {string} id
 * @param {object} [_user]
 */
export async function deleteContract(id, _user) {
    const existing = await contractDao.findContractById(id);
    if (!existing) {
        throw new AppError('Contract not found', 404);
    }

    if (existing.status !== 'DRAFT') {
        throw new AppError(
            'Only DRAFT contracts can be deleted. For active or historical contracts, cancel them instead.',
            400,
        );
    }

    const hasPayslips = await contractDao.checkContractHasPayslips(id);
    if (hasPayslips) {
        throw new AppError('Cannot delete contract associated with existing payslips', 400);
    }

    await contractDao.deleteContract(id);
    return {
        id,
        message: 'Contract deleted successfully',
    };
}

/**
 * Filter and list contracts
 * @param {object} queryParams
 */
export async function listContracts(queryParams) {
    return contractDao.listContractsWithFilters(queryParams);
}
