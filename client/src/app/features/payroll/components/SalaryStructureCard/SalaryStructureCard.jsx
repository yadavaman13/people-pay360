import { Card } from '@/components/Shared/DataDisplay/Card/Card';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import './SalaryStructureCard.scss';

/**
 * SCR-PAY-006: Dedicated Mobile Presentation Card
 * Rendered on mobile viewports (< 576px)
 */
function SalaryStructureCard({ structure, onClick, className = '' }) {
    if (!structure) return null;

    const isActive = structure.isActive !== false;
    const rulesNum = Number(structure.rulesCount) || 0;
    const rulesText = `${rulesNum} ${rulesNum === 1 ? 'rule' : 'rules'}`;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(structure.id);
        }
    };

    return (
        <Card
            hoverable
            padding="md"
            className={`salary-structure-card ${className}`}
            onClick={() => onClick?.(structure.id)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`View salary structure ${structure.name}`}
        >
            <div className="card-header-row">
                <h3 className="structure-title">{structure.name}</h3>
                <Badge variant={isActive ? 'success' : 'neutral'} dot={isActive} size="sm">
                    {isActive ? 'Active' : 'Inactive'}
                </Badge>
            </div>

            {structure.code && (
                <div className="card-code-row">
                    <span className="code-pill">Code: {structure.code}</span>
                </div>
            )}

            <div className="card-divider" />

            <div className="card-info-grid">
                <div className="info-item">
                    <span className="info-label">Rules</span>
                    <span className="info-value">{rulesText}</span>
                </div>
                <div className="info-item">
                    <span className="info-label">Employees</span>
                    <span className="info-value">—</span>
                </div>
            </div>

            <div className="card-action-hint">
                <span>Configure Rules ↗</span>
            </div>
        </Card>
    );
}

export default SalaryStructureCard;
