import { useState, useMemo } from 'react';
import { AttendanceContext } from './AttendanceContext';

/**
 * AttendanceProvider
 * Adheres strictly to Layer 3 (State Container) of the 4-Layer Architecture.
 * Pure state container: contains ZERO asynchronous calls or API requests.
 */

const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
};

export function AttendanceProvider({ children }) {
    // ── 1. Data Collections & Selected State ────────────────────────────────
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [todayStatus, setTodayStatus] = useState({
        hasAttendanceToday: false,
        isCurrentlyCheckedIn: false,
        attendanceDate: getTodayDateString(),
        totalWorkedHours: 0,
        maxPunchesPerDay: 3,
        punchesUsed: 0,
        remainingPunches: 3,
        canCheckIn: true,
        activePunch: null,
    });
    const [summaryMetrics, setSummaryMetrics] = useState({
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        halfDayCount: 0,
        missingCheckoutCount: 0,
        totalRecords: 0,
        totalHours: 0,
    });
    const [employeesList, setEmployeesList] = useState([]);

    // ── 2. Filters & Pagination State ───────────────────────────────────────
    const [filters, setFilters] = useState({
        search: '',
        dateFrom: getTodayDateString(),
        dateTo: getTodayDateString(),
        status: 'ALL',
        employeeId: '',
    });

    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    });

    // ── 3. Employee View Specific State ─────────────────────────────────────
    const [selectedMonth, setSelectedMonth] = useState(() => new Date());

    // ── 4. Status, Loading & Error Flags ────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);

    // ── 5. Derived Values ───────────────────────────────────────────────────
    const employeeMonthlySummary = useMemo(() => {
        // Calculate monthly statistics from attendanceRecords if employee
        const list = Array.isArray(attendanceRecords) ? attendanceRecords : [];
        const presentDays = list.filter(
            (r) => r.status === 'PRESENT' || r.status === 'MANUAL_CORRECTION',
        ).length;
        const lateDays = list.filter((r) => r.status === 'LATE').length;
        const halfDays = list.filter((r) => r.status === 'HALF_DAY').length;
        const totalPunches = list.length;
        const totalWorked = list.reduce((acc, curr) => {
            return acc + (parseFloat(curr.workedHours) || 0);
        }, 0);
        const avgDailyHrs = totalPunches > 0 ? (totalWorked / totalPunches).toFixed(1) : '0.0';

        return {
            presentDays,
            lateDays,
            halfDays,
            totalPunches,
            totalWorkedHours: totalWorked.toFixed(2),
            avgDailyHrs,
        };
    }, [attendanceRecords]);

    // ── 6. Context Value Memoization ────────────────────────────────────────
    const value = useMemo(
        () => ({
            // Read-only state
            attendanceRecords,
            selectedRecord,
            todayStatus,
            summaryMetrics,
            employeesList,
            filters,
            pagination,
            selectedMonth,
            employeeMonthlySummary,
            loading,
            actionLoading,
            error,

            // State setters (invoked only by hooks)
            setAttendanceRecords,
            setSelectedRecord,
            setTodayStatus,
            setSummaryMetrics,
            setEmployeesList,
            setFilters,
            setPagination,
            setSelectedMonth,
            setLoading,
            setActionLoading,
            setError,
        }),
        [
            attendanceRecords,
            selectedRecord,
            todayStatus,
            summaryMetrics,
            employeesList,
            filters,
            pagination,
            selectedMonth,
            employeeMonthlySummary,
            loading,
            actionLoading,
            error,
        ],
    );

    return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}
