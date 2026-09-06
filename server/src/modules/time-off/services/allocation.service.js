import * as allocationDao from '../../../dao/allocation.dao.js';
import * as timeOffTypeDao from '../../../dao/timeOffType.dao.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import { AppError } from '../../../utils/appError.js';

export async function listAllocations(filters, user) {
    const queryFilters = { ...filters };

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee) {
            return {
                allocations: [],
                total: 0,
                page: queryFilters.page || 1,
                limit: queryFilters.limit || 50,
                totalPages: 0,
            };
        }
        queryFilters.employeeId = employee.id;
    }

    return allocationDao.findAllAllocations(queryFilters);
}

export async function getAllocationById(id, user) {
    const allocation = await allocationDao.findAllocationById(id);
    if (!allocation) {
        throw new AppError('Leave allocation not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee || allocation.employeeId !== employee.id) {
            throw new AppError('You are not authorized to view this allocation', 403);
        }
    }

    return allocation;
}

export async function createAllocation(data) {
    const employee = await employeeDao.findActiveEmployee(data.employeeId);
    if (!employee) {
        throw new AppError('Active employee not found', 404);
    }

    const type = await timeOffTypeDao.findTimeOffTypeById(data.typeId);
    if (!type || !type.isActive) {
        throw new AppError('Active leave type not found', 404);
    }

    if (data.totalDays <= 0) {
        throw new AppError('totalDays must be greater than 0', 422);
    }

    const created = await allocationDao.createAllocation({
        employeeId: data.employeeId,
        typeId: data.typeId,
        totalDays: data.totalDays,
        validityStart: data.validityStart,
        validityEnd: data.validityEnd,
        notes: data.notes,
    });

    return allocationDao.findAllocationById(created.id);
}

export async function updateAllocation(id, updates) {
    const existing = await allocationDao.findAllocationById(id);
    if (!existing) {
        throw new AppError('Leave allocation not found', 404);
    }

    if (existing.status !== 'PENDING') {
        throw new AppError(
            `Cannot update an allocation with status ${existing.status}. Only PENDING allocations can be modified.`,
            409,
        );
    }

    await allocationDao.updateAllocation(id, updates);
    return allocationDao.findAllocationById(id);
}

export async function deleteAllocation(id) {
    const existing = await allocationDao.findAllocationById(id);
    if (!existing) {
        throw new AppError('Leave allocation not found', 404);
    }

    if (existing.status !== 'PENDING') {
        throw new AppError(
            `Cannot delete an allocation with status ${existing.status}. Only PENDING allocations can be deleted.`,
            409,
        );
    }

    await allocationDao.deleteAllocation(id);
    return { id, isDeleted: true };
}

export async function approveAllocation(id, user) {
    const existing = await allocationDao.findAllocationById(id);
    if (!existing) {
        throw new AppError('Leave allocation not found', 404);
    }

    if (existing.status !== 'PENDING') {
        throw new AppError(`Cannot approve an allocation with status ${existing.status}`, 409);
    }

    const updated = await allocationDao.updateAllocationStatus(id, 'APPROVED', user.id);
    return allocationDao.findAllocationById(updated.id);
}

export async function refuseAllocation(id, user) {
    const existing = await allocationDao.findAllocationById(id);
    if (!existing) {
        throw new AppError('Leave allocation not found', 404);
    }

    if (existing.status !== 'PENDING') {
        throw new AppError(`Cannot refuse an allocation with status ${existing.status}`, 409);
    }

    const updated = await allocationDao.updateAllocationStatus(id, 'REFUSED', user.id);
    return allocationDao.findAllocationById(updated.id);
}

export async function getLeaveBalance(requestedEmployeeId, user) {
    let targetEmployeeId = requestedEmployeeId;

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee) {
            return [];
        }
        if (targetEmployeeId && targetEmployeeId !== employee.id) {
            throw new AppError('You can only view your own leave balance', 403);
        }
        targetEmployeeId = employee.id;
    } else if (!targetEmployeeId) {
        // HR or Admin without an explicit employeeId parameter: check if linked to an employee profile
        const selfEmployee = await employeeDao.findEmployeeByUserId(user.id);
        if (selfEmployee) {
            targetEmployeeId = selfEmployee.id;
        } else {
            return [];
        }
    }

    if (!targetEmployeeId) {
        return [];
    }

    return allocationDao.findEmployeeBalances(targetEmployeeId);
}
