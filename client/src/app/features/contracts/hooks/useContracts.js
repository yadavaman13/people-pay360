import { useContext, useEffect, useRef, useCallback } from 'react';
import { ContractContext, CONTRACT_ACTIONS } from '../context/ContractContext';
import * as contractsService from '../services/contracts.service';

// Keeps a stable snapshot of the filter key used for the most recent successful
// contracts list fetch. Lives outside the component so it survives remounts
// (ContractsListPage unmounts when navigating to /new and remounts on return).
let lastFetchedFilterKey = null;
let lastFetchCompleted = false;

/**
 * Hook for managing the contracts list, debounced filtering, and pagination.
 */
export function useContracts() {
    const context = useContext(ContractContext);
    if (!context) {
        throw new Error('useContracts must be used within a ContractProvider');
    }

    const { contracts, counts, pagination, filters, loading, error, dispatch } = context;
    const filtersRef = useRef(filters);
    filtersRef.current = filters; // always current, no effect needed
    const abortControllerRef = useRef(null);
    const countsFetchedRef = useRef(false);

    // Build a stable string key from the current filters so we can detect
    // whether the active filter set has already been fetched.
    const filterKey = `${filters.page}|${filters.limit}|${filters.status}|${filters.employeeId}|${filters.search}`;

    const fetchContracts = useCallback(
        async (customFilters = {}) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            dispatch({ type: CONTRACT_ACTIONS.FETCH_START });

            const activeFilters = {
                ...filtersRef.current,
                ...customFilters,
            };

            const queryParams = {
                page: activeFilters.page,
                limit: activeFilters.limit,
            };

            if (activeFilters.search?.trim()) {
                queryParams.search = activeFilters.search.trim();
            }
            if (activeFilters.status?.trim()) {
                queryParams.status = activeFilters.status.trim();
            }
            if (activeFilters.employeeId?.trim()) {
                queryParams.employeeId = activeFilters.employeeId.trim();
            }

            try {
                const res = await contractsService.listContracts(queryParams);
                const payload = res.data || res;
                dispatch({
                    type: CONTRACT_ACTIONS.FETCH_SUCCESS,
                    payload: {
                        contracts: payload.contracts || [],
                        total: payload.total || 0,
                        page: payload.page || activeFilters.page,
                        limit: payload.limit || activeFilters.limit,
                        totalPages: payload.totalPages || 0,
                    },
                });
            } catch (err) {
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                    return;
                }
                const msg =
                    err.response?.data?.message || err.message || 'Failed to fetch contracts';
                dispatch({
                    type: CONTRACT_ACTIONS.FETCH_ERROR,
                    payload: msg,
                });
            }
        },
        [dispatch],
    );

    // Re-fetch whenever any filter changes (including search).
    // Skip the fetch when remounting with the same filters — this prevents a
    // redundant /api/contracts call every time the user navigates to /new and
    // then returns to the list page.
    useEffect(() => {
        const alreadyFetched = lastFetchedFilterKey === filterKey && lastFetchCompleted;

        if (!alreadyFetched) {
            fetchContracts();
            lastFetchedFilterKey = filterKey;
            lastFetchCompleted = true;
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [
        filters.page,
        filters.limit,
        filters.status,
        filters.employeeId,
        filters.search,
        fetchContracts,
    ]);

    const setFilter = useCallback(
        (key, value) => {
            dispatch({
                type: CONTRACT_ACTIONS.SET_FILTERS,
                payload: { [key]: value, page: 1 },
            });
        },
        [dispatch],
    );

    const setSearch = useCallback(
        (term) => {
            dispatch({
                type: CONTRACT_ACTIONS.SET_FILTERS,
                payload: { search: term, page: 1 },
            });
        },
        [dispatch],
    );

    const setPage = useCallback(
        (page) => {
            dispatch({
                type: CONTRACT_ACTIONS.SET_FILTERS,
                payload: { page },
            });
        },
        [dispatch],
    );

    const setLimit = useCallback(
        (limit) => {
            dispatch({
                type: CONTRACT_ACTIONS.SET_FILTERS,
                payload: { limit, page: 1 },
            });
        },
        [dispatch],
    );

    const fetchCounts = useCallback(async () => {
        try {
            const result = await contractsService.getContractCounts();
            dispatch({
                type: CONTRACT_ACTIONS.SET_COUNTS,
                payload: result,
            });
        } catch {
            // ignore
        }
    }, [dispatch]);

    // Fetch tab counts once on initial mount
    useEffect(() => {
        if (!countsFetchedRef.current) {
            countsFetchedRef.current = true;
            fetchCounts();
        }
    }, [fetchCounts]);

    const resetFilters = useCallback(() => {
        dispatch({ type: CONTRACT_ACTIONS.RESET_FILTERS });
    }, [dispatch]);

    const refetch = useCallback(() => {
        // Bypass the dedup guard so an explicit refresh always hits the API.
        lastFetchedFilterKey = null;
        lastFetchCompleted = false;
        return fetchContracts();
    }, [fetchContracts]);

    return {
        contracts,
        counts,
        pagination,
        filters,
        loading,
        error,
        setFilter,
        setSearch,
        setPage,
        setLimit,
        resetFilters,
        refetch,
        fetchCounts,
    };
}
