import { createContext } from 'react';

/**
 * DashboardContext — Holds reactive filter state for the dashboard.
 * Consumed by useDashboardData hook and DashboardFilters UI.
 */
export const DashboardContext = createContext(null);
