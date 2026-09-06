import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle, XCircle, Calendar, User, Layers } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import AllocationDecisionModal from '../../components/AllocationDecisionModal/AllocationDecisionModal';
import './AllocationDetailPage.scss';

export default function AllocationDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { roleSegment, triggerRefresh } = useTimeOff();

    const [allocation, setAllocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Decision modal state
    const [decisionModal, setDecisionModal] = useState({
        isOpen: false,
        actionType: 'approve',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadAllocation = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await timeOffApi.fetchAllocationById(id);
            setAllocation(res?.data || null);
        } catch (err) {
            console.error('[AllocationDetailPage] Failed to fetch allocation:', err);
            setError(
                err?.response?.data?.message || err?.message || 'Failed to load allocation details',
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadAllocation();
    }, [loadAllocation]);

    const handleDecisionConfirm = async () => {
        if (!allocation || isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (decisionModal.actionType === 'approve') {
                await timeOffApi.approveAllocation(allocation.id);
            } else {
                await timeOffApi.refuseAllocation(allocation.id);
            }
            triggerRefresh();
            await loadAllocation();
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="detail-loading-state">
                <Spinner size="lg" />
                <span>Loading allocation details...</span>
            </div>
        );
    }

    if (error || !allocation) {
        return (
            <div className="detail-error-container">
                <Alert variant="danger">
                    <AlertDescription>
                        {error || 'Leave allocation record not found'}
                    </AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={() => navigate(`/dashboard/${roleSegment}/time-off/allocations`)}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Allocations</span>
                </Button>
            </div>
        );
    }

    const employeeName =
        [allocation.employee?.firstName, allocation.employee?.lastName].filter(Boolean).join(' ') ||
        allocation.employee?.email ||
        'Employee';

    const isPending = allocation.status === 'PENDING';

    let statusVariant = 'default';
    let statusLabel = allocation.status;
    if (allocation.status === 'APPROVED') {
        statusVariant = 'success';
        statusLabel = 'Approved';
    } else if (allocation.status === 'REFUSED') {
        statusVariant = 'danger';
        statusLabel = 'Refused';
    } else if (allocation.status === 'PENDING') {
        statusVariant = 'warning';
        statusLabel = 'To Approve';
    }

    return (
        <div className="allocation-detail-page">
            {/* Header */}
            <div className="detail-header">
                <div className="header-left">
                    <Button
                        variant="plain"
                        size="sm"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/allocations`)}
                        className="back-btn"
                    >
                        <ArrowLeft size={16} />
                        <span>Allocations</span>
                    </Button>
                    <div className="header-titles">
                        <h1 className="page-title">Allocation / {employeeName}</h1>
                        <span className="page-subtitle">Form view of one allocation record</span>
                    </div>
                </div>

                <div className="header-actions">
                    {isPending && (
                        <>
                            <Button
                                variant="primary"
                                size="md"
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
                                onClick={() =>
                                    setDecisionModal({ isOpen: true, actionType: 'refuse' })
                                }
                            >
                                <XCircle size={16} />
                                <span>Refuse</span>
                            </Button>
                        </>
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
                                    {allocation.employee?.employeeCode && (
                                        <span className="user-code">
                                            ({allocation.employee.employeeCode})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Time Off Type</label>
                            <div className="field-value">
                                <Layers size={16} className="field-icon" />
                                <span className="type-title">
                                    {allocation.timeOffType?.name || '—'}
                                </span>
                                <span className="type-badge-pill">
                                    {allocation.timeOffType?.paidTimeOff ? 'Paid' : 'Unpaid'}
                                </span>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Allocated</label>
                            <div className="field-value">
                                <strong>{allocation.totalDays} Days</strong>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Status</label>
                            <div className="field-value">
                                <Badge variant={statusVariant}>{statusLabel}</Badge>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="detail-col">
                        <div className="field-group">
                            <label className="field-label">Taken</label>
                            <div className="field-value">
                                <span className="text-muted">
                                    {allocation.usedDays || '0.00'} Days
                                </span>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Remaining</label>
                            <div className="field-value">
                                <strong>
                                    {allocation.remainingDays || allocation.totalDays} Days
                                </strong>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Approver</label>
                            <div className="field-value">
                                <span>
                                    {allocation.approvedBy
                                        ? 'HR / Administrator'
                                        : 'Pending Review'}
                                </span>
                            </div>
                        </div>

                        <div className="field-group">
                            <label className="field-label">Validity Window</label>
                            <div className="field-value">
                                <Calendar size={16} className="field-icon" />
                                <span>
                                    {allocation.validityStart} to {allocation.validityEnd}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Description / Notes */}
                <div className="detail-full-width">
                    <div className="field-group">
                        <label className="field-label">Description / Notes</label>
                        <div className="text-box">
                            {allocation.notes ? (
                                <p>{allocation.notes}</p>
                            ) : (
                                <span className="empty-text">
                                    No notes provided for this allocation.
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Decision Modal */}
            <AllocationDecisionModal
                isOpen={decisionModal.isOpen}
                onClose={() => setDecisionModal({ isOpen: false, actionType: 'approve' })}
                actionType={decisionModal.actionType}
                allocation={allocation}
                onConfirm={handleDecisionConfirm}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
