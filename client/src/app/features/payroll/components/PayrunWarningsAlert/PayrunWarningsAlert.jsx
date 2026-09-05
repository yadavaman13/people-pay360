import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import './PayrunWarningsAlert.scss';

function PayrunWarningsAlert({ warnings }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!warnings) return null;

    const summary = warnings.summary || {};
    const alerts = warnings.alerts || [];

    const blockersCount = summary.blockersCount || 0;
    const warningsCount = summary.warningsCount || 0;
    const totalAlerts = summary.totalAlerts || alerts.length;

    if (totalAlerts === 0) return null;

    const hasBlockers = blockersCount > 0;
    const alertVariant = hasBlockers ? 'danger' : 'warning';
    const alertIcon = hasBlockers ? <AlertCircle size={20} /> : <AlertTriangle size={20} />;

    const title = hasBlockers
        ? `Validation Blocked: ${blockersCount} Blocker${blockersCount === 1 ? '' : 's'} Found`
        : `Pre-Flight Notice: ${warningsCount} Warning${warningsCount === 1 ? '' : 's'} Detected`;

    const description = hasBlockers
        ? 'Payroll cannot be finalized until all blocking validation issues are resolved or explicitly overridden.'
        : 'Warnings should be reviewed prior to validation, but will not prevent normal settlement.';

    return (
        <div className="payrun-warnings-alert">
            <Alert variant={alertVariant} className="payrun-warnings-alert__banner">
                <div className="payrun-warnings-alert__header">
                    <div className="payrun-warnings-alert__icon">{alertIcon}</div>
                    <div className="payrun-warnings-alert__text">
                        <AlertTitle>{title}</AlertTitle>
                        <AlertDescription>{description}</AlertDescription>
                    </div>
                    <button
                        type="button"
                        className="payrun-warnings-alert__expand-btn"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? (
                            <>
                                Hide Details <ChevronUp size={16} />
                            </>
                        ) : (
                            <>
                                View Details ({totalAlerts}) <ChevronDown size={16} />
                            </>
                        )}
                    </button>
                </div>

                {isExpanded && (
                    <div className="payrun-warnings-alert__list">
                        {alerts.map((alert, idx) => {
                            const isBlocker = alert.severity === 'BLOCKER';
                            return (
                                <div
                                    key={idx}
                                    className={`payrun-warnings-alert__item ${isBlocker ? 'is-blocker' : 'is-warning'}`}
                                >
                                    <div className="payrun-warnings-alert__item-header">
                                        <Badge
                                            variant={isBlocker ? 'danger' : 'warning'}
                                            type="solid"
                                        >
                                            {alert.severity}
                                        </Badge>
                                        {alert.employeeName && (
                                            <span className="payrun-warnings-alert__emp-tag">
                                                {alert.employeeName} ({alert.employeeCode})
                                            </span>
                                        )}
                                        {alert.type && (
                                            <span className="payrun-warnings-alert__type-tag">
                                                {alert.type}
                                            </span>
                                        )}
                                    </div>
                                    <div className="payrun-warnings-alert__item-message">
                                        {alert.message}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Alert>
        </div>
    );
}

export default PayrunWarningsAlert;
