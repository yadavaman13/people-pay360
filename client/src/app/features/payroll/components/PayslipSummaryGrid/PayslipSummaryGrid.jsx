import { Link, useLocation } from 'react-router';
import { ExternalLink } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import {
    formatDateRange,
    getPayslipStatusVariant,
    formatStatusText,
} from '../../utils/payrollFormatters';
import './PayslipSummaryGrid.scss';

function PayslipSummaryGrid({ payslip, onPayrunClick }) {
    const { pathname } = useLocation();
    const roleSegment = pathname.includes('/admin/') ? 'admin' : 'user';

    if (!payslip) return null;

    const fullName = `${payslip.firstName || ''} ${payslip.lastName || ''}`.trim() || 'Employee';
    const employeeDisplay = payslip.employeeCode
        ? `${fullName} (${payslip.employeeCode})`
        : fullName;

    const periodDisplay = formatDateRange(payslip.periodStart, payslip.periodEnd);
    const structureDisplay = payslip.structureName || 'Regular Salary Structure';
    const statusVariant = getPayslipStatusVariant(payslip.status);
    const statusLabel = formatStatusText(payslip.status);
    const payrunName = payslip.payrunName || 'Payrun';
    const payrunId = payslip.payrunId;

    const workedDaysDisplay =
        payslip.workedDays !== null && payslip.workedDays !== undefined
            ? `${Math.round(Number(payslip.workedDays))}`
            : '0';

    return (
        <div className="payslip-summary-card">
            <div className="summary-grid">
                {/* 1. Employee */}
                <div className="summary-item">
                    <span className="item-label">Employee</span>
                    <div className="item-value-box">
                        <span className="value-text">{employeeDisplay}</span>
                    </div>
                </div>

                {/* 2. Period */}
                <div className="summary-item">
                    <span className="item-label">Period</span>
                    <div className="item-value-box">
                        <span className="value-text">{periodDisplay}</span>
                    </div>
                </div>

                {/* 3. Salary Structure */}
                <div className="summary-item">
                    <span className="item-label">Salary Structure</span>
                    <div className="item-value-box">
                        <span className="value-text">{structureDisplay}</span>
                    </div>
                </div>

                {/* 4. Status */}
                <div className="summary-item">
                    <span className="item-label">Status</span>
                    <div className="item-value-box">
                        <Badge variant={statusVariant} showDot={true}>
                            {statusLabel}
                        </Badge>
                    </div>
                </div>

                {/* 5. Pay Run */}
                <div className="summary-item">
                    <span className="item-label">Pay Run</span>
                    <div className="item-value-box">
                        {payrunId ? (
                            <Link
                                to={`/dashboard/${roleSegment}/payroll/payruns/${payrunId}`}
                                className="payrun-link"
                                onClick={(e) => {
                                    if (onPayrunClick) {
                                        e.preventDefault();
                                        onPayrunClick(payrunId);
                                    }
                                }}
                            >
                                <span>{payrunName}</span>
                                <ExternalLink size={13} />
                            </Link>
                        ) : (
                            <span className="value-text">{payrunName}</span>
                        )}
                    </div>
                </div>

                {/* 6. Worked Days */}
                <div className="summary-item">
                    <span className="item-label">Worked Days</span>
                    <div className="item-value-box">
                        <span className="value-text">{workedDaysDisplay}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PayslipSummaryGrid;
