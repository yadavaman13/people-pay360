import { useState } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog';
import InputField from '@/components/Shared/Form/InputField/InputField';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { validateEmail } from '@/utils/validation';
import { adminCreateUser } from '../../services/users.api';
import { Info, ShieldAlert } from 'lucide-react';
import './CreateUserModal.scss';

const ROLES = [
    { value: 'EMPLOYEE', label: 'Employee' },
    { value: 'HR_MANAGER', label: 'HR Manager' },
    { value: 'HR_PAYROLL_USER', label: 'HR Payroll User' },
    { value: 'HR_PAYROLL_MANAGER', label: 'HR Payroll Manager' },
    { value: 'ADMIN', label: 'Administrator' },
];

function CreateUserModal({ isOpen, onClose, onUserCreated }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: 'EMPLOYEE',
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
        if (apiError) {
            setApiError('');
        }
    };

    const validate = () => {
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
    };

    const handleSubmit = async (e) => {
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

            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                role: 'EMPLOYEE',
            });
            setErrors({});

            if (onUserCreated) {
                onUserCreated(response.user, response.emailDeliveryFailed);
            }
            onClose();
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message || err.message || 'Failed to create user';

            if (status === 502) {
                // Email failed but user created
                if (onUserCreated) {
                    onUserCreated(err.response?.data?.user, true);
                }
                onClose();
                return;
            }

            setApiError(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Create New User"
            size="md"
            confirmText="Create Account"
            cancelText="Cancel"
            confirmLoading={submitting}
            onConfirm={handleSubmit}
        >
            <form onSubmit={handleSubmit} className="create-user-form" noValidate>
                {apiError && (
                    <Alert variant="danger" className="create-user-error-alert">
                        <div className="alert-content-wrapper">
                            <ShieldAlert className="alert-icon" size={18} />
                            <AlertDescription>{apiError}</AlertDescription>
                        </div>
                    </Alert>
                )}

                <div className="form-row-2">
                    <InputField
                        label="First Name *"
                        id="create-user-first-name"
                        name="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        placeholder="e.g. Jane"
                        error={errors.firstName}
                        disabled={submitting}
                    />

                    <InputField
                        label="Last Name *"
                        id="create-user-last-name"
                        name="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        placeholder="e.g. Doe"
                        error={errors.lastName}
                        disabled={submitting}
                    />
                </div>

                <InputField
                    label="Work Email *"
                    id="create-user-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="e.g. jane.doe@company.com"
                    error={errors.email}
                    disabled={submitting}
                />

                <div className={`form-group role-group ${errors.role ? 'has-error' : ''}`}>
                    <label htmlFor="create-user-role" className="form-label">
                        Role Assignment *
                    </label>
                    <div className="role-select-wrapper">
                        <select
                            id="create-user-role"
                            name="role"
                            className="role-select"
                            value={formData.role}
                            onChange={(e) => handleChange('role', e.target.value)}
                            disabled={submitting}
                        >
                            {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>
                                    {r.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {errors.role && <span className="field-error-text">{errors.role}</span>}
                </div>

                <Alert variant="info" className="create-user-info-alert">
                    <div className="alert-content-wrapper">
                        <Info className="alert-icon" size={18} />
                        <AlertDescription>
                            A secure temporary password will be automatically generated and
                            delivered to the user's email address. The user will be required to log
                            in with these credentials.
                        </AlertDescription>
                    </div>
                </Alert>
            </form>
        </Dialog>
    );
}

export default CreateUserModal;
