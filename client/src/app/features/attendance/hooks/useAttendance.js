import { useContext, useCallback, useRef, useEffect } from 'react';
import { AttendanceContext } from '../context/AttendanceContext';
import * as attendanceApi from '../services/attendance.api';
import { useToast } from '@/components/Shared/Feedback/Toast';

/**
 * useAttendance Hook
 * Adheres strictly to Layer 2 (Action Hooks Layer) of the 4-Layer Architecture.
 * Orchestrates API requests, loading/error states, and updates the state container.
 */
export function useAttendance() {
    const context = useContext(AttendanceContext);

    if (!context) {
        throw new Error('useAttendance must be used within an AttendanceProvider');
    }

    const {
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
    } = context;

    const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();

    // Stable refs to prevent callback re-creation loops
    const filtersRef = useRef(filters);
    const paginationRef = useRef(pagination);
    const selectedMonthRef = useRef(selectedMonth);

    useEffect(() => {
        filtersRef.current = filters;
        paginationRef.current = pagination;
        selectedMonthRef.current = selectedMonth;
    });

    // ── 1. Fetch Attendance Records List ────────────────────────────────────
    const loadAttendanceList = useCallback(
        async (customParams = {}) => {
            setLoading(true);
            setError(null);
            try {
                const currentFilters = filtersRef.current;
                const currentPagination = paginationRef.current;

                const page = customParams.page || currentPagination.page || 1;
                const limit = customParams.limit || currentPagination.limit || 10;

                const rawStatus =
                    customParams.status !== undefined ? customParams.status : currentFilters.status;
                const status =
                    rawStatus && rawStatus !== 'ALL' && rawStatus !== 'all' ? rawStatus : undefined;

                const rawDateFrom =
                    customParams.dateFrom !== undefined
                        ? customParams.dateFrom
                        : currentFilters.dateFrom;
                const dateFrom = rawDateFrom ? rawDateFrom : undefined;

                const rawDateTo =
                    customParams.dateTo !== undefined ? customParams.dateTo : currentFilters.dateTo;
                const dateTo = rawDateTo ? rawDateTo : undefined;

                const rawEmployeeId =
                    customParams.employeeId !== undefined
                        ? customParams.employeeId
                        : currentFilters.employeeId;
                const employeeId = rawEmployeeId ? rawEmployeeId : undefined;

                let scope;
                let excludeHr;

                if (customParams.excludeHr) {
                    // Employee management view: never send scope
                    excludeHr = true;
                    scope = undefined;
                } else if (customParams.scope) {
                    // Self attendance view: never exclude HR
                    scope = customParams.scope;
                    excludeHr = false;
                } else {
                    // Fallback to persisted filters
                    scope = currentFilters.scope || undefined;
                    excludeHr =
                        currentFilters.excludeHr !== undefined
                            ? currentFilters.excludeHr
                            : undefined;
                }

                const rawSearch =
                    customParams.search !== undefined
                        ? customParams.search
                        : customParams.searchTerm !== undefined
                          ? customParams.searchTerm
                          : currentFilters.search;
                const search =
                    rawSearch && typeof rawSearch === 'string' && rawSearch.trim()
                        ? rawSearch.trim()
                        : undefined;

                const queryParams = { page, limit };
                if (status) queryParams.status = status;
                if (dateFrom) queryParams.dateFrom = dateFrom;
                if (dateTo) queryParams.dateTo = dateTo;
                if (employeeId) queryParams.employeeId = employeeId;
                if (scope) queryParams.scope = scope;
                if (excludeHr !== undefined) queryParams.excludeHr = excludeHr;
                if (search) queryParams.search = search;

                if (
                    customParams.scope !== undefined ||
                    customParams.excludeHr !== undefined ||
                    customParams.search !== undefined ||
                    customParams.searchTerm !== undefined
                ) {
                    setFilters((prev) => ({
                        ...prev,
                        scope: scope || '',
                        excludeHr: Boolean(excludeHr),
                        search: search || '',
                    }));
                }

                const res = await attendanceApi.fetchAttendanceList(queryParams);
                const records = res.data || [];
                setAttendanceRecords(records);

                if (res.pagination) {
                    setPagination({
                        total: res.pagination.total ?? records.length,
                        page: res.pagination.page || 1,
                        limit: res.pagination.limit || 10,
                        totalPages: res.pagination.totalPages || 1,
                    });
                }
                return records;
            } catch (err) {
                const message =
                    err.response?.data?.message ||
                    err.message ||
                    'Failed to fetch attendance records';
                setError(message);
                return [];
            } finally {
                setLoading(false);
            }
        },
        [setAttendanceRecords, setPagination, setLoading, setError, setFilters],
    );

    // ── 2. Fetch Current Day Status ─────────────────────────────────────────
    const loadTodayStatus = useCallback(async () => {
        try {
            const res = await attendanceApi.fetchTodayStatus();
            if (res.data) {
                setTodayStatus(res.data);
                return res.data;
            }
        } catch (err) {
            console.warn('Could not load today status:', err.message);
        }
    }, [setTodayStatus]);

    // ── 3. Fetch HR Summary KPI Stats ───────────────────────────────────────
    const loadSummaryMetrics = useCallback(
        async (params = {}) => {
            try {
                const res = await attendanceApi.fetchAttendanceSummary(params);
                if (res.data) {
                    // API returns { stats: [{ status, count, totalWorkedHours }], missingCheckoutCount }
                    const rawData = res.data;
                    const rawArray = Array.isArray(rawData)
                        ? rawData
                        : Array.isArray(rawData?.stats)
                          ? rawData.stats
                          : [];
                    const serverMissingCheckout = rawData?.missingCheckoutCount ?? 0;

                    const normalized = {
                        presentCount: 0,
                        lateCount: 0,
                        absentCount: 0,
                        halfDayCount: 0,
                        missingCheckoutCount: Number(serverMissingCheckout),
                        totalRecords: 0,
                        totalHours: 0,
                    };
                    rawArray.forEach(({ status, count, totalWorkedHours }) => {
                        const n = Number(count) || 0;
                        normalized.totalRecords += n;
                        normalized.totalHours += Number(totalWorkedHours) || 0;
                        if (status === 'PRESENT') normalized.presentCount = n;
                        else if (status === 'LATE') normalized.lateCount = n;
                        else if (status === 'ABSENT') normalized.absentCount = n;
                        else if (status === 'HALF_DAY') normalized.halfDayCount = n;
                    });
                    setSummaryMetrics(normalized);
                    return normalized;
                }
            } catch (err) {
                console.warn('Could not load summary metrics:', err.message);
            }
        },
        [setSummaryMetrics],
    );

    // ── 4. Fetch Record Detail by ID ────────────────────────────────────────
    const loadAttendanceById = useCallback(
        async (id) => {
            setLoading(true);
            setError(null);
            try {
                const res = await attendanceApi.fetchAttendanceById(id);
                if (res.data) {
                    setSelectedRecord(res.data);
                    return res.data;
                }
            } catch (err) {
                const msg =
                    err.response?.data?.message ||
                    err.message ||
                    'Failed to load attendance details';
                setError(msg);
                toastError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [setSelectedRecord, setLoading, setError, toastError],
    );

    // ── 5. Fetch Employees for HR Filter Dropdown ───────────────────────────
    const loadEmployeesList = useCallback(async () => {
        try {
            const res = await attendanceApi.fetchEmployeesList();
            const list = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.employees)
                  ? res.data.employees
                  : [];
            setEmployeesList(list);
        } catch (err) {
            console.warn('Could not load employees list:', err.message);
            setEmployeesList([]);
        }
    }, [setEmployeesList]);

    // ── 6. Employee Check-In ────────────────────────────────────────────────
    const handleCheckIn = useCallback(
        async (notes = '') => {
            setActionLoading(true);
            try {
                const payload = notes ? { notes } : {};
                const res = await attendanceApi.punchCheckIn(payload);
                toastSuccess(res.message || 'Checked in successfully!');
                await loadTodayStatus();
                await loadAttendanceList();
                return res.data;
            } catch (err) {
                if (err.response?.status === 409) {
                    toastWarning(
                        err.response?.data?.message ||
                            'You already have an active check-in session. Please check out first.',
                    );
                    await loadTodayStatus();
                } else {
                    const msg =
                        err.response?.data?.message ||
                        err.message ||
                        'Failed to check in. Try again.';
                    toastError(msg);
                }
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [
            loadTodayStatus,
            loadAttendanceList,
            setActionLoading,
            toastSuccess,
            toastWarning,
            toastError,
        ],
    );

    // ── 7. Employee Check-Out ───────────────────────────────────────────────
    const handleCheckOut = useCallback(
        async (notes = '') => {
            setActionLoading(true);
            try {
                const payload = notes ? { notes } : {};
                const res = await attendanceApi.punchCheckOut(payload);
                toastSuccess(res.message || 'Checked out successfully!');
                await loadTodayStatus();
                await loadAttendanceList();
                return res.data;
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to check out. Try again.';
                toastError(msg);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [loadTodayStatus, loadAttendanceList, setActionLoading, toastSuccess, toastError],
    );

    // ── 8. HR Force Check-Out ───────────────────────────────────────────────
    const handleForceCheckOut = useCallback(
        async (recordId, notes = 'Force checked out by Administrator') => {
            setActionLoading(true);
            try {
                const res = await attendanceApi.forceCheckOut(recordId, { notes });
                toastSuccess('Force check-out completed successfully!');
                if (selectedRecord && selectedRecord.id === recordId) {
                    await loadAttendanceById(recordId);
                }
                await loadAttendanceList();
                return res.data;
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to force check out';
                toastError(msg);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [
            selectedRecord,
            loadAttendanceById,
            loadAttendanceList,
            setActionLoading,
            toastSuccess,
            toastError,
        ],
    );

    // ── 9. HR Manual Correction ─────────────────────────────────────────────
    const handleManualCorrection = useCallback(
        async (recordId, payload) => {
            setActionLoading(true);
            try {
                const res = await attendanceApi.correctAttendance(recordId, payload);
                toastSuccess('Attendance record corrected successfully!');
                if (selectedRecord && selectedRecord.id === recordId) {
                    await loadAttendanceById(recordId);
                }
                await loadAttendanceList();
                return res.data;
            } catch (err) {
                const msg =
                    err.response?.data?.message ||
                    err.response?.data?.errors?.[0]?.msg ||
                    err.message ||
                    'Failed to correct attendance record';
                toastError(msg);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [
            selectedRecord,
            loadAttendanceById,
            loadAttendanceList,
            setActionLoading,
            toastSuccess,
            toastError,
        ],
    );

    // ── 10. Delete Attendance Record ────────────────────────────────────────
    const handleDeleteRecord = useCallback(
        async (recordId) => {
            setActionLoading(true);
            try {
                await attendanceApi.deleteAttendance(recordId);
                toastSuccess('Attendance record deleted successfully');
                await loadAttendanceList();
            } catch (err) {
                const msg =
                    err.response?.data?.message ||
                    err.message ||
                    'Failed to delete attendance record';
                toastError(msg);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [loadAttendanceList, setActionLoading, toastSuccess, toastError],
    );

    // ── 11. Filter and Pagination Setters ───────────────────────────────────
    const updateFilters = useCallback(
        (newFilters) => {
            setFilters((prev) => ({ ...prev, ...newFilters }));
        },
        [setFilters],
    );

    const changePage = useCallback(
        (newPage) => {
            setPagination((prev) => ({ ...prev, page: newPage }));
            loadAttendanceList({ page: newPage });
        },
        [setPagination, loadAttendanceList],
    );

    const changeMonth = useCallback(
        (offsetOrDate, extraParams = {}) => {
            let nextDate;
            if (typeof offsetOrDate === 'number') {
                nextDate = new Date(selectedMonthRef.current);
                nextDate.setMonth(nextDate.getMonth() + offsetOrDate);
            } else if (offsetOrDate instanceof Date) {
                nextDate = offsetOrDate;
            } else {
                nextDate = new Date();
            }

            setSelectedMonth(nextDate);

            // Compute first and last date of month
            const year = nextDate.getFullYear();
            const month = nextDate.getMonth();
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

            setFilters((prev) => ({
                ...prev,
                dateFrom: firstDay,
                dateTo: lastDay,
            }));

            loadAttendanceList({ dateFrom: firstDay, dateTo: lastDay, page: 1, ...extraParams });
        },
        [setSelectedMonth, setFilters, loadAttendanceList],
    );

    return {
        // State values
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

        // Actions
        loadAttendanceList,
        loadTodayStatus,
        loadSummaryMetrics,
        loadAttendanceById,
        loadEmployeesList,
        handleCheckIn,
        handleCheckOut,
        handleForceCheckOut,
        handleManualCorrection,
        handleDeleteRecord,
        updateFilters,
        changePage,
        changeMonth,
        setSelectedRecord,
    };
}
