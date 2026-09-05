import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import {
    CATEGORY_OPTIONS,
    COMPUTATION_TYPE_OPTIONS,
} from '../../pages/SalaryRuleDetailPage/salaryRuleValidation.schema';
import { getCategoryConfig } from '../../pages/SalaryRulesListPage/salaryRulesTable.config';
import './RuleFormCard.scss';

/**
 * RuleFormCard Component
 * Displays interactive edit/create form or styled read-only detail view.
 */
function RuleFormCard({
    formData,
    isEditing,
    isCreate,
    errors = {},
    onChange,
    structures = [],
    roleSegment = 'employee',
}) {
    const navigate = useNavigate();

    const structureDropdownOptions = useMemo(
        () =>
            structures.map((s) => ({
                value: s.id,
                label: s.name,
            })),
        [structures],
    );

    const catConfig = getCategoryConfig(formData.category);

    const formatCurrency = (val) => {
        const num = Number(val);
        if (isNaN(num)) return '₹0.00';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(num);
    };

    const currentStructureName = useMemo(() => {
        if (formData.structureName) return formData.structureName;
        const found = structures.find((s) => s.id === formData.structureId);
        return found ? found.name : 'Unassigned';
    }, [formData.structureName, formData.structureId, structures]);

    return (
        <div className="rule-form-card">
            <div className="card-header-bar">
                <h2 className="card-title">
                    {isCreate ? 'New Rule Configuration' : 'Rule Configuration'}
                </h2>
                {!isEditing && (
                    <Badge
                        variant={formData.isActive !== false ? 'success' : 'neutral'}
                        dot={formData.isActive !== false}
                        size="sm"
                    >
                        {formData.isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                )}
            </div>

            {isEditing ? (
                /* Editable Form Mode */
                <div className="form-grid-2col">
                    {/* Left Column */}
                    <div className="form-column">
                        <InputField
                            label="Rule Name"
                            id="rule-name-input"
                            name="name"
                            value={formData.name || ''}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder="e.g. Basic Salary"
                            error={errors.name}
                        />

                        <InputField
                            label="Rule Code"
                            id="rule-code-input"
                            name="code"
                            value={formData.code || ''}
                            onChange={(e) =>
                                onChange(
                                    'code',
                                    e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                                )
                            }
                            placeholder="e.g. BASIC"
                            error={errors.code}
                        />

                        <div className="form-field-wrapper">
                            <Dropdown
                                label="Category"
                                options={CATEGORY_OPTIONS}
                                value={formData.category}
                                onChange={(val) => onChange('category', val)}
                                placeholder="Select category"
                                error={errors.category}
                            />
                        </div>

                        <InputField
                            label="Sequence Order"
                            id="rule-sequence-input"
                            name="sequenceOrder"
                            type="number"
                            value={
                                formData.sequenceOrder !== undefined &&
                                formData.sequenceOrder !== null
                                    ? formData.sequenceOrder
                                    : ''
                            }
                            onChange={(e) => onChange('sequenceOrder', e.target.value)}
                            placeholder="e.g. 1, 10, 20"
                            error={errors.sequenceOrder}
                        />
                    </div>

                    {/* Right Column */}
                    <div className="form-column">
                        <div className="form-field-wrapper">
                            <Dropdown
                                label="Salary Structure"
                                options={structureDropdownOptions}
                                value={formData.structureId}
                                onChange={(val) => onChange('structureId', val)}
                                placeholder="Select structure"
                                disabled={!isCreate}
                                error={errors.structureId}
                            />
                            {!isCreate && (
                                <span className="field-hint-text">
                                    Salary structure cannot be modified after creation.
                                </span>
                            )}
                        </div>

                        <div className="form-field-wrapper">
                            <Dropdown
                                label="Computation Type"
                                options={COMPUTATION_TYPE_OPTIONS}
                                value={formData.computationType}
                                onChange={(val) => onChange('computationType', val)}
                                placeholder="Select computation type"
                                error={errors.computationType}
                            />
                        </div>

                        {/* Dynamic Subforms based on computationType */}
                        {formData.computationType === 'FIXED' && (
                            <InputField
                                label="Fixed Amount (₹)"
                                id="rule-fixed-amount-input"
                                name="fixedAmount"
                                type="number"
                                value={
                                    formData.fixedAmount !== undefined &&
                                    formData.fixedAmount !== null
                                        ? formData.fixedAmount
                                        : ''
                                }
                                onChange={(e) => onChange('fixedAmount', e.target.value)}
                                placeholder="e.g. 10000.00"
                                error={errors.fixedAmount}
                            />
                        )}

                        {formData.computationType === 'PERCENTAGE' && (
                            <>
                                <InputField
                                    label="Percentage Base Code"
                                    id="rule-base-code-input"
                                    name="percentageBaseCode"
                                    value={formData.percentageBaseCode || ''}
                                    onChange={(e) =>
                                        onChange(
                                            'percentageBaseCode',
                                            e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                                        )
                                    }
                                    placeholder="e.g. WAGE, BASIC"
                                    error={errors.percentageBaseCode}
                                />

                                <InputField
                                    label="Percentage Rate (%)"
                                    id="rule-percentage-rate-input"
                                    name="percentageRate"
                                    type="number"
                                    value={
                                        formData.percentageRate !== undefined &&
                                        formData.percentageRate !== null
                                            ? formData.percentageRate
                                            : ''
                                    }
                                    onChange={(e) => onChange('percentageRate', e.target.value)}
                                    placeholder="e.g. 50.00"
                                    error={errors.percentageRate}
                                />
                            </>
                        )}

                        {formData.computationType === 'FORMULA' && (
                            <div className="form-group formula-group">
                                <label htmlFor="rule-formula-input" className="form-label">
                                    Formula Expression
                                </label>
                                <textarea
                                    id="rule-formula-input"
                                    className={`form-textarea formula-textarea ${errors.formulaExpression ? 'has-error' : ''}`}
                                    rows={3}
                                    value={formData.formulaExpression || ''}
                                    onChange={(e) => onChange('formulaExpression', e.target.value)}
                                    placeholder="e.g. BASIC + HRA + STD + BONUS"
                                />
                                {errors.formulaExpression && (
                                    <span className="error-message">
                                        {errors.formulaExpression}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Read-Only View Mode */
                <div className="view-grid-2col">
                    {/* Left Column */}
                    <div className="view-column">
                        <div className="view-field-item">
                            <span className="view-label">Rule Name</span>
                            <span className="view-value-strong">{formData.name || '—'}</span>
                        </div>

                        <div className="view-field-item">
                            <span className="view-label">Rule Code</span>
                            <span className="view-code-pill">{formData.code || '—'}</span>
                        </div>

                        <div className="view-field-item">
                            <span className="view-label">Category</span>
                            <Badge
                                variant={catConfig.variant}
                                className={`rule-category-badge ${catConfig.className}`}
                                size="sm"
                            >
                                {catConfig.label}
                            </Badge>
                        </div>

                        <div className="view-field-item">
                            <span className="view-label">Sequence Order</span>
                            <span className="view-sequence-badge">
                                #{formData.sequenceOrder ?? '—'}
                            </span>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="view-column">
                        <div className="view-field-item">
                            <span className="view-label">Salary Structure</span>
                            {formData.structureId ? (
                                <button
                                    type="button"
                                    className="structure-nav-btn"
                                    onClick={() =>
                                        navigate(
                                            `/dashboard/${roleSegment}/payroll/salary-structures/${formData.structureId}`,
                                        )
                                    }
                                >
                                    {currentStructureName} ↗
                                </button>
                            ) : (
                                <span className="view-value-text">{currentStructureName}</span>
                            )}
                        </div>

                        <div className="view-field-item">
                            <span className="view-label">Computation Type</span>
                            <span className="view-value-text">
                                {formData.computationType === 'FIXED' && 'Fixed Amount'}
                                {formData.computationType === 'PERCENTAGE' && 'Percentage of Base'}
                                {formData.computationType === 'FORMULA' &&
                                    'Formula / Mathematical Expression'}
                                {!formData.computationType && '—'}
                            </span>
                        </div>

                        {formData.computationType === 'FIXED' && (
                            <div className="view-field-item">
                                <span className="view-label">Fixed Amount</span>
                                <span className="view-value-highlight">
                                    {formatCurrency(formData.fixedAmount)}
                                </span>
                            </div>
                        )}

                        {formData.computationType === 'PERCENTAGE' && (
                            <div className="view-field-item">
                                <span className="view-label">Percentage Calculation</span>
                                <span className="view-value-highlight">
                                    {formData.percentageRate}% of {formData.percentageBaseCode}
                                </span>
                            </div>
                        )}

                        {formData.computationType === 'FORMULA' && (
                            <div className="view-field-item">
                                <span className="view-label">Formula Expression</span>
                                <code className="view-formula-code">
                                    {formData.formulaExpression || '—'}
                                </code>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RuleFormCard;
