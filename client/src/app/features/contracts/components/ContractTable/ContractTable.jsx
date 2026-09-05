import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, ExternalLink } from 'lucide-react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import ContractStatusBadge from '../ContractStatusBadge/ContractStatusBadge';
import ExpiryWarningBadge from '../ExpiryWarningBadge/ExpiryWarningBadge';
import Button from '@/components/Shared/Buttons/Button/Button';
import { DEFAULT_AVATAR_URL } from '@/utils/avatar';
import './ContractTable.scss';

function formatDisplayDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatCurrencyParts(amount) {
    if (amount === undefined || amount === null || amount === '') return { formatted: '—' };
    const num = Number(amount);
    if (isNaN(num)) return { formatted: String(amount) };
    const formatted = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num);
    return { formatted };
}

function ContractTable({
    contracts = [],
    loading = false,
    showEmployeeColumn = true,
    onRowClick,
    onActivate,
    onCancel,
}) {
    const navigate = useNavigate();

    const handleRowSelect = useCallback(
        (contract) => {
            if (onRowClick) {
                onRowClick(contract);
            } else {
                navigate(`/dashboard/user/contracts/${contract.id}`);
            }
        },
        [onRowClick, navigate],
    );

    const tableData = useMemo(() => {
        return (contracts || []).map((c) => {
            const employeeName = c.employee
                ? `${c.employee.firstName || ''} ${c.employee.lastName || ''}`.trim() || 'Unknown'
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
            const scheduleName = c.workingSchedule?.name || 'Standard';

            return {
                ...c,
                employeeName,
                employeeCode,
                contractName,
                startDateFormatted: startFormatted,
                endDateFormatted: endFormatted,
                isOpenEnded: !c.endDate,
                wageNumber,
                wageFormatted,
                wageUnit,
                structureName,
                scheduleName,
            };
        });
    }, [contracts]);

    const columns = useMemo(() => {
        const cols = [];

        if (showEmployeeColumn) {
            cols.push({
                key: 'employeeName',
                label: 'Employee',
                sortable: true,
                width: '230px',
                render: (_val, row) => (
                    <div
                        className="contract-employee-cell"
                        onClick={() => handleRowSelect(row)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleRowSelect(row)}
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
            });
        }

        cols.push(
            {
                key: 'contractName',
                label: 'Contract Name',
                sortable: true,
                width: '280px',
                render: (val, row) => (
                    <button
                        type="button"
                        className="contract-name-btn"
                        onClick={() => handleRowSelect(row)}
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
                        {row.status === 'DRAFT' && onActivate && (
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onActivate(row);
                                }}
                            >
                                Activate
                            </Button>
                        )}
                        {row.status === 'ACTIVE' && onCancel && (
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCancel(row);
                                }}
                            >
                                Cancel
                            </Button>
                        )}
                        <button
                            type="button"
                            className="view-details-arrow-btn"
                            onClick={() => handleRowSelect(row)}
                            aria-label={`View details for ${row.contractName}`}
                            title="View details"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                ),
            },
        );

        return cols;
    }, [showEmployeeColumn, onActivate, onCancel, handleRowSelect]);

    return (
        <div className="contract-table-container">
            <AdvancedTable
                columns={columns}
                data={tableData}
                loading={loading}
                skeletonRows={6}
                serverSide={true}
                searchable={false}
                showColumnSorting={true}
                showSerialNumber={false}
                showPagination={false}
            />
        </div>
    );
}

export default ContractTable;
