import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import * as timeOffApi from '../services/time-off.api';

const TimeOffContext = createContext(null);

export function TimeOffProvider({ children }) {
    const { user } = useAuth();
    const { pathname } = useLocation();

    const [types, setTypes] = useState([]);
    const [typesLoading, setTypesLoading] = useState(false);
    const [balances, setBalances] = useState([]);
    const [balancesLoading, setBalancesLoading] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0);

    const roleUpper = (user?.role || '').toUpperCase();
    const HR_ROLES = ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];
    const isAdmin = roleUpper === 'ADMIN';
    const isHR = HR_ROLES.includes(roleUpper) || isAdmin;
    const isEmployee = !isHR;

    // Current segment based on URL
    const roleSegment = pathname.includes('/admin/')
        ? 'admin'
        : pathname.includes('/hr/')
          ? 'hr'
          : 'employee';

    // Fetch active leave types catalog
    const loadTypes = useCallback(async () => {
        try {
            setTypesLoading(true);
            const res = await timeOffApi.fetchTimeOffTypes({ isActive: true });
            setTypes(res?.data || []);
        } catch (err) {
            console.error('[TimeOffContext] Failed to load leave types:', err);
        } finally {
            setTypesLoading(false);
        }
    }, []);

    // Fetch leave balances for the authenticated user / employee
    const loadBalances = useCallback(async () => {
        try {
            setBalancesLoading(true);
            const res = await timeOffApi.fetchLeaveBalance();
            setBalances(res?.data || []);
        } catch (err) {
            console.error('[TimeOffContext] Failed to load balances:', err);
        } finally {
            setBalancesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTypes();
        loadBalances();
    }, [loadTypes, loadBalances, refreshCount]);

    const triggerRefresh = useCallback(() => {
        setRefreshCount((prev) => prev + 1);
    }, []);

    const contextValue = useMemo(
        () => ({
            user,
            roleUpper,
            isAdmin,
            isHR,
            isEmployee,
            roleSegment,
            types,
            typesLoading,
            balances,
            balancesLoading,
            refreshCount,
            triggerRefresh,
            loadBalances,
            loadTypes,
        }),
        [
            user,
            roleUpper,
            isAdmin,
            isHR,
            isEmployee,
            roleSegment,
            types,
            typesLoading,
            balances,
            balancesLoading,
            refreshCount,
            triggerRefresh,
            loadBalances,
            loadTypes,
        ],
    );

    return <TimeOffContext.Provider value={contextValue}>{children}</TimeOffContext.Provider>;
}

export function useTimeOff() {
    const context = useContext(TimeOffContext);
    if (!context) {
        throw new Error('useTimeOff must be used within a TimeOffProvider');
    }
    return context;
}
