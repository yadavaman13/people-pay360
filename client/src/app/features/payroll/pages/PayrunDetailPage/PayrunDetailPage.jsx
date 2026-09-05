import { useEffect, useState, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { PayrollContext } from '../../context/payroll.context';
import { usePayroll } from '../../hooks/usePayroll';
import PayrunActionBar from '../../components/PayrunActionBar/PayrunActionBar';
import PayrunMetaSummary from '../../components/PayrunMetaSummary/PayrunMetaSummary';
import PayrunWarningsAlert from '../../components/PayrunWarningsAlert/PayrunWarningsAlert';
import PayrunPayslipsTable from '../../components/PayrunPayslipsTable/PayrunPayslipsTable';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import DatePicker from '@/components/Shared/Form/DatePicker/DatePicker';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import Button from '@/components/Shared/Buttons/Button/Button';
import './PayrunDetailPage.scss';

function PayrunDetailPage() {
    const { id: payrunId } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // 1. Read Path: Consume state directly from Context
    const { selectedPayrun, payslips, warnings, loading, error } = useContext(PayrollContext);

    // 2. Action Path: Consume action handlers from hook
    const {
        loadPayrunDetail,
        handleComputePayrun,
        handleValidatePayrun,
        handleMarkPaid,
        handleSendPayslips,
        handleDownloadPayslipPdf,
    } = usePayroll();

    // Local dialog states
    const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
    const [paymentDateInput, setPaymentDateInput] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [downloadingPdfId, setDownloadingPdfId] = useState(null);

    // Resolve current role segment for navigation
    const roleSegment = pathname.includes('/admin/')
        ? 'admin'
        : pathname.includes('/hr/')
          ? 'hr'
          : 'employee';

    useEffect(() => {
        if (payrunId) {
            loadPayrunDetail(payrunId);
        }
    }, [payrunId, loadPayrunDetail]);

    // Group alerts by employeeId for row-level chips
    const warningsByEmployee = useMemo(() => {
        const map = {};
        if (warnings?.alerts && Array.isArray(warnings.alerts)) {
            warnings.alerts.forEach((alert) => {
                if (alert.employeeId) {
                    if (!map[alert.employeeId]) map[alert.employeeId] = [];
                    map[alert.employeeId].push(alert);
                }
            });
        }
        return map;
    }, [warnings]);

    const handleCompute = async () => {
        if (!payrunId) return;
        await handleComputePayrun(payrunId);
    };

    const handleValidateClick = () => {
        const blockersCount = warnings?.summary?.blockersCount || 0;
        if (blockersCount > 0) {
            setShowOverrideModal(true);
        } else {
            handleValidatePayrun(payrunId, { overrideBlockers: false });
        }
    };

    const handleConfirmOverrideValidation = async () => {
        setShowOverrideModal(false);
        await handleValidatePayrun(payrunId, { overrideBlockers: true });
    };

    const handleConfirmMarkPaid = async () => {
        setShowMarkPaidModal(false);
        await handleMarkPaid(payrunId, { paymentDate: paymentDateInput });
    };

    const handleSendAllPayslips = async () => {
        if (!payrunId) return;
        await handleSendPayslips(payrunId);
    };

    const handleDownloadPdf = async (slipId, empCode, period) => {
        setDownloadingPdfId(slipId);
        try {
            await handleDownloadPayslipPdf(slipId, empCode, period);
        } finally {
            setDownloadingPdfId(null);
        }
    };

    const handleBackToList = () => {
        navigate(`/dashboard/${roleSegment}/payroll/payruns`);
    };

    if (loading.detail && !selectedPayrun) {
        return (
            <div className="payrun-detail-page__loading">
                <Spinner label="Loading payrun details..." />
            </div>
        );
    }

    if (error && !selectedPayrun) {
        return (
            <div className="payrun-detail-page payrun-detail-page--error">
                <Alert variant="danger">
                    <AlertTitle>Unable to load payrun</AlertTitle>
                    <AlertDescription>
                        {error}
                        <div className="payrun-detail-page__retry-action">
                            <Button
                                variant="outline"
                                onClick={() => loadPayrunDetail(payrunId)}
                                size="sm"
                            >
                                Retry
                            </Button>
                            <Button variant="ghost" onClick={handleBackToList} size="sm">
                                Back to Payruns
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const payrunStatus = selectedPayrun?.status || 'DRAFT';
    const canValidate = warnings?.summary?.canValidate ?? true;
    const blockersCount = warnings?.summary?.blockersCount || 0;

    return (
        <div className="payrun-detail-page">
            {/* Back navigation */}
            <div className="payrun-detail-page__back-nav">
                <button
                    type="button"
                    className="payrun-detail-page__back-btn"
                    onClick={handleBackToList}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Payruns</span>
                </button>
            </div>

            {/* Title & Subtitle Header */}
            <div className="payrun-detail-page__header">
                <h1 className="payrun-detail-page__title">
                    Payrun / {selectedPayrun?.name || 'Batch'}
                </h1>
                <p className="payrun-detail-page__subtitle">
                    Open one Payrun to compute and manage its payslips
                </p>
            </div>

            {/* Lifecycle Action Bar (Compute, Validate, Mark Paid, Send Payslips) */}
            <PayrunActionBar
                status={payrunStatus}
                onCompute={handleCompute}
                onValidate={handleValidateClick}
                onMarkPaid={() => setShowMarkPaidModal(true)}
                onSendPayslips={handleSendAllPayslips}
                canValidate={canValidate}
                blockersCount={blockersCount}
                isComputing={loading.action}
                isValidating={loading.action}
                isMarkingPaid={loading.action}
                isSending={loading.action}
            />

            {/* Pre-Validation Audit Warnings & Blockers Banner */}
            <PayrunWarningsAlert warnings={warnings} />

            {/* Metadata Summary Card (Period, Structure, Status, Gross/Net Totals) */}
            <PayrunMetaSummary payrun={selectedPayrun} />

            {/* Payslips Table with itemized values and PDF download */}
            <PayrunPayslipsTable
                payslips={payslips}
                warningsMap={warningsByEmployee}
                onDownloadPdf={handleDownloadPdf}
                downloadingId={downloadingPdfId}
            />

            {/* Wireframe Helpful Note */}
            <div className="payrun-detail-page__note">
                <p>
                    <strong>Useful note:</strong> warnings such as missing account data or duplicate
                    payslips should be visible before payroll is finalized.
                </p>
            </div>

            {/* Mark Paid Confirmation Dialog */}
            <Dialog
                isOpen={showMarkPaidModal}
                onClose={() => setShowMarkPaidModal(false)}
                title="Confirm Financial Settlement"
                variant="primary"
                size="sm"
                confirmText="Mark as Paid"
                cancelText="Cancel"
                confirmLoading={loading.action}
                onConfirm={handleConfirmMarkPaid}
            >
                <div className="payrun-detail-page__mark-paid-dialog">
                    <p>
                        Marking this payrun as <strong>PAID</strong> creates an immutable historical
                        settlement record and locks all associated payslips.
                    </p>
                    <div className="payrun-detail-page__date-field">
                        <DatePicker
                            label="Settlement Date *"
                            value={paymentDateInput}
                            onChange={(_fmt, d) => {
                                if (d) {
                                    const y = d.getFullYear();
                                    const m = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    setPaymentDateInput(`${y}-${m}-${day}`);
                                }
                            }}
                            portal={true}
                        />
                    </div>
                </div>
            </Dialog>

            {/* Override Blockers Confirmation Dialog */}
            <Dialog
                isOpen={showOverrideModal}
                onClose={() => setShowOverrideModal(false)}
                title="Override Validation Blockers"
                variant="danger"
                size="md"
                confirmText="Override & Validate"
                cancelText="Cancel"
                confirmLoading={loading.action}
                onConfirm={handleConfirmOverrideValidation}
            >
                <div className="payrun-detail-page__override-dialog">
                    <p>
                        This payrun currently has{' '}
                        <strong>{blockersCount} blocking warning(s)</strong> that would normally
                        prevent validation (e.g. missing bank accounts or active contract gaps).
                    </p>
                    <p>
                        Are you sure you want to <strong>explicitly override</strong> these blockers
                        and proceed with locking the calculation?
                    </p>
                </div>
            </Dialog>
        </div>
    );
}

export default PayrunDetailPage;
