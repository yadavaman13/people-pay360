import { useState } from 'react';
import { COMPUTATION_TYPE_OPTIONS } from '../../pages/SalaryRuleDetailPage/salaryRuleValidation.schema';
import './ComputationReferenceBox.scss';

/**
 * Computation Reference Box
 * Displays syntax examples, mathematical documentation, and token guides for each calculation type.
 */
function ComputationReferenceBox({ activeType = 'PERCENTAGE', onSelectType = null }) {
    const [selectedTab, setSelectedTab] = useState(activeType);

    // Sync tab when activeType prop updates externally
    const currentTab = onSelectType ? activeType : selectedTab;

    const handleTabClick = (type) => {
        setSelectedTab(type);
        if (onSelectType) {
            onSelectType(type);
        }
    };

    return (
        <div className="computation-reference-box">
            <div className="reference-header">
                <h3 className="reference-title">Computation Reference Guide</h3>
                <div className="reference-tabs" role="tablist">
                    {COMPUTATION_TYPE_OPTIONS.map((opt) => {
                        const isSelected = currentTab === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                role="tab"
                                aria-selected={isSelected}
                                className={`reference-tab-btn ${isSelected ? 'is-active' : ''}`}
                                onClick={() => handleTabClick(opt.value)}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="reference-content">
                {currentTab === 'FIXED' && (
                    <div className="reference-panel">
                        <div className="syntax-row">
                            <span className="syntax-label">Formula Syntax:</span>
                            <code className="syntax-code">Amount = fixedAmount</code>
                        </div>
                        <p className="reference-desc">
                            A constant monetary value added or deducted during each payrun execution
                            regardless of attendance or hours worked.
                        </p>
                        <div className="example-box">
                            <span className="example-tag">Example:</span>
                            <span className="example-text">
                                Setting Fixed Amount to <strong>₹10,000.00</strong> awards
                                ₹10,000.00 directly to the payslip line.
                            </span>
                        </div>
                    </div>
                )}

                {currentTab === 'PERCENTAGE' && (
                    <div className="reference-panel">
                        <div className="syntax-row">
                            <span className="syntax-label">Formula Syntax:</span>
                            <code className="syntax-code">
                                Amount = BaseValue × (PercentageRate / 100)
                            </code>
                        </div>
                        <p className="reference-desc">
                            Calculates a percentage of a predefined base code. The base code can be
                            the contract monthly base wage (<code>WAGE</code>) or any preceding rule
                            code with a lower sequence order (e.g. <code>BASIC</code>).
                        </p>
                        <div className="example-box">
                            <span className="example-tag">Example:</span>
                            <span className="example-text">
                                <strong>50.00%</strong> of <code>WAGE</code> produces{' '}
                                <strong>₹25,000.00</strong> for an employee with a ₹50,000.00
                                contract wage.
                            </span>
                        </div>
                    </div>
                )}

                {currentTab === 'FORMULA' && (
                    <div className="reference-panel">
                        <div className="syntax-row">
                            <span className="syntax-label">Formula Syntax:</span>
                            <code className="syntax-code">
                                Amount = Expression(BASIC, HRA, STD, ...)
                            </code>
                        </div>
                        <p className="reference-desc">
                            Mathematical expression evaluated dynamically by the salary engine. You
                            can reference any preceding rule codes with arithmetic operators (
                            <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>,{' '}
                            <code>( )</code>).
                        </p>
                        <div className="example-box">
                            <span className="example-tag">Example:</span>
                            <span className="example-text">
                                <code>BASIC + HRA + STD + BONUS + LTA + FIX</code> calculates Gross
                                Earnings by summing all prior allowance outputs.
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ComputationReferenceBox;
