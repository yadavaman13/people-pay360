import { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { PayrollContext } from '../../context/payroll.context';
import { usePayroll } from '../../hooks/usePayroll';
import PayrunCard from '../../components/PayrunCard/PayrunCard';
import PayrunFilterBar from '../../components/PayrunFilterBar/PayrunFilterBar';
import PayrunWizardModal from '../../components/PayrunWizardModal/PayrunWizardModal';
import Pagination from '@/components/Shared/Navigation/Pagination/Pagination';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import Button from '@/components/Shared/Buttons/Button/Button';
import './PayrunsListPage.scss';

function PayrunsListPage() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // 1. Read Path: Consume state directly from PayrollContext
    const { payruns, filteredPayruns, pagination, filters, loading, error } =
        useContext(PayrollContext);

    // 2. Action Path: Consume action handlers from usePayroll hook
    const { loadPayruns, handleDeletePayrun, setFilterValues } = usePayroll();

    // Local UI modal states
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Resolve current role segment for navigation ('user' or 'admin')
    const roleSegment = pathname.includes('/admin/') ? 'admin' : 'user';

    useEffect(() => {
        loadPayruns({
            page: pagination.page,
            limit: pagination.limit,
        });
    }, [loadPayruns, pagination.page, pagination.limit]);

    const handlePageChange = (newPage) => {
        loadPayruns({
            page: newPage,
            limit: pagination.limit,
        });
    };

    const handleCardClick = (payrunId) => {
        navigate(`/dashboard/${roleSegment}/payroll/payruns/${payrunId}`);
    };

    const handleWizardSuccess = (createdPayrun) => {
        setIsWizardOpen(false);
        if (createdPayrun?.id) {
            navigate(`/dashboard/${roleSegment}/payroll/payruns/${createdPayrun.id}`);
        } else {
            loadPayruns();
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget?.id) return;
        setIsDeleting(true);
        try {
            await handleDeletePayrun(deleteTarget.id);
            setDeleteTarget(null);
        } catch {
            // Error handled in hook toast
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="payruns-list-page">
            {/* Page Header */}
            <div className="payruns-list-page__header">
                <h1 className="payruns-list-page__title">Payruns</h1>
                <p className="payruns-list-page__subtitle">Payrun view for payroll periods</p>
            </div>

            {/* Filter & Actions Bar */}
            <PayrunFilterBar
                searchQuery={filters.search}
                onSearchChange={(search) => setFilterValues((prev) => ({ ...prev, search }))}
                selectedYear={filters.year}
                onYearChange={(year) => setFilterValues((prev) => ({ ...prev, year }))}
                selectedStatus={filters.status}
                onStatusChange={(status) => setFilterValues((prev) => ({ ...prev, status }))}
                onNewClick={() => setIsWizardOpen(true)}
                isLoading={loading.list}
            />

            {/* Error Banner */}
            {error && payruns.length === 0 && (
                <div className="payruns-list-page__error">
                    <Alert variant="danger">
                        <AlertTitle>Failed to load payruns</AlertTitle>
                        <AlertDescription>
                            {error}
                            <div className="payruns-list-page__retry-btn">
                                <Button variant="outline" onClick={() => loadPayruns()} size="sm">
                                    Retry
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Main Content Area */}
            <div className="payruns-list-page__content">
                {loading.list && payruns.length === 0 ? (
                    <div className="payruns-list-page__loading">
                        <Spinner label="Loading payruns..." />
                    </div>
                ) : filteredPayruns.length === 0 ? (
                    <div className="payruns-list-page__empty">
                        <EmptyState
                            title={payruns.length === 0 ? 'No Payruns Yet' : 'No Payruns Found'}
                            description={
                                payruns.length === 0
                                    ? 'Get started by creating your first payroll period run.'
                                    : 'No payruns match your active filters or search criteria.'
                            }
                            actionText={payruns.length === 0 ? 'Create Payrun' : 'Clear Filters'}
                            onAction={
                                payruns.length === 0
                                    ? () => setIsWizardOpen(true)
                                    : () =>
                                          setFilterValues({
                                              search: '',
                                              year: 'All',
                                              status: 'All',
                                          })
                            }
                        />
                    </div>
                ) : (
                    <div className="payruns-list-page__cards-list">
                        {filteredPayruns.map((payrun) => (
                            <PayrunCard
                                key={payrun.id}
                                payrun={payrun}
                                onClick={handleCardClick}
                                canDelete={true}
                                onDelete={(item) => setDeleteTarget(item)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Server Pagination */}
            {pagination.totalPages > 1 && (
                <div className="payruns-list-page__pagination">
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
            )}

            {/* Creation Wizard Modal (SCR-PAY-002) */}
            <PayrunWizardModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={handleWizardSuccess}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog
                isOpen={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                title="Delete Payrun"
                variant="danger"
                size="sm"
                confirmText="Delete"
                cancelText="Cancel"
                confirmLoading={isDeleting}
                onConfirm={handleConfirmDelete}
            >
                <p>
                    Are you sure you want to delete payrun{' '}
                    <strong>{deleteTarget?.name || 'this draft'}</strong>? This action cannot be
                    undone.
                </p>
            </Dialog>
        </div>
    );
}

export default PayrunsListPage;
