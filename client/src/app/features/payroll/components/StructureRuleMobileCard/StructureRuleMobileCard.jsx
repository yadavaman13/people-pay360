import { ArrowUpRight } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import './StructureRuleMobileCard.scss';

const CATEGORY_CONFIG = {
    BASIC: { label: 'Basic', variant: 'success' },
    ALLOWANCE: { label: 'Allowance', variant: 'info' },
    GROSS: { label: 'Gross', variant: 'warning' },
    DEDUCTION: { label: 'Deduction', variant: 'danger' },
    NET: { label: 'Net', variant: 'success' },
    OTHER: { label: 'Other', variant: 'neutral' },
};

function formatCalculationSummary(rule) {
    if (!rule) return '—';
    if (rule.computationType === 'FIXED') {
        const amt =
            rule.fixedAmount !== null && rule.fixedAmount !== undefined
                ? Number(rule.fixedAmount).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                  })
                : '0.00';
        return `Fixed ₹${amt}`;
    }
    if (rule.computationType === 'PERCENTAGE') {
        const rate = rule.percentageRate ? parseFloat(rule.percentageRate) : '0';
        const base = rule.percentageBaseCode || 'BASE';
        return `${rate}% of ${base}`;
    }
    if (rule.computationType === 'FORMULA') {
        return rule.formulaExpression ? `Formula: ${rule.formulaExpression}` : 'Formula / Computed';
    }
    return rule.computationType || '—';
}

/**
 * StructureRuleMobileCard
 * Mobile card view (< 576px) for salary rules attached to a structure.
 */
function StructureRuleMobileCard({ rule, onClick }) {
    const cat = CATEGORY_CONFIG[rule.category] || {
        label: rule.category || 'Rule',
        variant: 'neutral',
    };

    return (
        <div
            className="structure-rule-mobile-card"
            onClick={() => onClick?.(rule.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.(rule.id);
                }
            }}
        >
            <div className="card-top-row">
                <div className="seq-and-code">
                    <span className="seq-pill">Seq #{rule.sequenceOrder ?? 1}</span>
                    <span className="code-pill">{rule.code}</span>
                </div>
                <Badge variant={cat.variant}>{cat.label}</Badge>
            </div>

            <div className="card-body">
                <h3 className="rule-name">{rule.name}</h3>
                <div className="calc-row">
                    <span className="calc-label">Type:</span>
                    <span className="calc-value">{formatCalculationSummary(rule)}</span>
                </div>
            </div>

            <div className="card-footer">
                <span className="detail-action">
                    <span>Rule Details</span>
                    <ArrowUpRight size={14} />
                </span>
            </div>
        </div>
    );
}

export default StructureRuleMobileCard;
