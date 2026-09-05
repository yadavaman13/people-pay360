import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { ContractContext, CONTRACT_ACTIONS } from '../context/ContractContext';
import * as contractsService from '../services/contracts.service';
import { useToast } from '@/components/Shared/Feedback/Toast';

/**
 * Hook for fetching and managing a single contract's detail and status actions.
 * @param {string} contractId
 */
export function useContractDetail(contractId) {
    const context = useContext(ContractContext);
    const [localContract, setLocalContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const { success, error: toastError } = useToast();
    const abortControllerRef = useRef(null);

    // Keep dispatch in a ref so fetchContract does NOT need `context` as a dep.
    // Without this, dispatching SET_SELECTED_CONTRACT mutates context → recreates
    // fetchContract → triggers useEffect → infinite re-fetch loop on every render.
    const dispatchRef = useRef(context?.dispatch);
    useEffect(() => {
        dispatchRef.current = context?.dispatch;
    });

    const contract =
        context?.selectedContract?.id === contractId ? context.selectedContract : localContract;

    const fetchContract = useCallback(async () => {
        // Guard: skip if no id or if the id is a route keyword like 'new' / 'edit'
        if (!contractId || contractId === 'new' || contractId === 'edit') return;

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
            const res = await contractsService.getContractById(contractId);
            const contractData = res.data || res;
            setLocalContract(contractData);
            if (dispatchRef.current) {
                dispatchRef.current({
                    type: CONTRACT_ACTIONS.SET_SELECTED_CONTRACT,
                    payload: contractData,
                });
            }
        } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                return;
            }
            const msg =
                err.response?.data?.message || err.message || 'Failed to fetch contract details';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [contractId]); // Only contractId — NOT context, to prevent infinite re-fetch loop

    // Reset local state when contractId changes so no stale data flashes from
    // a previously viewed contract while the new fetch is in-flight.
    useEffect(() => {
        setLocalContract(null);
        setError(null);
        // Only enter loading state for real contract IDs
        setLoading(contractId !== 'new' && contractId !== 'edit' && Boolean(contractId));
    }, [contractId]);

    useEffect(() => {
        fetchContract();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [fetchContract]);

    const handleActivate = async (id = contractId) => {
        setActionLoading(true);
        try {
            const res = await contractsService.activateContract(id);
            const updated = res.data || res;
            success(res.message || 'Contract activated successfully');
            if (dispatchRef.current) {
                dispatchRef.current({
                    type: CONTRACT_ACTIONS.UPDATE_CONTRACT_IN_LIST,
                    payload: updated,
                });
            }
            await fetchContract();
            return { success: true, data: updated };
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.message ||
                'Failed to activate contract. Overlapping active contracts may exist.';
            toastError(msg);
            return { success: false, error: msg };
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancel = async (id = contractId) => {
        setActionLoading(true);
        try {
            const res = await contractsService.cancelContract(id);
            const updated = res.data || res;
            success(res.message || 'Contract cancelled successfully');
            if (dispatchRef.current) {
                dispatchRef.current({
                    type: CONTRACT_ACTIONS.UPDATE_CONTRACT_IN_LIST,
                    payload: updated,
                });
            }
            await fetchContract();
            return { success: true, data: updated };
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to cancel contract';
            toastError(msg);
            return { success: false, error: msg };
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id = contractId) => {
        setActionLoading(true);
        try {
            const res = await contractsService.deleteContract(id);
            success(res.message || 'Contract deleted successfully');
            if (dispatchRef.current) {
                dispatchRef.current({
                    type: CONTRACT_ACTIONS.REMOVE_CONTRACT_FROM_LIST,
                    payload: id,
                });
            }
            return { success: true };
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to delete contract';
            toastError(msg);
            return { success: false, error: msg };
        } finally {
            setActionLoading(false);
        }
    };

    return {
        contract,
        loading,
        error,
        actionLoading,
        refetch: fetchContract,
        handleActivate,
        handleCancel,
        handleDelete,
    };
}
