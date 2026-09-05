import { useContext } from 'react';
import { DashboardContext } from '../context/DashboardContext';

/**
 * useDashboard — Convenience hook for consuming DashboardContext.
 * Must be used within DashboardProvider.
 */
export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
