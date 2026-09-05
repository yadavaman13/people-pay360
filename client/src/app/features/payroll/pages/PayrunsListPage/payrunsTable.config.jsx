import { ArrowUpRight, Trash2, Users } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import { formatDateRange } from '../../utils/payrollFormatters';

/**
 * Resolve Badge variant based on payrun status enum
 * @param {string} status - 'DRAFT' | 'COMPUTED' | 'VALIDATED' | 'PAID' | 'CANCELLED'
 * @returns {'success'|'info'|'warning'|'danger'|'neutral'}
 */
export function getPayrunStatusVariant(status) {
    switch (status?.toUpperCase()) {
        case 'PAID':
            return 'success';
        case 'VALIDATED':
            return 'info';
        case 'COMPUTED':
            return 'warning';
        case 'CANCELLED':
            return 'danger';
        case 'DRAFT':
        default:
            return 'neutral';
    }
}

/**
 * Format status text for user presentation
 * @param {string} status
 * @returns {string}
 */
export function formatPayrunStatusText(status) {
    if (!status) return 'Draft';
    const upper = status.toUpperCase();
    return upper.charAt(0) + upper.slice(1).toLowerCase();
}

/**
 * AdvancedTable column definitions for SCR-PAY-001 (Payruns List)
 * @param {object} options
 * @param {function} [options.onRowNavigate] - (payrunId) => void
 * @param {function} [options.onDelete] - (payrun) => void
 * @param {boolean} [options.canDelete=true] - Whether delete action is permitted
 */
export const getPayrunColumns = ({ onRowNavigate, onDelete, canDelete = true } = {}) => [
    {
        key: 'name',
        label: 'Payrun Name & Period',
        sortable: true,
        render: (_, row) => {
            const dateRange = formatDateRange(row.periodStart, row.periodEnd);
            return (
                <div
                    className="payruns-table__name-cell"
                    onClick={() => onRowNavigate && onRowNavigate(row.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (onRowNavigate) onRowNavigate(row.id);
                        }
                    }}
                >
                    <span className="payruns-table__payrun-name">
                        {row.name || 'Unnamed Payrun'}
                    </span>
                    <span className="payruns-table__payrun-period">{dateRange}</span>
                </div>
            );
        },
    },
    {
        key: 'structureName',
        label: 'Structure',
        sortable: true,
        render: (_, row) => (
            <span className="payruns-table__structure-cell">
                {row.structureName || 'Regular Salary'}
            </span>
        ),
    },
    {
        key: 'totalEmployees',
        label: 'Employees',
        sortable: true,
        type: 'numeric',
        render: (_, row) => {
            const count = row.totalEmployees ?? row.employeeCount ?? 0;
            return (
                <div className="payruns-table__headcount-cell">
                    <Users size={14} className="payruns-table__headcount-icon" />
                    <span>
                        {count} {count === 1 ? 'employee' : 'employees'}
                    </span>
                </div>
            );
        },
    },
    {
        key: 'warnings',
        label: 'Warnings',
        render: (_, row) => {
            const count = row.warningsCount ?? row.warningCount ?? 0;
            if (count > 0) {
                return (
                    <Badge variant="warning" type="light" showDot={false}>
                        {`${count} ${count === 1 ? 'warning' : 'warnings'}`}
                    </Badge>
                );
            }
            return <span className="payruns-table__no-warning">No warnings</span>;
        },
    },
    {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (_, row) => {
            const variant = getPayrunStatusVariant(row.status);
            const label = formatPayrunStatusText(row.status);
            return (
                <Badge variant={variant} type="light" showDot={true}>
                    {label}
                </Badge>
            );
        },
    },
    {
        key: 'actions',
        label: '',
        render: (_, row) => (
            <div className="payruns-table__actions-cell">
                {canDelete && row.status?.toUpperCase() === 'DRAFT' && (
                    <Button
                        variant="ghost"
                        size="small"
                        className="payruns-table__action-btn delete-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onDelete) onDelete(row);
                        }}
                        title="Delete draft payrun"
                        aria-label="Delete payrun"
                    >
                        <Trash2 size={15} />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="small"
                    className="payruns-table__action-btn view-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onRowNavigate) onRowNavigate(row.id);
                    }}
                    title="View payrun details"
                    aria-label="View payrun"
                >
                    <ArrowUpRight size={16} />
                </Button>
            </div>
        ),
    },
];
