import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle, XCircle, Ban, Calendar, User, Clock } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { useToast } from '@/components/Shared/Feedback/Toast';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import RequestDecisionModal from '../../components/RequestDecisionModal/RequestDecisionModal';
import './TimeOffRequestDetailPage.scss';

export default function TimeOffRequestDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isHR, isEmployee, roleSegment, triggerRefresh } = useTimeOff();
    const { success: showSuccessToast, error: showErrorToast } = useToast();

    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Decision modal state
    const [decisionModal, setDecisionModal] = useState({
        isOpen: false,
        actionType: 'approve',
    });
    const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);
    const [actionRunning, setActionRunning] = useState(null);

    // Cancel modal state
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const loadRequest = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await timeOffApi.fetchRequestById(id);
            setRequest(res?.data || null);
        } catch (err) {
            console.error('[TimeOffRequestDetailPage] Failed to fetch request:', err);
            setError(
                err?.response?.data?.message || err?.message || 'Failed to load request details',
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadRequest();
    }, [loadRequest]);

    const handleDecisionConfirm = async (reviewNotes) => {
        if (!request || isDecisionSubmitting) return;
        const action = decisionModal.actionType;
        setIsDecisionSubmitting(true);
        setActionRunning(action);

        try {
            if (action === 'approve') {
                await timeOffApi.approveRequest(request.id, reviewNotes);
            } else {
                await timeOffApi.refuseRequest(request.id, reviewNotes);
            }

            const newStatus = action === 'approve' ? 'APPROVED' : 'REFUSED';
            setRequest((prev) =>
                prev
                    ? { ...prev, status: newStatus, reviewNotes: reviewNotes || prev.reviewNotes }
                    : null,
            );

            setDecisionModal({ isOpen: false, actionType: 'approve' });

            showSuccessToast(
                action === 'approve'
                    ? 'Time off request approved successfully'
                    : 'Time off request refused successfully',
            );

            triggerRefresh();
            loadRequest();
        } catch (err) {
            console.error('[TimeOffRequestDetailPage] Decision action failed:', err);
            const errMsg =
                err?.response?.data?.message || err?.message || `Failed to ${action} request`;
            showErrorToast(errMsg);
        } finally {
            setIsDecisionSubmitting(false);
            setActionRunning(null);
        }
    };

    const handleCancelConfirm = async () => {
        if (!request || isCancelling) return;
        setIsCancelling(true);
        try {
            await timeOffApi.cancelRequest(request.id);
            setRequest((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
            setIsCancelModalOpen(false);
            showSuccessToast('Time off request cancelled successfully');

            triggerRefresh();
            loadRequest();
        } catch (err) {
            const errMsg =
                err?.response?.data?.message || err?.message || 'Failed to cancel request';
            showErrorToast(errMsg);
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="detail-loading-state">
                <Spinner size="lg" />
                <span>Loading request details...</span>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="detail-error-container">
                <Alert variant="danger">
                    <AlertDescription>{error || 'Time off request not found'}</AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={() => navigate(`/dashboard/${roleSegment}/time-off/requests`)}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Requests</span>
                </Button>
            </div>
        );
    }

    const employeeName =
        [request.employee?.firstName, request.employee?.lastName].filter(Boolean).join(' ') ||
        request.employee?.email ||
        'Employee';

    const isPending = request.status === 'PENDING';

    let statusVariant = 'default';
    let statusLabel = request.status;
    if (request.status === 'APPROVED') {
        statusVariant = 'success';
        statusLabel = 'Approved';
    } else if (request.status === 'REFUSED') {
        statusVariant = 'danger';
        statusLabel = 'Refused';
    } else if (request.status === 'PENDING') {
        statusVariant = 'warning';
        statusLabel = isHR ? 'To Approve' : 'Pending';
    }

    return (
        <div className="time-off-detail-page">
            {/* Top Navigation & Action Header */}
            <div className="detail-header">
                <div className="header-left">
                    <Button
                        variant="plain"
                        size="sm"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/requests`)}
                        className="back-btn"
                    >
                        <ArrowLeft size={16} />
                        <span>Requests</span>
                    </Button>
                    <div className="header-titles">
                        <h1 className="page-title">
                            Time Off Request / {isHR ? employeeName : 'My Request'}
                        </h1>
                        <span className="page-subtitle">Form view of one request</span>
                    </div>
                </div>

                <div className="header-actions">
                    {isHR && isPending && (
                        <>
                            <Button
                                variant="primary"
                                size="md"
                                loading={actionRunning === 'approve'}
                                disabled={Boolean(actionRunning)}
                                onClick={() =>
                                    setDecisionModal({ isOpen: true, actionType: 'approve' })
                                }
                            >
                                <CheckCircle size={16} />
                                <span>Approve</span>
                            </Button>
                            <Button
                                variant="danger"
                                size="md"
                                loading={actionRunning === 'refuse'}
                                disabled={Boolean(actionRunning)}
                                onClick={() =>
                                    setDecisionModal({ isOpen: true, actionType: 'refuse' })
                                }
                            >
                                <XCircle size={16} />
                                <span>Refuse</span>
                            </Button>
                        </>
                    )}

                    {isEmployee && isPending && (
                        <Button
                            variant="danger"
                            size="md"
                            disabled={Boolean(actionRunning) || isCancelling}
                            onClick={() => setIsCancelModalOpen(true)}
                        >
                            <Ban size={16} />
                            <span>Cancel Request</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Two-Column Form Detail Card */}
            <div className="detail-card">
                <div className="detail-grid">
                    {/* Left Column */}
                    <div className="detail-col">
                        <div className="field-group">
                            <label className="field-label">Employee</label>
                            <div className="field-value user-info">
                                <User size={16} className="field-icon" />
                                <div>
                                    <span className="user-name">{employeeName}</span>
                                    {request.employee?.employeeCode && (
                                        <span className="user-code">
                                            ({request.employee.employeeCode})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Time Off Type</label>
                            <div className="field-value">
                                <span className="type-title">
                                    {request.timeOffType?.name || '—'}
                                </span>
                                <span className="type-badge-pill">
                                    {request.timeOffType?.paidTimeOff
                                        ? 'Paid Time Off'
                                        : 'Unpaid Leave'}
                                </span>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Start Date</label>
                            <div className="field-value">
                                <Calendar size={16} className="field-icon" />
                                <span>{request.startDate}</span>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">End Date</label>
                            <div className="field-value">
                                <Calendar size={16} className="field-icon" />
                                <span>{request.endDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="detail-col">
                        <div className="field-group">
                            <label className="field-label">Duration</label>
                            <div className="field-value">
                                <Clock size={16} className="field-icon" />
                                <strong>{request.numberOfDays} Days</strong>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Status</label>
                            <div className="field-value">
                                <Badge variant={statusVariant}>{statusLabel}</Badge>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Approver / Reviewer</label>
                            <div className="field-value">
                                <span>{request.reviewedBy ? 'Management / HR' : '—'}</span>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Allocation Used</label>
                            <div className="field-value">
                                <span>
                                    {request.allocationId
                                        ? `${request.timeOffType?.name || 'Leave'} Allocation`
                                        : 'No allocation required'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Reason & Review Notes Section */}
                <div className="detail-full-width">
                    <div className="field-group">
                        <label className="field-label">Reason</label>
                        <div className="text-box">
                            {request.reason ? (
                                <p>{request.reason}</p>
                            ) : (
                                <span className="empty-text">No reason provided.</span>
                            )}
                        </div>
                    </div>

                    {request.reviewNotes && (
                        <div className="field-group" style={{ marginTop: '16px' }}>
                            <label className="field-label">Review Notes</label>
                            <div className="text-box notes-box">
                                <p>{request.reviewNotes}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* HR Decision Modal */}
            <RequestDecisionModal
                isOpen={decisionModal.isOpen}
                onClose={() => setDecisionModal({ isOpen: false, actionType: 'approve' })}
                actionType={decisionModal.actionType}
                request={request}
                onConfirm={handleDecisionConfirm}
                isSubmitting={isDecisionSubmitting}
            />

            {/* Employee Cancel Modal */}
            <Dialog
                isOpen={isCancelModalOpen}
                onClose={() => setIsCancelModalOpen(false)}
                title="Cancel Time Off Request"
                variant="danger"
                size="sm"
                confirmText="Yes, Cancel Request"
                cancelText="No, Keep Request"
                onConfirm={handleCancelConfirm}
                confirmLoading={isCancelling}
                confirmDisabled={isCancelling}
                isConfirmLoading={isCancelling}
            >
                <p>
                    Are you sure you want to cancel this leave request? Consumed balances (if any)
                    will be restored automatically.
                </p>
            </Dialog>
        </div>
    );
}
