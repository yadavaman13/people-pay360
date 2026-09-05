import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Edit3, CheckCircle2, Ban, Trash2 } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import Dialog from '@/components/Shared/Feedback/Dialog';
import './ContractActionBar.scss';

function ContractActionBar({
    contract,
    userRole = '',
    onActivate,
    onCancel,
    onDelete,
    actionLoading = false,
}) {
    const navigate = useNavigate();
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        type: null,
        title: '',
        message: '',
        confirmText: 'Confirm',
        variant: 'primary',
    });

    if (!contract) return null;

    const normalizedRole = (userRole || '').toUpperCase();
    const status = (contract.status || '').toUpperCase();

    const isHrOrAdmin = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(normalizedRole);
    const isAdmin = normalizedRole === 'ADMIN';

    const canEdit = status === 'DRAFT' && isHrOrAdmin;
    const canActivate = status === 'DRAFT' && isHrOrAdmin;
    const canCancel = (status === 'ACTIVE' || status === 'DRAFT') && isHrOrAdmin;
    const canDelete = status === 'DRAFT' && isAdmin;

    const openDialog = (type) => {
        if (type === 'activate') {
            setDialogState({
                isOpen: true,
                type: 'activate',
                title: 'Activate Contract',
                message:
                    'Activating will make this the active contract for this date range. Employees cannot have overlapping active contracts.',
                confirmText: 'Activate',
                variant: 'primary',
            });
        } else if (type === 'cancel') {
            const isCurrentlyActive = status === 'ACTIVE';
            setDialogState({
                isOpen: true,
                type: 'cancel',
                title: 'Cancel Contract',
                message: isCurrentlyActive
                    ? '⚠️ Cancelling an active contract may block payroll processing if a payrun is in progress. This cannot be undone.'
                    : 'Are you sure you want to cancel this draft contract?',
                confirmText: isCurrentlyActive ? 'Yes, Cancel Contract' : 'Yes, Cancel',
                variant: isCurrentlyActive ? 'danger' : 'warning',
            });
        } else if (type === 'delete') {
            setDialogState({
                isOpen: true,
                type: 'delete',
                title: 'Delete Contract',
                message:
                    'Permanently delete this contract? This cannot be undone. Only DRAFT contracts without payslips can be deleted.',
                confirmText: 'Delete Permanently',
                variant: 'danger',
            });
        }
    };

    const closeDialog = () => {
        setDialogState((prev) => ({ ...prev, isOpen: false }));
    };

    const handleConfirm = async () => {
        const type = dialogState.type;
        closeDialog();

        if (type === 'activate' && onActivate) {
            await onActivate(contract.id);
        } else if (type === 'cancel' && onCancel) {
            await onCancel(contract.id);
        } else if (type === 'delete' && onDelete) {
            const res = await onDelete(contract.id);
            if (res?.success) {
                navigate('/dashboard/user/contracts');
            }
        }
    };

    if (!canEdit && !canActivate && !canCancel && !canDelete) {
        return null;
    }

    return (
        <div className="contract-action-bar">
            {canEdit && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/dashboard/user/contracts/${contract.id}/edit`)}
                    disabled={actionLoading}
                    className="action-btn"
                >
                    <Edit3 size={15} />
                    <span>Edit</span>
                </Button>
            )}

            {canActivate && (
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openDialog('activate')}
                    disabled={actionLoading}
                    className="action-btn activate-btn"
                >
                    <CheckCircle2 size={15} />
                    <span>Activate</span>
                </Button>
            )}

            {canCancel && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog('cancel')}
                    disabled={actionLoading}
                    className="action-btn cancel-btn"
                >
                    <Ban size={15} />
                    <span>Cancel Contract</span>
                </Button>
            )}

            {canDelete && (
                <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openDialog('delete')}
                    disabled={actionLoading}
                    className="action-btn delete-btn"
                >
                    <Trash2 size={15} />
                    <span>Delete</span>
                </Button>
            )}

            <Dialog
                isOpen={dialogState.isOpen}
                onClose={closeDialog}
                onConfirm={handleConfirm}
                title={dialogState.title}
                variant={dialogState.variant}
                confirmText={dialogState.confirmText}
                confirmLoading={actionLoading}
            >
                <p className="dialog-action-message">{dialogState.message}</p>
            </Dialog>
        </div>
    );
}

export default ContractActionBar;
