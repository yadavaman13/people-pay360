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

    const contract =
        context?.selectedContract?.id === contractId ? context.selectedContract : localContract;

    const fetchContract = useCallback(async () => {
        if (!contractId) return;

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
            if (context?.dispatch) {
                context.dispatch({
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
    }, [contractId, context]);

    useEffect(() => {
        fetchContract();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [contractId, fetchContract]);

    const handleActivate = async (id = contractId) => {
        setActionLoading(true);
        try {
            const res = await contractsService.activateContract(id);
            const updated = res.data || res;
            success(res.message || 'Contract activated successfully');
            if (context?.dispatch) {
                context.dispatch({
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
            if (context?.dispatch) {
                context.dispatch({
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
            if (context?.dispatch) {
                context.dispatch({
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
