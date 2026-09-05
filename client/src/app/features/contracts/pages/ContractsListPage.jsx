import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, FileText, RotateCcw } from 'lucide-react';
import { useContracts } from '../hooks/useContracts';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import ContractTable from '../components/ContractTable/ContractTable';
import SearchBar from '@/components/Shared/Form/SearchBar/SearchBar';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import Button from '@/components/Shared/Buttons/Button/Button';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import Pagination from '@/components/Shared/Navigation/Pagination/Pagination';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './ContractsListPage.scss';

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

function ContractsListPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        contracts,
        pagination,
        filters,
        loading,
        error,
        setFilter,
        setSearch,
        setPage,
        resetFilters,
        refetch,
    } = useContracts();

    const [searchValue, setSearchValue] = useState(filters.search || '');

    const userRole = (user?.role || '').toUpperCase();
    const canCreate = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(userRole);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchValue(val);
        setSearch(val);
    };

    const handleSearchClear = () => {
        setSearchValue('');
        setSearch('');
    };

    const handleStatusChange = (val) => {
        setFilter('status', val);
    };

    const handleResetAll = () => {
        setSearchValue('');
        resetFilters();
    };

    // Calculate pagination range display (e.g., Showing 1-20 of 47)
    const startIndex = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

    const hasActiveFilters = Boolean(searchValue || filters.status || filters.employeeId);

    return (
        <div className="contracts-list-page">
            {/* Header Section */}
            <header className="contracts-page-header">
                <div className="header-info">
                    <div className="title-row">
                        <FileText className="header-icon" size={26} />
                        <h1 className="header-title">Employment Contracts</h1>
                    </div>
                    <p className="header-subtitle">
                        Manage employee contracts, compensation packages, and operational validity
                        periods.
                    </p>
                </div>

                {canCreate && (
                    <div className="header-actions">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => navigate('/dashboard/user/contracts/new')}
                            className="create-contract-btn"
                        >
                            <Plus size={16} />
                            <span>New Contract</span>
                        </Button>
                    </div>
                )}
            </header>

            {/* Error Notification */}
            {error && (
                <div className="error-alert-wrapper">
                    <Alert variant="danger">
                        <AlertTitle>Error Loading Contracts</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                        <Button variant="outline" size="xs" onClick={refetch} className="retry-btn">
                            Retry
                        </Button>
                    </Alert>
                </div>
            )}

            {/* Filters Bar */}
            <div className="contracts-filter-bar">
                <div className="search-filter-col">
                    <SearchBar
                        value={searchValue}
                        onChange={handleSearchChange}
                        onClear={handleSearchClear}
                        placeholder="Search by employee name or code..."
                        className="contract-search-bar"
                    />
                </div>

                <div className="dropdown-filter-col">
                    <Dropdown
                        options={STATUS_FILTER_OPTIONS}
                        value={filters.status || ''}
                        onChange={handleStatusChange}
                        placeholder="Filter by Status"
                        className="status-dropdown"
                    />

                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetAll}
                            className="clear-filters-btn"
                        >
                            <RotateCcw size={14} />
                            <span>Clear</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content / Table Area */}
            <div className="contracts-table-card">
                {loading && contracts.length === 0 ? (
                    <div className="contracts-loading-state">
                        <Spinner label="Loading employment contracts..." />
                    </div>
                ) : contracts.length === 0 ? (
                    <div className="contracts-empty-state">
                        <EmptyState
                            icon={FileText}
                            title="No contracts found"
                            description={
                                hasActiveFilters
                                    ? 'No contracts match your current search and filter criteria.'
                                    : 'There are currently no contracts in the system.'
                            }
                            actionLabel={
                                canCreate && !hasActiveFilters ? '+ Create Contract' : undefined
                            }
                            onActionClick={
                                canCreate && !hasActiveFilters
                                    ? () => navigate('/dashboard/user/contracts/new')
                                    : undefined
                            }
                        />
                    </div>
                ) : (
                    <>
                        <ContractTable
                            contracts={contracts}
                            loading={loading}
                            showEmployeeColumn={true}
                            onRowClick={(row) => navigate(`/dashboard/user/contracts/${row.id}`)}
                        />

                        {/* Pagination Footer */}
                        <div className="contracts-pagination-bar">
                            <span className="pagination-count-text">
                                Showing {startIndex}–{endIndex} of {pagination.total}{' '}
                                {pagination.total === 1 ? 'contract' : 'contracts'}
                            </span>

                            {pagination.totalPages > 1 && (
                                <Pagination
                                    currentPage={pagination.page}
                                    totalPages={pagination.totalPages}
                                    onPageChange={setPage}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ContractsListPage;
