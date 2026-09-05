import { useRef, useCallback } from 'react';
import { Maximize2, Download, RotateCcw, BarChart2, LineChart } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/Shared/DataDisplay/Card/Card';
import Button from '@/components/Shared/Buttons/Button/Button';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import BaseChart from '../BaseChart/BaseChart';
import './ChartCard.scss';

/**
 * ChartCard — Wraps BaseChart in a design-system Card with:
 * - Header (title, subtitle, badge, view switcher, timeframe buttons, export, fullscreen, reset)
 * - Fullscreen modal overlay
 * - CSV and PNG export helpers
 *
 * @param {string} title - Card header title
 * @param {string} subtitle - Card header subtitle
 * @param {string} badge - Optional badge label
 * @param {string} badgeVariant - Badge color variant
 * @param {object} option - ECharts option for the chart
 * @param {boolean} loading - Pass-through loading state
 * @param {boolean} isEmpty - Pass-through empty state
 * @param {string} height - Chart canvas height (default '300px')
 * @param {string} theme - 'light' | 'dark'
 * @param {string[]} viewModes - Array of view mode labels (e.g. ['Line', 'Area'])
 * @param {number} activeViewMode - Index of active view mode
 * @param {function} onViewModeChange - (index) => void
 * @param {string[]} timeframes - Array of timeframe labels (e.g. ['3M','6M','12M'])
 * @param {string} activeTimeframe - Active timeframe label
 * @param {function} onTimeframeChange - (label) => void
 * @param {function} getCsvData - () => { headers, rows } for CSV export
 * @param {string} className - Additional class for card wrapper
 * @param {React.ReactNode} headerRight - Extra slot for header right area
 */
function ChartCard({
    title = '',
    subtitle = '',
    badge = '',
    badgeVariant = 'info',
    option = {},
    loading = false,
    isEmpty = false,
    emptyTitle,
    emptyDescription,
    height = '300px',
    theme = 'light',
    viewModes = [],
    activeViewMode = 0,
    onViewModeChange = null,
    timeframes = [],
    activeTimeframe = '',
    onTimeframeChange = null,
    getCsvData = null,
    className = '',
    headerRight = null,
    children = null,
}) {
    const chartInstanceRef = useRef(null);

    const handleExportPng = useCallback(() => {
        const instance = chartInstanceRef.current;
        if (!instance) return;
        const url = instance.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: 'transparent',
        });
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_chart.png`;
        link.click();
    }, [title]);

    const handleExportCsv = useCallback(() => {
        if (!getCsvData) return;
        const { headers, rows } = getCsvData();
        const csvContent = [
            headers.join(','),
            ...rows.map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
            ),
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_data.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, [getCsvData, title]);

    const handleResetZoom = useCallback(() => {
        const instance = chartInstanceRef.current;
        if (!instance) return;
        instance.dispatchAction({ type: 'dataZoom', start: 0, end: 100 });
    }, []);

    const handleChartReady = useCallback((instance) => {
        chartInstanceRef.current = instance;
    }, []);

    const viewModeIcons = [<LineChart size={14} />, <BarChart2 size={14} />];

    return (
        <Card className={`chart-card ${className}`}>
            <CardHeader className="chart-card-header">
                <div className="chart-card-header-left">
                    <div className="chart-card-title-row">
                        <CardTitle className="chart-card-title">{title}</CardTitle>
                        {badge && (
                            <Badge variant={badgeVariant} className="chart-card-badge">
                                {badge}
                            </Badge>
                        )}
                    </div>
                    {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
                </div>

                <div className="chart-card-header-right">
                    {/* View Mode Switcher */}
                    {viewModes.length > 1 && (
                        <div className="chart-card-view-switcher">
                            {viewModes.map((mode, i) => (
                                <button
                                    key={mode}
                                    className={`chart-view-btn ${activeViewMode === i ? 'is-active' : ''}`}
                                    onClick={() => onViewModeChange && onViewModeChange(i)}
                                    title={mode}
                                    aria-label={`Switch to ${mode} view`}
                                >
                                    {viewModeIcons[i] || mode}
                                    <span className="chart-view-btn-label">{mode}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Timeframe Selector */}
                    {timeframes.length > 0 && (
                        <div className="chart-card-timeframes">
                            {timeframes.map((tf) => (
                                <button
                                    key={tf}
                                    className={`chart-timeframe-btn ${activeTimeframe === tf ? 'is-active' : ''}`}
                                    onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                                    aria-label={`Show ${tf} data`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    )}

                    {headerRight}

                    {/* Action Buttons */}
                    <div className="chart-card-actions">
                        <Button
                            icon={<RotateCcw size={14} />}
                            onClick={handleResetZoom}
                            title="Reset zoom"
                            aria-label="Reset zoom"
                            variant="ghost"
                            size="sm"
                        />
                        {getCsvData && (
                            <Button
                                icon={<Download size={14} />}
                                onClick={handleExportCsv}
                                title="Export CSV"
                                aria-label="Export data as CSV"
                                variant="ghost"
                                size="sm"
                            />
                        )}
                        <Button
                            icon={<Maximize2 size={14} />}
                            onClick={handleExportPng}
                            title="Download chart as PNG"
                            aria-label="Download chart as PNG"
                            variant="ghost"
                            size="sm"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="chart-card-content">
                {children}
                <BaseChart
                    option={option}
                    loading={loading}
                    isEmpty={isEmpty}
                    emptyTitle={emptyTitle}
                    emptyDescription={emptyDescription}
                    height={height}
                    theme={theme}
                    onChartReady={handleChartReady}
                />
            </CardContent>
        </Card>
    );
}

export default ChartCard;
