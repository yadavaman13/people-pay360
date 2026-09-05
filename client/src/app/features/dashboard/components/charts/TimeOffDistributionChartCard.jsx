import { useMemo } from 'react';
import ChartCard from '@/components/Shared/Charts/ChartCard/ChartCard';
import { useChartTheme } from '../../hooks/useChartTheme';

/**
 * TimeOffDistributionChartCard — Pie/Donut chart of leave days by type.
 * Per ChartsGuide.md: Categorical composition ≤6 items → Pie/Donut.
 *
 * @param {Array} chartData - [{ name, value, requestsCount, paid, code }]
 * @param {object} timeOffSummary - { approvedDays, pendingRequestsCount, totalRequestsCount, byType }
 * @param {boolean} loading
 * @param {function} getCsvData
 */
function TimeOffDistributionChartCard({ chartData, timeOffSummary, loading = false, getCsvData }) {
    const chartTheme = useChartTheme();
    const {
        palette,
        tooltipBg,
        tooltipBorder,
        tooltipTextColor,
        tooltipSubTextColor,
        axisLabelColor,
        legendTextColor,
        echartsTheme,
    } = chartTheme;

    const totalDays = useMemo(
        () => (chartData || []).reduce((acc, d) => acc + d.value, 0),
        [chartData],
    );

    const option = useMemo(() => {
        if (!chartData || chartData.length === 0) return {};

        return {
            backgroundColor: 'transparent',
            animation: true,
            animationDuration: 700,
            animationEasing: 'cubicOut',
            tooltip: {
                trigger: 'item',
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: tooltipTextColor, fontSize: 12 },
                formatter: (params) => {
                    const d = params.data;
                    const pct = totalDays > 0 ? ((d.value / totalDays) * 100).toFixed(1) : 0;
                    return `<div>
                        <div style="font-weight:600;margin-bottom:4px;color:${tooltipTextColor}">${d.name} <span style="color:${axisLabelColor}">(${d.code || ''})</span></div>
                        <div style="color:${tooltipSubTextColor}">Days taken: <strong style="color:${params.color}">${d.value}</strong></div>
                        <div style="color:${tooltipSubTextColor}">Requests: <strong style="color:${tooltipTextColor}">${d.requestsCount}</strong></div>
                        <div style="color:${tooltipSubTextColor}">Share: <strong style="color:${tooltipTextColor}">${pct}%</strong></div>
                        <div style="color:${tooltipSubTextColor}">Paid leave: <strong style="color:${tooltipTextColor}">${d.paid ? 'Yes' : 'No'}</strong></div>
                    </div>`;
                },
            },
            legend: {
                orient: 'vertical',
                right: 8,
                top: 'middle',
                textStyle: { color: legendTextColor, fontSize: 11 },
                itemWidth: 10,
                itemHeight: 10,
                formatter: (name) => {
                    const d = chartData.find((i) => i.name === name);
                    return `${name} (${d?.value || 0}d)`;
                },
            },
            series: [
                {
                    type: 'pie',
                    radius: ['42%', '70%'],
                    center: ['38%', '50%'],
                    avoidLabelOverlap: true,
                    padAngle: 4,
                    itemStyle: { borderRadius: 5, borderColor: tooltipBg, borderWidth: 2 },
                    label: {
                        show: true,
                        position: 'center',
                        formatter: `{totalLabel|Approved Days}\n{totalValue|${totalDays.toFixed(0)}}`,
                        rich: {
                            totalLabel: { color: axisLabelColor, fontSize: 11, lineHeight: 20 },
                            totalValue: {
                                color: tooltipTextColor,
                                fontSize: 22,
                                fontWeight: 700,
                                lineHeight: 28,
                            },
                        },
                    },
                    emphasis: { label: { show: true }, scaleSize: 5 },
                    selectedMode: 'single',
                    data: chartData.map((d, i) => ({
                        ...d,
                        itemStyle: { color: palette[i % palette.length] },
                    })),
                },
            ],
        };
    }, [
        chartData,
        totalDays,
        palette,
        tooltipBg,
        tooltipBorder,
        tooltipTextColor,
        tooltipSubTextColor,
        axisLabelColor,
        legendTextColor,
    ]);

    const pendingCount = timeOffSummary?.pendingRequestsCount || 0;
    const isEmpty = !loading && (!chartData || chartData.length === 0);

    return (
        <ChartCard
            title="Time-Off Distribution"
            subtitle="Approved leave days by type"
            badge={pendingCount > 0 ? `${pendingCount} pending` : undefined}
            badgeVariant="warning"
            option={option}
            loading={loading}
            isEmpty={isEmpty}
            emptyTitle="No approved leave this period"
            emptyDescription="Approved leave requests will appear here."
            height="280px"
            theme={echartsTheme}
            getCsvData={getCsvData}
        />
    );
}

export default TimeOffDistributionChartCard;
