import * as attendanceDao from '../../../dao/attendance.dao.js';
import * as scheduleDao from '../../../dao/schedule.dao.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Helper to get current calendar date string in YYYY-MM-DD
 * Uses Asia/Kolkata timezone by default
 */
export function getTodayDateString(timezone = 'Asia/Kolkata') {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(new Date());
}

/**
 * Resolve employee ID for a request
 * If user is EMPLOYEE role, looks up linked employee record
 */
async function resolveEmployeeForUser(user, explicitEmployeeId) {
    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee) {
            throw new AppError('No active employee profile linked to your user account', 403);
        }
        return employee;
    }

    if (!explicitEmployeeId) {
        // HR checking in/out themselves if they have an employee record
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

/**
 * Determine status based on schedule line and actual work times
 */
async function evaluateAttendanceStatus(employee, checkInTime, checkOutTime, workedHours) {
    if (!employee.workingScheduleId) {
        return 'PRESENT';
    }

    const lines = await scheduleDao.findLinesByScheduleId(employee.workingScheduleId);
    if (!lines || lines.length === 0) {
        return 'PRESENT';
    }

    // day of week: 0 = Sun, 1 = Mon ...
    const checkInDate = new Date(checkInTime);
    const dayOfWeek = checkInDate.getDay();
    const scheduleLine = lines.find((l) => Number(l.dayOfWeek) === dayOfWeek);

    if (!scheduleLine) {
        return 'PRESENT';
    }

    const expectedStartMins = scheduleDao.timeStringToMinutes(scheduleLine.startTime);
    const expectedEndMins = scheduleDao.timeStringToMinutes(scheduleLine.endTime);
    const breakMins = Number(scheduleLine.breakMinutes || 0);
    const dailyExpectedHours = Math.max(0, expectedEndMins - expectedStartMins - breakMins) / 60;

    // Actual check-in in local minutes from midnight
    const actualCheckInMins = checkInDate.getHours() * 60 + checkInDate.getMinutes();

    let status = 'PRESENT';
    // 15-minute grace period
    if (actualCheckInMins > expectedStartMins + 15) {
        status = 'LATE';
    }

    // If worked less than half expected daily hours -> HALF_DAY
    if (dailyExpectedHours > 0 && workedHours < dailyExpectedHours / 2) {
        status = 'HALF_DAY';
    }

    return status;
}

/**
 * Check In
 */
export async function checkIn(user, body = {}) {
    const employee = await resolveEmployeeForUser(user, body.employeeId);
    const today = getTodayDateString();

    const existingRecord = await attendanceDao.findAttendanceByDate(employee.id, today);
    if (existingRecord && existingRecord.checkInTime) {
        throw new AppError('Already checked in for today', 409);
    }

    const newRecord = await attendanceDao.createCheckIn({
        employeeId: employee.id,
        attendanceDate: today,
        checkInTime: new Date(),
        status: 'PRESENT',
        notes: body.notes,
    });

    return attendanceDao.findAttendanceById(newRecord.id);
}

/**
 * Check Out
 */
export async function checkOut(attendanceId, user, body = {}) {
    let record = await attendanceDao.findAttendanceById(attendanceId);
    if (!record) {
        throw new AppError('Attendance record not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        const emp = await employeeDao.findEmployeeByUserId(user.id);
        if (!emp || emp.id !== record.employeeId) {
            throw new AppError('You are not authorized to check out for this employee', 403);
        }
    }

    if (!record.checkInTime) {
        throw new AppError('Cannot check out without a check-in timestamp', 409);
    }

    if (record.checkOutTime) {
        throw new AppError('Already checked out for this attendance record', 409);
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(record.checkInTime);
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const workedHours = Number((Math.max(0, diffMs) / (1000 * 60 * 60)).toFixed(2));

    const employee = await employeeDao.findEmployeeById(record.employeeId);
    const evaluatedStatus = await evaluateAttendanceStatus(
        employee,
        checkInTime,
        checkOutTime,
        workedHours,
    );

    const updated = await attendanceDao.updateCheckOut(attendanceId, {
        checkOutTime,
        workedHours,
        status: evaluatedStatus,
        notes: body.notes !== undefined ? body.notes : record.notes,
    });

    return attendanceDao.findAttendanceById(updated.id);
}

/**
 * Manual Correction by HR
 */
export async function manualCorrection(attendanceId, correctionData, user) {
    const record = await attendanceDao.findAttendanceById(attendanceId);
    if (!record) {
        throw new AppError('Attendance record not found', 404);
    }

    const checkInTime = correctionData.checkInTime
        ? new Date(correctionData.checkInTime)
        : record.checkInTime
          ? new Date(record.checkInTime)
          : null;
    const checkOutTime = correctionData.checkOutTime
        ? new Date(correctionData.checkOutTime)
        : record.checkOutTime
          ? new Date(record.checkOutTime)
          : null;

    let workedHours = correctionData.workedHours;
    if (workedHours === undefined && checkInTime && checkOutTime) {
        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
        workedHours = Number((Math.max(0, diffMs) / (1000 * 60 * 60)).toFixed(2));
    }

    const updated = await attendanceDao.manualCorrect(attendanceId, {
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        workedHours: workedHours !== undefined ? workedHours : record.workedHours,
        status: correctionData.status || record.status,
        correctionReason: correctionData.correctionReason,
        correctedBy: user.id,
        notes: correctionData.notes !== undefined ? correctionData.notes : record.notes,
    });

    return attendanceDao.findAttendanceById(updated.id);
}

/**
 * Delete Attendance Record
 */
export async function deleteAttendance(attendanceId) {
    const record = await attendanceDao.findAttendanceById(attendanceId);
    if (!record) {
        throw new AppError('Attendance record not found', 404);
    }

    await attendanceDao.deleteAttendance(attendanceId);
    return { id: attendanceId, isDeleted: true };
}

/**
 * List attendance records with role scoping
 */
export async function listAttendance(filters, user) {
    const queryFilters = { ...filters };

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee) {
            return {
                records: [],
                total: 0,
                page: queryFilters.page || 1,
                limit: queryFilters.limit || 50,
                totalPages: 0,
            };
        }
        queryFilters.employeeId = employee.id;
    }

    return attendanceDao.findAttendanceList(queryFilters);
}

/**
 * Get single attendance record with role scoping
 */
export async function getAttendanceById(id, user) {
    const record = await attendanceDao.findAttendanceById(id);
    if (!record) {
        throw new AppError('Attendance record not found', 404);
    }

    if (user.role === 'EMPLOYEE') {
        const employee = await employeeDao.findEmployeeByUserId(user.id);
        if (!employee || record.employeeId !== employee.id) {
            throw new AppError('You are not authorized to view this attendance record', 403);
        }
    }

    return record;
}

/**
 * Export for Dev 3 / Dev 4: Attendance for period
 */
export async function getAttendanceForPeriod(employeeId, periodStart, periodEnd) {
    return attendanceDao.getAttendanceForPeriod(employeeId, periodStart, periodEnd);
}

/**
 * Export for Dev 4: Summary stats
 */
export async function getAttendanceSummary(filters) {
    return attendanceDao.getSummaryStats(filters);
}
