import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { formatCurrency } from '../../utils/payrollFormatters';

/**
 * AdvancedTable column definitions for SCR-PAY-005 Salary Computation Table
 */
export const computationColumns = [
    {
        key: 'name',
        label: 'Rule',
        render: (val, row) => {
            const isSummary = row.isSummary || row.category === 'GROSS' || row.category === 'NET';
            return (
                <div className="salary-rule-cell">
                    <span
                        className={`salary-rule-name ${isSummary ? 'salary-rule-name--summary' : ''}`}
                    >
                        {val || row.code}
                    </span>
                </div>
            );
        },
    },
    {
        key: 'category',
        label: 'Category',
        render: (val) => {
            const cat = (val || '').toUpperCase();
            const variant =
                cat === 'BASIC'
                    ? 'info'
                    : cat === 'ALLOWANCE'
                      ? 'success'
                      : cat === 'DEDUCTION'
                        ? 'danger'
                        : cat === 'GROSS'
                          ? 'info'
                          : cat === 'NET'
                            ? 'success'
                            : 'neutral';
            const label = val ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() : '—';
            return (
                <Badge variant={variant} showDot={false}>
                    {label}
                </Badge>
            );
        },
    },
    {
        key: 'amount',
        label: 'Amount',
        type: 'numeric',
        render: (val, row) => {
            const isDeduction = row.category === 'DEDUCTION';
            const isNet = row.category === 'NET';
            const isGross = row.category === 'GROSS';
            const formatted = formatCurrency(val);

            if (isDeduction) {
                const clean = formatted.startsWith('-') ? formatted : `-${formatted}`;
                return <span className="salary-computation__deduction">{clean}</span>;
            }

            if (isNet) {
                return <span className="salary-computation__net-highlight">{formatted}</span>;
            }

            if (isGross) {
                return <span className="salary-computation__gross-highlight">{formatted}</span>;
            }

            return <span className="salary-computation__amount">{formatted}</span>;
        },
    },
    {
        key: 'code',
        label: 'Code',
        render: (val) => <code className="salary-rule-code-chip">{val || '—'}</code>,
    },
];
