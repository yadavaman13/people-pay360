import { Play, CheckCircle2, DollarSign, Send } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import Tooltip from '@/components/Shared/DataDisplay/Tooltip/Tooltip';
import './PayrunActionBar.scss';

function PayrunActionBar({
    status = 'DRAFT',
    onCompute,
    onValidate,
    onMarkPaid,
    onSendPayslips,
    canValidate = true,
    blockersCount = 0,
    isComputing = false,
    isValidating = false,
    isMarkingPaid = false,
    isSending = false,
}) {
    const upperStatus = status?.toUpperCase() || 'DRAFT';

    const isDraft = upperStatus === 'DRAFT';
    const isComputed = upperStatus === 'COMPUTED';
    const isValidated = upperStatus === 'VALIDATED';
    const isPaid = upperStatus === 'PAID';

    // Compute button states
    const canCompute = isDraft || isComputed;
    const computeLabel = isComputed ? 'Recompute' : 'Compute';

    // Validate button states
    const canClickValidate = isComputed;
    const validateDisabled = !isComputed;

    // Mark Paid button states
    const canClickMarkPaid = isValidated;

    // Send payslips states
    const canSend = isValidated || isPaid;

    const renderValidateButton = () => {
        const btn = (
            <Button
                variant={
                    canClickValidate ? (blockersCount > 0 ? 'secondary' : 'primary') : 'outline'
                }
                onClick={onValidate}
                loading={isValidating}
                disabled={validateDisabled || isValidating}
                icon={<CheckCircle2 size={16} />}
                className="payrun-action-bar__btn"
            >
                {isValidated ? 'Validated' : 'Validate'}
            </Button>
        );

        if (isComputed && blockersCount > 0) {
            return (
                <Tooltip
                    content={`Validation requires review: ${blockersCount} blocker(s) detected`}
                    position="top"
                >
                    <span className="payrun-action-bar__tooltip-trigger">{btn}</span>
                </Tooltip>
            );
        }

        return btn;
    };

    return (
        <div className="payrun-action-bar">
            <div className="payrun-action-bar__actions">
                {canCompute && (
                    <Button
                        variant={isDraft ? 'primary' : 'secondary'}
                        onClick={onCompute}
                        loading={isComputing}
                        disabled={isComputing}
                        icon={<Play size={16} />}
                        className="payrun-action-bar__btn"
                    >
                        {computeLabel}
                    </Button>
                )}

                {/* Validate action */}
                {!isPaid && renderValidateButton()}

                {/* Mark Paid action */}
                {!isPaid && (
                    <Button
                        variant={canClickMarkPaid ? 'primary' : 'outline'}
                        onClick={onMarkPaid}
                        loading={isMarkingPaid}
                        disabled={!canClickMarkPaid || isMarkingPaid}
                        icon={<DollarSign size={16} />}
                        className="payrun-action-bar__btn"
                    >
                        Mark Paid
                    </Button>
                )}

                {isPaid && (
                    <div className="payrun-action-bar__paid-indicator">
                        <CheckCircle2 size={18} className="payrun-action-bar__paid-icon" />
                        <span>Paid & Settled</span>
                    </div>
                )}

                {/* Distribution action */}
                <Button
                    variant={canSend ? 'secondary' : 'ghost'}
                    onClick={onSendPayslips}
                    loading={isSending}
                    disabled={!canSend || isSending}
                    icon={<Send size={16} />}
                    className="payrun-action-bar__send-btn"
                >
                    {isSending ? 'Sending...' : 'Send Payslips'}
                </Button>
            </div>
        </div>
    );
}

export default PayrunActionBar;
