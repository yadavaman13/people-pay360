import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Send } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import { fetchEmployees } from '@/app/features/employees/services/employee.api';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import InputField from '@/components/Shared/Form/InputField/InputField';
import DatePicker from '@/components/Shared/Form/DatePicker/DatePicker';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './NewAllocationPage.scss';

export default function NewAllocationPage() {
    const navigate = useNavigate();
    const { roleSegment, types, triggerRefresh } = useTimeOff();

    // Form fields
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [totalDays, setTotalDays] = useState('15');
    const [validityStart, setValidityStart] = useState(() => {
        const year = new Date().getFullYear();
        return `${year}-01-01`;
    });
    const [validityEnd, setValidityEnd] = useState(() => {
        const year = new Date().getFullYear();
        return `${year}-12-31`;
    });
    const [notes, setNotes] = useState('');

    // Employee options
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Submission & error states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Load active employees list
    useEffect(() => {
        let isMounted = true;
        async function loadEmployees() {
            try {
                setLoadingEmployees(true);
                const res = await fetchEmployees({ limit: 100, isActive: true });
                if (isMounted) {
                    const emps = res?.data?.employees || (Array.isArray(res?.data) ? res.data : []);
                    const options = emps.map((emp) => ({
                        value: emp.id,
                        label: `${emp.firstName || ''} ${emp.lastName || ''} (${emp.employeeCode || emp.email})`.trim(),
                    }));
                    setEmployeeOptions(options);
                    if (options.length > 0 && !selectedEmployeeId) {
                        setSelectedEmployeeId(options[0].value);
                    }
                }
            } catch (err) {
                console.error('[NewAllocationPage] Error loading employees:', err);
            } finally {
                if (isMounted) setLoadingEmployees(false);
            }
        }
        loadEmployees();
        return () => {
            isMounted = false;
        };
    }, []);

    // Time off types dropdown options (only types requiring allocation or all types)
    const typeOptions = useMemo(() => {
        return (types || []).map((t) => ({
            value: t.id,
            label: `${t.name} (${t.paidTimeOff ? 'Paid' : 'Unpaid'})`,
        }));
    }, [types]);

    // Auto-select first leave type once loaded
    useEffect(() => {
        if (!selectedTypeId && typeOptions.length > 0) {
            setSelectedTypeId(typeOptions[0].value);
        }
    }, [typeOptions, selectedTypeId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!selectedEmployeeId) {
            setError('Please select an employee.');
            return;
        }
        if (!selectedTypeId) {
            setError('Please select a leave type.');
            return;
        }
        const parsedDays = parseFloat(totalDays);
        if (isNaN(parsedDays) || parsedDays <= 0) {
            setError('Allocated days must be a positive number.');
            return;
        }
        if (!validityStart || !validityEnd) {
            setError('Please provide both validity start and end dates.');
            return;
        }
        if (validityStart > validityEnd) {
            setError('Validity start date cannot be after validity end date.');
            return;
        }

        setIsSubmitting(true);
        try {
            await timeOffApi.createAllocation({
                employeeId: selectedEmployeeId,
                typeId: selectedTypeId,
                totalDays: String(parsedDays),
                validityStart,
                validityEnd,
                notes: notes.trim() || undefined,
            });
            triggerRefresh();
            navigate(`/dashboard/${roleSegment}/time-off/allocations`);
        } catch (err) {
            console.error('[NewAllocationPage] Submission failed:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to create allocation');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="new-allocation-page">
            {/* Header section */}
            <div className="form-page-header">
                <div className="header-left">
                    <Button
                        variant="plain"
                        size="sm"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/allocations`)}
                        className="back-btn"
                    >
                        <ArrowLeft size={16} />
                        <span>Allocations</span>
                    </Button>
                    <div className="header-titles">
                        <h1 className="page-title">Create Leave Allocation</h1>
                        <span className="page-subtitle">
                            Grant leave balance quota to an employee (created in Pending status
                            until approved)
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
            <form onSubmit={handleSubmit} className="allocation-form-card">
                <div className="form-grid">
                    <div className="form-cell full-width">
                        <Dropdown
                            label="Employee"
                            options={employeeOptions}
                            value={selectedEmployeeId}
                            onChange={setSelectedEmployeeId}
                            placeholder={
                                loadingEmployees ? 'Loading employees...' : 'Select Employee'
                            }
                            disabled={loadingEmployees || isSubmitting}
                        />
                    </div>

                    <div className="form-cell">
                        <Dropdown
                            label="Time Off Type"
                            options={typeOptions}
                            value={selectedTypeId}
                            onChange={setSelectedTypeId}
                            placeholder="Select Leave Type"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-cell">
                        <InputField
                            id="allocated-days"
                            label="Allocated Days"
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={totalDays}
                            onChange={(e) => setTotalDays(e.target.value)}
                            placeholder="e.g. 20"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-cell">
                        <DatePicker
                            label="Validity Start"
                            value={validityStart}
                            onChange={setValidityStart}
                            placeholder="YYYY-MM-DD"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-cell">
                        <DatePicker
                            label="Validity End"
                            value={validityEnd}
                            onChange={setValidityEnd}
                            placeholder="YYYY-MM-DD"
                            min={validityStart || undefined}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-cell full-width">
                        <label className="input-label-preview">Notes / Description</label>
                        <Textarea
                            placeholder="e.g. Annual leave quota granted for FY2026."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                <div className="form-footer">
                    <Button
                        variant="outline"
                        size="md"
                        type="button"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/allocations`)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        size="md"
                        type="submit"
                        disabled={
                            isSubmitting || !selectedEmployeeId || !selectedTypeId || !totalDays
                        }
                        isConfirmLoading={isSubmitting}
                        className="submit-btn"
                    >
                        <Send size={16} />
                        <span>Create Allocation</span>
                    </Button>
                </div>
            </form>
        </div>
    );
}
