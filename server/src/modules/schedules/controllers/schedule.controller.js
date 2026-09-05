import * as scheduleService from '../services/schedule.service.js';
import { sendResponse } from '../../../utils/response.utlis.js';

export async function getAllSchedules(req, res, next) {
    try {
        const { isActive } = req.query;
        const schedules = await scheduleService.listSchedules({
            isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        });
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Working schedules fetched successfully',
            data: schedules,
        });
    } catch (error) {
        next(error);
    }
}

export async function getScheduleById(req, res, next) {
    try {
        const schedule = await scheduleService.getScheduleById(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Working schedule fetched successfully',
            data: schedule,
        });
    } catch (error) {
        next(error);
    }
}

export async function createSchedule(req, res, next) {
    try {
        const newSchedule = await scheduleService.createSchedule(req.body);
        return sendResponse({
            res,
            statusCode: 201,
            success: true,
            message: 'Working schedule created successfully',
            data: newSchedule,
        });
    } catch (error) {
        next(error);
    }
}

export async function updateSchedule(req, res, next) {
    try {
        const updated = await scheduleService.updateSchedule(req.params.id, req.body);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Working schedule updated successfully',
            data: updated,
        });
    } catch (error) {
        next(error);
    }
}

export async function replaceScheduleLines(req, res, next) {
    try {
        const result = await scheduleService.replaceScheduleLines(req.params.id, req.body.lines);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Schedule lines replaced successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteSchedule(req, res, next) {
    try {
        const result = await scheduleService.deleteSchedule(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Working schedule deactivated successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

export async function getWeeklyHours(req, res, next) {
    try {
        const result = await scheduleService.getWeeklyHours(req.params.id);
        return sendResponse({
            res,
            statusCode: 200,
            success: true,
            message: 'Weekly hours calculated successfully',
            data: result,
        });
    } catch (error) {
        next(error);
    }
}
