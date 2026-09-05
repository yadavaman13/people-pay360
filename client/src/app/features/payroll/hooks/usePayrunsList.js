import { useState, useEffect, useCallback, useMemo, useRef, useContext } from 'react';
import { useSearchParams } from 'react-router';
import { fetchPayruns, deletePayrun } from '../services/payroll.api';
import { PayrollContext } from '../context/payroll.context';
import { useToast } from '@/components/Shared/Feedback/Toast';

const STATUS_FILTER_OPTIONS = ['DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'CANCELLED'];
const DEFAULT_YEAR_OPTIONS = ['2026', '2025', '2024'];

/**
 * Orchestration hook for SCR-PAY-001: Payruns List Screen
 * Handles AdvancedTable synchronization, server-side filtering, debounced search, and actions.
 */
export function usePayrunsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { addToast } = useToast();
    const payrollContext = useContext(PayrollContext);

    // Initial query parameters
    const initialStatus = searchParams.get('status') || 'ALL';
    const initialYear = searchParams.get('year') || 'ALL';
    const initialPage = Number(searchParams.get('page')) || 1;

    // State Layer
    const [payruns, setPayruns] = useState([]);
    const [pagination, setPagination] = useState({
        page: initialPage,
        limit: 20,
        totalCount: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(initialStatus);
    const [selectedYear, setSelectedYear] = useState(initialYear);

    // Modal & Action states
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Debounce and params tracking refs
    const searchDebounceTimerRef = useRef(null);
    const searchQueryRef = useRef(searchQuery);
    const selectedStatusRef = useRef(selectedStatus);
    const selectedYearRef = useRef(selectedYear);

    useEffect(() => {
        searchQueryRef.current = searchQuery;
    }, [searchQuery]);

    useEffect(() => {
        selectedStatusRef.current = selectedStatus;
    }, [selectedStatus]);

    useEffect(() => {
        selectedYearRef.current = selectedYear;
    }, [selectedYear]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (searchDebounceTimerRef.current) {
                clearTimeout(searchDebounceTimerRef.current);
            }
        };
    }, []);

    // Update URL query parameters helper
    const updateUrlParams = useCallback(
        (status, year, page) => {
            const nextParams = new URLSearchParams();
            if (status && status !== 'ALL') {
                nextParams.set('status', status);
            }
            if (year && year !== 'ALL') {
                nextParams.set('year', year);
            }
            if (page > 1) {
                nextParams.set('page', String(page));
            }
            setSearchParams(nextParams, { replace: true });
        },
        [setSearchParams],
    );

    // Fetch payruns with parameters
    const loadPayrunsData = useCallback(
        async (
            status = selectedStatusRef.current,
            year = selectedYearRef.current,
            page = pagination.page,
            limit = pagination.limit,
            search = searchQueryRef.current,
        ) => {
            setIsLoading(true);
            setError(null);

            try {
                const params = {
                    page,
                    limit,
                };

                if (status && status !== 'ALL') {
                    params.status = status;
                }

                if (year && year !== 'ALL') {
                    params.periodStart = `${year}-01-01`;
                    params.periodEnd = `${year}-12-31`;
                }

                if (search && search.trim() !== '') {
                    params.search = search.trim();
                }

                const response = await fetchPayruns(params);
                const records = response.data || [];
                setPayruns(records);

                const nextPagination = {
                    page: response.pagination?.page || page,
                    limit: response.pagination?.limit || limit,
                    totalCount: response.pagination?.totalCount ?? records.length,
                    totalPages: response.pagination?.totalPages || 1,
                };
                setPagination(nextPagination);

                // Keep PayrollContext in sync if present
                if (payrollContext?.setPayruns) {
                    payrollContext.setPayruns(records);
                }
                if (payrollContext?.setPagination) {
                    payrollContext.setPagination(nextPagination);
                }
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to fetch payruns';
                setError(errorMsg);
                addToast(errorMsg, 'error');
            } finally {
                setIsLoading(false);
            }
        },
        [pagination.page, pagination.limit, addToast, payrollContext],
    );

    // Initial load
    useEffect(() => {
        loadPayrunsData(
            selectedStatus,
            selectedYear,
            pagination.page,
            pagination.limit,
            searchQuery,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Augmented dataset for table searching and sorting
    const tableData = useMemo(() => {
        return payruns.map((p) => {
            const year = p.periodStart ? String(new Date(p.periodStart).getFullYear()) : '';
            return {
                ...p,
                year,
            };
        });
    }, [payruns]);

    // Dynamic available years based on fetched payruns + defaults
    const availableYears = useMemo(() => {
        const yearsSet = new Set(DEFAULT_YEAR_OPTIONS);
        payruns.forEach((p) => {
            if (p.periodStart) {
                const y = String(new Date(p.periodStart).getFullYear());
                if (y && !isNaN(Number(y))) yearsSet.add(y);
            }
        });
        return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    }, [payruns]);

    // Client-side search filtering fallback
    const filteredPayruns = useMemo(() => {
        if (!searchQuery || !searchQuery.trim()) {
            return tableData;
        }
        const q = searchQuery.trim().toLowerCase();
        return tableData.filter((p) => {
            const name = (p.name || '').toLowerCase();
            const structure = (p.structureName || '').toLowerCase();
            const status = (p.status || '').toLowerCase();
            const startStr = (p.periodStart || '').toLowerCase();
            const endStr = (p.periodEnd || '').toLowerCase();
            let monthName = '';
            if (p.periodStart) {
                const d = new Date(p.periodStart);
                if (!isNaN(d.getTime())) {
                    monthName = d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
                }
            }
            return (
                name.includes(q) ||
                structure.includes(q) ||
                status.includes(q) ||
                monthName.includes(q) ||
                startStr.includes(q) ||
                endStr.includes(q)
            );
        });
    }, [tableData, searchQuery]);

    // Dynamic Filter Config for AdvancedTable matching UserManagement & Payslips
    const filterConfig = useMemo(
        () => [
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: STATUS_FILTER_OPTIONS,
            },
            {
                key: 'year',
                label: 'Year',
                type: 'select',
                options: availableYears,
            },
        ],
        [availableYears],
    );

    // AdvancedTable change handler
    const handleTableChange = useCallback(
        ({ page, rowsPerPage, searchTerm, columnFilters }) => {
            let nextStatus = 'ALL';
            if (columnFilters?.status && columnFilters.status.length > 0) {
                nextStatus = columnFilters.status[0];
            }

            let nextYear = 'ALL';
            if (columnFilters?.year && columnFilters.year.length > 0) {
                nextYear = columnFilters.year[0];
            }

            const trimmedSearch = typeof searchTerm === 'string' ? searchTerm.trim() : '';
            const isSearchChanged = trimmedSearch !== (searchQueryRef.current || '');
            const isFilterChanged =
                nextStatus !== selectedStatusRef.current || nextYear !== selectedYearRef.current;

            selectedStatusRef.current = nextStatus;
            selectedYearRef.current = nextYear;
            setSelectedStatus(nextStatus);
            setSelectedYear(nextYear);

            if (isSearchChanged) {
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }
                searchDebounceTimerRef.current = setTimeout(() => {
                    searchQueryRef.current = trimmedSearch;
                    setSearchQuery(trimmedSearch);
                    const targetPage = 1;
                    setPagination((prev) => ({ ...prev, page: targetPage }));
                    updateUrlParams(nextStatus, nextYear, targetPage);
                    loadPayrunsData(
                        nextStatus,
                        nextYear,
                        targetPage,
                        rowsPerPage || pagination.limit,
                        trimmedSearch,
                    );
                }, 300);
            } else if (isFilterChanged) {
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }
                const targetPage = 1;
                setPagination((prev) => ({ ...prev, page: targetPage }));
                updateUrlParams(nextStatus, nextYear, targetPage);
                loadPayrunsData(
                    nextStatus,
                    nextYear,
                    targetPage,
                    rowsPerPage || pagination.limit,
                    searchQueryRef.current,
                );
            } else if (page && page !== pagination.page) {
                setPagination((prev) => ({
                    ...prev,
                    page,
                    limit: rowsPerPage || prev.limit,
                }));
                updateUrlParams(nextStatus, nextYear, page);
                loadPayrunsData(
                    nextStatus,
                    nextYear,
                    page,
                    rowsPerPage || pagination.limit,
                    searchQueryRef.current,
                );
            } else if (rowsPerPage && rowsPerPage !== pagination.limit) {
                setPagination((prev) => ({
                    ...prev,
                    page: 1,
                    limit: rowsPerPage,
                }));
                loadPayrunsData(nextStatus, nextYear, 1, rowsPerPage, searchQueryRef.current);
            }
        },
        [loadPayrunsData, updateUrlParams, pagination.page, pagination.limit],
    );

    // Action Handlers
    const handlePageChange = useCallback(
        (newPage) => {
            setPagination((prev) => ({ ...prev, page: newPage }));
            updateUrlParams(selectedStatus, selectedYear, newPage);
            loadPayrunsData(
                selectedStatus,
                selectedYear,
                newPage,
                pagination.limit,
                searchQueryRef.current,
            );
        },
        [selectedStatus, selectedYear, pagination.limit, updateUrlParams, loadPayrunsData],
    );

    const clearFilters = useCallback(() => {
        if (searchDebounceTimerRef.current) {
            clearTimeout(searchDebounceTimerRef.current);
        }
        setSearchQuery('');
        setSelectedStatus('ALL');
        setSelectedYear('ALL');
        selectedStatusRef.current = 'ALL';
        selectedYearRef.current = 'ALL';
        searchQueryRef.current = '';
        setPagination((prev) => ({ ...prev, page: 1 }));
        updateUrlParams('ALL', 'ALL', 1);
        loadPayrunsData('ALL', 'ALL', 1, pagination.limit, '');
    }, [pagination.limit, updateUrlParams, loadPayrunsData]);

    const handleRetry = useCallback(() => {
        loadPayrunsData(
            selectedStatus,
            selectedYear,
            pagination.page,
            pagination.limit,
            searchQueryRef.current,
        );
    }, [loadPayrunsData, selectedStatus, selectedYear, pagination.page, pagination.limit]);

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget?.id) return;
        setIsDeleting(true);
        try {
            await deletePayrun(deleteTarget.id);
            addToast('Payrun deleted successfully', 'success');
            setDeleteTarget(null);
            await loadPayrunsData(
                selectedStatus,
                selectedYear,
                pagination.page,
                pagination.limit,
                searchQueryRef.current,
            );
        } catch (err) {
            const errorMsg =
                err.response?.data?.message || err.message || 'Failed to delete payrun';
            addToast(errorMsg, 'error');
        } finally {
            setIsDeleting(false);
        }
    }, [
        deleteTarget,
        addToast,
        loadPayrunsData,
        selectedStatus,
        selectedYear,
        pagination.page,
        pagination.limit,
    ]);

    const handleSearchChange = useCallback(
        (query) => {
            const text = typeof query === 'string' ? query : (query?.target?.value ?? '');
            searchQueryRef.current = text;
            setSearchQuery(text);

            if (searchDebounceTimerRef.current) {
                clearTimeout(searchDebounceTimerRef.current);
            }
            searchDebounceTimerRef.current = setTimeout(() => {
                const trimmed = text.trim();
                setPagination((prev) => ({ ...prev, page: 1 }));
                loadPayrunsData(
                    selectedStatusRef.current,
                    selectedYearRef.current,
                    1,
                    pagination.limit,
                    trimmed,
                );
            }, 300);
        },
        [loadPayrunsData, pagination.limit],
    );

    const handleStatusChange = useCallback(
        (newStatus) => {
            selectedStatusRef.current = newStatus;
            setSelectedStatus(newStatus);
            setPagination((prev) => ({ ...prev, page: 1 }));
            updateUrlParams(newStatus, selectedYearRef.current, 1);
            loadPayrunsData(
                newStatus,
                selectedYearRef.current,
                1,
                pagination.limit,
                searchQueryRef.current,
            );
        },
        [updateUrlParams, loadPayrunsData, pagination.limit],
    );

    const handleYearChange = useCallback(
        (newYear) => {
            selectedYearRef.current = newYear;
            setSelectedYear(newYear);
            setPagination((prev) => ({ ...prev, page: 1 }));
            updateUrlParams(selectedStatusRef.current, newYear, 1);
            loadPayrunsData(
                selectedStatusRef.current,
                newYear,
                1,
                pagination.limit,
                searchQueryRef.current,
            );
        },
        [updateUrlParams, loadPayrunsData, pagination.limit],
    );

    return {
        // Read-only state
        payruns,
        tableData,
        filteredPayruns,
        pagination,
        isLoading,
        error,
        searchQuery,
        selectedStatus,
        selectedYear,
        availableYears,
        filterConfig,
        isWizardOpen,
        deleteTarget,
        isDeleting,

        // Actions
        handleTableChange,
        handleSearchChange,
        handleStatusChange,
        handleYearChange,
        handlePageChange,
        clearFilters,
        handleRetry,
        setIsWizardOpen,
        setDeleteTarget,
        handleConfirmDelete,
    };
}
