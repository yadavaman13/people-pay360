import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { Edit2, ArrowLeft, Trash2, Check, X } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { useToast } from '@/components/Shared/Feedback/Toast';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import {
    fetchSalaryRuleById,
    fetchSalaryStructures,
    createSalaryRule,
    updateSalaryRule,
    deleteSalaryRule,
} from '../../services/salaryRules.api';
import RuleFormCard from '../../components/RuleFormCard/RuleFormCard';
import ComputationReferenceBox from '../../components/ComputationReferenceBox/ComputationReferenceBox';
import { validateSalaryRuleForm, buildSalaryRulePayload } from './salaryRuleValidation.schema';
import './SalaryRuleDetailPage.scss';

const DEFAULT_FORM_STATE = {
    name: '',
    code: '',
    category: 'BASIC',
    sequenceOrder: 1,
    structureId: '',
    computationType: 'PERCENTAGE',
    percentageBaseCode: 'WAGE',
    percentageRate: '50.00',
    fixedAmount: '',
    formulaExpression: '',
    isActive: true,
};

/**
 * SCR-PAY-009: Salary Rule Detail & Creation Screen
 * Full Create, View, and Edit modes with dynamic computation fields and toast notifications.
 */
function SalaryRuleDetailPage() {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const { pathname, state: routeState } = useLocation();
    const { user } = useAuth();
    const { addToast } = useToast();

    const isCreate = routeId === 'new';

    // Determine current role context ('admin', 'hr', or 'employee')
    const roleSegment = useMemo(() => {
        if (pathname.includes('/admin/')) return 'admin';
        if (pathname.includes('/hr/')) return 'hr';
        return 'employee';
    }, [pathname]);

    // Check RBAC permission for mutation triggers
    const canEdit = useMemo(() => {
        const allowed = ['ADMIN', 'HR_PAYROLL_MANAGER'];
        return Boolean(user?.role && allowed.includes(user.role));
    }, [user?.role]);

    // State Layer
    const [mode, setMode] = useState(isCreate ? 'create' : 'view');
    const [formData, setFormData] = useState(() => ({
        ...DEFAULT_FORM_STATE,
        structureId: routeState?.preselectedStructureId || '',
    }));
    const [initialData, setInitialData] = useState({});
    const [structures, setStructures] = useState([]);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);

    // Dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            setIsLoading(true);
            setServerError(null);

            try {
                // Fetch active structures for dropdown
                const structuresRes = await fetchSalaryStructures({ isActive: true, limit: 100 });
                const structureList = structuresRes?.data || [];
                if (isMounted) {
                    setStructures(structureList);
                }

                if (!isCreate) {
                    // Fetch existing rule by ID
                    const ruleRes = await fetchSalaryRuleById(routeId);
                    const rule = ruleRes?.data;
                    if (rule && isMounted) {
                        const populatedData = {
                            id: rule.id,
                            name: rule.name || '',
                            code: rule.code || '',
                            category: rule.category || 'BASIC',
                            sequenceOrder: rule.sequenceOrder ?? 1,
                            structureId: rule.structureId || '',
                            structureName: rule.structureName || '',
                            computationType: rule.computationType || 'PERCENTAGE',
                            percentageBaseCode: rule.percentageBaseCode || 'WAGE',
                            percentageRate: rule.percentageRate || '',
                            fixedAmount: rule.fixedAmount || '',
                            formulaExpression: rule.formulaExpression || '',
                            isActive: rule.isActive !== false,
                        };
                        setFormData(populatedData);
                        setInitialData(populatedData);
                        setMode('view');
                    }
                } else if (isMounted) {
                    const preselectedId =
                        routeState?.preselectedStructureId ||
                        (structureList.length > 0 ? structureList[0].id : '');
                    const newForm = {
                        ...DEFAULT_FORM_STATE,
                        structureId: preselectedId,
                    };
                    setFormData(newForm);
                    setInitialData(newForm);
                    setMode('create');
                }
            } catch (err) {
                if (isMounted) {
                    const errorMsg =
                        err?.response?.data?.message ||
                        err?.message ||
                        'Failed to load salary rule details';
                    setServerError(errorMsg);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadData();

        return () => {
            isMounted = false;
        };
    }, [routeId, isCreate, routeState?.preselectedStructureId]);

    // Handle form field changes
    const handleFieldChange = useCallback((field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
        // Clear field-level error on change
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const updated = { ...prev };
            delete updated[field];
            return updated;
        });
    }, []);

    // Check if form has unsaved modifications
    const isDirty = useMemo(() => {
        return JSON.stringify(formData) !== JSON.stringify(initialData);
    }, [formData, initialData]);

    // Submit handler (Create or Update)
    const handleSubmit = async (e) => {
        e?.preventDefault();
        setServerError(null);

        // Client-side validation
        const { isValid, errors: validationErrors } = validateSalaryRuleForm(formData);
        if (!isValid) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = buildSalaryRulePayload(formData);

            if (isCreate) {
                const res = await createSalaryRule(payload);
                addToast('Salary rule created successfully', 'success');
                const createdId = res?.data?.id;
                if (createdId) {
                    navigate(`/dashboard/${roleSegment}/payroll/salary-rules/${createdId}`, {
                        replace: true,
                    });
                } else {
                    navigate(`/dashboard/${roleSegment}/payroll/salary-rules`, {
                        replace: true,
                    });
                }
            } else {
                const res = await updateSalaryRule(routeId, payload);
                addToast('Salary rule updated successfully', 'success');
                const updated = res?.data || formData;
                setFormData((prev) => ({ ...prev, ...updated }));
                setInitialData((prev) => ({ ...prev, ...updated }));
                setMode('view');
            }
        } catch (err) {
            const errorMsg =
                err?.response?.data?.message ||
                err?.response?.data?.error?.message ||
                err?.message ||
                'Failed to save salary rule';

            // Check for duplicate conflict errors
            if (err?.response?.status === 409 || err?.response?.status === 422) {
                if (errorMsg.toLowerCase().includes('code')) {
                    setErrors((prev) => ({ ...prev, code: errorMsg }));
                } else if (errorMsg.toLowerCase().includes('sequence')) {
                    setErrors((prev) => ({ ...prev, sequenceOrder: errorMsg }));
                }
            }
            setServerError(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Cancel / Discard handler
    const handleCancelClick = () => {
        if (isCreate) {
            navigate(`/dashboard/${roleSegment}/payroll/salary-rules`);
        } else if (isDirty) {
            setShowDiscardDialog(true);
        } else {
            setMode('view');
            setErrors({});
        }
    };

    const handleConfirmDiscard = () => {
        setShowDiscardDialog(false);
        setFormData(initialData);
        setErrors({});
        setMode('view');
    };

    // Delete handler
    const handleDeleteConfirm = async () => {
        setIsDeleting(true);
        try {
            await deleteSalaryRule(routeId);
            addToast('Salary rule deleted successfully', 'success');
            setShowDeleteDialog(false);
            navigate(`/dashboard/${roleSegment}/payroll/salary-rules`, { replace: true });
        } catch (err) {
            const errorMsg =
                err?.response?.data?.message || err?.message || 'Failed to delete salary rule';
            addToast(errorMsg, 'error');
            setShowDeleteDialog(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="salary-rule-detail-page is-loading">
                <div className="detail-loading-container">
                    <Spinner size="lg" label="Loading salary rule details..." />
                </div>
            </div>
        );
    }

    return (
        <div className="salary-rule-detail-page">
            {/* Page Header */}
            <header className="salary-rule-detail-header">
                <div className="header-info">
                    <div className="title-row">
                        <button
                            type="button"
                            className="back-btn"
                            onClick={() =>
                                navigate(`/dashboard/${roleSegment}/payroll/salary-rules`)
                            }
                            title="Back to Salary Rules"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="header-title">
                            {isCreate
                                ? 'Salary Rule / New Salary Rule'
                                : `Salary Rule / ${formData.name || 'Detail'}`}
                        </h1>
                    </div>
                    <p className="header-subtitle">
                        {mode === 'view'
                            ? 'Form view'
                            : mode === 'edit'
                              ? 'Edit rule configuration'
                              : 'Create new computation rule'}
                    </p>
                </div>

                {/* Header Action Buttons */}
                <div className="header-actions">
                    {mode === 'view' && canEdit && (
                        <>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={() => setMode('edit')}
                                className="edit-rule-btn"
                            >
                                <Edit2 size={16} />
                                <span>EDIT</span>
                            </Button>
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={() => setShowDeleteDialog(true)}
                                className="delete-rule-btn"
                            >
                                <Trash2 size={16} />
                                <span>Delete</span>
                            </Button>
                        </>
                    )}

                    {(mode === 'edit' || mode === 'create') && (
                        <>
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleSubmit}
                                loading={isSubmitting}
                                disabled={isSubmitting}
                                className="save-rule-btn"
                            >
                                <Check size={16} />
                                <span>{isCreate ? 'Create Rule' : 'Save Changes'}</span>
                            </Button>
                            <Button
                                variant="secondary"
                                size="md"
                                onClick={handleCancelClick}
                                disabled={isSubmitting}
                                className="cancel-rule-btn"
                            >
                                <X size={16} />
                                <span>Cancel</span>
                            </Button>
                        </>
                    )}
                </div>
            </header>

            {/* 3. Server Error Alert */}
            {serverError && (
                <div className="page-error-alert">
                    <Alert variant="danger">
                        <AlertTitle>Action failed</AlertTitle>
                        <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* 4. Primary Rule Configuration Form Card */}
            <RuleFormCard
                formData={formData}
                isEditing={mode === 'edit' || mode === 'create'}
                isCreate={isCreate}
                errors={errors}
                onChange={handleFieldChange}
                structures={structures}
                roleSegment={roleSegment}
            />

            {/* 5. Computation Method Guidance Box */}
            <ComputationReferenceBox
                activeType={formData.computationType}
                onSelectType={
                    mode !== 'view' ? (type) => handleFieldChange('computationType', type) : null
                }
            />

            {/* 6. Delete Confirmation Dialog */}
            <Dialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                title="Delete Salary Rule"
            >
                <div className="dialog-body-content">
                    <p>
                        Are you sure you want to delete salary rule{' '}
                        <strong>&quot;{formData.name}&quot;</strong> ({formData.code})?
                    </p>
                    <p className="dialog-subtext">
                        This rule will be removed from payslip computations. This action cannot be
                        undone.
                    </p>
                    <div className="dialog-actions-row">
                        <Button
                            variant="secondary"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteConfirm}
                            loading={isDeleting}
                            disabled={isDeleting}
                        >
                            Delete Rule
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* 7. Discard Changes Confirmation Dialog */}
            <Dialog
                isOpen={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title="Discard Unsaved Changes"
            >
                <div className="dialog-body-content">
                    <p>
                        You have unsaved modifications to this salary rule. Are you sure you want to
                        discard them?
                    </p>
                    <div className="dialog-actions-row">
                        <Button variant="secondary" onClick={() => setShowDiscardDialog(false)}>
                            Keep Editing
                        </Button>
                        <Button variant="danger" onClick={handleConfirmDiscard}>
                            Discard Changes
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

export default SalaryRuleDetailPage;
