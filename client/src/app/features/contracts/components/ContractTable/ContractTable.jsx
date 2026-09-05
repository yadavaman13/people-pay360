import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, ExternalLink } from 'lucide-react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import ContractStatusBadge from '../ContractStatusBadge/ContractStatusBadge';
import ExpiryWarningBadge from '../ExpiryWarningBadge/ExpiryWarningBadge';
import Button from '@/components/Shared/Buttons/Button/Button';
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

function formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === '') return '—';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(num);
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
            const periodString = `${startFormatted} → ${endFormatted}`;
            const wageFormatted = `${formatCurrency(c.wage)} / ${(c.wageType || 'MONTHLY').toLowerCase() === 'hourly' ? 'hr' : 'mo'}`;
            const structureName = c.salaryStructure?.name || '—';
            const scheduleName = c.workingSchedule?.name || 'Standard';

            return {
                ...c,
                employeeName,
                employeeCode,
                contractName,
                periodString,
                wageFormatted,
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
                render: (_val, row) => {
                    const initials = (row.employeeName || 'U')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                    return (
                        <div
                            className="contract-employee-cell"
                            onClick={() => handleRowSelect(row)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleRowSelect(row)}
                        >
                            <div className="employee-avatar">{initials}</div>
                            <div className="employee-info">
                                <span className="employee-full-name">{row.employeeName}</span>
                                {row.employeeCode && (
                                    <span className="employee-code">{row.employeeCode}</span>
                                )}
                            </div>
                        </div>
                    );
                },
            });
        }

        cols.push(
            {
                key: 'contractName',
                label: 'Contract Name',
                sortable: true,
                render: (val, row) => (
                    <button
                        type="button"
                        className="contract-name-btn"
                        onClick={() => handleRowSelect(row)}
                        title="View contract details"
                    >
                        <span>{val}</span>
                        <ExternalLink size={13} className="name-link-icon" />
                    </button>
                ),
            },
            {
                key: 'periodString',
                label: 'Period',
                sortable: true,
                render: (val, row) => (
                    <div className="contract-period-cell">
                        <span className="period-text">{val}</span>
                        {row.endDate && <ExpiryWarningBadge endDate={row.endDate} />}
                    </div>
                ),
            },
            {
                key: 'wageFormatted',
                label: 'Wage',
                sortable: true,
                render: (val) => <span className="contract-wage-cell">{val}</span>,
            },
            {
                key: 'structureName',
                label: 'Structure',
                sortable: true,
                render: (val) => <span className="contract-structure-cell">{val}</span>,
            },
            {
                key: 'status',
                label: 'Status',
                sortable: true,
                render: (val) => <ContractStatusBadge status={val} size="sm" />,
            },
            {
                key: 'actions',
                label: '',
                sortable: false,
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
                serverSide={false}
                searchable={false}
                showColumnSorting={true}
                showSerialNumber={false}
                showPagination={false}
            />
        </div>
    );
}

export default ContractTable;
