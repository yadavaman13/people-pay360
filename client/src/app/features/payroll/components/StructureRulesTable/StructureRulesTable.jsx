import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import './StructureRulesTable.scss';

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
 * StructureRulesTable
 * Enterprise table displaying the structure's attached salary rules,
 * strictly ordered by sequenceOrder in ascending order.
 */
function StructureRulesTable({ rules = [], onRuleClick, canAddRule = false, onAddRuleClick }) {
    // Strictly sort by sequenceOrder ascending
    const sortedRules = useMemo(() => {
        return [...rules].sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));
    }, [rules]);

    if (sortedRules.length === 0) {
        return (
            <div className="structure-rules-empty">
                <EmptyState
                    title="No Salary Rules Attached"
                    description="This salary structure currently has no computation rules. Attach rules to define salary computation sequences."
                    actionText={canAddRule ? '+ Add First Rule' : undefined}
                    onAction={canAddRule ? onAddRuleClick : undefined}
                />
            </div>
        );
    }

    return (
        <div className="structure-rules-table-wrapper">
            <table className="structure-rules-table">
                <thead>
                    <tr>
                        <th className="col-sequence">Seq #</th>
                        <th className="col-name">Rule Name</th>
                        <th className="col-code">Code</th>
                        <th className="col-category">Category</th>
                        <th className="col-calc">Calculation Type</th>
                        <th className="col-action">
                            <span className="sr-only">Action</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedRules.map((rule) => {
                        const cat = CATEGORY_CONFIG[rule.category] || {
                            label: rule.category || 'Rule',
                            variant: 'neutral',
                        };

                        return (
                            <tr
                                key={rule.id || `${rule.code}-${rule.sequenceOrder}`}
                                className="rule-row"
                                onClick={() => onRuleClick?.(rule.id)}
                            >
                                <td className="col-sequence">
                                    <span className="sequence-badge">
                                        {rule.sequenceOrder ?? '—'}
                                    </span>
                                </td>
                                <td className="col-name">
                                    <span className="rule-name-link">{rule.name}</span>
                                </td>
                                <td className="col-code">
                                    <span className="code-pill">{rule.code}</span>
                                </td>
                                <td className="col-category">
                                    <Badge variant={cat.variant}>{cat.label}</Badge>
                                </td>
                                <td className="col-calc">
                                    <span className="calc-summary">
                                        {formatCalculationSummary(rule)}
                                    </span>
                                </td>
                                <td className="col-action">
                                    <ChevronRight size={16} className="row-arrow-icon" />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default StructureRulesTable;
