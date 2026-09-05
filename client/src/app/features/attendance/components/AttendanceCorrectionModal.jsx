import { useState } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import CircularAvatar from '@/components/Shared/DataDisplay/CircularAvatar/CircularAvatar';

const STATUS_OPTIONS = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'LATE', label: 'Late Arrival' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'HALF_DAY', label: 'Half Day' },
    { value: 'MANUAL_CORRECTION', label: 'Manual Correction' },
];

const toDatetimeLocal = (isoString) => {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch {
        return '';
    }
};

function AttendanceCorrectionFormContent({ record, onSave, isSubmitting, onClose }) {
    const [formData, setFormData] = useState(() => ({
        checkInTime: toDatetimeLocal(record?.checkInTime),
        checkOutTime: toDatetimeLocal(record?.checkOutTime),
        status: record?.status || 'PRESENT',
        workedHours: record?.workedHours ? String(record.workedHours) : '',
        correctionReason: record?.correctionReason || '',
        notes: record?.notes || '',
    }));

    const [errors, setErrors] = useState({});

    const handleChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };

            // Auto-calculate worked hours if both in and out exist
            if (
                (field === 'checkInTime' || field === 'checkOutTime') &&
                next.checkInTime &&
                next.checkOutTime
            ) {
                const inTime = new Date(next.checkInTime).getTime();
                const outTime = new Date(next.checkOutTime).getTime();
                if (outTime > inTime) {
                    const diffHours = (outTime - inTime) / (1000 * 60 * 60);
                    next.workedHours = diffHours.toFixed(2);
                }
            }
            return next;
        });

        // Clear error for edited field
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
            const inTime = new Date(formData.checkInTime).getTime();
            const outTime = new Date(formData.checkOutTime).getTime();
            if (outTime <= inTime) {
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

        const payload = {
            correctionReason: formData.correctionReason.trim(),
            status: formData.status,
            notes: formData.notes?.trim() || undefined,
            checkInTime: formData.checkInTime
                ? new Date(formData.checkInTime).toISOString()
                : undefined,
            checkOutTime: formData.checkOutTime
                ? new Date(formData.checkOutTime).toISOString()
                : undefined,
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
                <div
                    className="modal-read-only-banner"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--color-bg-subtle, #f9fafb)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                    }}
                >
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
                    <div
                        style={{ fontSize: '12px', color: 'var(--color-text-secondary, #4b5563)' }}
                    >
                        Date: <strong>{record.attendanceDate}</strong>
                    </div>
                </div>

                {/* Date-time inputs row */}
                <div className="form-inputs-row">
                    <div>
                        <span className="field-label">Check-In Time</span>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={formData.checkInTime}
                            onChange={(e) => handleChange('checkInTime', e.target.value)}
                        />
                        {errors.checkInTime && (
                            <div className="field-error-msg">{errors.checkInTime}</div>
                        )}
                    </div>

                    <div>
                        <span className="field-label">Check-Out Time</span>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={formData.checkOutTime}
                            onChange={(e) => handleChange('checkOutTime', e.target.value)}
                        />
                        {errors.checkOutTime && (
                            <div className="field-error-msg">{errors.checkOutTime}</div>
                        )}
                    </div>
                </div>

                {/* Status & Worked Hours */}
                <div className="form-inputs-row">
                    <div>
                        <span className="field-label">Attendance Status</span>
                        <Dropdown
                            options={STATUS_OPTIONS}
                            value={formData.status}
                            onChange={(val) => handleChange('status', val)}
                        />
                    </div>

                    <div>
                        <InputField
                            id="workedHours"
                            name="workedHours"
                            label="Worked Hours (hrs)"
                            type="number"
                            placeholder="e.g. 8.5"
                            value={formData.workedHours}
                            onChange={(e) => handleChange('workedHours', e.target.value)}
                            error={errors.workedHours}
                        />
                    </div>
                </div>

                {/* Mandatory Audit Reason */}
                <div>
                    <Textarea
                        id="correctionReason"
                        label="Correction Reason (Mandatory Audit Trail)"
                        placeholder="Explain why this record is being manually adjusted (e.g. Biometric device offline, supervisor approved)..."
                        value={formData.correctionReason}
                        onChange={(e) => handleChange('correctionReason', e.target.value)}
                        required
                        error={errors.correctionReason}
                        rows={3}
                    />
                </div>

                {/* Optional Notes */}
                <div>
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
