import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Info, AlertTriangle, Send } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import { fetchEmployees } from '@/app/features/employees/services/employee.api';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import DatePicker from '@/components/Shared/Form/DatePicker/DatePicker';
import {
    parseStringToDate,
    formatDateToString,
} from '@/components/Shared/Form/DatePicker/subcomponents/dateUtils';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './NewTimeOffRequestPage.scss';

// Helper to get today at 00:00:00
function getTodayDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// Helper to get tomorrow at 00:00:00
function getTomorrowDate() {
    const d = getTodayDate();
    d.setDate(d.getDate() + 1);
    return d;
}

// Calculate business days (Monday-Friday) strictly between startDate and endDate
function calculateBusinessDays(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return 0;
    const start = parseStringToDate(startDateStr);
    const end = parseStringToDate(endDateStr);
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (end < start) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

// Convert any date string (DD-MM-YYYY or YYYY-MM-DD) to ISO YYYY-MM-DD for backend API
function toIsoDate(dateStr) {
    if (!dateStr) return '';
    const d = parseStringToDate(dateStr);
    if (!d || isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function NewTimeOffRequestPage() {
    const navigate = useNavigate();
    const { isHR, roleSegment, types, balances, triggerRefresh } = useTimeOff();

    // Form fields
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // Dynamic Employee list for HR
    const [employeeOptions, setEmployeeOptions] = useState([]);
    const [employeeBalances, setEmployeeBalances] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Submission & validation state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Minimum start date string (Tomorrow formatted DD-MM-YYYY)
    const minStartDateFormatted = useMemo(() => {
        return formatDateToString(getTomorrowDate());
    }, []);

    // Minimum end date string (startDate formatted DD-MM-YYYY)
    const minEndDateFormatted = useMemo(() => {
        if (!startDate) return '';
        const startD = parseStringToDate(startDate);
        if (!startD || isNaN(startD.getTime())) return '';
        return startDate;
    }, [startDate]);

    // Handle Start Date change with automatic End Date invalidation
    const handleStartDateChange = useCallback((newStartDateStr) => {
        setStartDate(newStartDateStr);

        if (!newStartDateStr) {
            setEndDate('');
            return;
        }

        // If End Date is already set, check if End Date < new Start Date
        setEndDate((prevEndDate) => {
            if (!prevEndDate) return '';
            const startD = parseStringToDate(newStartDateStr);
            const endD = parseStringToDate(prevEndDate);
            if (startD && endD) {
                startD.setHours(0, 0, 0, 0);
                endD.setHours(0, 0, 0, 0);
                if (endD < startD) {
                    return ''; // Clear invalid End Date!
                }
            }
            return prevEndDate;
        });
    }, []);

    // If HR, load employee roster for employee picker
    useEffect(() => {
        if (!isHR) return;
        let isMounted = true;
        async function loadEmployeesList() {
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
                    if (options.length > 0) {
                        setSelectedEmployeeId((prev) => prev || options[0].value);
                    }
                }
            } catch (err) {
                console.error('[NewTimeOffRequestPage] Error fetching employees:', err);
            } finally {
                if (isMounted) setLoadingEmployees(false);
            }
        }
        loadEmployeesList();
        return () => {
            isMounted = false;
        };
    }, [isHR]);

    // When HR changes selectedEmployeeId, fetch that employee's leave balance
    useEffect(() => {
        if (!isHR || !selectedEmployeeId) {
            setEmployeeBalances([]);
            return;
        }
        let isMounted = true;
        async function loadSelectedEmployeeBalance() {
            try {
                const res = await timeOffApi.fetchLeaveBalance(selectedEmployeeId);
                if (isMounted) {
                    setEmployeeBalances(res?.data || []);
                }
            } catch (err) {
                console.error('[NewTimeOffRequestPage] Error fetching balance:', err);
            }
        }
        loadSelectedEmployeeBalance();
        return () => {
            isMounted = false;
        };
    }, [isHR, selectedEmployeeId]);

    // Dropdown options for Time Off Types
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

    // Selected Type metadata
    const selectedType = useMemo(() => {
        return types.find((t) => t.id === selectedTypeId);
    }, [types, selectedTypeId]);

    // Active balances pool (user's own balances if employee, or selected employee's if HR)
    const effectiveBalances = isHR ? employeeBalances : balances;

    // Remaining balance for selected type
    const availableBalanceInfo = useMemo(() => {
        if (!selectedType) return null;
        if (!selectedType.allocationRequired) {
            return { required: false, text: 'No allocation required' };
        }
        const match = effectiveBalances.find(
            (b) => b.typeId === selectedType.id || b.typeName === selectedType.name,
        );
        const remaining = match ? Number(match.remainingDays || 0) : 0;
        return {
            required: true,
            remaining,
            text: `${remaining} Days Remaining`,
        };
    }, [selectedType, effectiveBalances]);

    // Single source of truth boolean validations
    const isValidStartDate = useMemo(() => {
        if (!startDate) return false;
        const startD = parseStringToDate(startDate);
        if (!startD || isNaN(startD.getTime())) return false;
        startD.setHours(0, 0, 0, 0);
        return startD >= getTomorrowDate();
    }, [startDate]);

    const isValidEndDate = useMemo(() => {
        if (!startDate || !endDate) return false;
        const startD = parseStringToDate(startDate);
        const endD = parseStringToDate(endDate);
        if (!startD || !endD || isNaN(startD.getTime()) || isNaN(endD.getTime())) return false;
        startD.setHours(0, 0, 0, 0);
        endD.setHours(0, 0, 0, 0);
        return endD >= startD;
    }, [startDate, endDate]);

    const canCalculateDuration = isValidStartDate && isValidEndDate;

    // Auto-calculated duration in business days (null when dates are invalid or incomplete)
    const durationDays = useMemo(() => {
        if (!canCalculateDuration) return null;
        return calculateBusinessDays(startDate, endDate);
    }, [canCalculateDuration, startDate, endDate]);

    // Validation priority order (1. Start Date -> 2. Start Date >= tomorrow -> 3. End Date -> 4. End Date > Start Date -> 5. Duration -> 6. Leave Type -> 7. Balance)
    const validationError = useMemo(() => {
        // 1. Start Date exists
        if (!startDate) {
            return null; // Don't show premature warning before user interacts
        }
        const startD = parseStringToDate(startDate);
        if (!startD || isNaN(startD.getTime())) {
            return 'Please enter a valid start date.';
        }
        startD.setHours(0, 0, 0, 0);

        // 2. Start Date >= tomorrow
        if (startD < getTomorrowDate()) {
            return 'Leave start date must be from tomorrow onwards.';
        }

        // 3. End Date exists
        if (!endDate) {
            return null; // Waiting for user to select end date
        }
        const endD = parseStringToDate(endDate);
        if (!endD || isNaN(endD.getTime())) {
            return 'Please enter a valid end date.';
        }
        endD.setHours(0, 0, 0, 0);

        // 4. End Date >= Start Date
        if (endD < startD) {
            return 'End date cannot be before start date.';
        }

        // 5. Calculate business-day duration
        const days = calculateBusinessDays(startDate, endDate);
        if (days <= 0) {
            return 'The selected date range contains 0 business days (all selected dates fall on weekends).';
        }

        // 6. Validate leave type
        if (!selectedTypeId) {
            return 'Please select a leave type.';
        }

        // 7. Validate allocation/balance
        if (availableBalanceInfo?.required && days > availableBalanceInfo.remaining) {
            return `Insufficient leave balance. Available: ${availableBalanceInfo.remaining} days, Requested: ${days} days.`;
        }

        if (selectedType?.maxDaysPerRequest && days > selectedType.maxDaysPerRequest) {
            return `Maximum allowed per request for ${selectedType.name} is ${selectedType.maxDaysPerRequest} days (requested: ${days} days).`;
        }

        return null;
    }, [startDate, endDate, selectedTypeId, availableBalanceInfo, selectedType]);

    // Submission readiness
    const canSubmit = useMemo(() => {
        return (
            Boolean(selectedTypeId) &&
            Boolean(startDate) &&
            Boolean(endDate) &&
            canCalculateDuration &&
            durationDays !== null &&
            durationDays > 0 &&
            !validationError &&
            (!availableBalanceInfo?.required || durationDays <= availableBalanceInfo.remaining) &&
            (!selectedType?.maxDaysPerRequest || durationDays <= selectedType.maxDaysPerRequest) &&
            (!isHR || Boolean(selectedEmployeeId))
        );
    }, [
        selectedTypeId,
        startDate,
        endDate,
        canCalculateDuration,
        durationDays,
        validationError,
        availableBalanceInfo,
        selectedType,
        isHR,
        selectedEmployeeId,
    ]);

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Priority validation guards
        if (!startDate) {
            setError('Please select a start date.');
            return;
        }
        if (!isValidStartDate) {
            setError('Leave start date must be from tomorrow onwards.');
            return;
        }
        if (!endDate) {
            setError('Please select an end date.');
            return;
        }
        if (!isValidEndDate) {
            setError('End date cannot be before start date.');
            return;
        }
        if (!canCalculateDuration || durationDays === null || durationDays <= 0) {
            setError('The selected date range contains 0 business days.');
            return;
        }
        if (!selectedTypeId) {
            setError('Please select a leave type.');
            return;
        }
        if (availableBalanceInfo?.required && durationDays > availableBalanceInfo.remaining) {
            setError(
                `Insufficient leave balance. Available: ${availableBalanceInfo.remaining} days, Requested: ${durationDays} days.`,
            );
            return;
        }
        if (selectedType?.maxDaysPerRequest && durationDays > selectedType.maxDaysPerRequest) {
            setError(
                `Maximum allowed per request for ${selectedType.name} is ${selectedType.maxDaysPerRequest} days (requested: ${durationDays} days).`,
            );
            return;
        }
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                typeId: selectedTypeId,
                startDate: toIsoDate(startDate),
                endDate: toIsoDate(endDate),
                numberOfDays: String(durationDays),
                reason: reason.trim() || undefined,
            };

            if (isHR && selectedEmployeeId) {
                payload.employeeId = selectedEmployeeId;
            }

            await timeOffApi.createRequest(payload);
            triggerRefresh();
            navigate(`/dashboard/${roleSegment}/time-off/requests`);
        } catch (err) {
            console.error('[NewTimeOffRequestPage] Submission failed:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="new-time-off-request-page">
            {/* Header section */}
            <div className="form-page-header">
                <div className="header-left">
                    <Button
                        variant="plain"
                        size="sm"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/requests`)}
                        className="back-btn"
                    >
                        <ArrowLeft size={16} />
                        <span>Requests</span>
                    </Button>
                    <div className="header-titles">
                        <h1 className="page-title">Create Time Off Request</h1>
                        <span className="page-subtitle">
                            {isHR
                                ? 'Submit a leave request on behalf of an employee'
                                : 'Submit a new leave request for manager review and balance deduction'}
                        </span>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="danger">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Main Form Card */}
            <form onSubmit={handleSubmit} className="request-form-card">
                <div className="form-grid">
                    {/* Employee picker for HR */}
                    {isHR && (
                        <div className="form-cell full-width">
                            <Dropdown
                                label="Employee"
                                options={employeeOptions}
                                value={selectedEmployeeId}
                                onChange={setSelectedEmployeeId}
                                placeholder={
                                    loadingEmployees
                                        ? 'Loading employee roster...'
                                        : 'Select Employee'
                                }
                                disabled={loadingEmployees || isSubmitting}
                            />
                        </div>
                    )}

                    {/* Time Off Type selection */}
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

                    {/* Live balance indicator */}
                    <div className="form-cell">
                        <label className="input-label-preview">Available Balance</label>
                        <div
                            className={`balance-preview-box ${availableBalanceInfo?.required ? 'with-quota' : ''}`}
                        >
                            <Info size={16} className="info-icon" />
                            <span>{availableBalanceInfo?.text || 'Select a leave type'}</span>
                        </div>
                    </div>

                    {/* Date Pickers */}
                    <div className="form-cell">
                        <DatePicker
                            label="Start Date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            placeholder="Select Start Date"
                            min={minStartDateFormatted}
                            minDate={minStartDateFormatted}
                            disabled={isSubmitting}
                        />
                        <div className="datepicker-hint">Minimum date: {minStartDateFormatted}</div>
                    </div>

                    <div className="form-cell">
                        <DatePicker
                            label="End Date"
                            value={endDate}
                            onChange={setEndDate}
                            placeholder={!startDate ? 'Select start date first' : 'Select End Date'}
                            min={minEndDateFormatted}
                            minDate={minEndDateFormatted}
                            disabled={isSubmitting || !startDate}
                        />
                        {startDate && minEndDateFormatted && (
                            <div className="datepicker-hint">
                                Minimum date: {minEndDateFormatted}
                            </div>
                        )}
                    </div>

                    {/* Duration Preview */}
                    <div className="form-cell full-width">
                        <div className="duration-banner">
                            <Calendar size={18} />
                            {canCalculateDuration && durationDays !== null && durationDays > 0 ? (
                                <span>
                                    Calculated Duration:{' '}
                                    <strong>
                                        {durationDays} Business Day{durationDays === 1 ? '' : 's'}
                                    </strong>{' '}
                                    (excludes weekends)
                                </span>
                            ) : (
                                <span className="duration-placeholder">
                                    Calculated Duration: <strong>—</strong>{' '}
                                    <span className="duration-hint-sub">
                                        (Select valid dates to calculate duration)
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Validation alerts if any */}
                    {validationError && (
                        <div className="form-cell full-width">
                            <div className="validation-warning-box">
                                <AlertTriangle size={18} className="warn-icon" />
                                <div>{validationError}</div>
                            </div>
                        </div>
                    )}

                    {/* Reason Textarea */}
                    <div className="form-cell full-width">
                        <label className="input-label-preview">Reason / Description</label>
                        <Textarea
                            placeholder="Explain the purpose of your time off request..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="form-footer">
                    <Button
                        variant="outline"
                        size="md"
                        type="button"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/requests`)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="primary"
                        size="md"
                        type="submit"
                        disabled={isSubmitting || !canSubmit}
                        isConfirmLoading={isSubmitting}
                        className="submit-btn"
                    >
                        <Send size={16} />
                        <span>Submit Request</span>
                    </Button>
                </div>
            </form>
        </div>
    );
}
