import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, Edit2, Plus, Trash2, Check, X } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { useToast } from '@/components/Shared/Feedback/Toast';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import {
    fetchSalaryStructureById,
    updateSalaryStructure,
    deleteSalaryStructure,
    fetchStructureRules,
} from '../../services/salaryStructure.api';
import StructureMetadataCard from '../../components/StructureMetadataCard/StructureMetadataCard';
import StructureRulesTable from '../../components/StructureRulesTable/StructureRulesTable';
import StructureRuleMobileCard from '../../components/StructureRuleMobileCard/StructureRuleMobileCard';
import AddRuleToStructureModal from '../../components/AddRuleToStructureModal/AddRuleToStructureModal';
import './SalaryStructureDetailPage.scss';

/**
 * SCR-PAY-007: Salary Structure Detail Screen
 * Form view of structure metadata with itemized salary rules computation pipeline.
 */
function SalaryStructureDetailPage() {
    const { id: structureId } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useAuth();
    const { addToast } = useToast();

    // Determine current role segment for navigation
    const roleSegment = useMemo(() => {
        if (pathname.includes('/admin/')) return 'admin';
        if (pathname.includes('/hr/')) return 'hr';
        return 'employee';
    }, [pathname]);

    // Check RBAC mutation permissions
    const canEdit = useMemo(() => {
        const allowed = ['ADMIN', 'HR_PAYROLL_MANAGER'];
        return Boolean(user?.role && allowed.includes(user.role));
    }, [user?.role]);

    // State Layer
    const [structure, setStructure] = useState(null);
    const [rules, setRules] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [serverError, setServerError] = useState(null);

    // Metadata Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        code: '',
        description: '',
        isActive: true,
    });
    const [editErrors, setEditErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Deactivation Dialog State
    const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [deactivateError, setDeactivateError] = useState(null);

    // Add Rule Modal State
    const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);

    // Initial Data Fetch
    const loadStructure = useCallback(async () => {
        if (!structureId) return;
        setIsLoading(true);
        setServerError(null);

        try {
            const res = await fetchSalaryStructureById(structureId);
            const structData = res?.data;
            if (structData) {
                setStructure(structData);
                setRules(structData.rules || []);
                setEditFormData({
                    name: structData.name || '',
                    code: structData.code || '',
                    description: structData.description || '',
                    isActive: structData.isActive !== false,
                });
            }
        } catch (err) {
            const errorMsg =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to load salary structure details';
            setServerError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [structureId]);

    useEffect(() => {
        loadStructure();
    }, [loadStructure]);

    // Refresh only rules list
    const refreshRules = useCallback(async () => {
        try {
            const res = await fetchStructureRules(structureId);
            const updatedRules = res?.data || [];
            setRules(updatedRules);
            setStructure((prev) => (prev ? { ...prev, rules: updatedRules } : prev));
        } catch (err) {
            // If dedicated endpoint fails, fallback to full reload
            loadStructure();
        }
    }, [structureId, loadStructure]);

    // Navigation back to list
    const handleBackToList = () => {
        navigate(`/dashboard/${roleSegment}/payroll/salary-structures`);
    };

    // Rule row click navigation to SCR-PAY-009
    const handleRuleClick = (ruleId) => {
        if (ruleId) {
            navigate(`/dashboard/${roleSegment}/payroll/salary-rules/${ruleId}`);
        }
    };

    // Metadata form change handler
    const handleFieldChange = (field, value) => {
        setEditFormData((prev) => ({ ...prev, [field]: value }));
        if (editErrors[field]) {
            setEditErrors((prev) => {
                const updated = { ...prev };
                delete updated[field];
                return updated;
            });
        }
    };

    // Save metadata modifications
    const handleSaveMetadata = async () => {
        const errs = {};
        const trimmedName = editFormData.name.trim();
        if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
            errs.name = 'Structure name is required (2–100 characters)';
        }

        const trimmedCode = editFormData.code.trim();
        if (!trimmedCode) {
            errs.code = 'Structure code is required';
        } else if (!/^[A-Z0-9_]+$/.test(trimmedCode)) {
            errs.code = 'Code must contain only uppercase letters, numbers, and underscores';
        } else if (trimmedCode.length > 50) {
            errs.code = 'Code cannot exceed 50 characters';
        }

        if (editFormData.description && editFormData.description.length > 500) {
            errs.description = 'Description cannot exceed 500 characters';
        }

        if (Object.keys(errs).length > 0) {
            setEditErrors(errs);
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: trimmedName,
                code: trimmedCode.toUpperCase(),
                description: editFormData.description.trim() || undefined,
                isActive: editFormData.isActive,
            };

            const res = await updateSalaryStructure(structureId, payload);
            const updated = res?.data || payload;

            setStructure((prev) => ({ ...prev, ...updated }));
            setEditFormData({
                name: updated.name || '',
                code: updated.code || '',
                description: updated.description || '',
                isActive: updated.isActive !== false,
            });
            setIsEditing(false);
            addToast('Salary structure updated successfully', 'success');
        } catch (err) {
            const errorMsg =
                err?.response?.data?.message ||
                err?.response?.data?.error?.message ||
                err?.message ||
                'Failed to update salary structure';

            if (err?.response?.status === 409) {
                setEditErrors((prev) => ({ ...prev, code: errorMsg }));
            } else {
                addToast(errorMsg, 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (structure) {
            setEditFormData({
                name: structure.name || '',
                code: structure.code || '',
                description: structure.description || '',
                isActive: structure.isActive !== false,
            });
        }
        setEditErrors({});
        setIsEditing(false);
    };

    // Deactivation confirmation handler
    const handleDeactivateConfirm = async () => {
        setIsDeactivating(true);
        setDeactivateError(null);

        try {
            await deleteSalaryStructure(structureId);
            addToast('Salary structure deactivated successfully', 'success');
            setShowDeactivateDialog(false);
            setStructure((prev) => (prev ? { ...prev, isActive: false } : prev));
            setEditFormData((prev) => ({ ...prev, isActive: false }));
        } catch (err) {
            const errorMsg =
                err?.response?.data?.message ||
                err?.message ||
                'Failed to deactivate salary structure';

            if (err?.response?.status === 409) {
                setDeactivateError(errorMsg);
            } else {
                addToast(errorMsg, 'error');
                setShowDeactivateDialog(false);
            }
        } finally {
            setIsDeactivating(false);
        }
    };

    // Calculate suggested next sequence order
    const suggestedNextSequence = useMemo(() => {
        if (!rules || rules.length === 0) return 1;
        const maxSeq = Math.max(...rules.map((r) => r.sequenceOrder ?? 0));
        return maxSeq + 10;
    }, [rules]);

    if (isLoading) {
        return (
            <div className="salary-structure-detail-page is-loading">
                <div className="detail-loading-container">
                    <Spinner size="lg" label="Loading salary structure details..." />
                </div>
            </div>
        );
    }

    if (serverError && !structure) {
        return (
            <div className="salary-structure-detail-page">
                <div className="page-error-alert">
                    <Alert variant="danger">
                        <AlertTitle>Salary structure not found</AlertTitle>
                        <AlertDescription>
                            <span>{serverError}</span>
                            <div className="alert-retry-action">
                                <Button variant="secondary" size="sm" onClick={handleBackToList}>
                                    Back to Salary Structures
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="salary-structure-detail-page">
            {/* 1. Page Header */}
            <header className="salary-structure-detail-header">
                <div className="header-info">
                    <div className="title-row">
                        <button
                            type="button"
                            className="back-btn"
                            onClick={handleBackToList}
                            title="Back to Salary Structures"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="header-title">
                            Salary Structure / {structure?.name || 'Detail'}
                        </h1>
                    </div>
                    <p className="header-subtitle">Form view with its salary rules</p>
                </div>

                {/* Header Actions */}
                {canEdit && (
                    <div className="header-actions">
                        {!isEditing ? (
                            <>
                                <Button
                                    variant="secondary"
                                    size="md"
                                    onClick={() => setIsEditing(true)}
                                    className="edit-structure-btn"
                                >
                                    <Edit2 size={16} />
                                    <span>Edit Structure</span>
                                </Button>

                                {structure?.isActive && (
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        onClick={() => {
                                            setDeactivateError(null);
                                            setShowDeactivateDialog(true);
                                        }}
                                        className="deactivate-btn"
                                    >
                                        <Trash2 size={16} />
                                        <span>Deactivate</span>
                                    </Button>
                                )}

                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={() => setIsAddRuleModalOpen(true)}
                                    className="add-rule-btn"
                                >
                                    <Plus size={16} />
                                    <span>Add Salary Rule</span>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="primary"
                                    size="md"
                                    onClick={handleSaveMetadata}
                                    loading={isSaving}
                                    disabled={isSaving}
                                    className="save-changes-btn"
                                >
                                    <Check size={16} />
                                    <span>Save Changes</span>
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="md"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="cancel-btn"
                                >
                                    <X size={16} />
                                    <span>Cancel</span>
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </header>

            {/* 2. Deactivation Blocker Alert Banner if 409 occurred */}
            {deactivateError && (
                <div className="page-error-alert">
                    <Alert variant="danger" onClose={() => setDeactivateError(null)}>
                        <AlertTitle>Cannot Deactivate Salary Structure</AlertTitle>
                        <AlertDescription>{deactivateError}</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* 3. Structure Information Metadata Card */}
            <div className="metadata-section">
                <StructureMetadataCard
                    structure={structure}
                    isEditing={isEditing}
                    formData={editFormData}
                    onChange={handleFieldChange}
                    errors={editErrors}
                />
            </div>

            {/* 4. Salary Rules Section */}
            <section className="rules-section">
                <div className="rules-section-header">
                    <div className="rules-title-group">
                        <h2 className="rules-title">Salary Rules</h2>
                        <span className="rules-count-badge">({rules.length})</span>
                    </div>

                    {canEdit && rules.length > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsAddRuleModalOpen(true)}
                            className="inline-add-rule-btn"
                        >
                            <Plus size={14} />
                            <span>Add Rule</span>
                        </Button>
                    )}
                </div>

                {/* Desktop & Tablet Table (>= 576px) */}
                <div className="desktop-rules-container">
                    <StructureRulesTable
                        rules={rules}
                        onRuleClick={handleRuleClick}
                        canAddRule={canEdit}
                        onAddRuleClick={() => setIsAddRuleModalOpen(true)}
                    />
                </div>

                {/* Mobile Cards Stack (< 576px) */}
                <div className="mobile-rules-container">
                    {rules.length === 0 ? (
                        <div className="mobile-empty-rules">
                            <p>No salary rules attached to this structure.</p>
                            {canEdit && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsAddRuleModalOpen(true)}
                                >
                                    + Add First Rule
                                </Button>
                            )}
                        </div>
                    ) : (
                        rules
                            .sort((a, b) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0))
                            .map((rule) => (
                                <StructureRuleMobileCard
                                    key={rule.id || `${rule.code}-${rule.sequenceOrder}`}
                                    rule={rule}
                                    onClick={handleRuleClick}
                                />
                            ))
                    )}
                </div>
            </section>

            {/* 5. Add Rule Modal */}
            <AddRuleToStructureModal
                isOpen={isAddRuleModalOpen}
                structureId={structureId}
                structureName={structure?.name}
                suggestedSequence={suggestedNextSequence}
                onClose={() => setIsAddRuleModalOpen(false)}
                onSuccess={() => {
                    addToast('Salary rule added successfully', 'success');
                    refreshRules();
                }}
            />

            {/* 6. Deactivation Confirmation Dialog */}
            <Dialog
                isOpen={showDeactivateDialog}
                onClose={() => setShowDeactivateDialog(false)}
                title="Deactivate Salary Structure"
                variant="danger"
                confirmText="Deactivate Structure"
                cancelText="Cancel"
                confirmLoading={isDeactivating}
                onConfirm={handleDeactivateConfirm}
            >
                <div className="dialog-body-content">
                    <p>
                        Are you sure you want to deactivate salary structure{' '}
                        <strong>&quot;{structure?.name}&quot;</strong> ({structure?.code})?
                    </p>
                    <p className="dialog-subtext">
                        Deactivating will mark this structure inactive. Active employment contracts
                        or ongoing payruns must not be using this structure.
                    </p>
                </div>
            </Dialog>
        </div>
    );
}

export default SalaryStructureDetailPage;
