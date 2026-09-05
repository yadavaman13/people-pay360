import * as attendanceService from '../services/attendance.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAttendanceList(req, res, next) {
    try {
        const result = await attendanceService.listAttendance(req.query, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Attendance records fetched successfully',
            data: result.records,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function getAttendanceById(req, res, next) {
    try {
        const record = await attendanceService.getAttendanceById(req.params.id, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Attendance record fetched successfully',
            data: record,
        });
    } catch (error) {
        next(error);
    }
}

export async function getTodayStatus(req, res, next) {
    try {
        const result = await attendanceService.getTodayStatus(req.user, req.query.employeeId);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Today attendance status fetched successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function checkIn(req, res, next) {
    try {
        const record = await attendanceService.checkIn(req.user, req.body);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Checked in successfully',
            data: record,
        });
    } catch (error) {
        next(error);
    }
}

export async function checkOut(req, res, next) {
    try {
        const record = await attendanceService.checkOut(req.params.id, req.user, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Checked out successfully',
            data: record,
        });
    } catch (error) {
        next(error);
    }
}

export async function manualCorrection(req, res, next) {
    try {
        const record = await attendanceService.manualCorrection(req.params.id, req.body, req.user);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Attendance record corrected successfully',
            data: record,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteAttendance(req, res, next) {
    try {
        const result = await attendanceService.deleteAttendance(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Attendance record deleted successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function getSummaryStats(req, res, next) {
    try {
        const result = await attendanceService.getAttendanceSummary(req.query);
        // result = { stats: [{status, count, totalWorkedHours}], missingCheckoutCount }
        const stats = result?.stats ?? result ?? [];
        const missingCheckoutCount = result?.missingCheckoutCount ?? 0;
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Attendance summary stats fetched successfully',
            data: {
                stats,
                missingCheckoutCount,
            },
        });
    } catch (error) {
        next(error);
    }
}
