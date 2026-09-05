import { Calendar, AlertCircle } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import {
    formatDateRange,
    formatCurrency,
    getPayslipStatusVariant,
    formatStatusText,
} from '../../utils/payrollFormatters';
import './PayslipMobileCard.scss';

/**
 * Mobile Card representation of a single payslip record (< 576px)
 */
function PayslipMobileCard({ payslip, onSelect, warningsMap = {} }) {
    if (!payslip) return null;

    const fullName = `${payslip.firstName || ''} ${payslip.lastName || ''}`.trim() || 'Employee';
    const statusVariant = getPayslipStatusVariant(payslip.status);
    const statusLabel = formatStatusText(payslip.status);

    const empAlerts = warningsMap[payslip.employeeId] || [];
    const hasWarning = empAlerts.length > 0;
    const warningLabel = hasWarning
        ? empAlerts[0].message?.toLowerCase().includes('bank')
            ? 'A/C missing'
            : empAlerts[0].type === 'CONFLICTING_PAYSLIP'
              ? 'Duplicate'
              : empAlerts[0].type || 'Warning'
        : null;

    const handleCardClick = () => {
        if (onSelect && payslip.id) {
            onSelect(payslip.id);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
        }
    };

    return (
        <div
            className="payslips-mobile-card"
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`View payslip for ${fullName}`}
        >
            {/* 1. Header: Name, Code & Status Badge */}
            <div className="payslips-mobile-card__header">
                <div className="payslips-mobile-card__emp-title">
                    <span className="emp-name">{fullName}</span>
                    <span className="emp-code">{payslip.employeeCode}</span>
                </div>
                <div className="payslips-mobile-card__badge-wrapper">
                    <Badge variant={statusVariant} showDot={true}>
                        {statusLabel}
                    </Badge>
                </div>
            </div>

            {/* 2. Warning Chip if Alert Exists */}
            {hasWarning && (
                <div className="payslips-mobile-card__warning-row">
                    <Badge variant="warning" showDot={false}>
                        <AlertCircle size={12} className="warning-icon" />
                        <span>{warningLabel}</span>
                    </Badge>
                </div>
            )}

            {/* 3. Period & Salary Structure */}
            <div className="payslips-mobile-card__meta-row">
                <div className="period-label">
                    <Calendar size={13} className="calendar-icon" />
                    <span>{formatDateRange(payslip.periodStart, payslip.periodEnd)}</span>
                </div>
                <div className="structure-chip">{payslip.structureName || 'Regular Salary'}</div>
            </div>

            {/* 4. Financial Highlights 3-Col Micro-Grid */}
            <div className="payslips-mobile-card__metrics-grid">
                <div className="metric-item">
                    <span className="metric-label">Basic</span>
                    <span className="metric-value">
                        {formatCurrency(payslip.contractWageSnapshot, { compact: true })}
                    </span>
                </div>
                <div className="metric-item">
                    <span className="metric-label">Gross</span>
                    <span className="metric-value">
                        {formatCurrency(payslip.grossAmount, { compact: true })}
                    </span>
                </div>
                <div className="metric-item">
                    <span className="metric-label">Net</span>
                    <span className="metric-value metric-value--net">
                        {formatCurrency(payslip.netAmount, { compact: true })}
                    </span>
                </div>
            </div>

            {/* 5. Footer Link / Call-to-Action */}
            <div className="payslips-mobile-card__footer">
                <span className="card-cta">Open selected payslip ↗</span>
            </div>
        </div>
    );
}

export default PayslipMobileCard;
