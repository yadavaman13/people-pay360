import { useState, useCallback, useRef, useMemo } from 'react';
import { DashboardContext } from './DashboardContext';

/**
 * DashboardProvider — State layer for the Live Operational Dashboard.
 * Holds filter state and refresh trigger. No async HTTP logic here.
 *
 * Filters:
 *  - datePreset: 'THIS_MONTH' | 'LAST_30_DAYS' | 'PREV_MONTH' | 'THIS_YEAR' | 'ALL_TIME' | 'CUSTOM'
 *  - periodStart: ISO date string (YYYY-MM-DD) or ''
 *  - periodEnd: ISO date string (YYYY-MM-DD) or ''
 *  - departmentId: UUID string or ''
 *  - employeeType: '' | 'Full-time' | 'Contract'
 */
export function DashboardProvider({ children }) {
    const debounceRef = useRef(null);

    const [datePreset, setDatePreset] = useState('ALL_TIME');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [employeeType, setEmployeeType] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    /**
     * Apply a named date preset, computing actual start/end dates.
     */
    const applyDatePreset = useCallback((preset) => {
        const now = new Date();
        let start, end;
        switch (preset) {
            case 'THIS_MONTH':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = now;
                break;
            case 'LAST_30_DAYS':
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                end = now;
                break;
            case 'PREV_MONTH': {
                const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                start = prevMonthStart;
                end = prevMonthEnd;
                break;
            }
            case 'THIS_YEAR':
                start = new Date(now.getFullYear(), 0, 1);
                end = now;
                break;
            case 'ALL_TIME':
                start = null;
                end = null;
                break;
            default:
                return; // CUSTOM — don't override
        }
        setDatePreset(preset);
        setPeriodStart(start ? start.toISOString().slice(0, 10) : '');
        setPeriodEnd(end ? end.toISOString().slice(0, 10) : '');
    }, []);

    /**
     * Set custom date range (period preset automatically becomes 'CUSTOM')
     */
    const setCustomDateRange = useCallback((start, end) => {
        setDatePreset('CUSTOM');
        setPeriodStart(start || '');
        setPeriodEnd(end || '');
    }, []);

    /**
     * Update department filter with 300ms debounce
     */
    const updateDepartmentId = useCallback((id) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDepartmentId(id);
        }, 300);
    }, []);

    /**
     * Force re-fetch all dashboard data
     */
    const triggerRefresh = useCallback(() => {
        setRefreshTrigger((prev) => prev + 1);
    }, []);

    /**
     * Reset all filters to defaults
     */
    const resetFilters = useCallback(() => {
        applyDatePreset('ALL_TIME');
        setDepartmentId('');
        setEmployeeType('');
    }, [applyDatePreset]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (datePreset !== 'ALL_TIME') count++;
        if (departmentId) count++;
        if (employeeType) count++;
        return count;
    }, [datePreset, departmentId, employeeType]);

    const contextValue = useMemo(
        () => ({
            // Filter state
            datePreset,
            periodStart,
            periodEnd,
            departmentId,
            employeeType,
            refreshTrigger,
            activeFilterCount,
            // Setters
            applyDatePreset,
            setCustomDateRange,
            updateDepartmentId,
            setDepartmentId,
            setEmployeeType,
            triggerRefresh,
            resetFilters,
        }),
        [
            datePreset,
            periodStart,
            periodEnd,
            departmentId,
            employeeType,
            refreshTrigger,
            activeFilterCount,
            applyDatePreset,
            setCustomDateRange,
            updateDepartmentId,
            setDepartmentId,
            setEmployeeType,
            triggerRefresh,
            resetFilters,
        ],
    );

    return <DashboardContext.Provider value={contextValue}>{children}</DashboardContext.Provider>;
}

export { DashboardContext };
