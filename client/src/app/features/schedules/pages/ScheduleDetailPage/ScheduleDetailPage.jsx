import { useEffect, useContext, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { SchedulesContext } from '../../context/SchedulesContext';
import { useSchedules } from '../../hooks/useSchedules';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import { Card, CardContent } from '@/components/Shared/DataDisplay/Card/Card';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Checkbox from '@/components/Shared/Form/Checkbox/Checkbox';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import ScheduleFormModal from '../../components/ScheduleFormModal/ScheduleFormModal';
import {
    ArrowLeft,
    CalendarClock,
    Clock,
    Globe,
    Pencil,
    Trash2,
    Save,
    RefreshCw,
} from 'lucide-react';
import './ScheduleDetailPage.scss';

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computeNetHours(startTime, endTime, breakMinutes) {
    try {
        const [sh, sm] = (startTime || '').split(':').map(Number);
        const [eh, em] = (endTime || '').split(':').map(Number);
        const totalMins = eh * 60 + em - (sh * 60 + sm) - Number(breakMinutes || 0);
        if (isNaN(totalMins) || totalMins <= 0) return 0;
        return +(totalMins / 60).toFixed(2);
    } catch {
        return 0;
    }
}

function formatTime(timeStr) {
    if (!timeStr) return '—';
    return timeStr.slice(0, 5); // "HH:mm" from "HH:mm:ss"
}

/**
 * SCR-SCH-002: Working Schedule Detail Page
 * - All roles: view schedule metadata + shift lines grid
 * - HR/Admin only: inline edit shift lines, edit metadata modal, delete
 */
export default function ScheduleDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useAuth();

    const roleSegment = pathname.includes('/admin/')
        ? 'admin'
        : pathname.includes('/hr/')
          ? 'hr'
          : 'employee';

    const userRole = (user?.role || '').toUpperCase();
    const canManage = HR_ROLES.includes(userRole);

    // ── Read Path ────────────────────────────────────────────
    const { selectedSchedule, loading, error } = useContext(SchedulesContext);

    // ── Action Path ──────────────────────────────────────────
    const { loadScheduleDetail, handleUpdateSchedule, handleReplaceLines, handleDeleteSchedule } =
        useSchedules();

    // ── Local UI state ───────────────────────────────────────
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Editable lines state — initialized from schedule.lines on load
    const [editableLines, setEditableLines] = useState([]);

    useEffect(() => {
        if (id) loadScheduleDetail(id);
    }, [id, loadScheduleDetail]);

    // Sync editable lines when schedule is loaded/refreshed
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (selectedSchedule?.lines) {
            const base = DAY_NAMES.map((_, i) => {
                const existing = selectedSchedule.lines.find((l) => l.dayOfWeek === i);
                if (existing) {
                    return {
                        dayOfWeek: i,
                        enabled: true,
                        startTime: formatTime(existing.startTime),
                        endTime: formatTime(existing.endTime),
                        breakMinutes: existing.breakMinutes ?? 0,
                    };
                }
                return {
                    dayOfWeek: i,
                    enabled: false,
                    startTime: '09:00',
                    endTime: '17:00',
                    breakMinutes: 60,
                };
            });
            setEditableLines(base);
            setIsDirty(false);
        }
    }, [selectedSchedule]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // ── Handlers ─────────────────────────────────────────────
    const handleLineChange = useCallback((dayOfWeek, field, value) => {
        setEditableLines((prev) =>
            prev.map((l) => (l.dayOfWeek === dayOfWeek ? { ...l, [field]: value } : l)),
        );
        setIsDirty(true);
    }, []);

    const handleToggleDay = useCallback((dayOfWeek) => {
        setEditableLines((prev) =>
            prev.map((l) => (l.dayOfWeek === dayOfWeek ? { ...l, enabled: !l.enabled } : l)),
        );
        setIsDirty(true);
    }, []);

    const handleSaveLines = useCallback(async () => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            const lines = editableLines
                .filter((l) => l.enabled)
                .map(({ dayOfWeek, startTime, endTime, breakMinutes }) => ({
                    dayOfWeek,
                    startTime,
                    endTime,
                    breakMinutes: Number(breakMinutes) || 0,
                }));
            await handleReplaceLines(id, lines);
            setIsDirty(false);
        } finally {
            setIsSubmitting(false);
        }
    }, [id, editableLines, handleReplaceLines]);

    const handleEditMetaSubmit = useCallback(
        async (payload) => {
            if (!id) return;
            setIsSubmitting(true);
            try {
                await handleUpdateSchedule(id, {
                    name: payload.name,
                    description: payload.description,
                    timezone: payload.timezone,
                });
                setIsEditModalOpen(false);
            } finally {
                setIsSubmitting(false);
            }
        },
        [id, handleUpdateSchedule],
    );

    const handleDelete = useCallback(async () => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            await handleDeleteSchedule(id);
            navigate(`/dashboard/${roleSegment}/schedules`);
        } finally {
            setIsSubmitting(false);
        }
    }, [id, handleDeleteSchedule, navigate, roleSegment]);

    const handleDiscardChanges = useCallback(() => {
        if (selectedSchedule?.lines) {
            const base = DAY_NAMES.map((_, i) => {
                const existing = selectedSchedule.lines.find((l) => l.dayOfWeek === i);
                if (existing) {
                    return {
                        dayOfWeek: i,
                        enabled: true,
                        startTime: formatTime(existing.startTime),
                        endTime: formatTime(existing.endTime),
                        breakMinutes: existing.breakMinutes ?? 0,
                    };
                }
                return {
                    dayOfWeek: i,
                    enabled: false,
                    startTime: '09:00',
                    endTime: '17:00',
                    breakMinutes: 60,
                };
            });
            setEditableLines(base);
        }
        setIsDirty(false);
    }, [selectedSchedule]);

    // Computed weekly hours from current editable lines (live preview)
    const computedWeeklyHours = editableLines
        .filter((l) => l.enabled)
        .reduce((sum, l) => sum + computeNetHours(l.startTime, l.endTime, l.breakMinutes), 0)
        .toFixed(1);

    // ── Loading / Error ──────────────────────────────────────
    if (loading.detail) {
        return (
            <div className="schedule-detail-page schedule-detail-page--loading">
                <Spinner size="lg" />
            </div>
        );
    }

    if (error && !selectedSchedule) {
        return (
            <div className="schedule-detail-page schedule-detail-page--error">
                <EmptyState
                    variant="card"
                    icon={CalendarClock}
                    title="Schedule not found"
                    description={error}
                    action={{
                        label: 'Back to Schedules',
                        onClick: () => navigate(`/dashboard/${roleSegment}/schedules`),
                    }}
                />
            </div>
        );
    }

    if (!selectedSchedule) return null;

    return (
        <div className="schedule-detail-page">
            {/* ── Back + Action Bar ── */}
            <div className="schedule-detail-page__topbar">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/dashboard/${roleSegment}/schedules`)}
                    icon={ArrowLeft}
                    className="schedule-detail-page__back-btn"
                >
                    Schedules
                </Button>

                {canManage && (
                    <div className="schedule-detail-page__actions">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Pencil}
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            Edit Info
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setIsDeleteOpen(true)}
                        >
                            Deactivate
                        </Button>
                    </div>
                )}
            </div>

            {/* ── Metadata Card ── */}
            <Card className="schedule-detail-page__meta-card">
                <CardContent className="schedule-detail-page__meta-content">
                    <div className="schedule-detail-page__meta-left">
                        <div className="schedule-detail-page__meta-icon-wrap">
                            <CalendarClock size={24} />
                        </div>
                        <div className="schedule-detail-page__meta-info">
                            <div className="schedule-detail-page__meta-name-row">
                                <h1 className="schedule-detail-page__name">
                                    {selectedSchedule.name}
                                </h1>
                                <Badge
                                    variant={selectedSchedule.isActive ? 'success' : 'neutral'}
                                    showDot
                                >
                                    {selectedSchedule.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                            {selectedSchedule.description && (
                                <p className="schedule-detail-page__description">
                                    {selectedSchedule.description}
                                </p>
                            )}
                            <div className="schedule-detail-page__meta-tags">
                                <span className="schedule-detail-page__tag">
                                    <Globe size={13} />
                                    {selectedSchedule.timezone || 'UTC'}
                                </span>
                                <span className="schedule-detail-page__tag">
                                    <Clock size={13} />
                                    {computedWeeklyHours}h / week
                                </span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Shift Lines Section ── */}
            <div className="schedule-detail-page__lines-section">
                <div className="schedule-detail-page__lines-header">
                    <div>
                        <h2 className="schedule-detail-page__lines-title">Weekly Shift Grid</h2>
                        <p className="schedule-detail-page__lines-subtitle">
                            {canManage
                                ? 'Toggle days and edit times. Click Save Lines to apply changes.'
                                : 'The shift schedule for each day of the week.'}
                        </p>
                    </div>
                    {canManage && isDirty && (
                        <div className="schedule-detail-page__lines-actions">
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={RefreshCw}
                                onClick={handleDiscardChanges}
                            >
                                Discard
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                icon={Save}
                                onClick={handleSaveLines}
                                loading={loading.action || isSubmitting}
                            >
                                Save Lines
                            </Button>
                        </div>
                    )}
                </div>

                {/* Lines grid table */}
                <div className="schedule-detail-page__lines-grid">
                    {/* Column headers */}
                    <div className="schedule-detail-page__lines-col-header">
                        <span className="col-day">Day</span>
                        <span className="col-start">Start Time</span>
                        <span className="col-end">End Time</span>
                        <span className="col-break">Break (min)</span>
                        <span className="col-net">Net Hours</span>
                    </div>

                    {editableLines.map((line) => {
                        const netHrs = line.enabled
                            ? computeNetHours(line.startTime, line.endTime, line.breakMinutes)
                            : 0;

                        return (
                            <div
                                key={line.dayOfWeek}
                                className={`schedule-detail-page__line-row ${line.enabled ? 'is-enabled' : 'is-off'}`}
                            >
                                {/* Day toggle / label */}
                                <div className="schedule-detail-page__day-cell">
                                    {canManage ? (
                                        <Checkbox
                                            id={`detail-day-${line.dayOfWeek}`}
                                            checked={line.enabled}
                                            onChange={() => handleToggleDay(line.dayOfWeek)}
                                            label={DAY_NAMES[line.dayOfWeek]}
                                            disabled={loading.action || isSubmitting}
                                        />
                                    ) : (
                                        <span
                                            className={`schedule-detail-page__day-label ${line.enabled ? 'is-active' : ''}`}
                                        >
                                            {DAY_SHORT[line.dayOfWeek]}
                                        </span>
                                    )}
                                </div>

                                {/* Start time */}
                                <div className="schedule-detail-page__time-cell">
                                    {canManage ? (
                                        <input
                                            type="time"
                                            className="schedule-detail-page__time-input"
                                            value={line.startTime}
                                            onChange={(e) =>
                                                handleLineChange(
                                                    line.dayOfWeek,
                                                    'startTime',
                                                    e.target.value,
                                                )
                                            }
                                            disabled={
                                                !line.enabled || loading.action || isSubmitting
                                            }
                                            aria-label={`${DAY_NAMES[line.dayOfWeek]} start time`}
                                        />
                                    ) : (
                                        <span className="schedule-detail-page__time-display">
                                            {line.enabled ? formatTime(line.startTime) : '—'}
                                        </span>
                                    )}
                                </div>

                                {/* End time */}
                                <div className="schedule-detail-page__time-cell">
                                    {canManage ? (
                                        <input
                                            type="time"
                                            className="schedule-detail-page__time-input"
                                            value={line.endTime}
                                            onChange={(e) =>
                                                handleLineChange(
                                                    line.dayOfWeek,
                                                    'endTime',
                                                    e.target.value,
                                                )
                                            }
                                            disabled={
                                                !line.enabled || loading.action || isSubmitting
                                            }
                                            aria-label={`${DAY_NAMES[line.dayOfWeek]} end time`}
                                        />
                                    ) : (
                                        <span className="schedule-detail-page__time-display">
                                            {line.enabled ? formatTime(line.endTime) : '—'}
                                        </span>
                                    )}
                                </div>

                                {/* Break minutes */}
                                <div className="schedule-detail-page__break-cell">
                                    {canManage ? (
                                        <input
                                            type="number"
                                            className="schedule-detail-page__number-input"
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
                                            disabled={
                                                !line.enabled || loading.action || isSubmitting
                                            }
                                            aria-label={`${DAY_NAMES[line.dayOfWeek]} break minutes`}
                                        />
                                    ) : (
                                        <span className="schedule-detail-page__break-display">
                                            {line.enabled ? `${line.breakMinutes} min` : '—'}
                                        </span>
                                    )}
                                </div>

                                {/* Net hours computed */}
                                <div className="schedule-detail-page__net-cell">
                                    {line.enabled ? (
                                        <span
                                            className={`schedule-detail-page__net-badge ${netHrs > 0 ? 'is-valid' : 'is-zero'}`}
                                        >
                                            {netHrs > 0 ? `${netHrs}h` : '!'}
                                        </span>
                                    ) : (
                                        <span className="schedule-detail-page__net-off">Off</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Save bar — always visible when dirty on desktop */}
                {canManage && isDirty && (
                    <div className="schedule-detail-page__save-bar">
                        <span>You have unsaved changes to shift lines.</span>
                        <div className="schedule-detail-page__save-bar-actions">
                            <Button variant="ghost" size="sm" onClick={handleDiscardChanges}>
                                Discard
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleSaveLines}
                                loading={loading.action || isSubmitting}
                            >
                                Save Lines
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Edit Metadata Modal ── */}
            {canManage && (
                <ScheduleFormModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSubmit={handleEditMetaSubmit}
                    initialData={selectedSchedule}
                    isLoading={isSubmitting}
                />
            )}

            {/* ── Delete Confirmation Dialog ── */}
            {canManage && (
                <Dialog
                    isOpen={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title="Deactivate Schedule"
                    variant="danger"
                    size="sm"
                    confirmText="Deactivate"
                    cancelText="Cancel"
                    onConfirm={handleDelete}
                    confirmLoading={isSubmitting}
                >
                    <p className="schedule-detail-page__delete-text">
                        Are you sure you want to deactivate{' '}
                        <strong>"{selectedSchedule?.name}"</strong>? Employees currently assigned to
                        this schedule will be affected.
                    </p>
                </Dialog>
            )}
        </div>
    );
}
