import { useEffect, useContext, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { SchedulesContext } from '../../context/SchedulesContext';
import { useSchedules } from '../../hooks/useSchedules';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import MetricCard, { MetricCardGrid } from '@/components/Shared/DataDisplay/MetricCard/MetricCard';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import ScheduleFormModal from '../../components/ScheduleFormModal/ScheduleFormModal';
import { CalendarClock, Plus, Clock, CheckCircle, Layers, Trash2, Pencil } from 'lucide-react';
import './SchedulesListPage.scss';

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'];

/**
 * SCR-SCH-001: Working Schedules List Page
 * - HR/Admin: Full CRUD (Create, Edit, Delete)
 * - Employee: Read-only list + detail navigation
 */
export default function SchedulesListPage() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useAuth();

    // Determine role segment for routing
    const roleSegment = pathname.includes('/admin/')
        ? 'admin'
        : pathname.includes('/hr/')
          ? 'hr'
          : 'employee';

    const userRole = (user?.role || '').toUpperCase();
    const canManage = HR_ROLES.includes(userRole);

    // ── Read Path: state from Context ──────────────────────
    const { schedules, activeSchedulesCount, loading, error } = useContext(SchedulesContext);

    // ── Action Path: hooks ──────────────────────────────────
    const { loadSchedules, handleCreateSchedule, handleUpdateSchedule, handleDeleteSchedule } =
        useSchedules();

    // ── Local UI state ──────────────────────────────────────
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadSchedules();
    }, [loadSchedules]);

    // ── Handlers ────────────────────────────────────────────
    const handleRowClick = useCallback(
        (row) => {
            navigate(`/dashboard/${roleSegment}/schedules/${row.id}`);
        },
        [navigate, roleSegment],
    );

    const handleOpenEdit = useCallback((row) => {
        setEditTarget(row);
    }, []);

    const handleOpenDelete = useCallback((row) => {
        setDeleteTarget(row);
    }, []);

    const handleCreateSubmit = useCallback(
        async (payload) => {
            setIsSubmitting(true);
            try {
                await handleCreateSchedule(payload);
                setIsCreateOpen(false);
            } finally {
                setIsSubmitting(false);
            }
        },
        [handleCreateSchedule],
    );

    const handleEditSubmit = useCallback(
        async (payload) => {
            if (!editTarget) return;
            setIsSubmitting(true);
            try {
                // In edit-from-list mode, only update metadata (lines editor is on detail page)
                await handleUpdateSchedule(editTarget.id, {
                    name: payload.name,
                    description: payload.description,
                    timezone: payload.timezone,
                });
                setEditTarget(null);
            } finally {
                setIsSubmitting(false);
            }
        },
        [editTarget, handleUpdateSchedule],
    );

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        try {
            await handleDeleteSchedule(deleteTarget.id);
            setDeleteTarget(null);
        } finally {
            setIsSubmitting(false);
        }
    }, [deleteTarget, handleDeleteSchedule]);

    // ── Table column definitions ────────────────────────────
    const columns = useMemo(
        () => [
            {
                key: 'name',
                label: 'Schedule Name',
                sortable: true,
                render: (val) => (
                    <div className="schedule-name-cell">
                        <CalendarClock size={15} className="schedule-name-cell__icon" />
                        <span className="schedule-name-cell__text">{val}</span>
                    </div>
                ),
            },
            {
                key: 'description',
                label: 'Description',
                render: (val) => (
                    <span className="schedules-list-page__desc-cell">
                        {val ? (val.length > 65 ? `${val.slice(0, 65)}…` : val) : '—'}
                    </span>
                ),
            },
            {
                key: 'timezone',
                label: 'Timezone',
                sortable: true,
                render: (val) => (
                    <Badge variant="neutral" type="light">
                        {val || '—'}
                    </Badge>
                ),
            },
            {
                key: 'weeklyHours',
                label: 'Weekly Hours',
                sortable: true,
                render: (val) => (
                    <span className="schedules-list-page__hours-pill">
                        <Clock size={12} />
                        {val != null ? `${val}h / wk` : '—'}
                    </span>
                ),
            },
            {
                key: 'isActive',
                label: 'Status',
                sortable: true,
                render: (val) =>
                    val ? (
                        <Badge variant="success" showDot>
                            Active
                        </Badge>
                    ) : (
                        <Badge variant="neutral" showDot>
                            Inactive
                        </Badge>
                    ),
            },
            // Actions column — only shown to HR/Admin
            ...(canManage
                ? [
                      {
                          key: 'actions',
                          label: 'Actions',
                          render: (_val, row) => (
                              <div className="schedules-list-page__row-actions">
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEdit(row);
                                      }}
                                      title="Edit schedule metadata"
                                      aria-label="Edit schedule"
                                  >
                                      <Pencil size={14} />
                                  </Button>
                                  <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenDelete(row);
                                      }}
                                      title="Deactivate schedule"
                                      aria-label="Delete schedule"
                                      className="schedules-list-page__delete-btn"
                                  >
                                      <Trash2 size={14} />
                                  </Button>
                              </div>
                          ),
                      },
                  ]
                : []),
        ],
        [canManage, handleOpenEdit, handleOpenDelete],
    );

    return (
        <div className="schedules-list-page">
            {/* ── Page Header ── */}
            <header className="schedules-list-page__header">
                <div className="schedules-list-page__header-info">
                    <h1 className="schedules-list-page__title">Working Schedules</h1>
                    <p className="schedules-list-page__subtitle">
                        {canManage
                            ? 'Create and manage shift templates for your organization'
                            : 'View your organization shift schedule templates'}
                    </p>
                </div>
                {canManage && (
                    <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => setIsCreateOpen(true)}
                        id="create-schedule-btn"
                    >
                        New Schedule
                    </Button>
                )}
            </header>

            {/* ── Metric Cards ── */}
            <MetricCardGrid columns={3} className="schedules-list-page__metrics">
                <MetricCard label="Total Schedules" value={schedules.length} icon={Layers} />
                <MetricCard
                    label="Active Schedules"
                    value={activeSchedulesCount}
                    icon={CheckCircle}
                    iconColor="var(--color-success)"
                    trendType="positive"
                />
                <MetricCard
                    label="Inactive Schedules"
                    value={schedules.length - activeSchedulesCount}
                    icon={Clock}
                    iconColor="var(--color-text-secondary)"
                />
            </MetricCardGrid>

            {/* ── Error state ── */}
            {error && !loading.list && (
                <div className="schedules-list-page__error-banner">
                    <span>{error}</span>
                    <Button variant="ghost" size="sm" onClick={() => loadSchedules()}>
                        Retry
                    </Button>
                </div>
            )}

            {/* ── Data Table ── */}
            <div className="schedules-list-page__table-wrapper">
                {!loading.list && schedules.length === 0 && !error ? (
                    <EmptyState
                        variant="card"
                        icon={CalendarClock}
                        title="No working schedules yet"
                        description={
                            canManage
                                ? 'Create your first schedule to define shift templates for employees.'
                                : 'No schedules have been configured for your organization yet.'
                        }
                        action={
                            canManage
                                ? {
                                      label: 'New Schedule',
                                      onClick: () => setIsCreateOpen(true),
                                      icon: Plus,
                                  }
                                : null
                        }
                    />
                ) : (
                    <AdvancedTable
                        data={schedules}
                        columns={columns}
                        loading={loading.list}
                        searchable
                        searchPlaceholder="Search schedules by name or timezone…"
                        showColumnSorting
                        showRefresh
                        onRefresh={() => loadSchedules()}
                        showRowsPerPage
                        showResultsCount
                        showExport
                        showColumnToggle
                        onRowClick={handleRowClick}
                        className="schedules-advanced-table"
                        id="schedules-data-table"
                    />
                )}
            </div>

            {/* ── Create Modal ── */}
            {canManage && (
                <ScheduleFormModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSubmit={handleCreateSubmit}
                    initialData={null}
                    isLoading={isSubmitting}
                />
            )}

            {/* ── Edit Modal ── */}
            {canManage && (
                <ScheduleFormModal
                    isOpen={Boolean(editTarget)}
                    onClose={() => setEditTarget(null)}
                    onSubmit={handleEditSubmit}
                    initialData={editTarget}
                    isLoading={isSubmitting}
                />
            )}

            {/* ── Delete Confirmation Dialog ── */}
            {canManage && (
                <Dialog
                    isOpen={Boolean(deleteTarget)}
                    onClose={() => setDeleteTarget(null)}
                    title="Deactivate Schedule"
                    variant="danger"
                    size="sm"
                    confirmText="Deactivate"
                    cancelText="Cancel"
                    onConfirm={handleConfirmDelete}
                    confirmLoading={isSubmitting}
                >
                    <p className="schedules-list-page__delete-confirm-text">
                        Are you sure you want to deactivate <strong>"{deleteTarget?.name}"</strong>?
                        This schedule will be marked inactive and can no longer be assigned to
                        employees.
                    </p>
                </Dialog>
            )}
        </div>
    );
}
