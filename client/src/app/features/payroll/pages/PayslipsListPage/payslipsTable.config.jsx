import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import {
    formatDateRange,
    formatCurrency,
    getPayslipStatusVariant,
    formatStatusText,
} from '../../utils/payrollFormatters';

/**
 * AdvancedTable column definitions for SCR-PAY-004
 * @param {Record<string, Array>} warningsMap - Employee ID to warnings lookup
 * @param {function} onRowNavigate - (payslipId) => void
 */
export const getPayslipColumns = (warningsMap = {}, onRowNavigate) => [
    {
        key: 'fullName',
        label: 'Employee',
        sortable: true,
        render: (_, row) => {
            const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Employee';
            const initials =
                `${(row.firstName || '')[0] || ''}${(row.lastName || '')[0] || ''}`.toUpperCase() ||
                'EM';
            return (
                <div
                    className="payslips-table__emp-cell"
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
                    <div className="avatar-circle">{initials}</div>
                    <div className="name-details">
                        <span className="payslips-table__emp-name">{fullName}</span>
                        <span className="payslips-table__emp-code">{row.employeeCode || '—'}</span>
                    </div>
                </div>
            );
        },
    },
    {
        key: 'warning',
        label: 'Warning',
        render: (_, row) => {
            const empAlerts = warningsMap[row.employeeId] || [];
            if (empAlerts.length === 0) {
                return <span className="payslips-table__no-warning">—</span>;
            }
            const firstAlert = empAlerts[0];
            const label = firstAlert.message?.toLowerCase().includes('bank')
                ? 'A/C missing'
                : firstAlert.type === 'CONFLICTING_PAYSLIP'
                  ? 'Duplicate'
                  : firstAlert.type || 'Warning';
            return (
                <Badge variant="warning" type="light" showDot={false}>
                    {label}
                </Badge>
            );
        },
    },
    {
        key: 'periodStart',
        label: 'Period',
        sortable: true,
        render: (_, row) => (
            <span className="payslips-table__period-cell">
                {formatDateRange(row.periodStart, row.periodEnd)}
            </span>
        ),
    },
    {
        key: 'contractWageSnapshot',
        label: 'Basic',
        type: 'numeric',
        sortable: true,
        render: (_, row) => (
            <span className="payslips-table__amount-cell">
                {formatCurrency(row.contractWageSnapshot)}
            </span>
        ),
    },
    {
        key: 'grossAmount',
        label: 'Gross',
        type: 'numeric',
        sortable: true,
        render: (_, row) => (
            <span className="payslips-table__amount-cell">{formatCurrency(row.grossAmount)}</span>
        ),
    },
    {
        key: 'netAmount',
        label: 'Net',
        type: 'numeric',
        sortable: true,
        render: (_, row) => (
            <span className="payslips-table__net-amount">{formatCurrency(row.netAmount)}</span>
        ),
    },
    {
        key: 'structureName',
        label: 'Structure',
        render: (_, row) => (
            <span className="payslips-table__structure-cell">
                {row.structureName || 'Regular Salary'}
            </span>
        ),
    },
    {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (_, row) => {
            const variant = getPayslipStatusVariant(row.status);
            const label = formatStatusText(row.status);
            return (
                <Badge variant={variant} type="light" showDot={true}>
                    {label}
                </Badge>
            );
        },
    },
];
