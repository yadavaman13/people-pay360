import { useState, useMemo } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog';
import Calendar from '@/components/Shared/Form/Calendar/Calendar';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import CircularAvatar from '@/components/Shared/DataDisplay/CircularAvatar/CircularAvatar';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { Calendar as CalendarIcon } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'LATE', label: 'Late Arrival' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'HALF_DAY', label: 'Half Day' },
    { value: 'MANUAL_CORRECTION', label: 'Manual Correction' },
];

/**
 * Extracts 24h 'HH:mm' time string from ISO timestamp
 */
const toTimeString = (isoString) => {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    } catch {
        return '';
    }
};

function AttendanceCorrectionFormContent({ record, onSave, isSubmitting, onClose }) {
    // Determine initial date from attendanceDate or checkInTime
    const [selectedDate, setSelectedDate] = useState(() => {
        if (record?.attendanceDate) {
            const parts = String(record.attendanceDate).split('-');
            if (parts.length === 3) {
                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            }
        }
        if (record?.checkInTime) {
            const d = new Date(record.checkInTime);
            if (!isNaN(d.getTime())) return d;
        }
        return new Date();
    });

    const [formData, setFormData] = useState(() => ({
        checkInTime: toTimeString(record?.checkInTime),
        checkOutTime: toTimeString(record?.checkOutTime),
        status: record?.status || 'PRESENT',
        workedHours: record?.workedHours ? String(record.workedHours) : '',
        correctionReason: record?.correctionReason || '',
        notes: record?.notes || '',
    }));

    const [errors, setErrors] = useState({});

    const formattedDateDisplay = useMemo(() => {
        return selectedDate.toLocaleDateString('en-US', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    }, [selectedDate]);

    const dateIsoString = useMemo(() => {
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, [selectedDate]);

    const handleDateSelect = (date) => {
        setSelectedDate(date);
    };

    const handleTimeChange = (field, timeVal) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: timeVal };
            const inTime = field === 'checkInTime' ? timeVal : next.checkInTime;
            const outTime = field === 'checkOutTime' ? timeVal : next.checkOutTime;

            if (inTime && outTime) {
                const [inH, inM] = inTime.split(':').map(Number);
                const [outH, outM] = outTime.split(':').map(Number);
                const diffMins = outH * 60 + outM - (inH * 60 + inM);
                if (diffMins > 0) {
                    next.workedHours = (diffMins / 60).toFixed(2);
                }
            }
            return next;
        });

        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const errs = {};

        if (!formData.correctionReason || formData.correctionReason.trim().length < 5) {
            errs.correctionReason = 'Correction reason is mandatory (minimum 5 characters)';
        }

        if (formData.checkInTime && formData.checkOutTime) {
            const [inH, inM] = formData.checkInTime.split(':').map(Number);
            const [outH, outM] = formData.checkOutTime.split(':').map(Number);
            if (outH * 60 + outM <= inH * 60 + inM) {
                errs.checkOutTime = 'Check-out time must be chronologically after check-in time';
            }
        }

        if (formData.workedHours !== '') {
            const hrs = parseFloat(formData.workedHours);
            if (isNaN(hrs) || hrs < 0 || hrs > 24) {
                errs.workedHours = 'Worked hours must be a valid number between 0 and 24';
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleConfirm = async () => {
        if (!validate()) return;

        const buildIso = (baseDate, timeStr) => {
            if (!timeStr) return undefined;
            const [hh, mm] = timeStr.split(':').map(Number);
            const d = new Date(baseDate);
            d.setHours(hh, mm, 0, 0);
            return d.toISOString();
        };

        const payload = {
            correctionReason: formData.correctionReason.trim(),
            status: formData.status,
            notes: formData.notes?.trim() || undefined,
            checkInTime: buildIso(selectedDate, formData.checkInTime),
            checkOutTime: buildIso(selectedDate, formData.checkOutTime),
            workedHours: formData.workedHours !== '' ? parseFloat(formData.workedHours) : undefined,
        };

        await onSave(record.id, payload);
    };

    const emp = record.employee || {};
    const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';

    return (
        <Dialog
            isOpen={true}
            onClose={onClose}
            title={`Manual Attendance Correction — ${empName}`}
            variant="primary"
            size="lg"
            confirmText="Save Correction"
            cancelText="Cancel"
            onConfirm={handleConfirm}
            confirmLoading={isSubmitting}
            confirmDisabled={isSubmitting}
        >
            <div className="attendance-correction-form">
                {/* Read-only metadata banner */}
                <div className="modal-read-only-banner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CircularAvatar src={emp.profileImage} name={empName} size="md" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span
                                style={{
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    color: 'var(--color-text-primary, #111827)',
                                }}
                            >
                                {empName}
                            </span>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: 'var(--color-text-secondary, #6b7280)',
                                }}
                            >
                                {emp.employeeCode || 'N/A'} • {emp.email || ''}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            style={{
                                fontSize: '12px',
                                color: 'var(--color-text-secondary, #4b5563)',
                            }}
                        >
                            Record Date:
                        </span>
                        <Badge variant="neutral" size="sm">
                            {dateIsoString}
                        </Badge>
                    </div>
                </div>

                {/* Main Content: Calendar Widget on Left, Form Inputs on Right */}
                <div className="modal-content-grid">
                    {/* Left Column: Pre-Built Calendar Component */}
                    <div className="modal-calendar-panel">
                        <div className="calendar-panel-header">
                            <div className="calendar-panel-title">
                                <CalendarIcon
                                    size={15}
                                    style={{ color: 'var(--color-primary, #3b82f6)' }}
                                />
                                <span>Attendance Date</span>
                            </div>
                            <Badge variant="primary" size="sm">
                                {formattedDateDisplay}
                            </Badge>
                        </div>

                        <div className="calendar-widget-container">
                            <Calendar
                                selectedDate={selectedDate}
                                onSelectDate={handleDateSelect}
                                showCard={false}
                                maxDate={new Date()}
                                eventDates={[]}
                            />
                        </div>

                        <div className="calendar-panel-hint">
                            Selected: <strong>{formattedDateDisplay}</strong>
                        </div>
                    </div>

                    {/* Right Column: Time, Status, Hours, Audit Reason */}
                    <div className="modal-fields-panel">
                        {/* Check-In & Check-Out Time */}
                        <div className="form-inputs-row">
                            <InputField
                                id="checkInTime"
                                name="checkInTime"
                                label="Check-In Time"
                                type="time"
                                value={formData.checkInTime}
                                onChange={(e) => handleTimeChange('checkInTime', e.target.value)}
                                error={errors.checkInTime}
                            />

                            <InputField
                                id="checkOutTime"
                                name="checkOutTime"
                                label="Check-Out Time"
                                type="time"
                                value={formData.checkOutTime}
                                onChange={(e) => handleTimeChange('checkOutTime', e.target.value)}
                                error={errors.checkOutTime}
                            />
                        </div>

                        {/* Status & Worked Hours */}
                        <div className="form-inputs-row">
                            <div>
                                <label className="field-label">Attendance Status</label>
                                <Dropdown
                                    options={STATUS_OPTIONS}
                                    value={formData.status}
                                    onChange={(val) => handleChange('status', val)}
                                />
                            </div>

                            <InputField
                                id="workedHours"
                                name="workedHours"
                                label="Worked Hours (hrs)"
                                type="number"
                                step="0.25"
                                placeholder="e.g. 8.5"
                                value={formData.workedHours}
                                onChange={(e) => handleChange('workedHours', e.target.value)}
                                error={errors.workedHours}
                            />
                        </div>

                        {/* Mandatory Audit Reason */}
                        <Textarea
                            id="correctionReason"
                            label="Correction Reason (Mandatory Audit Trail) *"
                            placeholder="Explain why this record is being manually adjusted (e.g. Biometric device offline, supervisor approved)..."
                            value={formData.correctionReason}
                            onChange={(e) => handleChange('correctionReason', e.target.value)}
                            required
                            error={errors.correctionReason}
                            rows={3}
                        />

                        {/* Optional Notes */}
                        <InputField
                            id="notes"
                            name="notes"
                            label="Supervisor Notes (Optional)"
                            placeholder="Additional notes or references..."
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default function AttendanceCorrectionModal({
    isOpen = false,
    onClose,
    record,
    onSave,
    isSubmitting = false,
}) {
    if (!isOpen || !record) return null;

    return (
        <AttendanceCorrectionFormContent
            key={record.id}
            record={record}
            onSave={onSave}
            isSubmitting={isSubmitting}
            onClose={onClose}
        />
    );
}
