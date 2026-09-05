import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    fetchPayslipById,
    recomputeSinglePayslip,
    getPayslipPdfUrl,
    downloadPayslipPdf,
} from '../services/payslips.api';
import { useToast } from '@/components/Shared/Feedback/Toast';

/**
 * Orchestration hook for SCR-PAY-005: Payslip Detail / Salary Computation Screen
 * @param {string} payslipId - ID of the payslip to manage
 */
export function usePayslipDetail(payslipId) {
    const { addToast } = useToast();

    const [payslip, setPayslip] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isComputing, setIsComputing] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Load payslip data by ID
     */
    const loadPayslip = useCallback(
        async (id) => {
            if (!id) return;
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetchPayslipById(id);
                setPayslip(response.data || null);
                return response.data;
            } catch (err) {
                const message =
                    err.response?.data?.message || err.message || 'Failed to load payslip details';
                setError(message);
                addToast(message, 'error');
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [addToast],
    );

    useEffect(() => {
        if (payslipId) {
            loadPayslip(payslipId);
        }
    }, [payslipId, loadPayslip]);

    /**
     * Trigger single payslip recomputation
     */
    const handleRecompute = useCallback(async () => {
        if (!payslipId) return;

        const currentStatus = payslip?.status?.toUpperCase();
        if (['VALIDATED', 'PAID', 'SENT'].includes(currentStatus)) {
            addToast(`Cannot recompute: Payslip is locked in ${currentStatus} state`, 'warning');
            return;
        }

        setIsComputing(true);
        try {
            const result = await recomputeSinglePayslip(payslipId);
            // Re-fetch complete detail to ensure joined parent fields and breakdown match
            const refreshed = await fetchPayslipById(payslipId);
            setPayslip(refreshed.data || result.data);
            addToast('Payslip recomputed successfully', 'success');
        } catch (err) {
            const message =
                err.response?.data?.message || err.message || 'Failed to recompute payslip';
            addToast(message, 'error');
        } finally {
            setIsComputing(false);
        }
    }, [payslipId, payslip?.status, addToast]);

    /**
     * Open streaming PDF in new tab for viewing/printing
     */
    const handlePrint = useCallback(() => {
        if (!payslip?.id) return;
        if (payslip.status === 'DRAFT') {
            addToast('Cannot print: Payslip must be computed first', 'warning');
            return;
        }
        const pdfUrl = getPayslipPdfUrl(payslip.id, true);
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    }, [payslip, addToast]);

    /**
     * Download PDF attachment directly to file system
     */
    const handleDownload = useCallback(async () => {
        if (!payslip?.id) return;
        setIsPrinting(true);
        try {
            await downloadPayslipPdf(payslip.id, payslip.employeeCode, payslip.periodStart);
            addToast('Payslip PDF downloaded successfully', 'success');
        } catch (err) {
            const message = err.message || 'Failed to download payslip PDF';
            addToast(message, 'error');
        } finally {
            setIsPrinting(false);
        }
    }, [payslip, addToast]);

    /**
     * Normalized breakdown groups for rendering
     */
    const breakdown = useMemo(() => {
        if (!payslip) {
            return {
                basic: [],
                allowances: [],
                deductions: [],
                gross: null,
                net: null,
                other: [],
            };
        }

        if (payslip.breakdown) {
            return {
                basic: payslip.breakdown.basic || [],
                allowances: payslip.breakdown.allowances || [],
                deductions: payslip.breakdown.deductions || [],
                gross: payslip.breakdown.gross || null,
                net: payslip.breakdown.net || null,
                other: payslip.breakdown.other || [],
            };
        }

        const lines = payslip.lines || [];
        return {
            basic: lines.filter((l) => l.category === 'BASIC'),
            allowances: lines.filter((l) => l.category === 'ALLOWANCE'),
            gross: lines.find((l) => l.category === 'GROSS') || null,
            deductions: lines.filter((l) => l.category === 'DEDUCTION'),
            net: lines.find((l) => l.category === 'NET') || null,
            other: lines.filter((l) => l.category === 'OTHER'),
        };
    }, [payslip]);

    return {
        payslip,
        breakdown,
        isLoading,
        isComputing,
        isPrinting,
        error,
        handleRecompute,
        handlePrint,
        handleDownload,
        reloadPayslip: () => loadPayslip(payslipId),
    };
}

export default usePayslipDetail;
