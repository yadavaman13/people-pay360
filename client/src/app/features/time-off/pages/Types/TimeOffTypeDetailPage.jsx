import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Edit3, Save, X } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Checkbox from '@/components/Shared/Form/Checkbox/Checkbox';
import Button from '@/components/Shared/Buttons/Button/Button';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './TimeOffTypeDetailPage.scss';

export default function TimeOffTypeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { roleSegment, triggerRefresh } = useTimeOff();

    const [type, setType] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        allocationRequired: true,
        requestApprovalRequired: true,
        paidTimeOff: true,
        maxDaysPerRequest: '',
        isActive: true,
    });
    const [isSaving, setIsSaving] = useState(false);

    const loadType = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await timeOffApi.fetchTimeOffTypeById(id);
            const data = res?.data || null;
            setType(data);
            if (data) {
                setEditForm({
                    name: data.name || '',
                    allocationRequired: Boolean(data.allocationRequired),
                    requestApprovalRequired: Boolean(data.requestApprovalRequired),
                    paidTimeOff: Boolean(data.paidTimeOff),
                    maxDaysPerRequest: data.maxDaysPerRequest ? String(data.maxDaysPerRequest) : '',
                    isActive: Boolean(data.isActive),
                });
            }
        } catch (err) {
            console.error('[TimeOffTypeDetailPage] Error fetching type:', err);
            setError(
                err?.response?.data?.message || err?.message || 'Failed to load leave type details',
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadType();
    }, [loadType]);

    const handleSave = async (e) => {
        e.preventDefault();
        setError(null);

        if (!editForm.name.trim()) {
            setError('Type name cannot be empty.');
            return;
        }

        const parsedMaxDays = editForm.maxDaysPerRequest
            ? parseInt(editForm.maxDaysPerRequest, 10)
            : null;

        setIsSaving(true);
        try {
            await timeOffApi.updateTimeOffType(id, {
                name: editForm.name.trim(),
                allocationRequired: editForm.allocationRequired,
                requestApprovalRequired: editForm.requestApprovalRequired,
                paidTimeOff: editForm.paidTimeOff,
                maxDaysPerRequest: parsedMaxDays,
                isActive: editForm.isActive,
            });
            triggerRefresh();
            setIsEditing(false);
            await loadType();
        } catch (err) {
            console.error('[TimeOffTypeDetailPage] Update failed:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="detail-loading-state">
                <Spinner size="lg" />
                <span>Loading leave type details...</span>
            </div>
        );
    }

    if (error || !type) {
        return (
            <div className="detail-error-container">
                <Alert variant="danger">
                    <AlertDescription>{error || 'Time off type not found'}</AlertDescription>
                </Alert>
                <Button
                    variant="outline"
                    onClick={() => navigate(`/dashboard/${roleSegment}/time-off/types`)}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Types</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="time-off-type-detail-page">
            {/* Header */}
            <div className="detail-header">
                <div className="header-left">
                    <Button
                        variant="plain"
                        size="sm"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/types`)}
                        className="back-btn"
                    >
                        <ArrowLeft size={16} />
                        <span>Types</span>
                    </Button>
                    <div className="header-titles">
                        <h1 className="page-title">Time Off Type / {type.name}</h1>
                        <span className="page-subtitle">Configuration & policy master rule</span>
                    </div>
                </div>

                <div className="header-actions">
                    {!isEditing ? (
                        <Button variant="primary" size="md" onClick={() => setIsEditing(true)}>
                            <Edit3 size={16} />
                            <span>Edit Policy</span>
                        </Button>
                    ) : (
                        <Button variant="outline" size="md" onClick={() => setIsEditing(false)}>
                            <X size={16} />
                            <span>Cancel</span>
                        </Button>
                    )}
                </div>
            </div>

            {error && (
                <Alert variant="danger">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Content View / Edit */}
            {!isEditing ? (
                <div className="detail-card">
                    <div className="detail-grid">
                        {/* Left Column */}
                        <div className="detail-col">
                            <div className="field-group">
                                <label className="field-label">Type Name</label>
                                <div className="field-value">
                                    <strong>{type.name}</strong>
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Unique Code</label>
                                <div className="field-value">
                                    <span className="code-pill">{type.code}</span>
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Unit</label>
                                <div className="field-value">
                                    <span>Days</span>
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Requires Allocation</label>
                                <div className="field-value">
                                    <Badge
                                        variant={type.allocationRequired ? 'default' : 'neutral'}
                                    >
                                        {type.allocationRequired
                                            ? 'Yes (Quota Enforced)'
                                            : 'No Quota'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="detail-col">
                            <div className="field-group">
                                <label className="field-label">Request Approval Required</label>
                                <div className="field-value">
                                    <Badge
                                        variant={
                                            type.requestApprovalRequired ? 'primary' : 'neutral'
                                        }
                                    >
                                        {type.requestApprovalRequired
                                            ? 'Manager / HR Approval'
                                            : 'Auto Approved'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Classification</label>
                                <div className="field-value">
                                    <span
                                        style={{
                                            fontWeight: 600,
                                            color: type.paidTimeOff ? '#16a34a' : '#64748b',
                                        }}
                                    >
                                        {type.paidTimeOff
                                            ? 'Paid Time Off (Compensated)'
                                            : 'Unpaid Leave (LWP)'}
                                    </span>
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Max Days Per Request</label>
                                <div className="field-value">
                                    <span>
                                        {type.maxDaysPerRequest
                                            ? `${type.maxDaysPerRequest} Days`
                                            : 'No Limit'}
                                    </span>
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Status</label>
                                <div className="field-value">
                                    <Badge variant={type.isActive ? 'success' : 'neutral'}>
                                        {type.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-full-width">
                        <div className="field-group">
                            <label className="field-label">Configuration Notes</label>
                            <div className="text-box">
                                <p>
                                    Standard {type.name} policy rule. Requests submitted under this
                                    type will{' '}
                                    {type.allocationRequired
                                        ? 'consume from approved employee allocations'
                                        : 'not require an allocated quota balance'}
                                    {type.requestApprovalRequired
                                        ? ' and require approval by a designated reviewer before taking effect.'
                                        : '.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSave} className="detail-card edit-card">
                    <div className="detail-grid">
                        <div className="form-cell">
                            <InputField
                                id="edit-type-name"
                                label="Type Name"
                                value={editForm.name}
                                onChange={(e) =>
                                    setEditForm((p) => ({ ...p, name: e.target.value }))
                                }
                                disabled={isSaving}
                            />
                        </div>

                        <div className="form-cell">
                            <InputField
                                id="edit-max-days"
                                label="Maximum Days Per Request"
                                type="number"
                                min="1"
                                value={editForm.maxDaysPerRequest}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        maxDaysPerRequest: e.target.value,
                                    }))
                                }
                                placeholder="Leave blank for no limit"
                                disabled={isSaving}
                            />
                        </div>

                        <div className="form-cell full-width checkboxes-group">
                            <Checkbox
                                id="edit-alloc-required"
                                checked={editForm.allocationRequired}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        allocationRequired: e.target.checked,
                                    }))
                                }
                                label="Requires Allocation"
                                disabled={isSaving}
                            />

                            <Checkbox
                                id="edit-approval-required"
                                checked={editForm.requestApprovalRequired}
                                onChange={(e) =>
                                    setEditForm((p) => ({
                                        ...p,
                                        requestApprovalRequired: e.target.checked,
                                    }))
                                }
                                label="Request Approval Required"
                                disabled={isSaving}
                            />

                            <Checkbox
                                id="edit-paid"
                                checked={editForm.paidTimeOff}
                                onChange={(e) =>
                                    setEditForm((p) => ({ ...p, paidTimeOff: e.target.checked }))
                                }
                                label="Paid Time Off"
                                disabled={isSaving}
                            />

                            <Checkbox
                                id="edit-active"
                                checked={editForm.isActive}
                                onChange={(e) =>
                                    setEditForm((p) => ({ ...p, isActive: e.target.checked }))
                                }
                                label="Active Policy Rule"
                                disabled={isSaving}
                            />
                        </div>
                    </div>

                    <div className="form-footer">
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setIsEditing(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            isConfirmLoading={isSaving}
                            disabled={isSaving}
                        >
                            <Save size={16} />
                            <span>Save Policy Changes</span>
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
