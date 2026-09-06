import { useState } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AllocationDecisionModal({
    isOpen,
    onClose,
    actionType, // 'approve' | 'refuse'
    allocation,
    onConfirm,
    isSubmitting = false,
}) {
    const [error, setError] = useState(null);
    const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);

    const isApprove = actionType === 'approve';
    const title = isApprove ? 'Approve Leave Allocation' : 'Refuse Leave Allocation';
    const confirmText = isApprove ? 'Confirm Approval' : 'Refuse Allocation';
    const variant = isApprove ? 'primary' : 'danger';

    const isBusy = Boolean(isSubmitting || isInternalSubmitting);

    const handleConfirmClick = async () => {
        if (isBusy) return;
        setError(null);
        setIsInternalSubmitting(true);
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(
                err?.response?.data?.message || err?.message || 'Failed to process allocation',
            );
        } finally {
            setIsInternalSubmitting(false);
        }
    };

    if (!allocation) return null;

    const employeeName =
        [allocation.employee?.firstName, allocation.employee?.lastName].filter(Boolean).join(' ') ||
        allocation.employee?.email ||
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
                        {allocation.timeOffType?.name || 'Time Off'}
                    </div>
                    <div>
                        <strong style={{ color: '#0f172a' }}>Allocated Days:</strong>{' '}
                        {allocation.totalDays} Days
                    </div>
                    <div>
                        <strong style={{ color: '#0f172a' }}>Validity:</strong>{' '}
                        {allocation.validityStart} to {allocation.validityEnd}
                    </div>
                    {allocation.notes && (
                        <div style={{ color: '#64748b' }}>
                            <strong>Notes:</strong> <em>"{allocation.notes}"</em>
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
                            Approving this allocation will make{' '}
                            <strong>{allocation.totalDays} days</strong> active and available for
                            the employee to request time off against.
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
                            Refusing will mark this allocation as <strong>REFUSED</strong>. No leave
                            balance will be credited.
                        </span>
                    </div>
                )}
            </div>
        </Dialog>
    );
}
