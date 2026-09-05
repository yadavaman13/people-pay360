import { AlertTriangle, Clock } from 'lucide-react';
import './ExpiryWarningBadge.scss';

function ExpiryWarningBadge({ endDate }) {
    if (!endDate) return null;

    const end = new Date(endDate);
    if (isNaN(end.getTime())) return null;

    const today = new Date();
    // Normalize today to start of day for clean day diff
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    const diffTime = endMidnight.getTime() - todayMidnight.getTime();
    const daysLeft = Math.ceil(diffTime / 86400000);

    if (daysLeft > 30) return null;

    if (daysLeft < 0) {
        return (
            <span className="expiry-warning-badge is-expired" role="status">
                <AlertTriangle size={14} className="expiry-icon" aria-hidden="true" />
                <span>Expired</span>
            </span>
        );
    }

    if (daysLeft === 0) {
        return (
            <span className="expiry-warning-badge is-expiring" role="status">
                <Clock size={14} className="expiry-icon" aria-hidden="true" />
                <span>Expires today</span>
            </span>
        );
    }

    return (
        <span className="expiry-warning-badge is-expiring" role="status">
            <Clock size={14} className="expiry-icon" aria-hidden="true" />
            <span>
                Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
            </span>
        </span>
    );
}

export default ExpiryWarningBadge;
