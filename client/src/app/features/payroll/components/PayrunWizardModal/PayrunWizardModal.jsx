import { useState, useEffect, useContext } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import StepProgress from '@/components/Shared/DataDisplay/StepProgress/StepProgress';
import PayrunWizardStep1Scope from './PayrunWizardStep1Scope';
import PayrunWizardStep2Employees from './PayrunWizardStep2Employees';
import { PayrollContext } from '../../context/payroll.context';
import { usePayroll } from '../../hooks/usePayroll';
import './PayrunWizardModal.scss';

const WIZARD_STEPS = [
    { label: 'Scope Setup', description: 'Structure & Period' },
    { label: 'Employee Records', description: 'Select Roster' },
];

const INITIAL_FORM = {
    salaryStructureId: '',
    periodStart: '',
    periodEnd: '',
    name: '',
    paymentDate: '',
};

function PayrunWizardInner({ onClose, onSuccess, onStepChange, onSubmittingChange }) {
    const { salaryStructures } = useContext(PayrollContext);
    const { loadSalaryStructures, handleValidateWizard, handleCreatePayrun } = usePayroll();

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [eligibleEmployees, setEligibleEmployees] = useState([]);
    const [ineligibleEmployees, setIneligibleEmployees] = useState([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadSalaryStructures();
    }, [loadSalaryStructures]);

    const setStep = (step) => {
        setCurrentStep(step);
        if (onStepChange) onStepChange(step);
    };

    const setSubmitting = (submitting) => {
        setIsSubmitting(submitting);
        if (onSubmittingChange) onSubmittingChange(submitting);
    };

    const handleFormChange = (field, value) => {
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };
            // If periodStart changes to a date later than periodEnd, clear periodEnd
            if (
                field === 'periodStart' &&
                updated.periodEnd &&
                value &&
                updated.periodEnd < value
            ) {
                updated.periodEnd = '';
            }
            return updated;
        });
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: '' }));
        }
        if (field === 'periodStart' && formErrors.periodEnd) {
            setFormErrors((prev) => ({ ...prev, periodEnd: '' }));
        }
    };

    // Client-side validation for Step 1
    const validateStep1 = () => {
        const errors = {};
        if (!formData.salaryStructureId) {
            errors.salaryStructureId = 'Please select a salary structure';
        }
        if (!formData.periodStart) {
            errors.periodStart = 'Period start date is required';
        }
        if (!formData.periodEnd) {
            errors.periodEnd = 'Period end date is required';
        }
        if (
            formData.periodStart &&
            formData.periodEnd &&
            formData.periodStart > formData.periodEnd
        ) {
            errors.periodEnd = 'Period end must be on or after period start';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Step 1 -> Step 2 transition: Call POST /api/payruns/wizard/validate
    const handleContinueStep1 = async () => {
        if (!validateStep1()) return;

        setSubmitting(true);
        try {
            const preview = await handleValidateWizard({
                salaryStructureId: formData.salaryStructureId,
                periodStart: formData.periodStart,
                periodEnd: formData.periodEnd,
            });

            const eligible = preview.eligible || [];
            const ineligible = preview.ineligible || [];

            setEligibleEmployees(eligible);
            setIneligibleEmployees(ineligible);
            setSelectedEmployeeIds(eligible.map((item) => item.employee?.id).filter(Boolean));
            setStep(2);
        } catch {
            // Handled by hook toast
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleEmployee = (empId) => {
        setSelectedEmployeeIds((prev) =>
            prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
        );
    };

    const handleToggleSelectAll = () => {
        if (selectedEmployeeIds.length === eligibleEmployees.length) {
            setSelectedEmployeeIds([]);
        } else {
            setSelectedEmployeeIds(eligibleEmployees.map((e) => e.employee?.id).filter(Boolean));
        }
    };

    // Step 2 finalize: Call POST /api/payruns
    const handleFinalizePayrun = async () => {
        if (selectedEmployeeIds.length === 0) return;

        setSubmitting(true);
        try {
            const payload = {
                salaryStructureId: formData.salaryStructureId,
                periodStart: formData.periodStart,
                periodEnd: formData.periodEnd,
                employeeIds: selectedEmployeeIds,
            };

            if (formData.name?.trim()) {
                payload.name = formData.name.trim();
            }
            if (formData.paymentDate) {
                payload.paymentDate = formData.paymentDate;
            }

            const created = await handleCreatePayrun(payload);
            if (onSuccess) {
                onSuccess(created);
            }
            onClose();
        } catch {
            // Handled by hook toast
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="payrun-wizard-modal">
            <div className="payrun-wizard-modal__progress-container">
                <StepProgress
                    steps={WIZARD_STEPS}
                    currentStep={currentStep}
                    variant="blue"
                    size="small"
                />
            </div>

            {currentStep === 1 && (
                <PayrunWizardStep1Scope
                    formData={formData}
                    onChange={handleFormChange}
                    onContinue={handleContinueStep1}
                    onCancel={onClose}
                    isLoading={isSubmitting}
                    structures={salaryStructures}
                    errors={formErrors}
                />
            )}

            {currentStep === 2 && (
                <PayrunWizardStep2Employees
                    eligible={eligibleEmployees}
                    ineligible={ineligibleEmployees}
                    selectedIds={selectedEmployeeIds}
                    onToggleSelect={handleToggleEmployee}
                    onToggleSelectAll={handleToggleSelectAll}
                    onCreatePayrun={handleFinalizePayrun}
                    onBack={() => setStep(1)}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
}

function PayrunWizardModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const modalTitle = step === 1 ? 'New Pay Run' : 'Select Employee Records';
    const modalSize = 'lg';

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            size={modalSize}
            cancelText={null}
            confirmText={null}
            closeOnBackdrop={!isSubmitting}
        >
            <PayrunWizardInner
                onClose={onClose}
                onSuccess={onSuccess}
                onStepChange={setStep}
                onSubmittingChange={setIsSubmitting}
            />
        </Dialog>
    );
}

export default PayrunWizardModal;
