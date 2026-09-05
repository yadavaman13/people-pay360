import { useContext, useEffect, useRef, useCallback } from 'react';
import { ContractContext, CONTRACT_ACTIONS } from '../context/ContractContext';
import * as contractsService from '../services/contracts.service';

/**
 * Hook for managing the contracts list, debounced filtering, and pagination.
 */
export function useContracts() {
    const context = useContext(ContractContext);
    if (!context) {
        throw new Error('useContracts must be used within a ContractProvider');
    }

    const { contracts, pagination, filters, loading, error, dispatch } = context;
    const searchTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    const fetchContracts = useCallback(
        async (customFilters = {}) => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();

            dispatch({ type: CONTRACT_ACTIONS.FETCH_START });

            const activeFilters = {
                page: filters.page,
                limit: filters.limit,
                search: filters.search,
                status: filters.status,
                employeeId: filters.employeeId,
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
        [filters, dispatch],
    );

    // Initial load and filter change trigger
    useEffect(() => {
        fetchContracts();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [filters.page, filters.limit, filters.status, filters.employeeId, fetchContracts]);

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
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            searchTimeoutRef.current = setTimeout(() => {
                dispatch({
                    type: CONTRACT_ACTIONS.SET_FILTERS,
                    payload: { search: term, page: 1 },
                });
                fetchContracts({ search: term, page: 1 });
            }, 300);
        },
        [dispatch, fetchContracts],
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

    const resetFilters = useCallback(() => {
        dispatch({ type: CONTRACT_ACTIONS.RESET_FILTERS });
        fetchContracts({ search: '', status: '', employeeId: '', page: 1 });
    }, [dispatch, fetchContracts]);

    const refetch = useCallback(() => {
        return fetchContracts();
    }, [fetchContracts]);

    return {
        contracts,
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
    };
}
