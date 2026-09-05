import MetricCard from '@/components/Shared/DataDisplay/MetricCard/MetricCard';
import Button from '@/components/Shared/Buttons/Button/Button';
import {
    UserCheck,
    Clock,
    UserX,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar,
    TrendingUp,
} from 'lucide-react';

export default function AttendanceSummaryCards({
    isHR = false,
    summaryMetrics = {},
    employeeMonthlySummary = {},
    selectedMonth = new Date(),
    onMonthChange,
}) {
    if (isHR) {
        return (
            <section className="summary-cards-section">
                <div className="metric-cards-grid">
                    <MetricCard
                        title="Total Present"
                        value={String(summaryMetrics.presentCount ?? 0)}
                        icon={UserCheck}
                        variant="default"
                        trend="+ Today"
                        trendType="positive"
                    />
                    <MetricCard
                        title="Late Arrivals"
                        value={String(summaryMetrics.lateCount ?? 0)}
                        icon={Clock}
                        variant="default"
                        trend="Action Needed"
                        trendType="negative"
                    />
                    <MetricCard
                        title="Absent"
                        value={String(summaryMetrics.absentCount ?? 0)}
                        icon={UserX}
                        variant="default"
                        trend="Unexcused"
                        trendType="negative"
                    />
                    <MetricCard
                        title="Missing Checkout"
                        value={String(
                            summaryMetrics.missingCheckoutCount ?? summaryMetrics.halfDayCount ?? 0,
                        )}
                        icon={AlertCircle}
                        variant="default"
                        trend="Pending"
                        trendType="neutral"
                    />
                </div>
            </section>
        );
    }

    // Employee Monthly View with Month Navigator
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
    const formattedMonth = monthFormatter.format(
        selectedMonth instanceof Date ? selectedMonth : new Date(),
    );

    return (
        <section className="summary-cards-section">
            <div className="month-navigator-bar">
                <div className="month-title">
                    <span>
                        Monthly Summary: <strong>{formattedMonth}</strong>
                    </span>
                </div>
                <div className="nav-buttons-group">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMonthChange && onMonthChange(-1)}
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={16} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMonthChange && onMonthChange(new Date())}
                    >
                        Current Month
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMonthChange && onMonthChange(1)}
                        aria-label="Next month"
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>

            <div className="metric-cards-grid">
                <MetricCard
                    title="Days Present"
                    value={String(employeeMonthlySummary.presentDays ?? 0)}
                    icon={UserCheck}
                    variant="default"
                    trend="This Month"
                    trendType="positive"
                />
                <MetricCard
                    title="Late / Half Days"
                    value={String(
                        (employeeMonthlySummary.lateDays ?? 0) +
                            (employeeMonthlySummary.halfDays ?? 0),
                    )}
                    icon={Clock}
                    variant="default"
                    trend="Needs Attention"
                    trendType="neutral"
                />
                <MetricCard
                    title="Total Recorded Punches"
                    value={String(employeeMonthlySummary.totalPunches ?? 0)}
                    icon={Calendar}
                    variant="default"
                    trend="Punches Logged"
                    trendType="neutral"
                />
                <MetricCard
                    title="Avg Daily Hours"
                    value={`${employeeMonthlySummary.avgDailyHrs ?? '0.0'} hrs`}
                    icon={TrendingUp}
                    variant="default"
                    trend="Target: 8.0 hrs"
                    trendType="positive"
                />
            </div>
        </section>
    );
}
