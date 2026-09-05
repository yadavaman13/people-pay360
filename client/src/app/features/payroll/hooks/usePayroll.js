import { useContext, useCallback } from 'react';
import { PayrollContext } from '../context/payroll.context';
import * as payrollApi from '../services/payroll.api';
import * as payslipsApi from '../services/payslips.api';
import { useToast } from '@/components/Shared/Feedback/Toast';

export function usePayroll() {
    const context = useContext(PayrollContext);
    if (!context) {
        throw new Error('usePayroll must be used within a PayrollProvider');
    }

    const {
        setPayruns,
        setPagination,
        setFilters,
        setSelectedPayrun,
        setPayslips,
        setWarnings,
        setSalaryStructures,
        setLoading,
        setError,
    } = context;

    const { addToast } = useToast();

    /**
     * Load paginated payruns from API
     */
    const loadPayruns = useCallback(
        async (params = {}) => {
            setLoading((prev) => ({ ...prev, list: true }));
            setError(null);
            try {
                const response = await payrollApi.fetchPayruns(params);
                setPayruns(response.data || []);
                if (response.pagination) {
                    setPagination(response.pagination);
                }
                return response;
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to fetch payruns';
                setError(errorMsg);
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, list: false }));
            }
        },
        [setLoading, setError, setPayruns, setPagination, addToast],
    );

    /**
     * Load salary structures for wizard
     */
    const loadSalaryStructures = useCallback(async () => {
        try {
            const response = await payrollApi.fetchSalaryStructures({ isActive: true });
            const structures = response.data || [];
            setSalaryStructures(structures);
            return structures;
        } catch (err) {
            console.error('Failed to load salary structures', err);
            return [];
        }
    }, [setSalaryStructures]);

    /**
     * Load comprehensive payrun detail, payslips, and pre-validation audit
     */
    const loadPayrunDetail = useCallback(
        async (payrunId) => {
            setLoading((prev) => ({ ...prev, detail: true }));
            setError(null);
            try {
                const [payrunRes, payslipsRes, warningsRes] = await Promise.all([
                    payrollApi.fetchPayrunById(payrunId),
                    payslipsApi.fetchPayslipsByPayrun(payrunId),
                    payrollApi.fetchPayrunWarnings(payrunId).catch(() => ({
                        data: {
                            summary: {
                                blockersCount: 0,
                                warningsCount: 0,
                                totalAlerts: 0,
                                canValidate: true,
                            },
                            alerts: [],
                        },
                    })),
                ]);

                setSelectedPayrun(payrunRes.data);
                setPayslips(payslipsRes.data || []);
                if (warningsRes?.data) {
                    setWarnings(warningsRes.data);
                }

                return {
                    payrun: payrunRes.data,
                    payslips: payslipsRes.data || [],
                    warnings: warningsRes.data,
                };
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to load payrun details';
                setError(errorMsg);
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, detail: false }));
            }
        },
        [setLoading, setError, setSelectedPayrun, setPayslips, setWarnings, addToast],
    );

    /**
     * Step 1 Wizard: Validate scope and return eligible roster
     */
    const handleValidateWizard = useCallback(
        async (scopeData) => {
            setLoading((prev) => ({ ...prev, wizard: true }));
            setError(null);
            try {
                const response = await payrollApi.validatePayrunWizard({
                    salaryStructureId: scopeData.salaryStructureId,
                    periodStart: scopeData.periodStart,
                    periodEnd: scopeData.periodEnd,
                });
                return response.data;
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Wizard scope validation failed';
                setError(errorMsg);
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, wizard: false }));
            }
        },
        [setLoading, setError, addToast],
    );

    /**
     * Step 2 Wizard: Finalize and create payrun batch
     */
    const handleCreatePayrun = useCallback(
        async (payrunPayload) => {
            setLoading((prev) => ({ ...prev, wizard: true }));
            setError(null);
            try {
                const response = await payrollApi.createPayrun(payrunPayload);
                addToast('Payrun created successfully (DRAFT)', 'success');
                return response.data;
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to create payrun';
                setError(errorMsg);
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, wizard: false }));
            }
        },
        [setLoading, setError, addToast],
    );

    /**
     * Delete a DRAFT payrun
     */
    const handleDeletePayrun = useCallback(
        async (payrunId) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                await payrollApi.deletePayrun(payrunId);
                setPayruns((prev) => prev.filter((p) => p.id !== payrunId));
                addToast('Payrun deleted successfully', 'success');
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to delete payrun';
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, setPayruns, addToast],
    );

    /**
     * Compute salary rules & generate payslips
     */
    const handleComputePayrun = useCallback(
        async (payrunId) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                const res = await payrollApi.computePayrun(payrunId);
                addToast('Payroll computed successfully', 'success');
                // Refresh authoritative data
                await loadPayrunDetail(payrunId);
                return res.data;
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Compute execution failed';
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, addToast, loadPayrunDetail],
    );

    /**
     * Validate payrun & lock calculation
     */
    const handleValidatePayrun = useCallback(
        async (payrunId, options = {}) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                const res = await payrollApi.validatePayrun(payrunId, options);
                addToast('Payrun validated successfully. Payslips locked.', 'success');
                // Refresh authoritative data
                await loadPayrunDetail(payrunId);
                return res.data;
            } catch (err) {
                const errorMsg = err.response?.data?.message || err.message || 'Validation failed';
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, addToast, loadPayrunDetail],
    );

    /**
     * Mark Payrun as PAID (financial settlement)
     */
    const handleMarkPaid = useCallback(
        async (payrunId, payload = {}) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                const res = await payrollApi.markPayrunPaid(payrunId, payload);
                addToast('Payrun marked as paid. Financial settlement recorded.', 'success');
                // Refresh authoritative data
                await loadPayrunDetail(payrunId);
                return res.data;
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to mark payrun as paid';
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, addToast, loadPayrunDetail],
    );

    /**
     * Bulk distribute payslips via email
     */
    const handleSendPayslips = useCallback(
        async (payrunId) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                const res = await payrollApi.sendPayrunPayslips(payrunId);
                const count = res.data?.sent || 0;
                addToast(`Payslips distributed (${count} sent)`, 'success');
                await loadPayrunDetail(payrunId);
                return res.data;
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to distribute payslips';
                addToast(errorMsg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, addToast, loadPayrunDetail],
    );

    /**
     * Download single payslip PDF
     */
    const handleDownloadPayslipPdf = useCallback(
        async (payslipId, employeeCode, period) => {
            try {
                addToast('Preparing payslip PDF...', 'info', 2000);
                await payslipsApi.downloadPayslipPdf(payslipId, employeeCode, period);
                addToast('Payslip downloaded', 'success', 2000);
            } catch (err) {
                const errorMsg =
                    err.response?.data?.message || err.message || 'Failed to download payslip PDF';
                addToast(errorMsg, 'error');
            }
        },
        [addToast],
    );

    /**
     * Update filter state
     */
    const setFilterValues = useCallback(
        (updater) => {
            setFilters(updater);
        },
        [setFilters],
    );

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, [setError]);

    return {
        loadPayruns,
        loadSalaryStructures,
        loadPayrunDetail,
        handleValidateWizard,
        handleCreatePayrun,
        handleDeletePayrun,
        handleComputePayrun,
        handleValidatePayrun,
        handleMarkPaid,
        handleSendPayslips,
        handleDownloadPayslipPdf,
        setFilterValues,
        clearError,
    };
}

export default usePayroll;
