import { ArrowUpRight, Trash2, Users } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { Card } from '@/components/Shared/DataDisplay/Card/Card';
import './PayrunCard.scss';

function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
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
        const monthName = months[parseInt(month, 10) - 1] || month;
        return `${day}-${monthName}-${year}`;
    } catch {
        return dateStr;
    }
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

function PayrunCard({ payrun, onClick, canDelete = false, onDelete }) {
    const {
        id,
        name,
        periodStart,
        periodEnd,
        status = 'DRAFT',
        totalEmployees = 0,
        structureName,
        warningsCount = 0,
    } = payrun;

    const formattedStart = formatDateDisplay(periodStart);
    const formattedEnd = formatDateDisplay(periodEnd);
    const dateRange =
        formattedStart && formattedEnd
            ? `${formattedStart} — ${formattedEnd}`
            : formattedStart || '—';

    const statusVariant = getStatusBadgeVariant(status);
    const statusLabel = formatStatusText(status);

    const handleCardClick = () => {
        if (onClick) onClick(id);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        if (onDelete) onDelete(payrun);
    };

    return (
        <Card className="payrun-card" onClick={handleCardClick}>
            <div className="payrun-card__content">
                {/* Left group: Name, Period, Structure */}
                <div className="payrun-card__left">
                    <div className="payrun-card__title-row">
                        <h3 className="payrun-card__title">{name || 'Unnamed Payrun'}</h3>
                        {structureName && (
                            <span className="payrun-card__structure-tag">{structureName}</span>
                        )}
                    </div>
                    <div className="payrun-card__period">{dateRange}</div>
                </div>

                {/* Center group: Headcount */}
                <div className="payrun-card__center">
                    <span className="payrun-card__headcount">
                        <Users size={16} className="payrun-card__headcount-icon" />
                        {totalEmployees} {totalEmployees === 1 ? 'employee' : 'employees'}
                    </span>
                </div>

                {/* Right group: Status badge, Warnings, Actions */}
                <div className="payrun-card__right">
                    <div className="payrun-card__status-col">
                        <Badge variant={statusVariant} showDot={true}>
                            {statusLabel}
                        </Badge>
                        <span
                            className={`payrun-card__warning-badge ${warningsCount > 0 ? 'has-warnings' : ''}`}
                        >
                            {warningsCount > 0
                                ? `${warningsCount} ${warningsCount === 1 ? 'warning' : 'warnings'}`
                                : 'No warnings'}
                        </span>
                    </div>

                    <div className="payrun-card__actions">
                        {canDelete && status?.toUpperCase() === 'DRAFT' && (
                            <button
                                type="button"
                                className="payrun-card__delete-btn"
                                onClick={handleDeleteClick}
                                title="Delete draft payrun"
                                aria-label="Delete payrun"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                        <div className="payrun-card__nav-arrow" aria-hidden="true">
                            <ArrowUpRight size={18} />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export default PayrunCard;
