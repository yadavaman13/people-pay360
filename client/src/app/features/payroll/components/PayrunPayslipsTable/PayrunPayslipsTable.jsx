import { Link, useLocation } from 'react-router';
import { FileDown, AlertTriangle } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import './PayrunPayslipsTable.scss';

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '—';
    const num = Number(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(num);
}

function getPayslipStatusVariant(status) {
    switch (status?.toUpperCase()) {
        case 'PAID':
            return 'success';
        case 'VALIDATED':
            return 'info';
        case 'COMPUTED':
            return 'warning';
        case 'DRAFT':
        default:
            return 'neutral';
    }
}

function formatStatusText(status) {
    if (!status) return 'Draft';
    const upper = status.toUpperCase();
    if (upper === 'COMPUTED') return 'Done';
    return upper.charAt(0) + upper.slice(1).toLowerCase();
}

function PayrunPayslipsTable({
    payslips = [],
    warningsMap = {},
    onDownloadPdf,
    downloadingId = null,
}) {
    const { pathname } = useLocation();
    const roleSegment = pathname.includes('/admin/') ? 'admin' : 'user';

    if (!payslips || payslips.length === 0) {
        return (
            <div className="payrun-payslips-table__empty">
                <EmptyState
                    title="No Payslips Generated"
                    description="Click [Compute] in the action bar above to calculate salary rules and generate itemized payslips."
                />
            </div>
        );
    }

    return (
        <div className="payrun-payslips-table">
            <div className="payrun-payslips-table__header">
                <h3 className="payrun-payslips-table__title">
                    Payslips in this Payrun ({payslips.length})
                </h3>
            </div>

            <div className="payrun-payslips-table__wrapper">
                <table className="payrun-payslips-table__table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Warning</th>
                            <th className="payrun-payslips-table__th-number">Worked</th>
                            <th className="payrun-payslips-table__th-number">Basic</th>
                            <th className="payrun-payslips-table__th-number">Gross</th>
                            <th className="payrun-payslips-table__th-number">Net</th>
                            <th>Status</th>
                            <th className="payrun-payslips-table__th-action">PDF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payslips.map((slip) => {
                            const empWarnings = warningsMap[slip.employeeId] || [];
                            const hasWarnings = empWarnings.length > 0;
                            const warningText = hasWarnings
                                ? empWarnings[0].message?.includes('bank')
                                    ? 'A/C missing'
                                    : empWarnings[0].type || 'Warning'
                                : '—';

                            const isDownloading = downloadingId === slip.id;
                            const fullName =
                                `${slip.firstName || ''} ${slip.lastName || ''}`.trim() ||
                                'Employee';

                            const statusVariant = getPayslipStatusVariant(slip.status);
                            const statusLabel = formatStatusText(slip.status);

                            return (
                                <tr key={slip.id} className="payrun-payslips-table__row">
                                    <td className="payrun-payslips-table__td-employee">
                                        <div className="payrun-payslips-table__emp-name">
                                            <Link
                                                to={`/dashboard/${roleSegment}/payroll/payslips/${slip.id}`}
                                                className="payrun-payslips-table__emp-link"
                                            >
                                                {fullName}
                                            </Link>
                                        </div>
                                        <div className="payrun-payslips-table__emp-meta">
                                            {slip.employeeCode}
                                            {slip.departmentName && ` • ${slip.departmentName}`}
                                        </div>
                                    </td>

                                    <td>
                                        {hasWarnings ? (
                                            <span className="payrun-payslips-table__warning-chip">
                                                <AlertTriangle size={12} />
                                                {warningText}
                                            </span>
                                        ) : (
                                            <span className="payrun-payslips-table__no-warning">
                                                —
                                            </span>
                                        )}
                                    </td>

                                    <td className="payrun-payslips-table__td-number">
                                        {slip.workedDays !== null && slip.workedDays !== undefined
                                            ? Math.round(Number(slip.workedDays))
                                            : '0'}
                                    </td>

                                    <td className="payrun-payslips-table__td-number">
                                        {formatCurrency(slip.contractWageSnapshot)}
                                    </td>

                                    <td className="payrun-payslips-table__td-number">
                                        {formatCurrency(slip.grossAmount)}
                                    </td>

                                    <td className="payrun-payslips-table__td-number payrun-payslips-table__td-net">
                                        {formatCurrency(slip.netAmount)}
                                    </td>

                                    <td>
                                        <Badge variant={statusVariant} showDot={true}>
                                            {statusLabel}
                                        </Badge>
                                    </td>

                                    <td className="payrun-payslips-table__td-action">
                                        <Button
                                            variant="ghost"
                                            onClick={() =>
                                                onDownloadPdf &&
                                                onDownloadPdf(
                                                    slip.id,
                                                    slip.employeeCode,
                                                    slip.periodStart,
                                                )
                                            }
                                            loading={isDownloading}
                                            disabled={isDownloading}
                                            icon={<FileDown size={14} />}
                                            className="payrun-payslips-table__pdf-btn"
                                            title="Download Payslip PDF"
                                        >
                                            PDF
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default PayrunPayslipsTable;
