import { useState, useEffect, useRef, useCallback } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { addRuleToStructure } from '../../services/salaryStructure.api';
import './AddRuleToStructureModal.scss';

const CATEGORY_OPTIONS = [
    { value: 'BASIC', label: 'Basic Salary' },
    { value: 'ALLOWANCE', label: 'Allowance' },
    { value: 'GROSS', label: 'Gross' },
    { value: 'DEDUCTION', label: 'Deduction' },
    { value: 'NET', label: 'Net Salary' },
    { value: 'OTHER', label: 'Other' },
];

const COMPUTATION_OPTIONS = [
    { value: 'PERCENTAGE', label: 'Percentage of Base Code' },
    { value: 'FIXED', label: 'Fixed Amount (₹)' },
    { value: 'FORMULA', label: 'Formula Expression' },
];

const BASE_CODE_OPTIONS = [
    { value: 'WAGE', label: 'WAGE (Base Monthly Contract Wage)' },
    { value: 'BASIC', label: 'BASIC (Basic Salary)' },
    { value: 'GROSS', label: 'GROSS (Gross Salary)' },
];

/**
 * AddRuleToStructureModal
 * Modal enabling administrators & payroll managers to attach a new salary rule
 * directly to the selected salary structure.
 */
function AddRuleToStructureModal({
    isOpen,
    structureId,
    structureName,
    onClose,
    onSuccess,
    suggestedSequence = 10,
}) {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [category, setCategory] = useState('ALLOWANCE');
    const [sequenceOrder, setSequenceOrder] = useState(suggestedSequence);
    const [computationType, setComputationType] = useState('PERCENTAGE');
    const [percentageBaseCode, setPercentageBaseCode] = useState('BASIC');
    const [percentageRate, setPercentageRate] = useState('40.00');
    const [fixedAmount, setFixedAmount] = useState('');
    const [formulaExpression, setFormulaExpression] = useState('');

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);

    const prevIsOpenRef = useRef(false);

    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            setName('');
            setCode('');
            setCategory('ALLOWANCE');
            setSequenceOrder(suggestedSequence);
            setComputationType('PERCENTAGE');
            setPercentageBaseCode('BASIC');
            setPercentageRate('40.00');
            setFixedAmount('');
            setFormulaExpression('');
            setErrors({});
            setServerError(null);
            setIsSubmitting(false);
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, suggestedSequence]);

    const handleCodeChange = (e) => {
        const raw = e.target.value.toUpperCase();
        setCode(raw);
        if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
    };

    const validateForm = useCallback(() => {
        const errs = {};
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
            errs.name = 'Rule name is required (2–100 characters)';
        }

        const trimmedCode = code.trim();
        if (!trimmedCode) {
            errs.code = 'Rule code is required';
        } else if (!/^[A-Z0-9_]+$/.test(trimmedCode)) {
            errs.code = 'Code must contain only uppercase letters, numbers, and underscores';
        } else if (trimmedCode.length > 50) {
            errs.code = 'Code cannot exceed 50 characters';
        }

        const seq = Number(sequenceOrder);
        if (!sequenceOrder || Number.isNaN(seq) || seq < 1 || !Number.isInteger(seq)) {
            errs.sequenceOrder = 'Sequence order must be a positive integer';
        }

        if (computationType === 'FIXED') {
            const amt = Number(fixedAmount);
            if (fixedAmount === '' || Number.isNaN(amt) || amt < 0) {
                errs.fixedAmount = 'Fixed amount must be 0 or a positive number';
            }
        } else if (computationType === 'PERCENTAGE') {
            const rate = Number(percentageRate);
            if (percentageRate === '' || Number.isNaN(rate) || rate <= 0 || rate > 100) {
                errs.percentageRate = 'Percentage rate must be between 0.01 and 100';
            }
            if (!percentageBaseCode) {
                errs.percentageBaseCode = 'Base code is required for percentage calculation';
            }
        } else if (computationType === 'FORMULA') {
            const trimmedFormula = formulaExpression.trim();
            if (!trimmedFormula) {
                errs.formulaExpression = 'Formula expression is required';
            } else if (!/^[A-Z0-9_\s+\-*/().]+$/.test(trimmedFormula)) {
                errs.formulaExpression =
                    'Formula must contain valid uppercase tokens and operators (+, -, *, /, ())';
            }
        }

        return errs;
    }, [
        name,
        code,
        sequenceOrder,
        computationType,
        fixedAmount,
        percentageRate,
        percentageBaseCode,
        formulaExpression,
    ]);

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (isSubmitting) return;

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setServerError(null);

        try {
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                category,
                sequenceOrder: Number(sequenceOrder),
                computationType,
                fixedAmount:
                    computationType === 'FIXED' ? Number(fixedAmount).toFixed(2) : undefined,
                percentageBaseCode:
                    computationType === 'PERCENTAGE' ? percentageBaseCode : undefined,
                percentageRate:
                    computationType === 'PERCENTAGE'
                        ? Number(percentageRate).toFixed(4)
                        : undefined,
                formulaExpression:
                    computationType === 'FORMULA' ? formulaExpression.trim() : undefined,
                isActive: true,
            };

            const response = await addRuleToStructure(structureId, payload);
            const created = response.data;
            onSuccess?.(created);
            onClose();
        } catch (err) {
            const errorMsg =
                err?.response?.data?.message ||
                err?.response?.data?.error?.message ||
                err?.message ||
                'Failed to attach rule to structure';

            if (err?.response?.status === 409) {
                if (errorMsg.toLowerCase().includes('code')) {
                    setErrors((prev) => ({ ...prev, code: errorMsg }));
                } else if (errorMsg.toLowerCase().includes('sequence')) {
                    setErrors((prev) => ({ ...prev, sequenceOrder: errorMsg }));
                } else {
                    setServerError(errorMsg);
                }
            } else {
                setServerError(errorMsg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <div className="add-rule-modal__footer">
            <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSubmit} loading={isSubmitting}>
                Add Rule
            </Button>
        </div>
    );

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Add Salary Rule — ${structureName || 'Structure'}`}
            size="md"
            footer={modalFooter}
        >
            <form className="add-rule-modal__form" onSubmit={handleSubmit} noValidate>
                {serverError && (
                    <div className="modal-alert-wrapper">
                        <Alert variant="danger">
                            <AlertTitle>Action Failed</AlertTitle>
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    </div>
                )}

                <div className="form-row">
                    <div className="form-field-wrapper flex-2">
                        <InputField
                            label="Rule Name *"
                            id="add-rule-name"
                            placeholder="e.g. Standard Allowance"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name)
                                    setErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                            error={errors.name}
                            disabled={isSubmitting}
                            autoComplete="off"
                        />
                    </div>
                    <div className="form-field-wrapper flex-1">
                        <InputField
                            label="Code *"
                            id="add-rule-code"
                            placeholder="e.g. STD"
                            value={code}
                            onChange={handleCodeChange}
                            error={errors.code}
                            disabled={isSubmitting}
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field-wrapper flex-1">
                        <Dropdown
                            label="Category *"
                            id="add-rule-category"
                            options={CATEGORY_OPTIONS}
                            value={category}
                            onChange={(val) => setCategory(val)}
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="form-field-wrapper flex-1">
                        <InputField
                            label="Sequence Order *"
                            id="add-rule-seq"
                            type="number"
                            placeholder="e.g. 10"
                            value={sequenceOrder}
                            onChange={(e) => {
                                setSequenceOrder(e.target.value);
                                if (errors.sequenceOrder) {
                                    setErrors((prev) => ({ ...prev, sequenceOrder: undefined }));
                                }
                            }}
                            error={errors.sequenceOrder}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="form-field-wrapper full-width">
                    <Dropdown
                        label="Computation Type *"
                        id="add-rule-computation-type"
                        options={COMPUTATION_OPTIONS}
                        value={computationType}
                        onChange={(val) => setComputationType(val)}
                        disabled={isSubmitting}
                    />
                </div>

                {/* Dynamic Subforms */}
                {computationType === 'FIXED' && (
                    <div className="form-field-wrapper full-width computation-subform">
                        <InputField
                            label="Fixed Amount (₹) *"
                            id="add-rule-fixed-amount"
                            type="number"
                            step="0.01"
                            placeholder="e.g. 5000.00"
                            value={fixedAmount}
                            onChange={(e) => {
                                setFixedAmount(e.target.value);
                                if (errors.fixedAmount) {
                                    setErrors((prev) => ({ ...prev, fixedAmount: undefined }));
                                }
                            }}
                            error={errors.fixedAmount}
                            disabled={isSubmitting}
                        />
                    </div>
                )}

                {computationType === 'PERCENTAGE' && (
                    <div className="form-row computation-subform">
                        <div className="form-field-wrapper flex-1">
                            <Dropdown
                                label="Base Code *"
                                id="add-rule-base-code"
                                options={BASE_CODE_OPTIONS}
                                value={percentageBaseCode}
                                onChange={(val) => setPercentageBaseCode(val)}
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="form-field-wrapper flex-1">
                            <InputField
                                label="Percentage Rate (%) *"
                                id="add-rule-percentage-rate"
                                type="number"
                                step="0.01"
                                placeholder="e.g. 40.00"
                                value={percentageRate}
                                onChange={(e) => {
                                    setPercentageRate(e.target.value);
                                    if (errors.percentageRate) {
                                        setErrors((prev) => ({
                                            ...prev,
                                            percentageRate: undefined,
                                        }));
                                    }
                                }}
                                error={errors.percentageRate}
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                )}

                {computationType === 'FORMULA' && (
                    <div className="form-field-wrapper full-width computation-subform">
                        <Textarea
                            label="Formula Expression *"
                            id="add-rule-formula"
                            placeholder="e.g. BASIC + HRA + STD"
                            value={formulaExpression}
                            onChange={(e) => {
                                setFormulaExpression(e.target.value.toUpperCase());
                                if (errors.formulaExpression) {
                                    setErrors((prev) => ({
                                        ...prev,
                                        formulaExpression: undefined,
                                    }));
                                }
                            }}
                            error={errors.formulaExpression}
                            disabled={isSubmitting}
                            rows={2}
                            hint="Use uppercase code tokens and +, -, *, / operators"
                        />
                    </div>
                )}
            </form>
        </Dialog>
    );
}

export default AddRuleToStructureModal;
