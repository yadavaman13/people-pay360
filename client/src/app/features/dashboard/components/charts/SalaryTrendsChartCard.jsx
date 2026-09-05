import { useMemo, useState } from 'react';
import ChartCard from '@/components/Shared/Charts/ChartCard/ChartCard';
import { useChartTheme } from '../../hooks/useChartTheme';
import { formatINR } from '../../hooks/useDashboardData';

/**
 * SalaryTrendsChartCard — Multi-line / Stacked Area chart of monthly payroll trends.
 * Per ChartsGuide.md: Time series with 3 metrics → Multi-Line with Area gradient fill.
 *
 * @param {object} chartData - { labels, netSeries, grossSeries, deductionSeries }
 * @param {boolean} loading
 * @param {function} getCsvData - Returns { headers, rows } for CSV export
 */
function SalaryTrendsChartCard({ chartData, loading = false, getCsvData }) {
    const [viewMode, setViewMode] = useState(0); // 0=Line, 1=Stacked Area
    const [timeframe, setTimeframe] = useState('6M');
    const chartTheme = useChartTheme();

    const displayData = useMemo(() => {
        if (!chartData) return null;
        const { labels, netSeries, grossSeries, deductionSeries } = chartData;
        const monthsMap = { '3M': 3, '6M': 6, '12M': 12 };
        const limit = monthsMap[timeframe] || 6;
        return {
            labels: labels.slice(-limit),
            netSeries: netSeries.slice(-limit),
            grossSeries: grossSeries.slice(-limit),
            deductionSeries: deductionSeries.slice(-limit),
        };
    }, [chartData, timeframe]);

    const isAreaMode = viewMode === 1;
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
        dataZoomBg,
        dataZoomBorderColor,
        echartsTheme,
    } = chartTheme;

    const option = useMemo(() => {
        if (!displayData) return {};
        const { labels, netSeries, grossSeries, deductionSeries } = displayData;

        const makeArea = (enabled) =>
            enabled
                ? {
                      opacity: 0.12,
                      color: {
                          type: 'linear',
                          x: 0,
                          y: 0,
                          x2: 0,
                          y2: 1,
                          colorStops: [
                              { offset: 0, color: 'inherit' },
                              { offset: 1, color: 'rgba(0,0,0,0)' },
                          ],
                      },
                  }
                : undefined;

        const formatAxis = (val) => {
            if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
            if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
            if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
            return `₹${val}`;
        };

        return {
            backgroundColor: 'transparent',
            animation: true,
            animationDuration: 600,
            animationEasing: 'cubicOut',
            grid: { left: 10, right: 16, bottom: 50, top: 20, containLabel: true },
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
                axisPointer: { type: 'cross', crossStyle: { color: palette[0] } },
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: tooltipTextColor, fontSize: 13 },
                formatter: (params) => {
                    if (!params?.length) return '';
                    const month = params[0].axisValue;
                    let html = `<div style="font-weight:600;margin-bottom:6px;color:${tooltipTextColor}">${month}</div>`;
                    params.forEach((p) => {
                        html += `<div style="display:flex;justify-content:space-between;gap:20px;margin:3px 0">
                            <span style="display:flex;align-items:center;gap:6px;color:${tooltipSubTextColor}">
                                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
                                ${p.seriesName}
                            </span>
                            <span style="font-weight:600;color:${tooltipTextColor}">${formatINR(p.value)}</span>
                        </div>`;
                    });
                    return html;
                },
            },
            xAxis: {
                type: 'category',
                data: labels,
                axisLine: { lineStyle: { color: axisLineColor } },
                axisTick: { show: false },
                axisLabel: {
                    color: axisLabelColor,
                    fontSize: 11,
                    rotate: labels.length > 6 ? 25 : 0,
                },
                splitLine: { show: false },
                boundaryGap: false,
            },
            yAxis: {
                type: 'value',
                axisLabel: { color: axisLabelColor, fontSize: 11, formatter: formatAxis },
                splitLine: { lineStyle: { color: axisSplitLineColor, type: 'dashed' } },
                axisLine: { show: false },
                axisTick: { show: false },
            },
            dataZoom: [
                {
                    type: 'slider',
                    bottom: 40,
                    height: 20,
                    backgroundColor: dataZoomBg,
                    borderColor: dataZoomBorderColor,
                    textStyle: { color: axisLabelColor, fontSize: 10 },
                    show: labels.length > 8,
                    startValue: Math.max(0, labels.length - 8),
                    endValue: labels.length - 1,
                },
            ],
            series: [
                {
                    name: 'Net Salary',
                    type: 'line',
                    data: netSeries,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: { width: 2.5, color: palette[0] },
                    itemStyle: { color: palette[0] },
                    areaStyle: isAreaMode ? makeArea(true) : undefined,
                    z: 3,
                },
                {
                    name: 'Gross Salary',
                    type: 'line',
                    data: grossSeries,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: { width: 2, color: palette[1] },
                    itemStyle: { color: palette[1] },
                    areaStyle: isAreaMode ? { opacity: 0.08, color: palette[1] } : undefined,
                    z: 2,
                },
                {
                    name: 'Deductions',
                    type: 'line',
                    data: deductionSeries,
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: { width: 2, color: palette[2], type: 'dashed' },
                    itemStyle: { color: palette[2] },
                    areaStyle: isAreaMode ? { opacity: 0.06, color: palette[2] } : undefined,
                    z: 1,
                },
            ],
        };
    }, [
        displayData,
        isAreaMode,
        palette,
        tooltipBg,
        tooltipBorder,
        tooltipTextColor,
        tooltipSubTextColor,
        axisLineColor,
        axisSplitLineColor,
        axisLabelColor,
        legendTextColor,
        dataZoomBg,
        dataZoomBorderColor,
    ]);

    const isEmpty = !loading && (!chartData || chartData.labels?.length === 0);

    return (
        <ChartCard
            title="Payroll Expenditure Trends"
            subtitle="Monthly Net, Gross & Deductions progression"
            option={option}
            loading={loading}
            isEmpty={isEmpty}
            emptyTitle="No payroll history yet"
            emptyDescription="Payslip data will appear here once payruns are processed."
            height="320px"
            theme={echartsTheme}
            viewModes={['Line', 'Area']}
            activeViewMode={viewMode}
            onViewModeChange={setViewMode}
            timeframes={['3M', '6M', '12M']}
            activeTimeframe={timeframe}
            onTimeframeChange={setTimeframe}
            getCsvData={getCsvData}
        />
    );
}

export default SalaryTrendsChartCard;
