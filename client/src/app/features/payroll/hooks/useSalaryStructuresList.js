import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import { fetchSalaryStructures } from '../services/salaryStructure.api';
import { useToast } from '@/components/Shared/Feedback/Toast';

/**
 * Orchestration hook for SCR-PAY-006: Salary Structures List Screen
 * Coordinates server-side searching, filtering, pagination, permissions, and AdvancedTable interaction.
 */
export function useSalaryStructuresList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useAuth();
    const { addToast } = useToast();

    // Determine current role segment for navigation ('admin', 'hr', or 'employee')
    const roleSegment = useMemo(() => {
        if (pathname.includes('/admin/')) return 'admin';
        if (pathname.includes('/hr/')) return 'hr';
        return 'employee';
    }, [pathname]);

    // Check RBAC permission for creation trigger
    const canCreate = useMemo(() => {
        const allowed = ['ADMIN', 'HR_PAYROLL_MANAGER'];
        return Boolean(user?.role && allowed.includes(user.role));
    }, [user?.role]);

    // Initial search and filter params
    const initialSearch = searchParams.get('search') || '';
    const initialPage = Math.max(1, Number(searchParams.get('page')) || 1);
    const initialStatus = searchParams.get('status') || 'ALL';

    // State Layer
    const [structures, setStructures] = useState([]);
    const [pagination, setPagination] = useState({
        page: initialPage,
        limit: 50,
        totalCount: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [selectedStatus, setSelectedStatus] = useState(initialStatus);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Active tracking refs to avoid race conditions and stale closures
    const activeRequestIdRef = useRef(0);
    const searchQueryRef = useRef(initialSearch);
    const selectedStatusRef = useRef(initialStatus);
    const pageRef = useRef(initialPage);
    const limitRef = useRef(50);
    const searchDebounceTimerRef = useRef(null);

    // Filter configuration for AdvancedTable
    const filterConfig = useMemo(
        () => [
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: ['All', 'Active', 'Inactive'],
            },
        ],
        [],
    );

    // Fetch salary structures from backend
    const loadStructures = useCallback(
        async (
            query = searchQueryRef.current,
            page = pageRef.current,
            limit = limitRef.current,
            status = selectedStatusRef.current,
        ) => {
            const requestId = ++activeRequestIdRef.current;
            setIsLoading(true);
            setError(null);

            try {
                const params = {
                    page,
                    limit,
                };

                if (query && query.trim()) {
                    params.search = query.trim();
                }

                if (status && status !== 'ALL' && status !== 'All') {
                    params.isActive = status === 'Active';
                }

                const res = await fetchSalaryStructures(params);

                // Ignore stale response if another query has been fired
                if (requestId !== activeRequestIdRef.current) return;

                const items = res.data || [];
                setStructures(items);

                if (res.pagination) {
                    setPagination({
                        page: res.pagination.page || page,
                        limit: res.pagination.limit || limit,
                        totalCount: res.pagination.totalCount ?? items.length,
                        totalPages: res.pagination.totalPages || 1,
                    });
                } else {
                    setPagination((prev) => ({
                        ...prev,
                        page,
                        limit,
                        totalCount: items.length,
                        totalPages: Math.max(1, Math.ceil(items.length / limit)),
                    }));
                }
            } catch (err) {
                if (requestId !== activeRequestIdRef.current) return;
                const errorMsg =
                    err?.response?.data?.message ||
                    err?.message ||
                    'Failed to retrieve salary structures';
                setError(errorMsg);
            } finally {
                if (requestId === activeRequestIdRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [],
    );

    // Synchronize URL search params
    const updateUrlParams = useCallback(
        (query, page, status) => {
            const nextParams = {};
            if (query && query.trim()) {
                nextParams.search = query.trim();
            }
            if (page > 1) {
                nextParams.page = String(page);
            }
            if (status && status !== 'ALL' && status !== 'All') {
                nextParams.status = status;
            }
            setSearchParams(nextParams, { replace: true });
        },
        [setSearchParams],
    );

    // Initial load on mount
    useEffect(() => {
        loadStructures(
            searchQueryRef.current,
            pageRef.current,
            limitRef.current,
            selectedStatusRef.current,
        );
        return () => {
            if (searchDebounceTimerRef.current) {
                clearTimeout(searchDebounceTimerRef.current);
            }
        };
    }, [loadStructures]);

    // Handle AdvancedTable state changes (search, sort, pagination, filter)
    const handleTableChange = useCallback(
        ({ page, rowsPerPage, searchTerm, columnFilters }) => {
            let nextStatus = 'ALL';
            if (columnFilters?.status && columnFilters.status.length > 0) {
                nextStatus = columnFilters.status[0];
            }

            const trimmedSearch = typeof searchTerm === 'string' ? searchTerm.trim() : '';
            const isSearchChanged = trimmedSearch !== (searchQueryRef.current || '');
            const isFilterChanged = nextStatus !== (selectedStatusRef.current || 'ALL');
            const isPageChanged = page !== undefined && page !== pageRef.current;
            const isLimitChanged = rowsPerPage !== undefined && rowsPerPage !== limitRef.current;

            selectedStatusRef.current = nextStatus;
            setSelectedStatus(nextStatus);

            if (isLimitChanged) {
                limitRef.current = rowsPerPage;
                setPagination((prev) => ({ ...prev, limit: rowsPerPage }));
            }

            if (isSearchChanged) {
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }
                searchDebounceTimerRef.current = setTimeout(() => {
                    searchQueryRef.current = trimmedSearch;
                    setSearchQuery(trimmedSearch);
                    const targetPage = 1;
                    pageRef.current = targetPage;
                    setPagination((prev) => ({ ...prev, page: targetPage }));
                    updateUrlParams(trimmedSearch, targetPage, nextStatus);
                    loadStructures(
                        trimmedSearch,
                        targetPage,
                        rowsPerPage || limitRef.current,
                        nextStatus,
                    );
                }, 300);
            } else if (isFilterChanged) {
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }
                const targetPage = 1;
                pageRef.current = targetPage;
                setPagination((prev) => ({ ...prev, page: targetPage }));
                updateUrlParams(searchQueryRef.current, targetPage, nextStatus);
                loadStructures(
                    searchQueryRef.current,
                    targetPage,
                    rowsPerPage || limitRef.current,
                    nextStatus,
                );
            } else if (isPageChanged || isLimitChanged) {
                const targetPage = isLimitChanged ? 1 : page;
                pageRef.current = targetPage;
                setPagination((prev) => ({ ...prev, page: targetPage }));
                updateUrlParams(searchQueryRef.current, targetPage, nextStatus);
                loadStructures(
                    searchQueryRef.current,
                    targetPage,
                    rowsPerPage || limitRef.current,
                    nextStatus,
                );
            }
        },
        [loadStructures, updateUrlParams],
    );

    const handleRetry = useCallback(() => {
        loadStructures(
            searchQueryRef.current,
            pageRef.current,
            limitRef.current,
            selectedStatusRef.current,
        );
    }, [loadStructures]);

    const handleRowClick = useCallback(
        (id) => {
            if (!id) return;
            navigate(`/dashboard/${roleSegment}/payroll/salary-structures/${id}`);
        },
        [navigate, roleSegment],
    );

    const handleCreateSuccess = useCallback(() => {
        setIsCreateModalOpen(false);
        addToast('Salary structure created successfully', 'success');
        loadStructures(
            searchQueryRef.current,
            pageRef.current,
            limitRef.current,
            selectedStatusRef.current,
        );
    }, [addToast, loadStructures]);

    return {
        // Read-only state
        structures,
        pagination,
        isLoading,
        error,
        searchQuery,
        selectedStatus,
        filterConfig,
        isCreateModalOpen,
        canCreate,
        roleSegment,

        // Action handlers
        handleTableChange,
        handleRetry,
        handleRowClick,
        handleCreateSuccess,
        setIsCreateModalOpen,
    };
}
