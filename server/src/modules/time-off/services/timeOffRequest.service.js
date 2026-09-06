import * as timeOffRequestDao from '../../../dao/timeOffRequest.dao.js';
import * as timeOffTypeDao from '../../../dao/timeOffType.dao.js';
import * as allocationDao from '../../../dao/allocation.dao.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import { AppError } from '../../../utils/appError.js';
import { sendEmail } from '../../../services/mail/mail.service.js';
import { timeOffDecisionEmailTemplate } from '../../../templates/email.template.js';

/**
 * Calculate business days (Monday-Friday) between two dates inclusive
 */
export function calculateBusinessDays(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return count;
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

    // Strict business rules enforcement
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const start = new Date(data.startDate);
    start.setHours(0, 0, 0, 0);
    if (isNaN(start.getTime()) || start < tomorrow) {
        throw new AppError('Leave start date must be from tomorrow onwards', 422);
    }

    const end = new Date(data.endDate);
    end.setHours(0, 0, 0, 0);
    if (isNaN(end.getTime()) || end < start) {
        throw new AppError('endDate must be on or after startDate', 422);
    }

    const numberOfDays = calculateBusinessDays(data.startDate, data.endDate);
    if (numberOfDays <= 0) {
        throw new AppError('The selected date range contains no business days', 422);
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

async function dispatchDecisionEmail(request, status, reviewNotes) {
    try {
        const employeeEmail = request?.employee?.email;
        if (!employeeEmail) return;

        const employeeName =
            [request.employee?.firstName, request.employee?.lastName].filter(Boolean).join(' ') ||
            'Employee';

        const html = timeOffDecisionEmailTemplate({
            employeeName,
            status,
            typeName: request?.timeOffType?.name || 'Leave',
            startDate: request.startDate,
            endDate: request.endDate,
            numberOfDays: request.numberOfDays,
            reviewNotes: reviewNotes || request.reviewNotes,
        });

        await sendEmail({
            to: employeeEmail,
            subject: `Time Off Request ${status === 'APPROVED' ? 'Approved' : 'Refused'} - PeoplePay360`,
            html,
            text: `Your time off request for ${request?.timeOffType?.name || 'Leave'} (${request.startDate} to ${request.endDate}) has been ${status}.`,
        });
    } catch (err) {
        console.error(
            `[TimeOff] Failed to send decision email for request ${request?.id}:`,
            err?.message || err,
        );
    }
}

export async function approveRequest(id, user, reviewNotes) {
    const result = await timeOffRequestDao.approveRequestAtomic(id, user.id, reviewNotes);
    const fullRequest = await timeOffRequestDao.findRequestById(id);

    // Asynchronously dispatch decision notification email
    dispatchDecisionEmail(fullRequest, 'APPROVED', reviewNotes);

    return {
        request: fullRequest,
        allocation: result.allocation,
    };
}

export async function refuseRequest(id, user, reviewNotes) {
    const refused = await timeOffRequestDao.refuseRequest(id, user.id, reviewNotes);
    const fullRequest = await timeOffRequestDao.findRequestById(refused.id);

    // Asynchronously dispatch decision notification email
    dispatchDecisionEmail(fullRequest, 'REFUSED', reviewNotes);

    return fullRequest;
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
