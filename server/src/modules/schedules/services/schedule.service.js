import * as scheduleDao from '../../../dao/schedule.dao.js';
import { AppError } from '../../../utils/appError.js';

/**
 * Schedule Service
 */

export async function listSchedules(filters = {}) {
    return scheduleDao.findAllSchedules(filters);
}

export async function getScheduleById(id) {
    const schedule = await scheduleDao.findScheduleWithLines(id);
    if (!schedule) {
        throw new AppError('Working schedule not found', 404);
    }
    return schedule;
}

export async function createSchedule(data) {
    const existing = await scheduleDao.findScheduleByName(data.name.trim());
    if (existing) {
        throw new AppError('A working schedule with this name already exists', 409);
    }

    const newSchedule = await scheduleDao.createSchedule({
        name: data.name.trim(),
        description: data.description,
        timezone: data.timezone,
        isActive: data.isActive,
    });

    if (Array.isArray(data.lines) && data.lines.length > 0) {
        await scheduleDao.replaceScheduleLines(newSchedule.id, data.lines);
    }

    return scheduleDao.findScheduleWithLines(newSchedule.id);
}

export async function updateSchedule(id, updates) {
    const existing = await scheduleDao.findScheduleById(id);
    if (!existing) {
        throw new AppError('Working schedule not found', 404);
    }

    if (updates.name && updates.name.trim() !== existing.name) {
        const nameConflict = await scheduleDao.findScheduleByName(updates.name.trim());
        if (nameConflict && nameConflict.id !== id) {
            throw new AppError('A working schedule with this name already exists', 409);
        }
    }

    await scheduleDao.updateSchedule(id, updates);
    return scheduleDao.findScheduleWithLines(id);
}

export async function replaceScheduleLines(id, lines) {
    const existing = await scheduleDao.findScheduleById(id);
    if (!existing) {
        throw new AppError('Working schedule not found', 404);
    }

    const updatedLines = await scheduleDao.replaceScheduleLines(id, lines);
    const weeklyHours = scheduleDao.computeWeeklyHoursFromLines(updatedLines);

    return {
        scheduleId: id,
        lines: updatedLines,
        weeklyHours,
    };
}

export async function deleteSchedule(id) {
    const existing = await scheduleDao.findScheduleById(id);
    if (!existing) {
        throw new AppError('Working schedule not found', 404);
    }

    const inUse = await scheduleDao.checkScheduleInUse(id);
    if (inUse) {
        throw new AppError(
            'Cannot deactivate schedule: it is currently in use by active employees or contracts',
            409,
        );
    }

    await scheduleDao.softDeleteSchedule(id);
    return { id, isDeleted: true };
}

export async function getWeeklyHours(id) {
    const existing = await scheduleDao.findScheduleById(id);
    if (!existing) {
        throw new AppError('Working schedule not found', 404);
    }

    const weeklyHours = await scheduleDao.calculateWeeklyHours(id);
    return {
        scheduleId: id,
        scheduleName: existing.name,
        weeklyHours,
    };
}
