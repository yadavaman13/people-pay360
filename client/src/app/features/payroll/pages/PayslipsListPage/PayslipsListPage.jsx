import { useNavigate, useLocation } from 'react-router';
import { Receipt, Plus } from 'lucide-react';
import { usePayslipsList } from '../../hooks/usePayslipsList';
import PayslipsTable from '../../components/PayslipsTable/PayslipsTable';
import PayslipMobileCard from '../../components/PayslipMobileCard/PayslipMobileCard';
import PayrunWizardModal from '../../components/PayrunWizardModal/PayrunWizardModal';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import Button from '@/components/Shared/Buttons/Button/Button';
import './PayslipsListPage.scss';

/**
 * SCR-PAY-004: Master Payslips List Screen
 * Dual-Mode presentation (Enterprise Table on Desktop/Tablet, Interactive Card Roster on Mobile)
 */
function PayslipsListPage() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Determine current role context for routing ('admin', 'hr', or 'employee')
    const roleSegment = pathname.includes('/admin/')
        ? 'admin'
        : pathname.includes('/hr/')
          ? 'hr'
          : 'employee';

    const {
        payslips,
        filteredPayslips,
        pagination,
        isLoading,
        error,
        searchQuery,
        selectedPayrunId,
        filterConfig,
        warningsMap,
        isWizardOpen,
        handleTableChange,
        handlePageChange,
        clearFilters,
        handleRetry,
        setIsWizardOpen,
    } = usePayslipsList();

    const handleNavigateDetail = (payslipId) => {
        if (!payslipId) return;
        navigate(`/dashboard/${roleSegment}/payroll/payslips/${payslipId}`);
    };

    const handleWizardSuccess = (createdPayrun) => {
        setIsWizardOpen(false);
        if (createdPayrun?.id) {
            navigate(`/dashboard/${roleSegment}/payroll/payruns/${createdPayrun.id}`);
        } else {
            handleRetry();
        }
    };

    const isFiltered = Boolean(
        searchQuery.trim() || (selectedPayrunId && selectedPayrunId !== 'ALL'),
    );

    return (
        <div className="payslips-list-page">
            {/* 1. Header Section matching UserManagement */}
            <header className="payslips-list-header">
                <div className="header-info">
                    <div className="title-row">
                        <Receipt className="header-icon" size={24} />
                        <h1 className="header-title">Payslips</h1>
                    </div>
                    <p className="header-subtitle">List view of employee payslips</p>
                </div>

                <div className="header-actions">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => setIsWizardOpen(true)}
                        className="create-payrun-btn"
                    >
                        <Plus size={16} />
                        <span>New Payrun</span>
                    </Button>
                </div>
            </header>

            {/* 2. Error Banner */}
            {error && (
                <div className="payslips-list-page__error-alert">
                    <Alert variant="danger">
                        <AlertTitle>Failed to load payslips</AlertTitle>
                        <AlertDescription>
                            <span>{error}</span>
                            <div className="alert-retry-action">
                                <Button variant="secondary" size="small" onClick={handleRetry}>
                                    Retry
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* 3. Empty State Handlers */}
            {!isLoading && payslips.length === 0 && (
                <div className="payslips-list-page__empty">
                    <EmptyState
                        title={isFiltered ? 'No Payslips Found' : 'No Payslips Generated'}
                        description={
                            isFiltered
                                ? 'No payslips match your active period filter. Try switching back to All Periods.'
                                : 'No payslips have been generated yet. Create and compute a payrun batch to generate employee payslips.'
                        }
                        actionText={isFiltered ? 'Clear Filters' : 'Create Payrun'}
                        onAction={isFiltered ? clearFilters : () => setIsWizardOpen(true)}
                    />
                </div>
            )}

            {!isLoading && payslips.length > 0 && filteredPayslips.length === 0 && (
                <div className="payslips-list-page__empty">
                    <EmptyState
                        title="No Matching Payslips"
                        description={`No employee payslips found matching "${searchQuery}".`}
                        actionText="Clear Search"
                        onAction={clearFilters}
                    />
                </div>
            )}

            {/* 4. Main Roster Content (Visible when loading or data exists) */}
            {(isLoading || filteredPayslips.length > 0) && (
                <>
                    {/* Desktop & Tablet Table (>= 576px) */}
                    <PayslipsTable
                        payslips={filteredPayslips}
                        onRowClick={handleNavigateDetail}
                        isLoading={isLoading}
                        warningsMap={warningsMap}
                        totalCount={pagination.totalCount}
                        onTableChange={handleTableChange}
                        filterConfig={filterConfig}
                        onRefresh={handleRetry}
                    />

                    {/* Mobile Card Roster (< 576px) */}
                    <div className="payslips-list-page__mobile-card-list">
                        {isLoading ? (
                            <div className="payslips-mobile-card-skeletons">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="payslips-mobile-card-skeleton" />
                                ))}
                            </div>
                        ) : (
                            filteredPayslips.map((slip) => (
                                <PayslipMobileCard
                                    key={slip.id}
                                    payslip={slip}
                                    onSelect={handleNavigateDetail}
                                    warningsMap={warningsMap}
                                />
                            ))
                        )}
                    </div>

                    {/* Mobile Compact Pagination (< 576px) */}
                    {pagination.totalPages > 1 && (
                        <div className="payslips-list-page__pagination-mobile">
                            <Button
                                variant="secondary"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="pagination-mobile-btn"
                            >
                                &lt; Previous
                            </Button>
                            <span className="pagination-mobile-label">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="pagination-mobile-btn"
                            >
                                Next &gt;
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* 5. Payrun Wizard Modal */}
            <PayrunWizardModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={handleWizardSuccess}
            />
        </div>
    );
}

export default PayslipsListPage;
