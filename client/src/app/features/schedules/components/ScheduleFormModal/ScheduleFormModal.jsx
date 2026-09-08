import { useState, useEffect } from 'react';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import Checkbox from '@/components/Shared/Form/Checkbox/Checkbox';
import './ScheduleFormModal.scss';

const TIMEZONE_OPTIONS = [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'America/New_York (EST, UTC-5)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST, UTC-8)' },
    { value: 'Europe/London', label: 'Europe/London (GMT, UTC+0)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET, UTC+1)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT, UTC+11)' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Default Mon–Fri 09:00–17:00, 60-min break
function buildDefaultLines() {
    return DAY_NAMES.map((_, i) => ({
        dayOfWeek: i,
        enabled: i >= 1 && i <= 5,
        startTime: '09:00',
        endTime: '17:00',
        breakMinutes: i >= 1 && i <= 5 ? 60 : 0,
    }));
}

function computeNetHours(startTime, endTime, breakMinutes) {
    try {
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        const totalMins = eh * 60 + em - (sh * 60 + sm) - Number(breakMinutes || 0);
        if (totalMins <= 0) return 0;
        return +(totalMins / 60).toFixed(2);
    } catch {
        return 0;
    }
}

/**
 * ScheduleFormModal
 * Create or Edit a working schedule using only shared components:
 * Dialog, InputField, Textarea, Dropdown, Checkbox
 *
 * Props:
 *  isOpen          {boolean}
 *  onClose         {function}
 *  onSubmit        {function(payload)} — async, called with final payload
 *  initialData     {object|null}       — prefilled data for edit mode
 *  isLoading       {boolean}
 */
function ScheduleFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading = false }) {
    const isEditMode = Boolean(initialData?.id);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [timezone, setTimezone] = useState('Asia/Kolkata');
    const [lines, setLines] = useState(buildDefaultLines());
    const [errors, setErrors] = useState({});

    // Populate form when opening in edit mode
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name || '');
            setDescription(initialData.description || '');
            setTimezone(initialData.timezone || 'Asia/Kolkata');

            // Rebuild lines from existing data
            const base = buildDefaultLines();
            if (Array.isArray(initialData.lines) && initialData.lines.length > 0) {
                const lineMap = {};
                initialData.lines.forEach((l) => {
                    lineMap[l.dayOfWeek] = l;
                });
                const merged = base.map((d) => {
                    const existing = lineMap[d.dayOfWeek];
                    if (existing) {
                        return {
                            dayOfWeek: d.dayOfWeek,
                            enabled: true,
                            startTime: (existing.startTime || '09:00:00').slice(0, 5),
                            endTime: (existing.endTime || '17:00:00').slice(0, 5),
                            breakMinutes: existing.breakMinutes ?? 60,
                        };
                    }
                    return { ...d, enabled: false };
                });
                setLines(merged);
            } else {
                setLines(base);
            }
        } else if (isOpen && !initialData) {
            // Create mode — reset to defaults
            setName('');
            setDescription('');
            setTimezone('Asia/Kolkata');
            setLines(buildDefaultLines());
            setErrors({});
        }
    }, [isOpen, initialData]);
    /* eslint-enable react-hooks/set-state-in-effect */

    function validate() {
        const errs = {};
        if (!name.trim()) errs.name = 'Schedule name is required';
        if (name.trim().length > 100) errs.name = 'Name cannot exceed 100 characters';
        if (!timezone) errs.timezone = 'Timezone is required';

        const enabledLines = lines.filter((l) => l.enabled);
        enabledLines.forEach((l) => {
            if (!l.startTime) errs[`day_${l.dayOfWeek}_start`] = 'Required';
            if (!l.endTime) errs[`day_${l.dayOfWeek}_end`] = 'Required';
            const net = computeNetHours(l.startTime, l.endTime, l.breakMinutes);
            if (net <= 0) errs[`day_${l.dayOfWeek}_net`] = 'End time must be after start + break';
        });

        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    function handleLineChange(dayOfWeek, field, value) {
        setLines((prev) =>
            prev.map((l) => (l.dayOfWeek === dayOfWeek ? { ...l, [field]: value } : l)),
        );
    }

    function handleToggleDay(dayOfWeek) {
        setLines((prev) =>
            prev.map((l) => (l.dayOfWeek === dayOfWeek ? { ...l, enabled: !l.enabled } : l)),
        );
    }

    async function handleConfirm() {
        if (!validate()) return;

        const enabledLines = lines
            .filter((l) => l.enabled)
            .map(({ dayOfWeek, startTime, endTime, breakMinutes }) => ({
                dayOfWeek,
                startTime,
                endTime,
                breakMinutes: Number(breakMinutes) || 0,
            }));

        const payload = {
            name: name.trim(),
            description: description.trim() || undefined,
            timezone,
            lines: enabledLines,
        };

        await onSubmit(payload);
    }

    const totalWeeklyHours = lines
        .filter((l) => l.enabled)
        .reduce((sum, l) => sum + computeNetHours(l.startTime, l.endTime, l.breakMinutes), 0)
        .toFixed(1);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? 'Edit Working Schedule' : 'New Working Schedule'}
            size="lg"
            variant="primary"
            confirmText={isEditMode ? 'Save Changes' : 'Create Schedule'}
            cancelText="Cancel"
            onConfirm={handleConfirm}
            confirmLoading={isLoading}
        >
            <div className="schedule-form-modal">
                {/* ── Metadata Section ── */}
                <section className="schedule-form-modal__section">
                    <h4 className="schedule-form-modal__section-title">Schedule Details</h4>

                    <InputField
                        id="schedule-name"
                        name="name"
                        label="Schedule Name *"
                        placeholder="e.g. Standard 40h Office Shift"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={errors.name}
                        disabled={isLoading}
                    />

                    <Textarea
                        id="schedule-description"
                        label="Description"
                        placeholder="Briefly describe this schedule (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={300}
                        autoResize
                        disabled={isLoading}
                    />

                    <Dropdown
                        label="Timezone *"
                        placeholder="Select timezone"
                        options={TIMEZONE_OPTIONS}
                        value={timezone}
                        onChange={(val) => setTimezone(val)}
                        error={errors.timezone}
                        searchable
                        disabled={isLoading}
                    />
                </section>

                {/* ── Shift Lines Section ── */}
                <section className="schedule-form-modal__section">
                    <div className="schedule-form-modal__lines-header">
                        <h4 className="schedule-form-modal__section-title">Daily Shift Lines</h4>
                        <span className="schedule-form-modal__weekly-total">
                            Total: <strong>{totalWeeklyHours}h</strong> / week
                        </span>
                    </div>

                    <div className="schedule-form-modal__lines-grid">
                        {/* Column headers */}
                        <div className="schedule-form-modal__lines-col-headers">
                            <span className="col-day">Day</span>
                            <span className="col-start">Start</span>
                            <span className="col-end">End</span>
                            <span className="col-break">Break (min)</span>
                            <span className="col-net">Net hrs</span>
                        </div>

                        {lines.map((line) => {
                            const netHrs = line.enabled
                                ? computeNetHours(line.startTime, line.endTime, line.breakMinutes)
                                : 0;
                            const hasNetErr = errors[`day_${line.dayOfWeek}_net`];

                            return (
                                <div
                                    key={line.dayOfWeek}
                                    className={`schedule-form-modal__line-row ${line.enabled ? 'is-enabled' : 'is-disabled'}`}
                                >
                                    {/* Day toggle */}
                                    <Checkbox
                                        id={`day-toggle-${line.dayOfWeek}`}
                                        checked={line.enabled}
                                        onChange={() => handleToggleDay(line.dayOfWeek)}
                                        label={DAY_NAMES[line.dayOfWeek]}
                                        disabled={isLoading}
                                    />

                                    {/* Start time */}
                                    <input
                                        type="time"
                                        className={`schedule-form-modal__time-input ${errors[`day_${line.dayOfWeek}_start`] ? 'has-error' : ''}`}
                                        value={line.startTime}
                                        onChange={(e) =>
                                            handleLineChange(
                                                line.dayOfWeek,
                                                'startTime',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!line.enabled || isLoading}
                                        aria-label={`${DAY_NAMES[line.dayOfWeek]} start time`}
                                    />

                                    {/* End time */}
                                    <input
                                        type="time"
                                        className={`schedule-form-modal__time-input ${errors[`day_${line.dayOfWeek}_end`] ? 'has-error' : ''}`}
                                        value={line.endTime}
                                        onChange={(e) =>
                                            handleLineChange(
                                                line.dayOfWeek,
                                                'endTime',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!line.enabled || isLoading}
                                        aria-label={`${DAY_NAMES[line.dayOfWeek]} end time`}
                                    />

                                    {/* Break minutes */}
                                    <input
                                        type="number"
                                        className="schedule-form-modal__number-input"
                                        value={line.breakMinutes}
                                        min={0}
                                        max={480}
                                        onChange={(e) =>
                                            handleLineChange(
                                                line.dayOfWeek,
                                                'breakMinutes',
                                                e.target.value,
                                            )
                                        }
                                        disabled={!line.enabled || isLoading}
                                        aria-label={`${DAY_NAMES[line.dayOfWeek]} break minutes`}
                                    />

                                    {/* Net hours computed */}
                                    <span
                                        className={`schedule-form-modal__net-hrs ${hasNetErr ? 'is-error' : netHrs > 0 ? 'is-valid' : ''}`}
                                        title={hasNetErr || ''}
                                    >
                                        {line.enabled ? (hasNetErr ? '!' : `${netHrs}h`) : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </Dialog>
    );
}

export default ScheduleFormModal;
