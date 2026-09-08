import { useState, useMemo } from 'react';
import { SchedulesContext } from './SchedulesContext';

export { SchedulesContext };

export function SchedulesProvider({ children }) {
    // List state
    const [schedules, setSchedules] = useState([]);

    // Detail state
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    // Loading flags — mirrors payroll.context.jsx pattern
    const [loading, setLoading] = useState({
        list: false,
        detail: false,
        action: false,
    });

    const [error, setError] = useState(null);

    // Derived value: count of active schedules for MetricCard display
    const activeSchedulesCount = useMemo(
        () => schedules.filter((s) => s.isActive).length,
        [schedules],
    );

    const value = useMemo(
        () => ({
            // 1. Read-only values (consumed by UI via useContext)
            schedules,
            selectedSchedule,
            loading,
            error,
            activeSchedulesCount,

            // 2. Setters (consumed by useSchedules hook ONLY)
            setSchedules,
            setSelectedSchedule,
            setLoading,
            setError,
        }),
        [schedules, selectedSchedule, loading, error, activeSchedulesCount],
    );

    return <SchedulesContext.Provider value={value}>{children}</SchedulesContext.Provider>;
}

export default SchedulesProvider;
