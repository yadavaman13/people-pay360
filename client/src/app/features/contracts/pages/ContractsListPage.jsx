import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, RotateCcw, ExternalLink, ChevronRight } from 'lucide-react';
import { useContracts } from '../hooks/useContracts';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Pagination from '@/components/Shared/Navigation/Pagination/Pagination';
import ContractStatusBadge from '../components/ContractStatusBadge/ContractStatusBadge';
import ExpiryWarningBadge from '../components/ExpiryWarningBadge/ExpiryWarningBadge';
import ContractSearchBar from '../components/ContractSearchBar';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { DEFAULT_AVATAR_URL } from '@/utils/avatar';
import './ContractsListPage.scss';
import '../components/ContractTable/ContractTable.scss';

// ── Formatters ──────────────────────────────────────────────────────────────
function formatDisplayDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === '') return '—';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num);
}

function formatCurrencyParts(amount) {
    if (amount === undefined || amount === null || amount === '') return { formatted: '—' };
    const num = Number(amount);
    if (isNaN(num)) return { formatted: String(amount) };
    const formatted = formatCurrency(amount);
    return { formatted };
}

function ContractsListPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        contracts,
        counts,
        pagination,
        filters,
        loading,
        error,
        setFilter,
        setSearch,
        setPage,
        setLimit,
        resetFilters,
        refetch,
    } = useContracts();

    const [searchValue, setSearchValue] = useState(filters.search || '');
    const searchDebounceRef = useRef(null);

    const userRole = (user?.role || '').toUpperCase();
    const canCreate = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(userRole);

    const handleSearchChange = useCallback(
        (e) => {
            const val = e.target.value;
            setSearchValue(val);
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(() => setSearch(val), 350);
        },
        [setSearch],
    );

    const handleSearchClear = useCallback(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        setSearchValue('');
        setSearch('');
    }, [setSearch]);

    const handleResetAll = () => {
        setSearchValue('');
        resetFilters();
    };

    const hasActiveFilters = Boolean(searchValue || filters.status || filters.employeeId);

    const contractTabs = useMemo(() => {
        const c = counts || {};
        const allCount = c.all || (!filters.status ? pagination.total : 0) || 0;
        return [
            { id: 'all', label: 'All Contracts', count: allCount },
            { id: 'ACTIVE', label: 'Active', count: c.ACTIVE ?? 0 },
            { id: 'DRAFT', label: 'Draft', count: c.DRAFT ?? 0 },
            { id: 'EXPIRED', label: 'Expired', count: c.EXPIRED ?? 0 },
            { id: 'CANCELLED', label: 'Cancelled', count: c.CANCELLED ?? 0 },
        ];
    }, [counts, filters.status, pagination.total]);

    // ── Transform raw contracts for the table ────────────────────────────────
    const tableData = useMemo(
        () =>
            (contracts || []).map((c) => {
                const employeeName = c.employee
                    ? `${c.employee.firstName || ''} ${c.employee.lastName || ''}`.trim() ||
                      'Unknown'
                    : 'Unknown';
                const employeeCode = c.employee?.employeeCode || '';
                const contractName =
                    c.contractName ||
                    c.notes?.split('\n')[0] ||
                    (c.salaryStructure?.name
                        ? `${c.salaryStructure.name} Contract`
                        : 'Employment Contract');
                const startFormatted = formatDisplayDate(c.startDate) || '—';
                const endFormatted = formatDisplayDate(c.endDate) || 'Open-Ended';
                const isHourly = (c.wageType || 'MONTHLY').toLowerCase() === 'hourly';
                const wageNumber = Number(c.wage) || 0;
                const wageFormatted = formatCurrencyParts(c.wage).formatted;
                const wageUnit = isHourly ? '/ hr' : '/ mo';
                const structureName = c.salaryStructure?.name || '—';
                const departmentName = c.department?.name || '—';
                const termType = c.endDate ? 'Fixed-Term' : 'Open-Ended';

                return {
                    ...c,
                    employeeName,
                    employeeCode,
                    contractName,
                    contractStatus: c.status,
                    startDateFormatted: startFormatted,
                    endDateFormatted: endFormatted,
                    isOpenEnded: !c.endDate,
                    termType,
                    wageNumber,
                    wageFormatted,
                    wageUnit,
                    structureName,
                    departmentName,
                };
            }),
        [contracts],
    );

    // ── Filter configuration for the Filter toggle panel (allows multiple filters) ──
    const filterConfig = useMemo(() => {
        const configs = [
            {
                key: 'contractStatus',
                label: 'Status',
                type: 'select',
                options: ['ACTIVE', 'DRAFT', 'EXPIRED', 'CANCELLED'],
            },
            {
                key: 'wageType',
                label: 'Wage Type',
                type: 'select',
                options: ['MONTHLY', 'HOURLY'],
            },
            {
                key: 'termType',
                label: 'Contract Term',
                type: 'select',
                options: ['Fixed-Term', 'Open-Ended'],
            },
        ];

        const uniqueStructures = Array.from(
            new Set(
                (tableData || [])
                    .map((row) => row.structureName)
                    .filter((name) => name && name !== '—'),
            ),
        );
        if (uniqueStructures.length > 0) {
            configs.push({
                key: 'structureName',
                label: 'Salary Structure',
                type: 'select',
                options: uniqueStructures,
            });
        }

        const uniqueDepts = Array.from(
            new Set(
                (tableData || [])
                    .map((row) => row.departmentName)
                    .filter((name) => name && name !== '—'),
            ),
        );
        if (uniqueDepts.length > 0) {
            configs.push({
                key: 'departmentName',
                label: 'Department',
                type: 'select',
                options: uniqueDepts,
            });
        }

        return configs;
    }, [tableData]);

    const handleTableChange = useCallback(
        ({ page, rowsPerPage, columnFilters }) => {
            if (rowsPerPage && rowsPerPage !== pagination.limit) {
                setLimit(rowsPerPage);
            }
            if (page && page !== pagination.page) {
                setPage(page);
            }
            if (columnFilters?.contractStatus) {
                const selected = columnFilters.contractStatus;
                const joined = selected.join(',');
                if (joined !== filters.status) {
                    setFilter('status', joined);
                }
            } else if (filters.status && !columnFilters?.contractStatus) {
                setFilter('status', '');
            }
        },
        [pagination.limit, pagination.page, filters.status, setLimit, setPage, setFilter],
    );

    // ── Column definitions for AdvancedTable ─────────────────────────────────
    const columns = useMemo(
        () => [
            {
                key: 'employeeName',
                label: 'Employee',
                sortable: true,
                width: '230px',
                render: (_val, row) => (
                    <div
                        className="contract-employee-cell"
                        onClick={() => navigate(`/dashboard/user/contracts/${row.id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) =>
                            e.key === 'Enter' && navigate(`/dashboard/user/contracts/${row.id}`)
                        }
                    >
                        <img
                            src={row.employee?.profileImage || DEFAULT_AVATAR_URL}
                            alt={row.employeeName || 'Employee'}
                            className="employee-avatar"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_AVATAR_URL;
                            }}
                        />
                        <div className="employee-info">
                            <span className="employee-full-name">{row.employeeName}</span>
                            {row.employeeCode && (
                                <span className="employee-code">{row.employeeCode}</span>
                            )}
                        </div>
                    </div>
                ),
            },
            {
                key: 'contractName',
                label: 'Contract Name',
                sortable: true,
                width: '280px',
                render: (val, row) => (
                    <button
                        type="button"
                        className="contract-name-btn"
                        onClick={() => navigate(`/dashboard/user/contracts/${row.id}`)}
                        title="View contract details"
                    >
                        <span className="contract-title-text">{val}</span>
                        <ExternalLink size={13} className="name-link-icon" />
                    </button>
                ),
            },
            {
                key: 'startDate',
                label: 'Period',
                sortable: true,
                sortValue: (_val, row) => (row.startDate ? new Date(row.startDate).getTime() : 0),
                width: '220px',
                render: (_val, row) => (
                    <div className="contract-period-cell">
                        <div className="period-dates">
                            <span className="date-start">{row.startDateFormatted}</span>
                            <span className="date-arrow">→</span>
                            <span className={`date-end ${row.isOpenEnded ? 'is-open' : ''}`}>
                                {row.endDateFormatted}
                            </span>
                        </div>
                        {row.endDate && <ExpiryWarningBadge endDate={row.endDate} />}
                    </div>
                ),
            },
            {
                key: 'wage',
                label: 'Wage',
                sortable: true,
                sortValue: (_val, row) => row.wageNumber,
                width: '180px',
                render: (_val, row) => (
                    <div className="contract-wage-cell">
                        <span className="wage-amount">{row.wageFormatted}</span>
                        <span className="wage-unit">{row.wageUnit}</span>
                    </div>
                ),
            },
            {
                key: 'structureName',
                label: 'Salary Structure',
                sortable: true,
                width: '240px',
                render: (val) => (
                    <div className="contract-structure-cell" title={val}>
                        <span className="structure-text">{val}</span>
                    </div>
                ),
            },
            {
                key: 'status',
                label: 'Status',
                sortable: true,
                width: '120px',
                render: (val) => <ContractStatusBadge status={val} size="sm" />,
            },
            {
                key: 'actions',
                label: '',
                sortable: false,
                width: '56px',
                render: (_val, row) => (
                    <div className="contract-row-actions">
                        <button
                            type="button"
                            className="view-details-arrow-btn"
                            onClick={() => navigate(`/dashboard/user/contracts/${row.id}`)}
                            aria-label={`View details for ${row.contractName}`}
                            title="View details"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                ),
            },
        ],
        [navigate],
    );

    return (
        <div className="contracts-list-page">
            {/* Header */}
            <header className="contracts-page-header">
                <div className="header-info">
                    <div className="title-row">
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

            {/* Error */}
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

            {/* AdvancedTable — shared component used directly */}
            <div className="contracts-table-card contract-table-container">
                <AdvancedTable
                    columns={columns}
                    data={tableData}
                    loading={loading}
                    skeletonRows={6}
                    serverSide={true}
                    totalCount={pagination.total}
                    searchable={false}
                    showColumnSorting={true}
                    showSortDropdown={true}
                    showFilter={true}
                    filterConfig={filterConfig}
                    showColumnToggle={true}
                    showRefresh={true}
                    onRefresh={refetch}
                    showRowsPerPage={true}
                    showResultsCount={true}
                    showSerialNumber={false}
                    showPagination={false}
                    initialRowsPerPage={pagination.limit}
                    onTableChange={handleTableChange}
                    tabs={contractTabs}
                    showTabs={true}
                    activeTab={filters.status || 'all'}
                    onTabChange={(tabId) => setFilter('status', tabId === 'all' ? '' : tabId)}
                    controlsLeft={
                        <div className="contracts-table-controls-left">
                            <div className="search-filter-col">
                                <ContractSearchBar
                                    value={searchValue}
                                    onChange={handleSearchChange}
                                    onClear={handleSearchClear}
                                />
                            </div>

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
                    }
                />

                {/* External pagination for server-side page control */}
                {pagination.totalPages > 1 && (
                    <div className={`contracts-pagination-bar ${loading ? 'is-loading' : ''}`}>
                        <Pagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={setPage}
                            disabled={loading}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default ContractsListPage;
