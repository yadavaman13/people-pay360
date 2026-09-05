import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    fetchDashboardSummary,
    fetchDepartmentSalary,
    fetchNetSalaryTrends,
    fetchAttendanceMetrics,
    fetchTimeOffMetrics,
    fetchDepartmentBreakdown,
    fetchDashboardAlerts,
} from '../services/dashboard.api';
import { useDashboard } from './useDashboard';

/**
 * Formats a number as Indian Rupee currency string.
 * e.g. 1250000 → "₹ 12,50,000.00"
 */
export function formatINR(value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

/**
 * Formats a large number compactly.
 * e.g. 1250000 → "₹ 12.5L"
 */
export function formatINRCompact(value) {
    const num = Number(value) || 0;
    if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹ ${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹ ${(num / 1000).toFixed(1)}K`;
    return formatINR(num);
}

/**
 * useDashboardData — Orchestration hook for all 7 dashboard API endpoints.
 *
 * Responsibilities:
 * - Concurrent fetching with Promise.allSettled
 * - Per-endpoint loading state management
 * - Data transformation to ECharts datasets
 * - CSV export helper
 */
export function useDashboardData() {
    const { periodStart, periodEnd, departmentId, employeeType, refreshTrigger } = useDashboard();

    // ── Raw API Data ─────────────────────────────────────────────────────────
    const [summaryData, setSummaryData] = useState(null);
    const [departmentSalaryData, setDepartmentSalaryData] = useState([]);
    const [salaryTrendsData, setSalaryTrendsData] = useState([]);
    const [attendanceData, setAttendanceData] = useState(null);
    const [timeOffData, setTimeOffData] = useState(null);
    const [departmentBreakdownData, setDepartmentBreakdownData] = useState([]);
    const [alertsData, setAlertsData] = useState([]);

    // ── Loading & Error States ───────────────────────────────────────────────
    const [loading, setLoading] = useState({
        summary: true,
        departmentSalary: true,
        salaryTrends: true,
        attendance: true,
        timeOff: true,
        departmentBreakdown: true,
        alerts: true,
    });
    const [errors, setErrors] = useState({});
    const [lastUpdated, setLastUpdated] = useState(null);

    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ── Fetch All Dashboard Data ─────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        if (!isMountedRef.current) return;

        setLoading({
            summary: true,
            departmentSalary: true,
            salaryTrends: true,
            attendance: true,
            timeOff: true,
            departmentBreakdown: true,
            alerts: true,
        });
        setErrors({});

        const params = {
            ...(periodStart && { periodStart }),
            ...(periodEnd && { periodEnd }),
            ...(departmentId && { departmentId }),
            ...(employeeType && { employeeType }),
        };

        const [
            summaryRes,
            deptSalaryRes,
            trendsRes,
            attendanceRes,
            timeOffRes,
            deptBreakdownRes,
            alertsRes,
        ] = await Promise.allSettled([
            fetchDashboardSummary(params),
            fetchDepartmentSalary(params),
            fetchNetSalaryTrends(params),
            fetchAttendanceMetrics(params),
            fetchTimeOffMetrics(params),
            fetchDepartmentBreakdown(params),
            fetchDashboardAlerts({ departmentId: params.departmentId }),
        ]);

        if (!isMountedRef.current) return;

        const newErrors = {};

        if (summaryRes.status === 'fulfilled') {
            setSummaryData(summaryRes.value?.data || summaryRes.value);
        } else {
            newErrors.summary = summaryRes.reason?.message || 'Failed to load summary';
        }

        if (deptSalaryRes.status === 'fulfilled') {
            setDepartmentSalaryData(deptSalaryRes.value?.data || deptSalaryRes.value || []);
        } else {
            newErrors.departmentSalary = deptSalaryRes.reason?.message;
        }

        if (trendsRes.status === 'fulfilled') {
            setSalaryTrendsData(trendsRes.value?.data || trendsRes.value || []);
        } else {
            newErrors.salaryTrends = trendsRes.reason?.message;
        }

        if (attendanceRes.status === 'fulfilled') {
            setAttendanceData(attendanceRes.value?.data || attendanceRes.value);
        } else {
            newErrors.attendance = attendanceRes.reason?.message;
        }

        if (timeOffRes.status === 'fulfilled') {
            setTimeOffData(timeOffRes.value?.data || timeOffRes.value);
        } else {
            newErrors.timeOff = timeOffRes.reason?.message;
        }

        if (deptBreakdownRes.status === 'fulfilled') {
            setDepartmentBreakdownData(
                deptBreakdownRes.value?.data || deptBreakdownRes.value || [],
            );
        } else {
            newErrors.departmentBreakdown = deptBreakdownRes.reason?.message;
        }

        if (alertsRes.status === 'fulfilled') {
            setAlertsData(alertsRes.value?.data || alertsRes.value || []);
        } else {
            newErrors.alerts = alertsRes.reason?.message;
        }

        setErrors(newErrors);
        setLoading({
            summary: false,
            departmentSalary: false,
            salaryTrends: false,
            attendance: false,
            timeOff: false,
            departmentBreakdown: false,
            alerts: false,
        });
        setLastUpdated(new Date());
    }, [periodStart, periodEnd, departmentId, employeeType, refreshTrigger]); // eslint-disable-line

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAll();
    }, [fetchAll]);

    // ── ECharts Dataset: Salary Trends ───────────────────────────────────────
    const salaryTrendsChartData = useMemo(() => {
        if (!salaryTrendsData || salaryTrendsData.length === 0) return null;
        const labels = salaryTrendsData.map((d) => d.label || d.month);
        const netSeries = salaryTrendsData.map((d) => Number(d.netSalary || 0));
        const grossSeries = salaryTrendsData.map((d) => Number(d.grossSalary || 0));
        const deductionSeries = salaryTrendsData.map((d) => Number(d.deductions || 0));
        return { labels, netSeries, grossSeries, deductionSeries };
    }, [salaryTrendsData]);

    // ── ECharts Dataset: Department Salary ───────────────────────────────────
    const departmentSalaryChartData = useMemo(() => {
        if (!departmentSalaryData || departmentSalaryData.length === 0) return null;
        return departmentSalaryData.map((d) => ({
            name: d.name,
            value: Number(d.totalNet || 0),
            budget: Number(d.totalBudgetedWage || 0),
            employeeCount: d.employeeCount,
            percentage: d.percentage,
            id: d.departmentId,
        }));
    }, [departmentSalaryData]);

    // ── ECharts Dataset: Daily Attendance Timeline ───────────────────────────
    const attendanceChartData = useMemo(() => {
        const timeline = attendanceData?.dailyTimeline || [];
        if (timeline.length === 0) return null;
        return {
            dates: timeline.map((d) => d.date),
            present: timeline.map((d) => d.present),
            late: timeline.map((d) => d.late),
            absent: timeline.map((d) => d.absent),
        };
    }, [attendanceData]);

    // ── ECharts Dataset: Time Off by Type ───────────────────────────────────
    const timeOffChartData = useMemo(() => {
        const byType = timeOffData?.byType || [];
        if (byType.length === 0) return null;
        return byType
            .filter((t) => Number(t.approvedDays) > 0 || Number(t.requestsCount) > 0)
            .map((t) => ({
                name: t.name,
                value: Number(t.approvedDays || 0),
                requestsCount: t.requestsCount,
                paid: t.paid,
                code: t.code,
            }));
    }, [timeOffData]);

    // ── CSV Export Helpers ───────────────────────────────────────────────────
    const getSalaryTrendsCsv = useCallback(
        () => ({
            headers: [
                'Month',
                'Net Salary (INR)',
                'Gross Salary (INR)',
                'Deductions (INR)',
                'Payslips',
            ],
            rows: salaryTrendsData.map((d) => [
                d.label || d.month,
                d.netSalary,
                d.grossSalary,
                d.deductions,
                d.payslipCount,
            ]),
        }),
        [salaryTrendsData],
    );

    const getDepartmentSalaryCsv = useCallback(
        () => ({
            headers: [
                'Department',
                'Net Pay (INR)',
                'Gross Pay (INR)',
                'Budgeted Wage (INR)',
                'Employees',
                '% Share',
            ],
            rows: departmentSalaryData.map((d) => [
                d.name,
                d.totalNet,
                d.totalGross,
                d.totalBudgetedWage,
                d.employeeCount,
                d.percentage,
            ]),
        }),
        [departmentSalaryData],
    );

    const getAttendanceCsv = useCallback(
        () => ({
            headers: ['Date', 'Present', 'Late', 'Absent', 'Total'],
            rows: (attendanceData?.dailyTimeline || []).map((d) => [
                d.date,
                d.present,
                d.late,
                d.absent,
                d.total,
            ]),
        }),
        [attendanceData],
    );

    const getTimeOffCsv = useCallback(
        () => ({
            headers: ['Leave Type', 'Code', 'Approved Days', 'Requests', 'Paid'],
            rows: (timeOffData?.byType || []).map((t) => [
                t.name,
                t.code,
                t.approvedDays,
                t.requestsCount,
                t.paid ? 'Yes' : 'No',
            ]),
        }),
        [timeOffData],
    );

    const getDepartmentBreakdownCsv = useCallback(
        () => ({
            headers: [
                'Department',
                'Code',
                'Manager',
                'Headcount',
                'Wage Expense (INR)',
                'Avg Salary (INR)',
                'Attendance Rate',
                'Leave Days',
            ],
            rows: departmentBreakdownData.map((d) => [
                d.name,
                d.code,
                d.manager,
                d.headcount,
                d.totalWageExpense,
                d.averageSalary,
                d.attendanceRate,
                d.leaveDaysTaken,
            ]),
        }),
        [departmentBreakdownData],
    );

    return {
        // Raw data
        summaryData,
        departmentSalaryData,
        salaryTrendsData,
        attendanceData,
        timeOffData,
        departmentBreakdownData,
        alertsData,

        // Transformed chart datasets
        salaryTrendsChartData,
        departmentSalaryChartData,
        attendanceChartData,
        timeOffChartData,

        // States
        loading,
        errors,
        lastUpdated,

        // CSV helpers
        getSalaryTrendsCsv,
        getDepartmentSalaryCsv,
        getAttendanceCsv,
        getTimeOffCsv,
        getDepartmentBreakdownCsv,

        // Utils
        formatINR,
        formatINRCompact,

        // Manual refetch
        refetch: fetchAll,
    };
}

export default useDashboardData;
