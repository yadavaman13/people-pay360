import { useMemo } from 'react';
import ChartCard from '@/components/Shared/Charts/ChartCard/ChartCard';
import { useChartTheme } from '../../hooks/useChartTheme';

const COLORS = {
    present: '#22c55e',
    late: '#f59e0b',
    absent: '#ef4444',
};

/**
 * AttendanceTimelineChartCard — Stacked Bar chart showing daily attendance breakdown.
 * Per ChartsGuide.md: Composition over time with categories → Stacked Bar.
 *
 * @param {object} attendanceSummary - { totalRecords, presentCount, absentCount, lateCount, healthRate, dailyTimeline }
 * @param {object} chartData - { dates, present, late, absent }
 * @param {boolean} loading
 * @param {function} getCsvData - Returns { headers, rows } for CSV export
 */
function AttendanceTimelineChartCard({
    attendanceSummary,
    chartData,
    loading = false,
    getCsvData,
}) {
    const chartTheme = useChartTheme();
    const {
        tooltipBg,
        tooltipBorder,
        tooltipTextColor,
        tooltipSubTextColor,
        axisLineColor,
        axisSplitLineColor,
        axisLabelColor,
        legendTextColor,
        echartsTheme,
    } = chartTheme;

    const option = useMemo(() => {
        if (!chartData) return {};
        const { dates, present, late, absent } = chartData;

        const formatDate = (d) => {
            const dt = new Date(d);
            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        };

        return {
            backgroundColor: 'transparent',
            animation: true,
            animationDuration: 600,
            animationEasing: 'cubicOut',
            grid: { left: 10, right: 10, bottom: 50, top: 10, containLabel: true },
            legend: {
                bottom: 0,
                itemGap: 20,
                textStyle: { color: legendTextColor, fontSize: 12 },
                icon: 'circle',
                itemWidth: 8,
                itemHeight: 8,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: tooltipTextColor, fontSize: 12 },
                formatter: (params) => {
                    if (!params?.length) return '';
                    const dateLabel = params[0].axisValue;
                    const totalPresent = params.find((p) => p.seriesName === 'Present')?.value || 0;
                    const totalLate = params.find((p) => p.seriesName === 'Late')?.value || 0;
                    const totalAbsent = params.find((p) => p.seriesName === 'Absent')?.value || 0;
                    const total = totalPresent + totalLate + totalAbsent;
                    const rate =
                        total > 0 ? (((totalPresent + totalLate) / total) * 100).toFixed(1) : '0.0';
                    return `<div>
                        <div style="font-weight:600;margin-bottom:6px;color:${tooltipTextColor}">${dateLabel}</div>
                        <div style="color:${tooltipSubTextColor}">Present: <strong style="color:${COLORS.present}">${totalPresent}</strong></div>
                        <div style="color:${tooltipSubTextColor}">Late: <strong style="color:${COLORS.late}">${totalLate}</strong></div>
                        <div style="color:${tooltipSubTextColor}">Absent: <strong style="color:${COLORS.absent}">${totalAbsent}</strong></div>
                        <div style="margin-top:4px;color:${tooltipSubTextColor}">Attendance Rate: <strong style="color:${tooltipTextColor}">${rate}%</strong></div>
                    </div>`;
                },
            },
            xAxis: {
                type: 'category',
                data: dates.map(formatDate),
                axisLine: { lineStyle: { color: axisLineColor } },
                axisTick: { show: false },
                axisLabel: {
                    color: axisLabelColor,
                    fontSize: 10,
                    rotate: dates.length > 10 ? 30 : 0,
                },
                splitLine: { show: false },
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: axisLabelColor, fontSize: 11, formatter: (v) => v.toFixed(0) },
                splitLine: { lineStyle: { color: axisSplitLineColor, type: 'dashed' } },
                axisLine: { show: false },
                axisTick: { show: false },
                minInterval: 1,
            },
            series: [
                {
                    name: 'Present',
                    type: 'bar',
                    stack: 'attendance',
                    data: present,
                    itemStyle: { color: COLORS.present, borderRadius: [0, 0, 0, 0] },
                    emphasis: { focus: 'series' },
                    barMaxWidth: 32,
                },
                {
                    name: 'Late',
                    type: 'bar',
                    stack: 'attendance',
                    data: late,
                    itemStyle: { color: COLORS.late },
                    emphasis: { focus: 'series' },
                },
                {
                    name: 'Absent',
                    type: 'bar',
                    stack: 'attendance',
                    data: absent,
                    itemStyle: { color: COLORS.absent, borderRadius: [3, 3, 0, 0] },
                    emphasis: { focus: 'series' },
                },
            ],
        };
    }, [
        chartData,
        tooltipBg,
        tooltipBorder,
        tooltipTextColor,
        tooltipSubTextColor,
        axisLineColor,
        axisSplitLineColor,
        axisLabelColor,
        legendTextColor,
    ]);

    const healthRate = attendanceSummary?.healthRate || '—';
    const isEmpty = !loading && !chartData;

    return (
        <ChartCard
            title="Daily Attendance Timeline"
            subtitle="14-day Present / Late / Absent breakdown"
            badge={healthRate}
            badgeVariant={parseFloat(healthRate) >= 80 ? 'success' : 'warning'}
            option={option}
            loading={loading}
            isEmpty={isEmpty}
            emptyTitle="No attendance data"
            emptyDescription="Attendance records will appear here once employees are checked in."
            height="300px"
            theme={echartsTheme}
            getCsvData={getCsvData}
        />
    );
}

export default AttendanceTimelineChartCard;
