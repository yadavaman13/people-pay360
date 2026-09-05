import { useMemo, useCallback, useEffect } from 'react';
import { BarChart2 } from 'lucide-react';
import { DashboardProvider } from '../context/dashboard.context';
import { useDashboardData } from '../hooks/useDashboardData';
import DashboardFilters from '../components/DashboardFilters/DashboardFilters';
import DashboardKpiGrid from '../components/DashboardKpiGrid/DashboardKpiGrid';
import SalaryTrendsChartCard from '../components/charts/SalaryTrendsChartCard';
import DepartmentSalaryChartCard from '../components/charts/DepartmentSalaryChartCard';
import AttendanceTimelineChartCard from '../components/charts/AttendanceTimelineChartCard';
import TimeOffDistributionChartCard from '../components/charts/TimeOffDistributionChartCard';
import OperationalAlertsFeed from '../components/OperationalAlertsFeed/OperationalAlertsFeed';
import DepartmentBreakdownTable from '../components/DepartmentBreakdownTable/DepartmentBreakdownTable';
import './PayrollDashboardPage.scss';

/**
 * PayrollDashboardInner — The real dashboard content.
 * Split from the provider so it can consume DashboardContext.
 */
function PayrollDashboardInner() {
    useEffect(() => {
        window.scrollTo(0, 0);
        const rightPane = document.querySelector('.dashboard-right-pane');
        if (rightPane) rightPane.scrollTop = 0;
    }, []);

    const {
        summaryData,
        attendanceData,
        timeOffData,
        salaryTrendsChartData,
        departmentSalaryChartData,
        attendanceChartData,
        timeOffChartData,
        loading,
        lastUpdated,
        getSalaryTrendsCsv,
        getDepartmentSalaryCsv,
        getAttendanceCsv,
        getTimeOffCsv,
        getDepartmentBreakdownCsv,
        departmentBreakdownData,
        alertsData,
        refetch,
    } = useDashboardData();

    const lastUpdatedLabel = useMemo(() => {
        if (!lastUpdated) return '';
        return `Updated at ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }, [lastUpdated]);

    const isAnyLoading = Object.values(loading).some(Boolean);

    // Departments list for the filter dropdown (derived from breakdown data)
    const departments = useMemo(() => {
        return departmentBreakdownData
            .filter((d) => d.id && d.name)
            .map((d) => ({ id: d.id, name: d.name }));
    }, [departmentBreakdownData]);

    const handleRefresh = useCallback(() => refetch(), [refetch]);

    return (
        <div className="payroll-dashboard-page">
            {/* Page Header */}
            <div className="dashboard-page-header">
                <div className="dashboard-page-header-left">
                    <BarChart2 size={22} className="dashboard-page-header-icon" />
                    <div>
                        <h1 className="dashboard-page-title">Live Dashboard</h1>
                        <p className="dashboard-page-description">
                            Real-time payroll, attendance, and workforce metrics
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <DashboardFilters
                departments={departments}
                isRefreshing={isAnyLoading}
                lastUpdatedLabel={lastUpdatedLabel}
                onRefresh={handleRefresh}
            />

            {/* KPI Row */}
            <section className="dashboard-section" aria-labelledby="kpi-section-heading">
                <h2 id="kpi-section-heading" className="sr-only">
                    Key Performance Indicators
                </h2>
                <DashboardKpiGrid summaryData={summaryData} loading={loading.summary} />
            </section>

            {/* Main Charts Row */}
            <section
                className="dashboard-section dashboard-charts-row"
                aria-labelledby="charts-heading"
            >
                <h2 id="charts-heading" className="sr-only">
                    Payroll Charts
                </h2>
                <div className="dashboard-chart-primary">
                    <SalaryTrendsChartCard
                        chartData={salaryTrendsChartData}
                        loading={loading.salaryTrends}
                        getCsvData={getSalaryTrendsCsv}
                    />
                </div>
                <div className="dashboard-chart-secondary">
                    <DepartmentSalaryChartCard
                        chartData={departmentSalaryChartData}
                        loading={loading.departmentSalary}
                        getCsvData={getDepartmentSalaryCsv}
                    />
                </div>
            </section>

            {/* Attendance + Time Off Row */}
            <section
                className="dashboard-section dashboard-charts-row"
                aria-labelledby="attendance-heading"
            >
                <h2 id="attendance-heading" className="sr-only">
                    Attendance and Time Off
                </h2>
                <div className="dashboard-chart-primary">
                    <AttendanceTimelineChartCard
                        attendanceSummary={attendanceData}
                        chartData={attendanceChartData}
                        loading={loading.attendance}
                        getCsvData={getAttendanceCsv}
                    />
                </div>
                <div className="dashboard-chart-tertiary">
                    <TimeOffDistributionChartCard
                        chartData={timeOffChartData}
                        timeOffSummary={timeOffData}
                        loading={loading.timeOff}
                        getCsvData={getTimeOffCsv}
                    />
                </div>
            </section>

            {/* Bottom Row: Department Table + Alerts Feed */}
            <section
                className="dashboard-section dashboard-bottom-row"
                aria-labelledby="dept-table-heading"
            >
                <h2 id="dept-table-heading" className="sr-only">
                    Department Breakdown and Alerts
                </h2>
                <div className="dashboard-dept-table">
                    <DepartmentBreakdownTable
                        data={departmentBreakdownData}
                        loading={loading.departmentBreakdown}
                        getCsvData={getDepartmentBreakdownCsv}
                    />
                </div>
                <div className="dashboard-alerts-col">
                    <OperationalAlertsFeed
                        alertsData={alertsData}
                        loading={loading.alerts}
                        onRefresh={handleRefresh}
                    />
                </div>
            </section>
        </div>
    );
}

/**
 * PayrollDashboardPage — Top-level page component for SCR-DASH-001.
 * Wraps the inner dashboard with DashboardProvider state layer.
 */
export default function PayrollDashboardPage() {
    return (
        <DashboardProvider>
            <PayrollDashboardInner />
        </DashboardProvider>
    );
}
