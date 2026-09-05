import { useMemo } from 'react';
import {
    DollarSign,
    FileText,
    TrendingUp,
    UserCheck,
    Calendar,
    AlertTriangle,
    Lock,
} from 'lucide-react';
import MetricCard, { MetricCardGrid } from '@/components/Shared/DataDisplay/MetricCard/MetricCard';
import { formatINRCompact } from '../../hooks/useDashboardData';
import './DashboardKpiGrid.scss';

/**
 * DashboardKpiGrid — Renders 5 primary KPI MetricCards from the /api/dashboard/summary response.
 * Handles role-aware rendering: HR_MANAGER sees a "restricted" card for financial metrics.
 *
 * @param {object} summaryData - Raw data from fetchDashboardSummary()
 * @param {boolean} loading - Show skeleton/spinner overlay
 */
function DashboardKpiGrid({ summaryData, loading = false }) {
    const kpiCards = useMemo(() => {
        if (!summaryData) return [];

        const payroll = summaryData.payroll || {};
        const workforce = summaryData.workforce || {};
        const attendance = summaryData.attendance || {};
        const timeOff = summaryData.timeOff || {};
        const payruns = summaryData.payruns || {};

        const isRestricted = payroll.payrollAccessRestricted;

        const cards = [];

        // ── Card 1: Total Net Salary ─────────────────────────────────────
        if (isRestricted) {
            cards.push({
                id: 'net-salary',
                label: 'Payroll Access',
                value: 'Restricted',
                icon: Lock,
                iconColor: 'var(--color-warning)',
                trend: 'HR Manager role has limited financial access',
                trendType: 'neutral',
            });
        } else {
            const net = Number(payroll.totalNetPaid || 0);
            const gross = Number(payroll.totalGross || 0);
            const deductions = Number(payroll.totalDeductions || 0);
            cards.push({
                id: 'net-salary',
                label: 'Total Net Salary Disbursed',
                value: formatINRCompact(net),
                icon: DollarSign,
                iconColor: 'var(--color-blue-accent)',
                trend:
                    gross > 0
                        ? `Gross: ${formatINRCompact(gross)} · Deductions: ${formatINRCompact(deductions)}`
                        : 'No payslips processed yet',
                trendType: net > 0 ? 'positive' : 'neutral',
            });
        }

        // ── Card 2: Payslips Generated ────────────────────────────────────
        if (!isRestricted) {
            const count = payroll.payslipsGenerated || 0;
            const paidPayruns = payruns.paid || 0;
            const validatedPayruns = payruns.validated || 0;
            cards.push({
                id: 'payslips',
                label: 'Payslips Generated',
                value: count.toLocaleString('en-IN'),
                icon: FileText,
                iconColor: 'var(--color-teal)',
                trend: `${paidPayruns} Paid · ${validatedPayruns} Validated batches`,
                trendType: count > 0 ? 'positive' : 'neutral',
            });
        }

        // ── Card 3: Average Net Salary ─────────────────────────────────────
        if (!isRestricted) {
            const avg = Number(payroll.averageNetSalary || 0);
            cards.push({
                id: 'avg-salary',
                label: 'Average Net Salary',
                value: formatINRCompact(avg),
                icon: TrendingUp,
                iconColor: 'var(--color-violet)',
                trend: `Per employee in selected period`,
                trendType: avg > 0 ? 'positive' : 'neutral',
            });
        }

        // ── Card 4: Workforce / Headcount ─────────────────────────────────
        const totalEmp = workforce.totalEmployees || 0;
        const activeEmp = workforce.activeEmployees || 0;
        cards.push({
            id: 'headcount',
            label: 'Active Employees',
            value: activeEmp.toLocaleString('en-IN'),
            icon: UserCheck,
            iconColor: 'var(--color-success)',
            trend: `${totalEmp} total registered · ${activeEmp} active`,
            trendType: activeEmp > 0 ? 'positive' : 'neutral',
        });

        // ── Card 5: Attendance Health ──────────────────────────────────────
        const attHealth = attendance.healthRate || '0.0%';
        const presentCount = attendance.presentCount || 0;
        const lateCount = attendance.lateCount || 0;
        const missingCheckouts = attendance.missingCheckouts || 0;
        cards.push({
            id: 'attendance',
            label: 'Attendance Health Rate',
            value: attHealth,
            icon: UserCheck,
            iconColor: 'var(--color-success)',
            trend: `Present: ${presentCount} · Late: ${lateCount}${missingCheckouts > 0 ? ` · ${missingCheckouts} missing checkout` : ''}`,
            trendType: parseFloat(attHealth) >= 80 ? 'positive' : 'negative',
        });

        // ── Card 6: Time Off ────────────────────────────────────────────────
        const approvedDays = Number(timeOff.approvedDays || 0);
        const pendingCount = timeOff.pendingRequestsCount || 0;
        cards.push({
            id: 'time-off',
            label: 'Approved Leave Days',
            value: approvedDays.toFixed(0),
            icon: Calendar,
            iconColor: pendingCount > 0 ? 'var(--color-warning)' : 'var(--color-info)',
            trend:
                pendingCount > 0
                    ? `⚠ ${pendingCount} requests pending approval`
                    : 'No pending requests',
            trendType: pendingCount > 0 ? 'negative' : 'neutral',
        });

        return cards;
    }, [summaryData]);

    if (loading) {
        return (
            <div className="dashboard-kpi-grid dashboard-kpi-grid--loading">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="kpi-skeleton-card" aria-hidden="true">
                        <div className="kpi-skeleton-label" />
                        <div className="kpi-skeleton-value" />
                        <div className="kpi-skeleton-trend" />
                    </div>
                ))}
            </div>
        );
    }

    if (!summaryData) {
        return (
            <div className="dashboard-kpi-grid dashboard-kpi-grid--error">
                <div className="kpi-error-state">
                    <AlertTriangle size={20} />
                    <span>Failed to load KPI metrics. Please refresh.</span>
                </div>
            </div>
        );
    }

    return (
        <MetricCardGrid columns={Math.min(kpiCards.length, 4)} className="dashboard-kpi-grid">
            {kpiCards.map((card) => (
                <MetricCard
                    key={card.id}
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                    iconColor={card.iconColor}
                    trend={card.trend}
                    trendType={card.trendType}
                    showTrend
                    className="dashboard-kpi-card"
                />
            ))}
        </MetricCardGrid>
    );
}

export default DashboardKpiGrid;
