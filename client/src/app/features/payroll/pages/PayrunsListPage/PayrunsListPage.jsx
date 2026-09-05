import { useNavigate, useLocation } from 'react-router';
import { Plus, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePayrunsList } from '../../hooks/usePayrunsList';
import PayrunsTable from '../../components/PayrunsTable/PayrunsTable';
import PayrunMobileCard from '../../components/PayrunMobileCard/PayrunMobileCard';
import PayrunWizardModal from '../../components/PayrunWizardModal/PayrunWizardModal';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import Button from '@/components/Shared/Buttons/Button/Button';
import './PayrunsListPage.scss';

/**
 * SCR-PAY-001: Master Payruns List Screen
 * Dual-Mode presentation (Enterprise Table on Desktop/Tablet, Interactive Card Roster on Mobile)
 */
function PayrunsListPage() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Determine current role context for routing ('admin', 'hr', or 'employee')
    const roleSegment = pathname.includes('/admin/')
        ? 'admin'
        : pathname.includes('/hr/')
          ? 'hr'
          : 'employee';

    const {
        payruns,
        filteredPayruns,
        pagination,
        isLoading,
        error,
        searchQuery,
        selectedStatus,
        selectedYear,
        availableYears,
        filterConfig,
        isWizardOpen,
        deleteTarget,
        isDeleting,
        handleTableChange,
        handleSearchChange,
        handleStatusChange,
        handleYearChange,
        handlePageChange,
        clearFilters,
        handleRetry,
        setIsWizardOpen,
        setDeleteTarget,
        handleConfirmDelete,
    } = usePayrunsList();

    const handleNavigateDetail = (payrunId) => {
        if (!payrunId) return;
        navigate(`/dashboard/${roleSegment}/payroll/payruns/${payrunId}`);
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
        searchQuery.trim() ||
        (selectedStatus && selectedStatus !== 'ALL') ||
        (selectedYear && selectedYear !== 'ALL'),
    );

    return (
        <div className="payruns-list-page">
            {/* 1. Header Section matching UserManagement and Payslips */}
            <header className="payruns-list-header">
                <div className="header-info">
                    <div className="title-row">
                        <h1 className="header-title">Payruns</h1>
                    </div>
                    <p className="header-subtitle">Payrun view for payroll periods</p>
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

            {/* 2. Mobile Search & Filter Toolbar (< 576px) */}
            <div className="payruns-list-page__mobile-toolbar">
                <div className="mobile-search-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        className="mobile-search-input"
                        placeholder="Search payruns by name, status..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        aria-label="Search payruns"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="search-clear-btn"
                            onClick={() => handleSearchChange('')}
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="mobile-filter-pills">
                    <select
                        className="mobile-filter-select"
                        value={selectedStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        aria-label="Filter by status"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="COMPUTED">Computed</option>
                        <option value="VALIDATED">Validated</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>

                    <select
                        className="mobile-filter-select"
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        aria-label="Filter by year"
                    >
                        <option value="ALL">All Years</option>
                        {availableYears.map((yr) => (
                            <option key={yr} value={yr}>
                                {yr}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 3. Error Banner */}
            {error && (
                <div className="payruns-list-page__error-alert">
                    <Alert variant="danger">
                        <AlertTitle>Failed to load payruns</AlertTitle>
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

            {/* 4. Empty State Handler (Only when database has zero payruns and no active filters) */}
            {!isLoading && payruns.length === 0 && !isFiltered && (
                <div className="payruns-list-page__empty">
                    <EmptyState
                        title="No Payruns Yet"
                        description="Get started by creating your first payroll period run."
                        actionLabel="Create Payrun"
                        onActionClick={() => setIsWizardOpen(true)}
                    />
                </div>
            )}

            {/* 5. Main Roster Content (Visible when loading, data exists, or filters/search are applied) */}
            {(isLoading || payruns.length > 0 || isFiltered) && (
                <>
                    {/* Desktop & Tablet Table (>= 576px) */}
                    <PayrunsTable
                        payruns={filteredPayruns}
                        onRowClick={handleNavigateDetail}
                        onDelete={(payrun) => setDeleteTarget(payrun)}
                        canDelete={true}
                        isLoading={isLoading}
                        totalCount={pagination.totalCount}
                        onTableChange={handleTableChange}
                        filterConfig={filterConfig}
                        onRefresh={handleRetry}
                        searchTerm={searchQuery}
                    />

                    {/* Mobile Card Roster (< 576px) */}
                    <div className="payruns-list-page__mobile-card-list">
                        {isLoading ? (
                            <div className="payruns-mobile-card-skeletons">
                                {[1, 2, 3].map((n) => (
                                    <div key={n} className="payruns-mobile-card-skeleton" />
                                ))}
                            </div>
                        ) : filteredPayruns.length === 0 ? (
                            <div className="payruns-list-page__mobile-empty">
                                <EmptyState
                                    title={isFiltered ? 'No Matching Payruns' : 'No Payruns Found'}
                                    description={
                                        isFiltered
                                            ? `No payruns found matching active filters or "${searchQuery}".`
                                            : 'No payruns available in this view.'
                                    }
                                    actionLabel={isFiltered ? 'Clear Filters' : 'Create Payrun'}
                                    onActionClick={
                                        isFiltered ? clearFilters : () => setIsWizardOpen(true)
                                    }
                                />
                            </div>
                        ) : (
                            filteredPayruns.map((payrun) => (
                                <PayrunMobileCard
                                    key={payrun.id}
                                    payrun={payrun}
                                    onSelect={handleNavigateDetail}
                                    canDelete={true}
                                    onDelete={(item) => setDeleteTarget(item)}
                                />
                            ))
                        )}
                    </div>

                    {/* Mobile Compact Pagination (< 576px) */}
                    {pagination.totalPages > 1 && (
                        <div className="payruns-list-page__pagination-mobile">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page <= 1}
                                className="pagination-mobile-btn"
                            >
                                <ChevronLeft size={16} />
                                <span>Previous</span>
                            </Button>
                            <span className="pagination-mobile-label">
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages}
                                className="pagination-mobile-btn"
                            >
                                <span>Next</span>
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* 6. Payrun Wizard Modal */}
            <PayrunWizardModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={handleWizardSuccess}
            />

            {/* 7. Delete Confirmation Dialog */}
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
