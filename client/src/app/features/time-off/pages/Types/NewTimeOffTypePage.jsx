import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Checkbox from '@/components/Shared/Form/Checkbox/Checkbox';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './NewTimeOffTypePage.scss';

export default function NewTimeOffTypePage() {
    const navigate = useNavigate();
    const { roleSegment, triggerRefresh } = useTimeOff();

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [allocationRequired, setAllocationRequired] = useState(true);
    const [requestApprovalRequired, setRequestApprovalRequired] = useState(true);
    const [paidTimeOff, setPaidTimeOff] = useState(true);
    const [maxDaysPerRequest, setMaxDaysPerRequest] = useState('10');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Please provide a leave type name.');
            return;
        }
        if (!code.trim()) {
            setError('Please provide a unique code (e.g. ANNUAL, SICK, VACATION).');
            return;
        }

        const parsedMaxDays = maxDaysPerRequest ? parseInt(maxDaysPerRequest, 10) : null;
        if (parsedMaxDays !== null && (isNaN(parsedMaxDays) || parsedMaxDays <= 0)) {
            setError('Max days per request must be a valid positive integer.');
            return;
        }

        setIsSubmitting(true);
        try {
            await timeOffApi.createTimeOffType({
                name: name.trim(),
                code: code.trim().toUpperCase(),
                allocationRequired,
                requestApprovalRequired,
                paidTimeOff,
                maxDaysPerRequest: parsedMaxDays,
            });
            triggerRefresh();
            navigate(`/dashboard/${roleSegment}/time-off/types`);
        } catch (err) {
            console.error('[NewTimeOffTypePage] Creation failed:', err);
            setError(
                err?.response?.data?.message || err?.message || 'Failed to create time off type',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="new-time-off-type-page">
            {/* Header section */}
            <div className="form-page-header">
                <div className="header-left">
                    <Button
                        variant="plain"
                        size="sm"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/types`)}
                        className="back-btn"
                    >
                        <ArrowLeft size={16} />
                        <span>Time Off Types</span>
                    </Button>
                    <div className="header-titles">
                        <h1 className="page-title">Create Time Off Type</h1>
                        <span className="page-subtitle">
                            Configure a new leave policy rule, allocation requirement, and approval
                            workflow
                        </span>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="danger">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Form Card */}
            <form onSubmit={handleSubmit} className="type-form-card">
                <div className="form-grid">
                    <div className="form-cell">
                        <InputField
                            id="type-name"
                            label="Type Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Annual Paid Vacation"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-cell">
                        <InputField
                            id="type-code"
                            label="Unique Code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. ANNUAL"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-cell">
                        <InputField
                            id="max-days"
                            label="Maximum Days Per Request (Optional)"
                            type="number"
                            min="1"
                            value={maxDaysPerRequest}
                            onChange={(e) => setMaxDaysPerRequest(e.target.value)}
                            placeholder="e.g. 10 (leave empty for unlimited)"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-cell checkboxes-group full-width">
                        <h3 className="group-title">Policy & Approval Rules</h3>
                        <div className="checkbox-items">
                            <Checkbox
                                id="alloc-required"
                                checked={allocationRequired}
                                onChange={(e) => setAllocationRequired(e.target.checked)}
                                label="Requires Allocation (Employee must have an approved quota before requesting)"
                                disabled={isSubmitting}
                            />

                            <Checkbox
                                id="approval-required"
                                checked={requestApprovalRequired}
                                onChange={(e) => setRequestApprovalRequired(e.target.checked)}
                                label="Request Approval Required (Requests must be reviewed by HR/Manager)"
                                disabled={isSubmitting}
                            />

                            <Checkbox
                                id="paid-time-off"
                                checked={paidTimeOff}
                                onChange={(e) => setPaidTimeOff(e.target.checked)}
                                label="Paid Time Off (Classified as compensated leave in payroll calculation)"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-footer">
                    <Button
                        variant="outline"
                        size="md"
                        type="button"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/types`)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        size="md"
                        type="submit"
                        disabled={isSubmitting || !name.trim() || !code.trim()}
                        isConfirmLoading={isSubmitting}
                        className="submit-btn"
                    >
                        <Send size={16} />
                        <span>Create Leave Type</span>
                    </Button>
                </div>
            </form>
        </div>
    );
}
