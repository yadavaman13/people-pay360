import { useMemo } from 'react';
import useTheme from '@/hooks/useTheme';

/**
 * useChartTheme — Provides ECharts-compatible theme configuration based on
 * the application's current light/dark theme state.
 *
 * Returns:
 *  - echartsTheme: 'light' | 'dark' for echarts.init()
 *  - palette: Array of chart series colors
 *  - tooltipBg: Tooltip background CSS value
 *  - tooltipBorder: Tooltip border CSS value
 *  - tooltipTextColor: Tooltip text CSS value
 *  - axisLineColor: Axis line and split line color
 *  - axisLabelColor: Axis label text color
 *  - gridBg: Chart grid background color
 */
export function useChartTheme() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const theme = useMemo(() => {
        if (isDark) {
            return {
                echartsTheme: 'dark',
                // Brand-aligned chart palette for dark mode
                palette: [
                    '#60a5fa', // Blue accent (net salary)
                    '#34d399', // Emerald (gross)
                    '#f87171', // Rose (deductions)
                    '#a78bfa', // Violet
                    '#fbbf24', // Amber
                    '#2dd4bf', // Teal
                    '#f472b6', // Pink
                    '#818cf8', // Indigo
                ],
                tooltipBg: 'rgba(15, 23, 42, 0.95)',
                tooltipBorder: 'rgba(255,255,255,0.08)',
                tooltipTextColor: '#e2e8f0',
                tooltipSubTextColor: '#94a3b8',
                axisLineColor: 'rgba(255,255,255,0.08)',
                axisSplitLineColor: 'rgba(255,255,255,0.04)',
                axisLabelColor: '#94a3b8',
                gridBg: 'transparent',
                legendTextColor: '#cbd5e1',
                dataZoomBg: 'rgba(255,255,255,0.04)',
                dataZoomBorderColor: 'rgba(255,255,255,0.08)',
            };
        }
        return {
            echartsTheme: 'light',
            // Brand-aligned chart palette for light mode
            palette: [
                '#2563eb', // Primary blue (net salary)
                '#059669', // Emerald (gross)
                '#dc2626', // Red (deductions)
                '#7c3aed', // Violet
                '#d97706', // Amber
                '#0d9488', // Teal
                '#db2777', // Pink
                '#4f46e5', // Indigo
            ],
            tooltipBg: 'rgba(255,255,255,0.98)',
            tooltipBorder: 'rgba(0,0,0,0.08)',
            tooltipTextColor: '#111827',
            tooltipSubTextColor: '#6b7280',
            axisLineColor: '#e5e7eb',
            axisSplitLineColor: '#f3f4f6',
            axisLabelColor: '#6b7280',
            gridBg: 'transparent',
            legendTextColor: '#374151',
            dataZoomBg: '#f9fafb',
            dataZoomBorderColor: '#e5e7eb',
        };
    }, [isDark]);

    return theme;
}

export default useChartTheme;
