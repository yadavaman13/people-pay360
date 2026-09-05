import * as timeOffTypeDao from '../../../dao/timeOffType.dao.js';
import { AppError } from '../../../utils/appError.js';

export async function listTimeOffTypes(filters = {}) {
    return timeOffTypeDao.findAllTimeOffTypes(filters);
}

export async function getTimeOffTypeById(id) {
    const type = await timeOffTypeDao.findTimeOffTypeById(id);
    if (!type) {
        throw new AppError('Leave type not found', 404);
    }
    return type;
}

export async function createTimeOffType(data) {
    const normalizedCode = data.code.trim().toUpperCase();
    const existing = await timeOffTypeDao.findTimeOffTypeByCode(normalizedCode);
    if (existing) {
        throw new AppError(`A leave type with code "${normalizedCode}" already exists`, 409);
    }

    return timeOffTypeDao.createTimeOffType({
        ...data,
        code: normalizedCode,
    });
}

export async function updateTimeOffType(id, updates) {
    const existing = await timeOffTypeDao.findTimeOffTypeById(id);
    if (!existing) {
        throw new AppError('Leave type not found', 404);
    }

    if (updates.code && updates.code.trim().toUpperCase() !== existing.code) {
        const inUse = await timeOffTypeDao.checkTypeInUse(id);
        if (inUse) {
            throw new AppError(
                'Cannot change the code of a leave type that is already in use',
                409,
            );
        }
        const codeConflict = await timeOffTypeDao.findTimeOffTypeByCode(
            updates.code.trim().toUpperCase(),
        );
        if (codeConflict && codeConflict.id !== id) {
            throw new AppError(
                `A leave type with code "${updates.code.trim().toUpperCase()}" already exists`,
                409,
            );
        }
        updates.code = updates.code.trim().toUpperCase();
    }

    return timeOffTypeDao.updateTimeOffType(id, updates);
}

export async function deleteTimeOffType(id) {
    const existing = await timeOffTypeDao.findTimeOffTypeById(id);
    if (!existing) {
        throw new AppError('Leave type not found', 404);
    }

    const inUse = await timeOffTypeDao.checkTypeInUse(id);
    if (inUse) {
        throw new AppError(
            'Cannot deactivate leave type: it is referenced by existing allocations or requests',
            409,
        );
    }

    await timeOffTypeDao.softDeleteTimeOffType(id);
    return { id, isDeleted: true };
}
