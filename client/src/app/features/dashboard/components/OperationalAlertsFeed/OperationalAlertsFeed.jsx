import { AlertTriangle, XCircle, Info, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/Shared/DataDisplay/Card/Card';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import { formatINRCompact } from '../../hooks/useDashboardData';
import './OperationalAlertsFeed.scss';

const SEVERITY_MAP = {
    BLOCKER: {
        icon: XCircle,
        iconColor: 'var(--color-danger)',
        badgeVariant: 'danger',
        label: 'Blocker',
    },
    WARNING: {
        icon: AlertTriangle,
        iconColor: 'var(--color-warning)',
        badgeVariant: 'warning',
        label: 'Warning',
    },
    INFO: {
        icon: Info,
        iconColor: 'var(--color-info)',
        badgeVariant: 'info',
        label: 'Info',
    },
    OK: {
        icon: CheckCircle,
        iconColor: 'var(--color-success)',
        badgeVariant: 'success',
        label: 'OK',
    },
};

/**
 * OperationalAlertsFeed — Live alerts feed: compliance blockers, contract expirations,
 * missing documentation, and payrun status warnings.
 *
 * @param {Array} alertsData - Raw alerts from fetchDashboardAlerts()
 * @param {boolean} loading
 * @param {function} onRefresh - Manual refresh trigger
 */
function OperationalAlertsFeed({ alertsData = [], loading = false, onRefresh }) {
    const blockers = alertsData.filter((a) => a.severity === 'BLOCKER');
    const warnings = alertsData.filter((a) => a.severity === 'WARNING');

    const headerBadgeVariant =
        blockers.length > 0 ? 'danger' : warnings.length > 0 ? 'warning' : 'success';
    const headerBadgeLabel =
        blockers.length > 0
            ? `${blockers.length} blocker${blockers.length > 1 ? 's' : ''}`
            : warnings.length > 0
              ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}`
              : 'All clear';

    return (
        <Card className="alerts-feed-card">
            <CardHeader className="alerts-feed-header">
                <div className="alerts-feed-header-left">
                    <CardTitle className="alerts-feed-title">Operational Alerts</CardTitle>
                    <Badge variant={headerBadgeVariant} className="alerts-feed-summary-badge">
                        {headerBadgeLabel}
                    </Badge>
                </div>
                <button
                    className="alerts-feed-refresh-btn"
                    onClick={onRefresh}
                    title="Refresh alerts"
                    aria-label="Refresh operational alerts"
                    disabled={loading}
                >
                    <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
                </button>
            </CardHeader>

            <CardContent className="alerts-feed-content">
                {loading && (
                    <div className="alerts-feed-loading">
                        <Spinner />
                    </div>
                )}

                {!loading && alertsData.length === 0 && (
                    <EmptyState
                        title="All systems operational"
                        description="No compliance blockers or active warnings found."
                        icon={CheckCircle}
                    />
                )}

                {!loading && alertsData.length > 0 && (
                    <ul className="alerts-feed-list" role="list" aria-label="Operational alerts">
                        {alertsData.map((alert, index) => {
                            const config = SEVERITY_MAP[alert.severity] || SEVERITY_MAP.INFO;
                            const IconComponent = config.icon;
                            return (
                                <li
                                    key={alert.id || index}
                                    className={`alert-item alert-item--${alert.severity?.toLowerCase()}`}
                                    role="listitem"
                                >
                                    <div
                                        className="alert-item-icon"
                                        style={{ color: config.iconColor }}
                                    >
                                        <IconComponent size={16} />
                                    </div>
                                    <div className="alert-item-body">
                                        <div className="alert-item-header">
                                            <span className="alert-item-title">
                                                {alert.title || alert.message}
                                            </span>
                                            <Badge
                                                variant={config.badgeVariant}
                                                className="alert-item-badge"
                                            >
                                                {config.label}
                                            </Badge>
                                        </div>
                                        {alert.detail && (
                                            <p className="alert-item-detail">{alert.detail}</p>
                                        )}
                                        <div className="alert-item-meta">
                                            {alert.affectedCount !== undefined && (
                                                <span className="alert-meta-chip">
                                                    {alert.affectedCount} affected
                                                </span>
                                            )}
                                            {alert.amount && (
                                                <span className="alert-meta-chip">
                                                    {formatINRCompact(alert.amount)}
                                                </span>
                                            )}
                                            {alert.actionUrl && (
                                                <a
                                                    href={alert.actionUrl}
                                                    className="alert-action-link"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`View details for ${alert.title}`}
                                                >
                                                    View <ExternalLink size={11} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

export default OperationalAlertsFeed;
