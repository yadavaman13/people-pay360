import { Card } from '@/components/Shared/DataDisplay/Card/Card';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import './PayrunMetaSummary.scss';

function formatDateDisplay(dateStr) {
    if (!dateStr) return '—';
    try {
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
        ];
        const m = months[parseInt(month, 10) - 1] || month;
        return `${day}-${m}-${year}`;
    } catch {
        return dateStr;
    }
}

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '₹0.00';
    const num = Number(amount);
    if (isNaN(num)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(num);
}

function getStatusBadgeVariant(status) {
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
    return upper.charAt(0) + upper.slice(1).toLowerCase();
}

function PayrunMetaSummary({ payrun }) {
    if (!payrun) return null;

    const {
        name,
        structureName,
        periodStart,
        periodEnd,
        status = 'DRAFT',
        totalEmployees = 0,
        totalGross = '0.00',
        totalDeductions = '0.00',
        totalNet = '0.00',
    } = payrun;

    const formattedStart = formatDateDisplay(periodStart);
    const formattedEnd = formatDateDisplay(periodEnd);
    const dateRange = formattedStart && formattedEnd ? `${formattedStart} — ${formattedEnd}` : '—';

    const statusVariant = getStatusBadgeVariant(status);
    const statusLabel = formatStatusText(status);

    return (
        <Card className="payrun-meta-summary">
            <div className="payrun-meta-summary__header">
                <h3 className="payrun-meta-summary__title">Payrun Information</h3>
            </div>

            <div className="payrun-meta-summary__info-grid">
                <div className="payrun-meta-summary__field">
                    <span className="payrun-meta-summary__label">Name</span>
                    <span className="payrun-meta-summary__value">{name || '—'}</span>
                </div>

                <div className="payrun-meta-summary__field">
                    <span className="payrun-meta-summary__label">Salary Structure</span>
                    <span className="payrun-meta-summary__value">{structureName || '—'}</span>
                </div>

                <div className="payrun-meta-summary__field">
                    <span className="payrun-meta-summary__label">Period</span>
                    <span className="payrun-meta-summary__value">{dateRange}</span>
                </div>

                <div className="payrun-meta-summary__field">
                    <span className="payrun-meta-summary__label">Status</span>
                    <span className="payrun-meta-summary__value">
                        <Badge variant={statusVariant} showDot={true}>
                            {statusLabel}
                        </Badge>
                    </span>
                </div>
            </div>

            <div className="payrun-meta-summary__totals-grid">
                <div className="payrun-meta-summary__total-card">
                    <span className="payrun-meta-summary__total-label">Headcount</span>
                    <span className="payrun-meta-summary__total-value">{totalEmployees}</span>
                </div>

                <div className="payrun-meta-summary__total-card">
                    <span className="payrun-meta-summary__total-label">Total Gross</span>
                    <span className="payrun-meta-summary__total-value">
                        {formatCurrency(totalGross)}
                    </span>
                </div>

                <div className="payrun-meta-summary__total-card">
                    <span className="payrun-meta-summary__total-label">Total Deductions</span>
                    <span className="payrun-meta-summary__total-value payrun-meta-summary__total-value--deduction">
                        {formatCurrency(totalDeductions)}
                    </span>
                </div>

                <div className="payrun-meta-summary__total-card payrun-meta-summary__total-card--net">
                    <span className="payrun-meta-summary__total-label">Total Net Pay</span>
                    <span className="payrun-meta-summary__total-value payrun-meta-summary__total-value--net">
                        {formatCurrency(totalNet)}
                    </span>
                </div>
            </div>
        </Card>
    );
}

export default PayrunMetaSummary;
