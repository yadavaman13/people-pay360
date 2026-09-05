import { useEffect, useRef, useCallback } from 'react';
import * as echarts from 'echarts';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import './BaseChart.scss';

/**
 * BaseChart — Manages ECharts lifecycle, theme sync, ResizeObserver, and empty/loading states.
 * All chart components in the dashboard use this as the rendering foundation.
 *
 * @param {object} option - ECharts option object
 * @param {boolean} loading - Show loading spinner overlay
 * @param {boolean} isEmpty - Show empty state illustration
 * @param {string} emptyTitle - Empty state heading text
 * @param {string} emptyDescription - Empty state description text
 * @param {string} theme - ECharts theme name ('light' | 'dark')
 * @param {string} className - Additional CSS classes
 * @param {string} height - CSS height string (default '320px')
 * @param {object} ref - Forwarded ref receives ECharts instance via getChart()
 * @param {function} onChartReady - Callback (chartInstance) => void
 */
function BaseChart({
    option = {},
    loading = false,
    isEmpty = false,
    emptyTitle = 'No data available',
    emptyDescription = 'Data will appear here once records are created.',
    theme = 'light',
    className = '',
    height = '320px',
    onChartReady = null,
}) {
    const containerRef = useRef(null);
    const chartRef = useRef(null);
    const prevThemeRef = useRef(theme);

    const initChart = useCallback(() => {
        if (!containerRef.current) return;

        // Dispose previous instance if theme changed (theme can't be changed post-init)
        if (chartRef.current && prevThemeRef.current !== theme) {
            chartRef.current.dispose();
            chartRef.current = null;
        }
        prevThemeRef.current = theme;

        if (!chartRef.current) {
            chartRef.current = echarts.init(containerRef.current, theme, { renderer: 'canvas' });
        }

        chartRef.current.setOption(option, { notMerge: false, lazyUpdate: true });

        if (onChartReady) onChartReady(chartRef.current);
    }, [option, theme, onChartReady]);

    useEffect(() => {
        if (!isEmpty && !loading) {
            initChart();
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.dispose();
                chartRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update option when it changes
    useEffect(() => {
        if (chartRef.current && !isEmpty && !loading) {
            chartRef.current.setOption(option, { notMerge: false, lazyUpdate: true });
        }
    }, [option, isEmpty, loading]);

    // Re-init when theme changes
    useEffect(() => {
        if (!isEmpty && !loading) {
            initChart();
        }
    }, [theme, initChart, isEmpty, loading]);

    // ResizeObserver for container dimension changes
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(() => {
            if (chartRef.current) {
                chartRef.current.resize();
            }
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    if (loading) {
        return (
            <div className={`base-chart-container is-loading ${className}`} style={{ height }}>
                <div className="base-chart-loading-overlay">
                    <Spinner />
                    <span className="base-chart-loading-text">Loading chart data…</span>
                </div>
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className={`base-chart-container is-empty ${className}`} style={{ height }}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`base-chart-container ${className}`}
            style={{ height, width: '100%' }}
        />
    );
}

export default BaseChart;
