import { Calendar, Users, AlertTriangle, ArrowUpRight, Trash2 } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { formatDateRange } from '../../utils/payrollFormatters';
import {
    getPayrunStatusVariant,
    formatPayrunStatusText,
} from '../../pages/PayrunsListPage/payrunsTable.config';
import './PayrunMobileCard.scss';

/**
 * Mobile Card representation of a single payrun record (< 576px)
 */
function PayrunMobileCard({ payrun, onSelect, onDelete, canDelete = true }) {
    if (!payrun) return null;

    const statusVariant = getPayrunStatusVariant(payrun.status);
    const statusLabel = formatPayrunStatusText(payrun.status);
    const dateRange = formatDateRange(payrun.periodStart, payrun.periodEnd);
    const count = payrun.totalEmployees ?? payrun.employeeCount ?? 0;
    const warningsCount = payrun.warningsCount ?? payrun.warningCount ?? 0;

    const handleCardClick = () => {
        if (onSelect && payrun.id) {
            onSelect(payrun.id);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
        }
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        if (onDelete) onDelete(payrun);
    };

    return (
        <div
            className="payrun-mobile-card"
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`View payrun ${payrun.name || 'details'}`}
        >
            {/* 1. Header: Name & Status Badge */}
            <div className="payrun-mobile-card__header">
                <h3 className="payrun-mobile-card__title">{payrun.name || 'Unnamed Payrun'}</h3>
                <div className="payrun-mobile-card__badge-wrapper">
                    <Badge variant={statusVariant} showDot={true}>
                        {statusLabel}
                    </Badge>
                </div>
            </div>

            {/* 2. Meta: Period & Salary Structure */}
            <div className="payrun-mobile-card__meta-row">
                <div className="period-label">
                    <Calendar size={13} className="calendar-icon" />
                    <span>{dateRange}</span>
                </div>
                <div className="structure-chip">{payrun.structureName || 'Regular Salary'}</div>
            </div>

            {/* 3. Footer: Headcount, Warnings, & Action Buttons */}
            <div className="payrun-mobile-card__footer">
                <div className="payrun-mobile-card__info-group">
                    <div className="headcount-chip">
                        <Users size={13} className="users-icon" />
                        <span>
                            {count} {count === 1 ? 'employee' : 'employees'}
                        </span>
                    </div>

                    {warningsCount > 0 ? (
                        <Badge variant="warning" type="light" showDot={false}>
                            <AlertTriangle size={12} className="warning-icon" />
                            <span>
                                {warningsCount} {warningsCount === 1 ? 'warning' : 'warnings'}
                            </span>
                        </Badge>
                    ) : (
                        <span className="no-warning-label">No warnings</span>
                    )}
                </div>

                <div className="payrun-mobile-card__actions">
                    {canDelete && payrun.status?.toUpperCase() === 'DRAFT' && (
                        <button
                            type="button"
                            className="delete-action-btn"
                            onClick={handleDeleteClick}
                            title="Delete draft payrun"
                            aria-label="Delete payrun"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                    <div className="nav-arrow-icon" aria-hidden="true">
                        <ArrowUpRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PayrunMobileCard;
