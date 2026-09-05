import { useMemo, useState } from 'react';
import ChartCard from '@/components/Shared/Charts/ChartCard/ChartCard';
import { useChartTheme } from '../../hooks/useChartTheme';
import { formatINR, formatINRCompact } from '../../hooks/useDashboardData';

/**
 * DepartmentSalaryChartCard — Pie / Horizontal Bar view of salary distribution per department.
 * Per ChartsGuide.md: Part-to-whole with ≤6 items → Pie/Donut; >6 items → Horizontal Bar.
 *
 * @param {Array} chartData - [{name, value, employeeCount, percentage, id}]
 * @param {boolean} loading
 * @param {function} getCsvData - Returns { headers, rows } for CSV export
 */
function DepartmentSalaryChartCard({ chartData, loading = false, getCsvData }) {
    const [viewMode, setViewMode] = useState(0); // 0=Donut, 1=Bar
    const chartTheme = useChartTheme();
    const {
        palette,
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

    const isDonut = viewMode === 0 || (chartData && chartData.length <= 6);

    const option = useMemo(() => {
        if (!chartData || chartData.length === 0) return {};

        const total = chartData.reduce((acc, d) => acc + d.value, 0);

        if (isDonut && viewMode === 0) {
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
                    textStyle: { color: tooltipTextColor, fontSize: 13 },
                    formatter: (params) => {
                        const d = params.data;
                        return `<div>
                            <div style="font-weight:600;margin-bottom:4px;color:${tooltipTextColor}">${d.name}</div>
                            <div style="color:${tooltipSubTextColor}">Net Pay: <strong style="color:${tooltipTextColor}">${formatINR(d.value)}</strong></div>
                            <div style="color:${tooltipSubTextColor}">Share: <strong style="color:${palette[params.dataIndex % palette.length]}">${d.percentage || params.percent?.toFixed(1)}%</strong></div>
                            <div style="color:${tooltipSubTextColor}">Employees: <strong style="color:${tooltipTextColor}">${d.employeeCount || '—'}</strong></div>
                        </div>`;
                    },
                },
                legend: {
                    orient: 'vertical',
                    right: 10,
                    top: 'middle',
                    textStyle: { color: legendTextColor, fontSize: 12 },
                    formatter: (name) => {
                        const d = chartData.find((i) => i.name === name);
                        return `${name} (${d?.percentage || ''}%)`;
                    },
                    itemWidth: 10,
                    itemHeight: 10,
                },
                series: [
                    {
                        type: 'pie',
                        radius: ['45%', '75%'],
                        center: ['38%', '50%'],
                        avoidLabelOverlap: true,
                        padAngle: 3,
                        itemStyle: { borderRadius: 6, borderColor: tooltipBg, borderWidth: 2 },
                        label: {
                            show: true,
                            position: 'center',
                            formatter: `{totalLabel|Total}\n{totalValue|${formatINRCompact(total)}}`,
                            rich: {
                                totalLabel: { color: axisLabelColor, fontSize: 12, lineHeight: 22 },
                                totalValue: {
                                    color: tooltipTextColor,
                                    fontSize: 16,
                                    fontWeight: 700,
                                    lineHeight: 24,
                                },
                            },
                        },
                        emphasis: {
                            label: { show: true },
                            scaleSize: 6,
                        },
                        data: chartData.map((d, i) => ({
                            ...d,
                            itemStyle: { color: palette[i % palette.length] },
                        })),
                    },
                ],
            };
        }

        // Horizontal Bar view
        const sorted = [...chartData].sort((a, b) => b.value - a.value);
        return {
            backgroundColor: 'transparent',
            animation: true,
            grid: { left: 10, right: 80, top: 8, bottom: 8, containLabel: true },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'none' },
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: [8, 12],
                textStyle: { color: tooltipTextColor, fontSize: 12 },
                formatter: (params) => {
                    const p = params[0];
                    const d = sorted[p.dataIndex];
                    return `<div><strong style="color:${tooltipTextColor}">${d.name}</strong><br/>
                        Net: <strong>${formatINR(d.value)}</strong><br/>
                        Employees: ${d.employeeCount}</div>`;
                },
            },
            xAxis: {
                type: 'value',
                axisLabel: {
                    formatter: (v) => formatINRCompact(v),
                    color: axisLabelColor,
                    fontSize: 11,
                },
                splitLine: { lineStyle: { color: axisSplitLineColor, type: 'dashed' } },
                axisLine: { lineStyle: { color: axisLineColor } },
            },
            yAxis: {
                type: 'category',
                data: sorted.map((d) => d.name),
                axisLabel: {
                    color: axisLabelColor,
                    fontSize: 11,
                    width: 100,
                    overflow: 'truncate',
                },
                axisLine: { show: false },
                axisTick: { show: false },
            },
            series: [
                {
                    type: 'bar',
                    data: sorted.map((d, i) => ({
                        value: d.value,
                        itemStyle: {
                            color: palette[i % palette.length],
                            borderRadius: [0, 4, 4, 0],
                        },
                    })),
                    label: {
                        show: true,
                        position: 'right',
                        formatter: (p) => formatINRCompact(p.value),
                        color: axisLabelColor,
                        fontSize: 11,
                    },
                    barMaxWidth: 28,
                },
            ],
        };
    }, [
        chartData,
        isDonut,
        viewMode,
        palette,
        tooltipBg,
        tooltipBorder,
        tooltipTextColor,
        tooltipSubTextColor,
        axisLineColor,
        axisSplitLineColor,
        axisLabelColor,
        legendTextColor,
    ]);

    const isEmpty = !loading && (!chartData || chartData.length === 0);

    return (
        <ChartCard
            title="Salary by Department"
            subtitle="Net pay distribution across departments"
            option={option}
            loading={loading}
            isEmpty={isEmpty}
            emptyTitle="No department salary data"
            emptyDescription="Process payslips to see department-wise salary breakdown."
            height="320px"
            theme={echartsTheme}
            viewModes={['Donut', 'Bar']}
            activeViewMode={viewMode}
            onViewModeChange={setViewMode}
            getCsvData={getCsvData}
        />
    );
}

export default DepartmentSalaryChartCard;
