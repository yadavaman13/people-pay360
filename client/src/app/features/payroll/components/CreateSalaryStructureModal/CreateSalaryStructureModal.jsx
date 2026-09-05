import { useState, useEffect, useCallback, useRef } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Checkbox from '@/components/Shared/Form/Checkbox/Checkbox';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { createSalaryStructure } from '../../services/salaryStructure.api';
import './CreateSalaryStructureModal.scss';

const DEFAULT_INITIAL_VALUES = Object.freeze({});

/**
 * SCR-PAY-006: Create Salary Structure Modal
 * Enables administrators and payroll managers to provision new salary structures.
 */
function CreateSalaryStructureModal({
    isOpen,
    onClose,
    onSuccess,
    initialValues = DEFAULT_INITIAL_VALUES,
}) {
    const [name, setName] = useState(initialValues?.name || '');
    const [code, setCode] = useState(initialValues?.code || '');
    const [description, setDescription] = useState(initialValues?.description || '');
    const [isActive, setIsActive] = useState(
        initialValues?.isActive !== undefined ? initialValues.isActive : true,
    );

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const prevIsOpenRef = useRef(false);

    // Reset form only when modal transitions from closed to open
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            setName(initialValues?.name || '');
            setCode(initialValues?.code || '');
            setDescription(initialValues?.description || '');
            setIsActive(initialValues?.isActive !== undefined ? initialValues.isActive : true);
            setErrors({});
            setIsSubmitting(false);
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen, initialValues]);

    // Handle code change: auto-uppercase and strip illegal characters
    const handleCodeChange = (e) => {
        const raw = e.target.value.toUpperCase();
        setCode(raw);
        if (errors.code) {
            setErrors((prev) => ({ ...prev, code: undefined }));
        }
    };

    // Client-side field validation
    const validateForm = useCallback(() => {
        const newErrors = {};

        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
            newErrors.name = 'Structure name is required (2–100 characters)';
        }

        const trimmedCode = code.trim();
        if (!trimmedCode) {
            newErrors.code = 'Structure code is required (letters, numbers, and underscores only)';
        } else if (!/^[A-Z0-9_]+$/.test(trimmedCode)) {
            newErrors.code =
                'Structure code must contain only uppercase letters, numbers, and underscores';
        } else if (trimmedCode.length > 50) {
            newErrors.code = 'Code cannot exceed 50 characters';
        }

        if (description && description.length > 500) {
            newErrors.description = 'Description cannot exceed 500 characters';
        }

        return newErrors;
    }, [name, code, description]);

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (isSubmitting) return;

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            const payload = {
                name: name.trim(),
                code: code.trim().toUpperCase(),
                description: description.trim() || undefined,
                isActive,
            };

            const response = await createSalaryStructure(payload);
            const created = response.data;
            onSuccess?.(created);
        } catch (err) {
            const status = err?.response?.status;
            const resData = err?.response?.data;

            if (status === 409) {
                // Duplicate Code conflict
                setErrors((prev) => ({
                    ...prev,
                    code:
                        resData?.message ||
                        `A salary structure with code "${code.trim()}" already exists`,
                }));
            } else if (status === 422 && Array.isArray(resData?.errors)) {
                // Validation error mapping
                const fieldErrors = {};
                resData.errors.forEach((errObj) => {
                    const field = errObj.path || errObj.param;
                    if (field) {
                        fieldErrors[field] = errObj.msg;
                    }
                });
                setErrors((prev) => ({
                    ...prev,
                    ...fieldErrors,
                    general: resData.message || 'Please fix the validation errors below',
                }));
            } else {
                setErrors((prev) => ({
                    ...prev,
                    general:
                        resData?.message ||
                        err?.message ||
                        'Failed to create salary structure. Please try again.',
                }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalFooter = (
        <div className="create-salary-structure-modal__footer">
            <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
                Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleSubmit} loading={isSubmitting}>
                Create Structure
            </Button>
        </div>
    );

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="New Salary Structure"
            size="md"
            footer={modalFooter}
        >
            <form
                className="create-salary-structure-modal__form"
                onSubmit={handleSubmit}
                noValidate
            >
                {errors.general && (
                    <div className="modal-alert-wrapper">
                        <Alert variant="danger">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{errors.general}</AlertDescription>
                        </Alert>
                    </div>
                )}

                <div className="form-field-wrapper">
                    <InputField
                        label="Structure Name"
                        id="structure-name"
                        placeholder="e.g. Regular Salary"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        error={errors.name}
                        disabled={isSubmitting}
                        autoComplete="off"
                    />
                </div>

                <div className="form-field-wrapper">
                    <InputField
                        label="Structure Code"
                        id="structure-code"
                        placeholder="e.g. REG_SALARY"
                        value={code}
                        onChange={handleCodeChange}
                        error={errors.code}
                        disabled={isSubmitting}
                        autoComplete="off"
                    />
                </div>

                <div className="form-field-wrapper">
                    <Textarea
                        label="Description"
                        id="structure-description"
                        placeholder="Provide details on target employee grades or calculation rules..."
                        value={description}
                        onChange={(e) => {
                            setDescription(e.target.value);
                            if (errors.description) {
                                setErrors((prev) => ({ ...prev, description: undefined }));
                            }
                        }}
                        maxLength={500}
                        rows={3}
                        error={errors.description}
                        disabled={isSubmitting}
                        hint="Maximum 500 characters"
                    />
                </div>

                <div className="form-checkbox-wrapper">
                    <Checkbox
                        id="structure-active-toggle"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        label="Active structure (eligible for payruns)"
                        disabled={isSubmitting}
                    />
                </div>
            </form>
        </Dialog>
    );
}

export default CreateSalaryStructureModal;
