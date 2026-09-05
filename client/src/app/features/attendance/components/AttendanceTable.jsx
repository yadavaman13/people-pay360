import { useMemo } from 'react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import CircularAvatar from '@/components/Shared/DataDisplay/CircularAvatar/CircularAvatar';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import Tooltip from '@/components/Shared/DataDisplay/Tooltip/Tooltip';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import { Card, CardContent } from '@/components/Shared/DataDisplay/Card/Card';
import { Eye, Edit3, LogOut, Clock, Calendar } from 'lucide-react';

/**
 * Format time to 12-hour AM/PM string
 */
function formatTime(isoString) {
    if (!isoString) return null;
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return null;
    }
}

/**
 * Format date string (YYYY-MM-DD)
 */
function formatDate(dateString) {
    if (!dateString) return '—';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateString;
    }
}

/**
 * Resolve status badge variant
 */
function getStatusVariant(status) {
    switch (status) {
        case 'PRESENT':
            return 'success';
        case 'LATE':
            return 'warning';
        case 'ABSENT':
            return 'danger';
        case 'HALF_DAY':
            return 'warning';
        default:
            return 'neutral';
    }
}

export default function AttendanceTable({
    records = [],
    isLoading = false,
    isHR = false,
    pagination,
    onPageChange,
    onViewRecord,
    onEditRecord,
    onForceCheckOut,
}) {
    const columns = useMemo(() => {
        const cols = [];

        // 1. Employee profile column (HR view)
        if (isHR) {
            cols.push({
                key: 'employee',
                label: 'Employee',
                render: (_val, rowRecord) => {
                    const row = rowRecord || {};
                    const emp = row.employee || {};
                    const fullName =
                        `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown';
                    const profileImg = emp.profileImage || '';

                    return (
                        <div
                            className="employee-profile-cell"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <CircularAvatar src={profileImg} name={fullName} size="md" />
                            <div
                                className="employee-info-text"
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <span
                                    className="emp-name"
                                    style={{ fontWeight: 600, fontSize: '13px' }}
                                >
                                    {fullName}
                                </span>
                                <span
                                    className="emp-code"
                                    style={{
                                        fontSize: '11px',
                                        color: 'var(--color-text-secondary, #6b7280)',
                                    }}
                                >
                                    {emp.employeeCode || row.employeeId?.slice(0, 8)}
                                </span>
                            </div>
                        </div>
                    );
                },
            });
        }

        // 2. Attendance Date
        cols.push({
            key: 'attendanceDate',
            label: 'Date',
            render: (val, rowRecord) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} style={{ color: 'var(--color-text-secondary, #6b7280)' }} />
                    <span>{formatDate(val || rowRecord?.attendanceDate)}</span>
                </div>
            ),
        });

        // 3. Check-In Time
        cols.push({
            key: 'checkInTime',
            label: 'Check In',
            render: (val, rowRecord) => {
                const checkIn = val || rowRecord?.checkInTime;
                const timeStr = formatTime(checkIn);
                return timeStr ? (
                    <span
                        className="time-badge-cell"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Clock size={12} />
                        {timeStr}
                    </span>
                ) : (
                    <span
                        className="time-badge-cell not-recorded"
                        style={{ color: 'var(--color-text-muted, #9ca3af)' }}
                    >
                        —
                    </span>
                );
            },
        });

        // 4. Check-Out Time
        cols.push({
            key: 'checkOutTime',
            label: 'Check Out',
            render: (val, rowRecord) => {
                const row = rowRecord || {};
                const checkOut = val || row.checkOutTime;
                const timeStr = formatTime(checkOut);
                if (timeStr) {
                    return (
                        <span
                            className="time-badge-cell"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Clock size={12} />
                            {timeStr}
                        </span>
                    );
                }
                if (row.isCurrentlyCheckedIn || (!row.checkOutTime && row.checkInTime)) {
                    return (
                        <Badge variant="primary" size="sm">
                            In Session
                        </Badge>
                    );
                }
                return (
                    <span
                        className="time-badge-cell not-recorded"
                        style={{ color: 'var(--color-text-muted, #9ca3af)' }}
                    >
                        —
                    </span>
                );
            },
        });

        // 5. Total Worked Hours
        cols.push({
            key: 'workedHours',
            label: 'Worked Hours',
            render: (val, rowRecord) => {
                const row = rowRecord || {};
                const hrs = parseFloat(val !== undefined && val !== null ? val : row.workedHours);
                if (!isNaN(hrs) && hrs > 0) {
                    return <strong>{hrs.toFixed(2)} hrs</strong>;
                }
                return <span style={{ color: 'var(--color-text-muted, #9ca3af)' }}>0.00 hrs</span>;
            },
        });

        // 6. Status Chip
        cols.push({
            key: 'status',
            label: 'Status',
            render: (val, rowRecord) => {
                const row = rowRecord || {};
                const status = val || row.status;
                const badgeVariant = getStatusVariant(status);

                return (
                    <div
                        className="status-chip-wrapper"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Badge variant={badgeVariant} showDot>
                            {status || 'UNKNOWN'}
                        </Badge>

                        {row.isManuallyCorrected && (
                            <Tooltip
                                content={`Corrected: ${row.correctionReason || 'Manual adjustment'}`}
                                position="top"
                            >
                                <span
                                    className="corrected-pill"
                                    style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--color-bg-subtle, #f3f4f6)',
                                        color: 'var(--color-text-secondary, #4b5563)',
                                        border: '1px solid var(--color-border-subtle, #e5e7eb)',
                                        cursor: 'help',
                                    }}
                                >
                                    Corrected
                                </span>
                            </Tooltip>
                        )}
                    </div>
                );
            },
        });

        // 7. Actions
        cols.push({
            key: 'actions',
            label: 'Actions',
            render: (_val, rowRecord) => {
                const row = rowRecord || {};
                const hasOpenPunch = !row.checkOutTime && row.checkInTime;

                return (
                    <div
                        className="row-action-cluster"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewRecord && onViewRecord(row)}
                            title="View Record Details"
                            aria-label="View record details"
                        >
                            <Eye size={15} />
                        </Button>

                        {isHR && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditRecord && onEditRecord(row)}
                                title="Manual Correction"
                                aria-label="Edit record"
                            >
                                <Edit3 size={15} />
                            </Button>
                        )}

                        {isHR && hasOpenPunch && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onForceCheckOut && onForceCheckOut(row)}
                                title="Force Check Out"
                                aria-label="Force check out"
                                style={{ color: 'var(--color-danger, #ef4444)' }}
                            >
                                <LogOut size={15} />
                            </Button>
                        )}
                    </div>
                );
            },
        });

        return cols;
    }, [isHR, onViewRecord, onEditRecord, onForceCheckOut]);

    // Custom Grid Card Renderer for AdvancedTable's Grid mode
    const renderCard = (row) => {
        const emp = row.employee || {};
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
        const hasOpenPunch = !row.checkOutTime && row.checkInTime;
        const badgeVariant = getStatusVariant(row.status);
        const workedHrs = parseFloat(row.workedHours) || 0;

        return (
            <Card
                key={row.id}
                className="attendance-grid-card"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    padding: '16px',
                    border: '1px solid var(--color-border-subtle, #e5e7eb)',
                    borderRadius: '12px',
                    background: 'var(--color-bg-card, #ffffff)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
            >
                <CardContent style={{ padding: 0 }}>
                    {/* Header: Avatar + Name + Status */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CircularAvatar src={emp.profileImage} name={fullName} size="md" />
                            <div>
                                <h4
                                    style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: 'var(--color-text-primary, #111827)',
                                    }}
                                >
                                    {fullName}
                                </h4>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: 'var(--color-text-secondary, #6b7280)',
                                    }}
                                >
                                    {emp.employeeCode || row.employeeId?.slice(0, 8)}
                                </span>
                            </div>
                        </div>

                        <Badge variant={badgeVariant} showDot size="sm">
                            {row.status}
                        </Badge>
                    </div>

                    {/* Metadata Grid */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            padding: '10px 12px',
                            backgroundColor: 'var(--color-bg-subtle, #f9fafb)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            marginBottom: '12px',
                        }}
                    >
                        <div>
                            <span
                                style={{
                                    color: 'var(--color-text-secondary, #6b7280)',
                                    display: 'block',
                                    fontSize: '11px',
                                }}
                            >
                                Date
                            </span>
                            <strong>{formatDate(row.attendanceDate)}</strong>
                        </div>
                        <div>
                            <span
                                style={{
                                    color: 'var(--color-text-secondary, #6b7280)',
                                    display: 'block',
                                    fontSize: '11px',
                                }}
                            >
                                Worked
                            </span>
                            <strong>{workedHrs.toFixed(2)} hrs</strong>
                        </div>
                        <div>
                            <span
                                style={{
                                    color: 'var(--color-text-secondary, #6b7280)',
                                    display: 'block',
                                    fontSize: '11px',
                                }}
                            >
                                Check In
                            </span>
                            <span>{formatTime(row.checkInTime) || '—'}</span>
                        </div>
                        <div>
                            <span
                                style={{
                                    color: 'var(--color-text-secondary, #6b7280)',
                                    display: 'block',
                                    fontSize: '11px',
                                }}
                            >
                                Check Out
                            </span>
                            <span>
                                {formatTime(row.checkOutTime) ||
                                    (hasOpenPunch ? (
                                        <span
                                            style={{
                                                color: 'var(--color-primary, #3b82f6)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Active
                                        </span>
                                    ) : (
                                        '—'
                                    ))}
                            </span>
                        </div>
                    </div>

                    {row.isManuallyCorrected && (
                        <div
                            style={{
                                marginBottom: '10px',
                                fontSize: '11px',
                                color: 'var(--color-warning-text, #b45309)',
                            }}
                        >
                            * Manually adjusted by HR
                        </div>
                    )}
                </CardContent>

                {/* Footer Actions */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        borderTop: '1px solid var(--color-border-subtle, #f3f4f6)',
                        paddingTop: '10px',
                    }}
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewRecord && onViewRecord(row)}
                    >
                        <Eye size={14} style={{ marginRight: '4px' }} />
                        View
                    </Button>
                    {isHR && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRecord && onEditRecord(row)}
                        >
                            <Edit3 size={14} style={{ marginRight: '4px' }} />
                            Edit
                        </Button>
                    )}
                    {isHR && hasOpenPunch && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onForceCheckOut && onForceCheckOut(row)}
                            style={{ color: 'var(--color-danger, #ef4444)' }}
                        >
                            <LogOut size={14} style={{ marginRight: '4px' }} />
                            End Shift
                        </Button>
                    )}
                </div>
            </Card>
        );
    };

    const safeRecords = Array.isArray(records) ? records : [];

    return (
        <div className="attendance-table-card">
            {safeRecords.length === 0 && !isLoading ? (
                <Card
                    style={{
                        padding: '32px',
                        textAlign: 'center',
                        background: 'var(--color-bg-card, #ffffff)',
                    }}
                >
                    <EmptyState
                        icon={Calendar}
                        title="No Attendance Records Found"
                        description="There are no attendance or shift records matching the current filters and date range."
                        variant="inline"
                        size="md"
                    />
                </Card>
            ) : (
                <AdvancedTable
                    columns={columns}
                    data={safeRecords}
                    loading={isLoading}
                    showViewToggle={true}
                    renderCard={renderCard}
                    gridColumns={3}
                    showPagination={!!pagination}
                    showResultsCount={true}
                    showRowsPerPage={true}
                    serverSide={true}
                    totalCount={pagination?.total || safeRecords.length}
                    initialRowsPerPage={pagination?.limit || 10}
                    onTableChange={(tableState) => {
                        if (
                            tableState.page &&
                            tableState.page !== pagination?.page &&
                            onPageChange
                        ) {
                            onPageChange(tableState.page);
                        }
                    }}
                />
            )}
        </div>
    );
}
