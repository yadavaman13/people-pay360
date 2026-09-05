import { Card } from '@/components/Shared/DataDisplay/Card/Card';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { getCategoryConfig } from '../../pages/SalaryRulesListPage/salaryRulesTable.config';
import './SalaryRuleListCard.scss';

/**
 * SCR-PAY-008: Dedicated Mobile Presentation Card for Salary Rules
 * Rendered on mobile viewports (< 576px)
 */
function SalaryRuleListCard({ rule, onClick, className = '' }) {
    if (!rule) return null;

    const catConfig = getCategoryConfig(rule.category);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(rule.id);
        }
    };

    return (
        <Card
            hoverable
            padding="md"
            className={`salary-rule-list-card ${className}`}
            onClick={() => onClick?.(rule.id)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`View salary rule ${rule.name}`}
        >
            <div className="card-top-meta">
                <div className="meta-left">
                    <span className="sequence-badge">Seq #{rule.sequenceOrder ?? '—'}</span>
                    {rule.code && <span className="code-pill">{rule.code}</span>}
                </div>
                <Badge
                    variant={catConfig.variant}
                    className={`category-badge ${catConfig.className}`}
                    size="sm"
                >
                    {catConfig.label}
                </Badge>
            </div>

            <div className="card-body">
                <h3 className="rule-title">{rule.name}</h3>
                <p className="rule-structure">
                    <span className="structure-label">Structure: </span>
                    <span className="structure-value">{rule.structureName || 'Unassigned'}</span>
                </p>
            </div>

            <div className="card-divider" />

            <div className="card-footer-action">
                <span className="action-hint">View Rule ↗</span>
            </div>
        </Card>
    );
}

export default SalaryRuleListCard;
