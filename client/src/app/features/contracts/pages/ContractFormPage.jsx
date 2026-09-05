import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useContractForm } from '../hooks/useContractForm';
import ContractFormFields from '../components/ContractFormFields/ContractFormFields';
import Button from '@/components/Shared/Buttons/Button/Button';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import './ContractFormPage.scss';

function ContractFormPage({ mode = 'create' }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const isEdit = mode === 'edit';
    const contractId = isEdit ? id : null;

    const {
        form,
        errors,
        isSubmitting,
        loadingDependencies,
        salaryStructures,
        workingSchedules,
        employees,
        handleFieldChange,
        handleSubmit,
    } = useContractForm({ mode, contractId });

    const onSubmit = async (e) => {
        e.preventDefault();
        const res = await handleSubmit(e);
        if (res?.success) {
            const targetId = res.id || contractId;
            if (isEdit) {
                navigate(`/dashboard/user/contracts/${targetId}`, { replace: true });
            } else {
                navigate(`/dashboard/user/contracts/${targetId}`);
            }
        }
    };

    const handleCancel = () => {
        if (isEdit && contractId) {
            navigate(`/dashboard/user/contracts/${contractId}`);
        } else {
            navigate('/dashboard/user/contracts');
        }
    };

    return (
        <div className="contract-form-page">
            {/* Top Navigation & Header */}
            <div className="form-page-top-bar">
                <button
                    type="button"
                    className="back-btn"
                    onClick={handleCancel}
                    aria-label="Go back"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Contracts</span>
                </button>
            </div>

            <div className="form-page-card">
                <header className="form-card-header">
                    <h1 className="form-title">
                        {isEdit ? 'Edit Contract' : 'Create New Contract'}
                    </h1>
                    <p className="form-subtitle">
                        {isEdit
                            ? 'Update compensation parameters, working schedule, or contract validity dates.'
                            : 'Set up an employment contract with structure assignment and date constraints.'}
                    </p>
                </header>

                {loadingDependencies ? (
                    <div className="form-loading-state">
                        <Spinner label="Loading contract details and form options..." />
                    </div>
                ) : (
                    <form onSubmit={onSubmit} noValidate className="contract-form-element">
                        <ContractFormFields
                            form={form}
                            onChange={handleFieldChange}
                            errors={errors}
                            salaryStructures={salaryStructures}
                            workingSchedules={workingSchedules}
                            employees={employees}
                            mode={mode}
                            disabled={isSubmitting}
                        />

                        {/* Form Action Controls */}
                        <div className="form-action-footer">
                            <Button
                                type="button"
                                variant="outline"
                                size="md"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="cancel-form-btn"
                            >
                                <X size={16} />
                                <span>Cancel</span>
                            </Button>

                            <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                disabled={isSubmitting}
                                className="submit-form-btn"
                            >
                                <Save size={16} />
                                <span>
                                    {isSubmitting
                                        ? 'Saving...'
                                        : isEdit
                                          ? 'Update Contract'
                                          : 'Create Contract'}
                                </span>
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default ContractFormPage;
