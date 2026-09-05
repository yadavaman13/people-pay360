import { useState, useMemo } from 'react';
import { PayrollContext } from './PayrollContext';

export { PayrollContext };

export function PayrollProvider({ children }) {
    // List state
    const [payruns, setPayruns] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalRecords: 0,
        totalPages: 1,
    });
    const [filters, setFilters] = useState({
        search: '',
        year: 'All',
        status: 'All',
    });

    // Detail & lifecycle state
    const [selectedPayrun, setSelectedPayrun] = useState(null);
    const [payslips, setPayslips] = useState([]);
    const [warnings, setWarnings] = useState({
        summary: {
            blockersCount: 0,
            warningsCount: 0,
            totalAlerts: 0,
            canValidate: true,
        },
        alerts: [],
    });

    // Wizard support state
    const [salaryStructures, setSalaryStructures] = useState([]);

    // Loading & Error states
    const [loading, setLoading] = useState({
        list: false,
        detail: false,
        action: false,
        wizard: false,
    });
    const [error, setError] = useState(null);

    // Derived values
    const filteredPayruns = useMemo(() => {
        let result = [...payruns];

        if (filters.status && filters.status !== 'All') {
            result = result.filter((p) => p.status?.toUpperCase() === filters.status.toUpperCase());
        }

        if (filters.year && filters.year !== 'All') {
            const yrStr = String(filters.year);
            result = result.filter((p) => {
                const pStart = p.periodStart || '';
                return pStart.startsWith(yrStr);
            });
        }

        if (filters.search && filters.search.trim()) {
            const query = filters.search.trim().toLowerCase();
            result = result.filter((p) => {
                const name = (p.name || '').toLowerCase();
                const struct = (p.structureName || '').toLowerCase();
                const status = (p.status || '').toLowerCase();
                return name.includes(query) || struct.includes(query) || status.includes(query);
            });
        }

        return result;
    }, [payruns, filters]);

    const value = useMemo(
        () => ({
            // 1. Read-only values
            payruns,
            filteredPayruns,
            pagination,
            filters,
            selectedPayrun,
            payslips,
            warnings,
            salaryStructures,
            loading,
            error,

            // 2. State setters (consumed by usePayroll hook ONLY)
            setPayruns,
            setPagination,
            setFilters,
            setSelectedPayrun,
            setPayslips,
            setWarnings,
            setSalaryStructures,
            setLoading,
            setError,
        }),
        [
            payruns,
            filteredPayruns,
            pagination,
            filters,
            selectedPayrun,
            payslips,
            warnings,
            salaryStructures,
            loading,
            error,
        ],
    );

    return <PayrollContext.Provider value={value}>{children}</PayrollContext.Provider>;
}

export default PayrollProvider;
