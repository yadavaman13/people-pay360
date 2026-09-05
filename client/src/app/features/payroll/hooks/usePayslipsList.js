import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
    fetchPayslips,
    fetchPayrunsForDropdown,
    fetchPayrunWarnings,
} from '../services/payslips.api';
import { useToast } from '@/components/Shared/Feedback/Toast';

/**
 * Orchestration hook for SCR-PAY-004: Payslips List Screen
 */
export function usePayslipsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToast } = useToast();

    // URL Query parameters initial values
    const initialPayrunId = searchParams.get('payrunId') || 'ALL';
    const initialPage = Number(searchParams.get('page')) || 1;

    // State Layer
    const [payslips, setPayslips] = useState([]);
    const [pagination, setPagination] = useState({
        page: initialPage,
        limit: 20,
        totalCount: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPayrunId, setSelectedPayrunId] = useState(initialPayrunId);
    const [payrunOptions, setPayrunOptions] = useState([{ value: 'ALL', label: 'All Periods' }]);
    const [warningsMap, setWarningsMap] = useState({});
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Fetch payrun options for Period dropdown once on mount
    useEffect(() => {
        let isMounted = true;

        async function loadPayrunOptions() {
            try {
                const res = await fetchPayrunsForDropdown({ limit: 50 });
                const payrunList = res.data || [];
                const formattedOptions = [
                    { value: 'ALL', label: 'All Periods' },
                    ...payrunList.map((p) => ({
                        value: p.id,
                        label: p.name || `Payrun ${p.periodStart?.slice(0, 7) || ''}`,
                    })),
                ];
                if (isMounted) {
                    setPayrunOptions(formattedOptions);
                }
            } catch (err) {
                console.error('Failed to load payruns for dropdown', err);
            }
        }

        loadPayrunOptions();
        return () => {
            isMounted = false;
        };
    }, []);

    // Main fetch routine for payslips and contextual warnings
    const loadPayslipsData = useCallback(
        async (payrunId = selectedPayrunId, page = pagination.page) => {
            setIsLoading(true);
            setError(null);

            try {
                const params = {
                    page,
                    limit: pagination.limit,
                };
                if (payrunId && payrunId !== 'ALL') {
                    params.payrunId = payrunId;
                }

                // Concurrent fetch: payslips roster and, if filtered, payrun warnings
                const promises = [fetchPayslips(params)];

                if (payrunId && payrunId !== 'ALL') {
                    promises.push(
                        fetchPayrunWarnings(payrunId).catch(() => ({ data: { alerts: [] } })),
                    );
                }

                const [payslipsRes, warningsRes] = await Promise.all(promises);

                setPayslips(payslipsRes.data || []);
                if (payslipsRes.pagination) {
                    setPagination({
                        page: payslipsRes.pagination.page || page,
                        limit: payslipsRes.pagination.limit || 20,
                        totalCount: payslipsRes.pagination.totalCount || 0,
                        totalPages: payslipsRes.pagination.totalPages || 1,
                    });
                }

                // Build employeeId -> Array<alert> lookup map
                if (warningsRes?.data?.alerts) {
                    const newMap = {};
                    (warningsRes.data.alerts || []).forEach((alert) => {
                        if (alert.employeeId) {
                            if (!newMap[alert.employeeId]) {
                                newMap[alert.employeeId] = [];
                            }
                            newMap[alert.employeeId].push(alert);
                        }
                    });
                    setWarningsMap(newMap);
                } else {
                    setWarningsMap({});
                }
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to fetch payslips';
                setError(errorMsg);
                addToast(errorMsg, 'error');
            } finally {
                setIsLoading(false);
            }
        },
        [selectedPayrunId, pagination.page, pagination.limit, addToast],
    );

    // Synchronize data on payrun or page change
    useEffect(() => {
        loadPayslipsData(selectedPayrunId, pagination.page);
    }, [selectedPayrunId, pagination.page, loadPayslipsData]);

    // Update URL query parameters helper
    const updateUrlParams = useCallback(
        (payrunId, page) => {
            const nextParams = new URLSearchParams();
            if (payrunId && payrunId !== 'ALL') {
                nextParams.set('payrunId', payrunId);
            }
            if (page > 1) {
                nextParams.set('page', String(page));
            }
            setSearchParams(nextParams, { replace: true });
        },
        [setSearchParams],
    );

    // Augmented dataset for searching and sorting in AdvancedTable
    const tableData = useMemo(() => {
        return payslips.map((item) => {
            const firstName = item.firstName || '';
            const lastName = item.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim() || 'Employee';
            return {
                ...item,
                fullName,
            };
        });
    }, [payslips]);

    // Filtered payslips derived state (client-side debounced search fallback)
    const filteredPayslips = useMemo(() => {
        if (!searchQuery || !searchQuery.trim()) {
            return tableData;
        }
        const q = searchQuery.trim().toLowerCase();
        return tableData.filter((item) => {
            const code = (item.employeeCode || '').toLowerCase();
            const payrunName = (item.payrunName || '').toLowerCase();
            const structure = (item.structureName || '').toLowerCase();

            return (
                item.fullName.toLowerCase().includes(q) ||
                code.includes(q) ||
                payrunName.includes(q) ||
                structure.includes(q)
            );
        });
    }, [tableData, searchQuery]);

    // Dynamic Filter Config for AdvancedTable matching UserManagement
    const filterConfig = useMemo(
        () => [
            {
                key: 'payrunName',
                label: 'Period',
                type: 'select',
                options: payrunOptions.filter((o) => o.value !== 'ALL').map((o) => o.label),
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: ['DRAFT', 'COMPUTED', 'PAID', 'CANCELLED'],
            },
        ],
        [payrunOptions],
    );

    // AdvancedTable change handler matching useUsers
    const handleTableChange = useCallback(
        ({ page, rowsPerPage, searchTerm, columnFilters }) => {
            let nextPayrunId = selectedPayrunId;
            if (columnFilters?.payrunName && columnFilters.payrunName.length > 0) {
                const selectedLabel = columnFilters.payrunName[0];
                const found = payrunOptions.find((o) => o.label === selectedLabel);
                nextPayrunId = found ? found.value : 'ALL';
            } else if (columnFilters?.payrunName && columnFilters.payrunName.length === 0) {
                nextPayrunId = 'ALL';
            }

            if (nextPayrunId !== selectedPayrunId) {
                setSelectedPayrunId(nextPayrunId);
                updateUrlParams(nextPayrunId, 1);
            }

            if (typeof searchTerm === 'string') {
                setSearchQuery(searchTerm);
            }

            if (page && page !== pagination.page) {
                setPagination((prev) => ({
                    ...prev,
                    page,
                    limit: rowsPerPage || prev.limit,
                }));
                updateUrlParams(nextPayrunId, page);
            } else if (rowsPerPage && rowsPerPage !== pagination.limit) {
                setPagination((prev) => ({
                    ...prev,
                    page: 1,
                    limit: rowsPerPage,
                }));
            }
        },
        [selectedPayrunId, payrunOptions, updateUrlParams, pagination.page, pagination.limit],
    );

    // Action Handlers
    const handleSearchChange = useCallback((query) => {
        setSearchQuery(query);
    }, []);

    const handlePayrunChange = useCallback(
        (payrunId) => {
            setSelectedPayrunId(payrunId);
            setPagination((prev) => ({ ...prev, page: 1 }));
            updateUrlParams(payrunId, 1);
        },
        [updateUrlParams],
    );

    const handlePageChange = useCallback(
        (newPage) => {
            setPagination((prev) => ({ ...prev, page: newPage }));
            updateUrlParams(selectedPayrunId, newPage);
        },
        [selectedPayrunId, updateUrlParams],
    );

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setSelectedPayrunId('ALL');
        setPagination((prev) => ({ ...prev, page: 1 }));
        updateUrlParams('ALL', 1);
    }, [updateUrlParams]);

    const handleRetry = useCallback(() => {
        loadPayslipsData(selectedPayrunId, pagination.page);
    }, [loadPayslipsData, selectedPayrunId, pagination.page]);

    return {
        // Read-only state
        payslips,
        tableData,
        filteredPayslips,
        pagination,
        isLoading,
        error,
        searchQuery,
        selectedPayrunId,
        payrunOptions,
        filterConfig,
        warningsMap,
        isWizardOpen,

        // Actions
        handleTableChange,
        handleSearchChange,
        handlePayrunChange,
        handlePageChange,
        clearFilters,
        handleRetry,
        setIsWizardOpen,
    };
}
