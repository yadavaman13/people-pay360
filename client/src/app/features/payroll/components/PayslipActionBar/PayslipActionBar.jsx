import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Zap, CheckCircle, Printer } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import Tooltip from '@/components/Shared/DataDisplay/Tooltip/Tooltip';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import './PayslipActionBar.scss';

function PayslipActionBar({
    status = 'DRAFT',
    payrunStatus = 'DRAFT',
    payrunId = null,
    payrunName = '',
    onCompute,
    onPrintPdf,
    isComputing = false,
    isPrinting = false,
    _userRole = 'HR_PAYROLL_USER',
}) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [showSettlementModal, setShowSettlementModal] = useState(false);

    const upperStatus = (status || 'DRAFT').toUpperCase();
    const isLocked = ['VALIDATED', 'PAID', 'SENT'].includes(upperStatus);
    const isPaid = upperStatus === 'PAID';
    const isDraft = upperStatus === 'DRAFT';

    // Current role segment for routing
    const roleSegment = pathname.includes('/admin/') ? 'admin' : 'user';

    const handleNavigateToPayrun = () => {
        setShowSettlementModal(false);
        if (payrunId) {
            navigate(`/dashboard/${roleSegment}/payroll/payruns/${payrunId}`);
        } else {
            navigate(`/dashboard/${roleSegment}/payroll/payruns`);
        }
    };

    const computeButton = (
        <Button
            variant="primary"
            size="md"
            onClick={onCompute}
            loading={isComputing}
            disabled={isComputing || isLocked}
            className="payslip-action-btn payslip-action-btn--compute"
            icon={!isComputing && <Zap size={16} />}
        >
            {isComputing ? 'Computing...' : 'COMPUTE'}
        </Button>
    );

    const markPaidButton = (
        <Button
            variant="secondary"
            size="md"
            onClick={() => setShowSettlementModal(true)}
            disabled={isPaid}
            className="payslip-action-btn payslip-action-btn--mark-paid"
            icon={<CheckCircle size={16} />}
        >
            MARK PAID
        </Button>
    );

    const printButton = (
        <Button
            variant="secondary"
            size="md"
            onClick={onPrintPdf}
            loading={isPrinting}
            disabled={isDraft || isPrinting}
            className="payslip-action-btn payslip-action-btn--print"
            icon={!isPrinting && <Printer size={16} />}
        >
            {isPrinting ? 'Preparing...' : 'PRINT PAYSLIP'}
        </Button>
    );

    return (
        <>
            <div className="payslip-actions-bar">
                {/* 1. Compute Action */}
                {isLocked ? (
                    <Tooltip content={`Payslip is locked in ${upperStatus} status`} position="top">
                        <span className="payslip-action-tooltip-wrapper">{computeButton}</span>
                    </Tooltip>
                ) : (
                    computeButton
                )}

                {/* 2. Mark Paid Action */}
                {isPaid ? (
                    <Tooltip content="Payslip has already been marked as paid" position="top">
                        <span className="payslip-action-tooltip-wrapper">{markPaidButton}</span>
                    </Tooltip>
                ) : (
                    markPaidButton
                )}

                {/* 3. Print Payslip Action */}
                {isDraft ? (
                    <Tooltip content="Compute payslip first before printing PDF" position="top">
                        <span className="payslip-action-tooltip-wrapper">{printButton}</span>
                    </Tooltip>
                ) : (
                    printButton
                )}
            </div>

            {/* Payrun Settlement Guidance Dialog */}
            <Dialog
                isOpen={showSettlementModal}
                onClose={() => setShowSettlementModal(false)}
                title="Batch Salary Settlement"
                variant="primary"
                confirmText="Go to Parent Payrun"
                cancelText="Close"
                onConfirm={handleNavigateToPayrun}
            >
                <div className="payslip-settlement-modal-content">
                    <p>
                        In PeoplePay360, financial disbursements and settlement tracking are managed
                        at the batch <strong>Payrun</strong> level to ensure financial integrity and
                        bank compliance.
                    </p>
                    {payrunName && (
                        <p className="payslip-settlement-modal-highlight">
                            Parent Payrun: <strong>{payrunName}</strong> (Status: {payrunStatus})
                        </p>
                    )}
                    <p>
                        Would you like to navigate to the parent payrun to record or verify batch
                        disbursement?
                    </p>
                </div>
            </Dialog>
        </>
    );
}

export default PayslipActionBar;
