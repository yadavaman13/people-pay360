import { useState, useCallback } from 'react';
import { validateEmail } from '@/utils/validation';
import { adminCreateUser } from '../services/users.api';

const INITIAL_FORM_STATE = {
    firstName: '',
    lastName: '',
    email: '',
    role: 'HR_MANAGER',
};

/**
 * useCreateUser — Custom hook managing user creation form state, validation, and API dispatch.
 * Follows the 4-layer architecture (UI -> Hook -> State -> API).
 *
 * @param {object} options
 * @param {Function} [options.onClose] - Callback to dismiss the modal dialog
 * @param {Function} [options.onUserCreated] - Callback executed on successful user creation
 * @returns {object} Form state, errors, submission flags, and handler functions
 */
export function useCreateUser({ onClose, onUserCreated } = {}) {
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleChange = useCallback((field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
        setApiError('');
    }, []);

    const resetForm = useCallback(() => {
        setFormData(INITIAL_FORM_STATE);
        setErrors({});
        setApiError('');
    }, []);

    const validate = useCallback(() => {
        const newErrors = {};
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First Name is required';
        }
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last Name is required';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email.trim())) {
            newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.role) {
            newErrors.role = 'Role is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = useCallback(
        async (e) => {
            if (e && e.preventDefault) e.preventDefault();
            if (!validate()) return;

            setSubmitting(true);
            setApiError('');

            try {
                const response = await adminCreateUser({
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    email: formData.email.trim().toLowerCase(),
                    role: formData.role,
                });

                resetForm();

                if (onUserCreated) {
                    onUserCreated(response.user, response.emailDeliveryFailed);
                }
                if (onClose) {
                    onClose();
                }
            } catch (err) {
                const status = err.response?.status;
                const message =
                    err.response?.data?.message || err.message || 'Failed to create user';

                if (status === 502) {
                    // Email delivery failed but user account was created
                    resetForm();
                    if (onUserCreated) {
                        onUserCreated(err.response?.data?.user, true);
                    }
                    if (onClose) {
                        onClose();
                    }
                    return;
                }

                setApiError(message);
            } finally {
                setSubmitting(false);
            }
        },
        [formData, validate, resetForm, onUserCreated, onClose],
    );

    return {
        formData,
        errors,
        submitting,
        apiError,
        handleChange,
        handleSubmit,
        resetForm,
    };
}
