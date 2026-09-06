import { useState } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function RequestDecisionModal({
    isOpen,
    onClose,
    actionType, // 'approve' | 'refuse'
    request,
    onConfirm,
    isSubmitting = false,
}) {
    const [reviewNotes, setReviewNotes] = useState('');
    const [error, setError] = useState(null);
    const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);

    const isApprove = actionType === 'approve';
    const title = isApprove ? 'Approve Time Off Request' : 'Refuse Time Off Request';
    const confirmText = isApprove ? 'Confirm Approval' : 'Refuse Request';
    const variant = isApprove ? 'primary' : 'danger';

    const isBusy = Boolean(isSubmitting || isInternalSubmitting);

    const handleConfirmClick = async () => {
        if (isBusy) return;
        setError(null);
        setIsInternalSubmitting(true);
        try {
            await onConfirm(reviewNotes);
            setReviewNotes('');
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Failed to process request');
        } finally {
            setIsInternalSubmitting(false);
        }
    };

    if (!request) return null;

    const employeeName =
        [request.employee?.firstName, request.employee?.lastName].filter(Boolean).join(' ') ||
        request.employee?.email ||
        'Employee';

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            variant={variant}
            size="md"
            confirmText={confirmText}
            cancelText="Cancel"
            onConfirm={handleConfirmClick}
            confirmLoading={isBusy}
            confirmDisabled={isBusy}
            isConfirmLoading={isBusy}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {error && (
                    <Alert variant="danger">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div
                    style={{
                        background: '#f8fafc',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                    }}
                >
                    <div>
                        <strong style={{ color: '#0f172a' }}>Employee:</strong> {employeeName}
                    </div>
                    <div>
                        <strong style={{ color: '#0f172a' }}>Leave Type:</strong>{' '}
                        {request.timeOffType?.name || 'Time Off'}
                    </div>
                    <div>
                        <strong style={{ color: '#0f172a' }}>Period:</strong> {request.startDate} to{' '}
                        {request.endDate} ({request.numberOfDays} Days)
                    </div>
                    {request.reason && (
                        <div style={{ color: '#64748b' }}>
                            <strong>Reason:</strong> <em>"{request.reason}"</em>
                        </div>
                    )}
                </div>

                {isApprove ? (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            color: '#0f172a',
                            fontSize: '13px',
                            background: '#f0fdf4',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0',
                        }}
                    >
                        <CheckCircle2
                            size={16}
                            color="#16a34a"
                            style={{ marginTop: '2px', flexShrink: 0 }}
                        />
                        <span>
                            Approving will mark this request as <strong>APPROVED</strong> and deduct{' '}
                            <strong>{request.numberOfDays} days</strong> from the employee's active
                            leave allocation.
                        </span>
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            color: '#991b1b',
                            fontSize: '13px',
                            background: '#fef2f2',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                        }}
                    >
                        <AlertTriangle
                            size={16}
                            color="#dc2626"
                            style={{ marginTop: '2px', flexShrink: 0 }}
                        />
                        <span>
                            Refusing this request will set its status to <strong>REFUSED</strong>.
                            No leave balance will be consumed.
                        </span>
                    </div>
                )}

                <div>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#334155',
                        }}
                    >
                        Reviewer Notes {isApprove ? '(Optional)' : '(Recommended)'}
                    </label>
                    <Textarea
                        placeholder={
                            isApprove
                                ? 'e.g. Approved. Enjoy your time off!'
                                : 'e.g. Project deliverable deadline conflict on requested dates.'
                        }
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                    />
                </div>
            </div>
        </Dialog>
    );
}
