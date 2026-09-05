import * as timeOffRequestDao from '../../../dao/timeOffRequest.dao.js';
import * as timeOffTypeDao from '../../../dao/timeOffType.dao.js';
import * as allocationDao from '../../../dao/allocation.dao.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Calculate business days (Monday-Friday) between two dates inclusive
 */
export function calculateBusinessDays(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    let count = 0;
    const cur = new Date(start);

    while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return Math.max(1, count);
}

/**
 * Resolve employee ID for request submission
 */
async function resolveEmployeeForRequest(user, explicitEmployeeId) {
    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee) {
            throw new AppError('No active employee profile linked to your user account', 403);
        }
        return employee;
    }

    if (!explicitEmployeeId) {
        const selfEmployee = await employeeDao.findEmployeeByUserId(user.id);
        if (selfEmployee) return selfEmployee;
        throw new AppError('employeeId is required for this operation', 422);
    }

    const employee = await employeeDao.findActiveEmployee(explicitEmployeeId);
    if (!employee) {
        throw new AppError('Active employee not found', 404);
    }
    return employee;
}

export async function listRequests(filters, user) {
    const queryFilters = { ...filters };

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee) {
            return {
                requests: [],
                total: 0,
                page: queryFilters.page || 1,
                limit: queryFilters.limit || 50,
                totalPages: 0,
            };
        }
        queryFilters.employeeId = employee.id;
    }

    return timeOffRequestDao.findAllRequests(queryFilters);
}

export async function getRequestById(id, user) {
    const request = await timeOffRequestDao.findRequestById(id);
    if (!request) {
        throw new AppError('Time off request not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee || request.employeeId !== employee.id) {
            throw new AppError('You are not authorized to view this request', 403);
        }
    }

    return request;
}

export async function createRequest(data, user) {
    const employee = await resolveEmployeeForRequest(user, data.employeeId);

    const type = await timeOffTypeDao.findTimeOffTypeById(data.typeId);
    if (!type || !type.isActive) {
        throw new AppError('Active leave type not found', 404);
    }

    if (data.startDate > data.endDate) {
        throw new AppError('startDate must be on or before endDate', 422);
    }

    const numberOfDays =
        data.numberOfDays !== undefined
            ? Number(data.numberOfDays)
            : calculateBusinessDays(data.startDate, data.endDate);

    if (numberOfDays <= 0) {
        throw new AppError('numberOfDays must be greater than 0', 422);
    }

    if (type.maxDaysPerRequest && numberOfDays > type.maxDaysPerRequest) {
        throw new AppError(
            `numberOfDays (${numberOfDays}) exceeds max allowed per request (${type.maxDaysPerRequest}) for this leave type`,
            422,
        );
    }

    // Check for overlapping approved requests
    const hasOverlap = await timeOffRequestDao.hasOverlappingApprovedRequests(
        employee.id,
        data.startDate,
        data.endDate,
    );
    if (hasOverlap) {
        throw new AppError('You already have an approved leave request covering these dates', 409);
    }

    let matchedAllocationId = null;

    if (type.allocationRequired) {
        const allocation = await allocationDao.findActiveApprovedAllocation(
            employee.id,
            type.id,
            data.startDate,
        );

        if (!allocation) {
            throw new AppError(
                'No approved leave allocation found for this leave type and date window',
                409,
            );
        }

        const remaining =
            parseFloat(allocation.totalDays || 0) - parseFloat(allocation.usedDays || 0);
        if (remaining < numberOfDays) {
            throw new AppError(
                `Insufficient leave balance. Remaining: ${remaining.toFixed(2)} days, Requested: ${numberOfDays} days`,
                409,
            );
        }

        matchedAllocationId = allocation.id;
    }

    const created = await timeOffRequestDao.createRequest({
        employeeId: employee.id,
        typeId: type.id,
        allocationId: matchedAllocationId,
        startDate: data.startDate,
        endDate: data.endDate,
        numberOfDays,
        reason: data.reason,
    });

    return timeOffRequestDao.findRequestById(created.id);
}

export async function updateRequest(id, updates, user) {
    const existing = await timeOffRequestDao.findRequestById(id);
    if (!existing) {
        throw new AppError('Time off request not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee || existing.employeeId !== employee.id) {
            throw new AppError('You are not authorized to update this request', 403);
        }
    }

    if (existing.status !== 'PENDING') {
        throw new AppError(
            `Cannot update a request with status ${existing.status}. Only PENDING requests can be modified.`,
            409,
        );
    }

    await timeOffRequestDao.updateRequest(id, updates);
    return timeOffRequestDao.findRequestById(id);
}

export async function deleteRequest(id, user) {
    const existing = await timeOffRequestDao.findRequestById(id);
    if (!existing) {
        throw new AppError('Time off request not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee || existing.employeeId !== employee.id) {
            throw new AppError('You are not authorized to delete this request', 403);
        }
    }

    if (existing.status !== 'PENDING') {
        throw new AppError(
            `Cannot delete a request with status ${existing.status}. Only PENDING requests can be deleted.`,
            409,
        );
    }

    await timeOffRequestDao.deleteRequest(id);
    return { id, isDeleted: true };
}

export async function approveRequest(id, user) {
    const result = await timeOffRequestDao.approveRequestAtomic(id, user.id);
    const fullRequest = await timeOffRequestDao.findRequestById(id);
    return {
        request: fullRequest,
        allocation: result.allocation,
    };
}

export async function refuseRequest(id, user, reviewNotes) {
    const refused = await timeOffRequestDao.refuseRequest(id, user.id, reviewNotes);
    return timeOffRequestDao.findRequestById(refused.id);
}

export async function cancelRequest(id, user) {
    const existing = await timeOffRequestDao.findRequestById(id);
    if (!existing) {
        throw new AppError('Time off request not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee || existing.employeeId !== employee.id) {
            throw new AppError('You are not authorized to cancel this request', 403);
        }
    }

    const result = await timeOffRequestDao.cancelRequestAtomic(id, user.id);
    const fullRequest = await timeOffRequestDao.findRequestById(id);
    return {
        request: fullRequest,
        allocation: result.allocation,
    };
}

export async function getApprovedTimeOff(employeeId, periodStart, periodEnd) {
    return timeOffRequestDao.getApprovedTimeOff(employeeId, periodStart, periodEnd);
}
