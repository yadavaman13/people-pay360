import * as attendanceDao from '../../../dao/attendance.dao.js';
import * as scheduleDao from '../../../dao/schedule.dao.js';
import * as employeeDao from '../../../dao/employee.dao.js';
import * as contractDao from '../../../dao/contract.dao.js';
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
 * Resolve maximum allowed daily punches for an employee based on their applicable contract
 * Default fallback is 3.
 */
export async function resolveMaxDailyPunches(employeeId, dateStr) {
    try {
        const contract =
            (await contractDao.getApplicableContract(employeeId, dateStr, dateStr)) ||
            (await contractDao.findActiveContractByEmployee(employeeId));
        if (
            contract &&
            contract.maxPunchesPerDay !== undefined &&
            contract.maxPunchesPerDay !== null
        ) {
            return Number(contract.maxPunchesPerDay);
        }
    } catch {
        // Fallback gracefully on query error
    }
    return 3;
}

// ─── Constants ────────────────────────────────────────────────────────────────
/** Grace period (minutes) past scheduled end before we treat a session as MISSING_CHECKOUT */
const OVERTIME_GRACE_MINUTES = 60;
/** Default shift length (hours) when an employee has no workingScheduleId */
const DEFAULT_SHIFT_HOURS = 8;

/**
 * Classify whether an open (un-checked-out) punch is OVERTIME or MISSING_CHECKOUT.
 *
 * Rules:
 *  - If the punch's attendanceDate is a PAST calendar date  → always MISSING_CHECKOUT
 *  - If the punch is from TODAY and current time ≤ scheduleEnd + OVERTIME_GRACE_MINUTES → OVERTIME
 *  - Otherwise (same day but very overdue, or no schedule + > DEFAULT_SHIFT_HOURS elapsed) → MISSING_CHECKOUT
 *
 * @param {object} punch            - raw punch row with checkInTime, attendanceDate
 * @param {object} employee         - employee row with workingScheduleId
 * @param {string} todayDate        - 'YYYY-MM-DD' string for today
 * @returns {{ classification: 'OVERTIME'|'MISSING_CHECKOUT', estimatedWorkedHours: number, estimatedCheckOutTime: Date }}
 */
export async function classifyOpenPunch(punch, employee, todayDate) {
    const punchDate =
        punch.attendanceDate ||
        new Date(punch.checkInTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const isPastDay = punchDate < todayDate;
    const now = new Date();
    const checkInTime = new Date(punch.checkInTime);

    // ── Fetch schedule line for that day ──────────────────────────────────────
    let scheduleEndMinutes = null; // minutes from midnight
    let breakMinutes = 0;

    if (employee.workingScheduleId) {
        try {
            const lines = await scheduleDao.findLinesByScheduleId(employee.workingScheduleId);
            const dayOfWeek = checkInTime.getDay();
            const scheduleLine = lines?.find((l) => Number(l.dayOfWeek) === dayOfWeek);
            if (scheduleLine) {
                scheduleEndMinutes = scheduleDao.timeStringToMinutes(scheduleLine.endTime);
                breakMinutes = Number(scheduleLine.breakMinutes || 0);
            }
        } catch {
            // ignore — fall through to defaults
        }
    }

    // ── Compute estimated checkout time ───────────────────────────────────────
    let estimatedCheckOutTime;

    if (scheduleEndMinutes !== null) {
        // Build a Date for schedule end on the punch date
        const punchDateObj = new Date(checkInTime);
        punchDateObj.setHours(Math.floor(scheduleEndMinutes / 60), scheduleEndMinutes % 60, 0, 0);
        estimatedCheckOutTime = punchDateObj;
    } else {
        // No schedule: assume DEFAULT_SHIFT_HOURS after check-in
        estimatedCheckOutTime = new Date(
            checkInTime.getTime() + DEFAULT_SHIFT_HOURS * 60 * 60 * 1000,
        );
    }

    // ── Classify ──────────────────────────────────────────────────────────────
    let classification;

    if (isPastDay) {
        // Any open punch from a previous calendar day is definitely a missing checkout
        classification = 'MISSING_CHECKOUT';
    } else {
        // Same day — check if within overtime grace window
        const overdueMinutes = Math.floor(
            (now.getTime() - estimatedCheckOutTime.getTime()) / (1000 * 60),
        );
        classification = overdueMinutes <= OVERTIME_GRACE_MINUTES ? 'OVERTIME' : 'MISSING_CHECKOUT';
    }

    // ── Clamp estimated checkout — never after "now" for MISSING_CHECKOUT ─────
    if (classification === 'MISSING_CHECKOUT' && estimatedCheckOutTime > now) {
        estimatedCheckOutTime = new Date(now);
    }

    const diffMs = Math.max(0, estimatedCheckOutTime.getTime() - checkInTime.getTime());
    const grossHours = diffMs / (1000 * 60 * 60);
    const estimatedWorkedHours = Number(Math.max(0, grossHours - breakMinutes / 60).toFixed(2));

    return { classification, estimatedWorkedHours, estimatedCheckOutTime };
}

/**
 * Batch-resolve all stale (missing checkout) punches from past dates.
 * Should be called by HR on-demand or via a nightly cron.
 *
 * For each open punch on a past date:
 *  1. Classify it (will always be MISSING_CHECKOUT since it's a past day)
 *  2. Close the punch with the estimated checkOutTime and workedHours
 *  3. Update the parent attendance record: workedHours, status = 'MISSING_CHECKOUT'
 *
 * @returns {{ resolved: number, skipped: number, details: Array }}
 */
export async function resolveStaleCheckouts() {
    const today = getTodayDateString();
    const openRows = await attendanceDao.findAllOpenPunchesBeforeDate(today);

    let resolved = 0;
    let skipped = 0;
    const details = [];

    for (const row of openRows) {
        try {
            const { punch, record, employee } = row;

            const { estimatedWorkedHours, estimatedCheckOutTime } = await classifyOpenPunch(
                { ...punch, attendanceDate: record.attendanceDate },
                employee,
                today,
            );

            // Close the stale punch
            await attendanceDao.updatePunch(punch.id, {
                checkOutTime: estimatedCheckOutTime,
                workedHours: estimatedWorkedHours,
                notes: punch.notes,
            });

            // Recalculate total workedHours across all punches for this record
            const allPunches = await attendanceDao.findPunchesByRecordId(record.id);
            const totalWorkedHours = Number(
                allPunches
                    .reduce((sum, p) => {
                        const hrs =
                            p.id === punch.id
                                ? estimatedWorkedHours
                                : parseFloat(p.workedHours || 0);
                        return sum + hrs;
                    }, 0)
                    .toFixed(2),
            );

            // Update parent record — flag as MISSING_CHECKOUT for HR visibility
            await attendanceDao.updateAttendanceRecord(record.id, {
                checkOutTime: estimatedCheckOutTime,
                workedHours: String(totalWorkedHours),
                status: 'MISSING_CHECKOUT',
                correctionReason: 'Auto-resolved: missing checkout detected on past date',
                isManuallyCorrected: true,
            });

            resolved++;
            details.push({
                attendanceRecordId: record.id,
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                attendanceDate: record.attendanceDate,
                estimatedCheckOutTime,
                estimatedWorkedHours,
            });
        } catch (err) {
            skipped++;
            details.push({
                attendanceRecordId: row.record?.id,
                error: err?.message || 'Unknown error during resolution',
            });
        }
    }

    return { resolved, skipped, total: openRows.length, details };
}

/**
 * Check In (Supports initial or subsequent check-in on the same calendar day up to contract max limit)
 */
export async function checkIn(user, body = {}) {
    const employee = await resolveEmployeeForUser(user, body.employeeId);
    const today = getTodayDateString();
    const now = new Date();

    const maxPunches = await resolveMaxDailyPunches(employee.id, today);

    const existingRecord = await attendanceDao.findAttendanceByDate(employee.id, today);

    if (!existingRecord) {
        if (maxPunches < 1) {
            throw new AppError(
                'Daily punch limit reached for your contract (maximum allowed: 0).',
                403,
            );
        }

        // Initial check-in of the day: create parent attendance_records and first child punch
        const initialStatus = await evaluateAttendanceStatus(employee, now, null, 0);

        const newRecord = await attendanceDao.createCheckIn({
            employeeId: employee.id,
            attendanceDate: today,
            checkInTime: now,
            status: initialStatus,
            notes: body.notes,
        });

        await attendanceDao.createPunch({
            attendanceRecordId: newRecord.id,
            checkInTime: now,
            notes: body.notes,
        });

        return attendanceDao.findAttendanceById(newRecord.id);
    }

    // Record already exists for today: check how many punches were used so far
    const punches = await attendanceDao.findPunchesByRecordId(existingRecord.id);
    if (punches.length >= maxPunches) {
        throw new AppError(
            `Daily punch limit reached for your contract (maximum allowed: ${maxPunches}). Further check-ins are not permitted today.`,
            403,
        );
    }

    // Check if there is an active (open) punch
    const activePunch = await attendanceDao.findActivePunch(existingRecord.id);
    if (activePunch) {
        throw new AppError(
            'You already have an active check-in session. Please check out before checking in again.',
            409,
        );
    }

    // All previous punches are checked out: start a new check-in session
    await attendanceDao.createPunch({
        attendanceRecordId: existingRecord.id,
        checkInTime: now,
        notes: body.notes,
    });

    // Update parent record: set checkOutTime = null (currently active at work)
    const combinedNotes = body.notes
        ? existingRecord.notes
            ? `${existingRecord.notes}; ${body.notes}`
            : body.notes
        : existingRecord.notes;

    await attendanceDao.updateAttendanceRecord(existingRecord.id, {
        checkOutTime: null,
        notes: combinedNotes,
    });

    return attendanceDao.findAttendanceById(existingRecord.id);
}

/**
 * Check Out (Closes current active punch session and recalculates cumulative daily hours)
 * Can be called with explicit attendanceId or self-service without attendanceId.
 */
export async function checkOut(attendanceId, user, body = {}) {
    let record;
    if (attendanceId) {
        record = await attendanceDao.findAttendanceById(attendanceId);
        if (!record) {
            throw new AppError('Attendance record not found', 404);
        }
    } else {
        const employee = await resolveEmployeeForUser(user, body.employeeId);
        const today = getTodayDateString();
        record = await attendanceDao.findAttendanceByDate(employee.id, today);
        if (!record) {
            throw new AppError('No attendance record found for today to check out from', 404);
        }
    }

    if (user.role === 'EMPLOYEE') {
        const emp = await employeeDao.findEmployeeByUserId(user.id);
        if (!emp || emp.id !== record.employeeId) {
            throw new AppError('You are not authorized to check out for this employee', 403);
        }
    }

    // Find the currently open punch session
    const activePunch = await attendanceDao.findActivePunch(record.id);
    if (!activePunch) {
        throw new AppError(
            'No active check-in session found for this attendance record (already checked out)',
            409,
        );
    }

    const checkOutTime = new Date();
    const checkInTime = new Date(activePunch.checkInTime);
    const diffMs = checkOutTime.getTime() - checkInTime.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    // ── Short-session guards ──────────────────────────────────────────────────
    // TIER 1: Hard block — accidental check-in (under 60 seconds)
    // HR force-checkout (attendanceId provided) bypasses this block so they can
    // always correct stale records without being locked out.
    const MIN_SESSION_SECONDS = 60;
    if (!attendanceId && diffSeconds < MIN_SESSION_SECONDS) {
        throw new AppError(
            `You checked in only ${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago. ` +
                `Please wait at least ${MIN_SESSION_SECONDS} seconds before checking out. ` +
                `If this was accidental, ask HR to void the punch.`,
            422,
        );
    }

    // TIER 2: Soft flag — very short session (60 s – 10 min): allow but annotate for HR review
    const SHORT_SESSION_MINUTES = 10;
    const isShortSession =
        diffSeconds >= MIN_SESSION_SECONDS && diffSeconds < SHORT_SESSION_MINUTES * 60;
    const shortSessionNote = isShortSession
        ? `[Short session: ${Math.ceil(diffSeconds / 60)} min — may require HR review]`
        : null;

    const sessionWorkedHours = Number((Math.max(0, diffMs) / (1000 * 60 * 60)).toFixed(2));

    // Merge short-session note with any user-supplied notes
    const punchNotes = (() => {
        const userNote = body.notes !== undefined ? body.notes : activePunch.notes;
        if (shortSessionNote && userNote) return `${shortSessionNote} ${userNote}`;
        return shortSessionNote || userNote || null;
    })();

    // Close the active punch session
    await attendanceDao.updatePunch(activePunch.id, {
        checkOutTime,
        workedHours: sessionWorkedHours,
        notes: punchNotes,
    });

    // Recalculate total daily worked hours across all punches
    const punches = await attendanceDao.findPunchesByRecordId(record.id);
    const totalDailyWorkedHours = Number(
        punches
            .reduce((sum, p) => {
                const hrs =
                    p.id === activePunch.id ? sessionWorkedHours : parseFloat(p.workedHours || 0);
                return sum + hrs;
            }, 0)
            .toFixed(2),
    );

    // Re-evaluate daily status based on first check-in (lateness) and cumulative worked hours
    const employee = await employeeDao.findEmployeeById(record.employeeId);
    const evaluatedStatus = await evaluateAttendanceStatus(
        employee,
        record.checkInTime,
        checkOutTime,
        totalDailyWorkedHours,
    );

    // Update parent daily attendance record
    // If it was a short session, merge the flag note onto the parent record too
    const parentNotes = (() => {
        const existing = body.notes !== undefined ? body.notes : record.notes;
        if (shortSessionNote && existing) return `${shortSessionNote} ${existing}`;
        return shortSessionNote || existing || null;
    })();

    await attendanceDao.updateAttendanceRecord(record.id, {
        checkOutTime,
        workedHours: String(totalDailyWorkedHours),
        status: evaluatedStatus,
        notes: parentNotes,
    });

    return attendanceDao.findAttendanceById(record.id);
}

/**
 * Get live attendance status for current employee today
 */
export async function getTodayStatus(user, explicitEmployeeId) {
    const employee = await resolveEmployeeForUser(user, explicitEmployeeId);
    const today = getTodayDateString();
    const maxPunches = await resolveMaxDailyPunches(employee.id, today);

    const employeeInfo = {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
        profileImage: user.profileImage,
    };

    const record = await attendanceDao.findAttendanceByDate(employee.id, today);

    if (!record) {
        return {
            hasAttendanceToday: false,
            isCurrentlyCheckedIn: false,
            attendanceDate: today,
            totalWorkedHours: 0,
            maxPunchesPerDay: maxPunches,
            punchesUsed: 0,
            remainingPunches: maxPunches,
            canCheckIn: maxPunches > 0,
            activePunch: null,
            currentSessionMinutes: 0,
            punches: [],
            record: null,
            employee: employeeInfo,
        };
    }

    const punchesUsed = record.punches ? record.punches.length : 0;
    const remainingPunches = Math.max(0, maxPunches - punchesUsed);
    const activePunch = record.activePunch;
    let currentSessionMinutes = 0;
    let sessionClassification = 'NORMAL';
    let estimatedOvertimeMinutes = 0;

    if (activePunch) {
        const now = new Date();
        const start = new Date(activePunch.checkInTime);
        currentSessionMinutes = Math.max(
            0,
            Math.floor((now.getTime() - start.getTime()) / (1000 * 60)),
        );

        // Classify the active session — OVERTIME vs NORMAL
        try {
            const { classification, estimatedCheckOutTime } = await classifyOpenPunch(
                { ...activePunch, attendanceDate: today },
                employee,
                today,
            );
            sessionClassification =
                classification === 'MISSING_CHECKOUT' ? 'MISSING_CHECKOUT' : 'OVERTIME';

            if (sessionClassification === 'OVERTIME') {
                const now2 = new Date();
                const overtimeStartMs = estimatedCheckOutTime.getTime(); // schedule end time
                estimatedOvertimeMinutes = Math.max(
                    0,
                    Math.floor((now2.getTime() - overtimeStartMs) / (1000 * 60)),
                );
                if (estimatedOvertimeMinutes === 0) sessionClassification = 'NORMAL';
            }
        } catch {
            // ignore classification errors — default NORMAL
        }
    }

    return {
        hasAttendanceToday: true,
        isCurrentlyCheckedIn: record.isCurrentlyCheckedIn,
        attendanceDate: today,
        totalWorkedHours: Number(record.workedHours || 0),
        maxPunchesPerDay: maxPunches,
        punchesUsed,
        remainingPunches,
        canCheckIn: !record.isCurrentlyCheckedIn && remainingPunches > 0,
        activePunch,
        currentSessionMinutes,
        sessionClassification,
        estimatedOvertimeMinutes,
        punches: record.punches,
        record,
        employee: employeeInfo,
    };
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

    // Explicit self-scoping (for HR roles in "My Attendance" mode or EMPLOYEE role)
    const isSelfMode =
        queryFilters.scope === 'self' ||
        queryFilters.employeeId === 'me' ||
        user.role === 'EMPLOYEE';

    if (isSelfMode) {
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

    if (queryFilters.excludeHr === true || queryFilters.excludeHr === 'true') {
        queryFilters.excludeHr = true;
    } else {
        queryFilters.excludeHr = false;
    }

    delete queryFilters.scope;

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
 * Returns { stats: [{status, count, totalWorkedHours}], missingCheckoutCount: number }
 */
export async function getAttendanceSummary(filters = {}) {
    const queryFilters = { ...filters };
    if (queryFilters.excludeHr === true || queryFilters.excludeHr === 'true') {
        queryFilters.excludeHr = true;
    } else {
        queryFilters.excludeHr = false;
    }
    return attendanceDao.getSummaryStats(queryFilters);
}
