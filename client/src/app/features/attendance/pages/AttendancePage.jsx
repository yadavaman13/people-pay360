import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import { useAttendance } from '../hooks/useAttendance';
import AttendanceHeader from '../components/AttendanceHeader';
import AttendanceQuickWidget from '../components/AttendanceQuickWidget';
import AttendanceSummaryCards from '../components/AttendanceSummaryCards';
import AttendanceCorrectionModal from '../components/AttendanceCorrectionModal';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import CircularAvatar from '@/components/Shared/DataDisplay/CircularAvatar/CircularAvatar';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import Tooltip from '@/components/Shared/DataDisplay/Tooltip/Tooltip';
import { Card, CardContent } from '@/components/Shared/DataDisplay/Card/Card';
import { Eye, Edit3, LogOut, Clock, Calendar, ShieldCheck } from 'lucide-react';
import '../Attendance.scss';

// ADMIN is view-only — they cannot punch their own attendance
const PUNCH_BLOCKED_ROLES = ['ADMIN'];

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

/**
 * Admin notice shown in place of the punch widget for ADMIN role.
 */
function AdminAttendanceNotice() {
    return (
        <Card
            className="admin-attendance-notice"
            style={{
                background:
                    'linear-gradient(135deg, var(--color-bg-subtle, #f8fafc) 0%, var(--color-bg-card, #fff) 100%)',
                border: '1px solid var(--color-border-subtle, #e5e7eb)',
                borderRadius: '12px',
                marginBottom: '16px',
            }}
        >
            <CardContent
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '18px 24px',
                }}
            >
                <ShieldCheck
                    size={28}
                    style={{ color: 'var(--color-primary, #3b82f6)', flexShrink: 0 }}
                />
                <div>
                    <div
                        style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'var(--color-text-primary, #111827)',
                            marginBottom: '2px',
                        }}
                    >
                        Administrator View
                    </div>
                    <div
                        style={{
                            fontSize: '13px',
                            color: 'var(--color-text-secondary, #6b7280)',
                        }}
                    >
                        Attendance check-in/out is managed by employees directly. Use the controls
                        below to monitor, correct, or manage employee attendance records.
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AttendancePage({ mode: initialMode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const userRole = (user?.role || '').toUpperCase();
    const isAdmin = useMemo(() => PUNCH_BLOCKED_ROLES.includes(userRole), [userRole]);
    const isHRRole = useMemo(
        () => ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(userRole),
        [userRole],
    );
    const canManageEmployees = isHRRole || isAdmin;
    const canPunch = !isAdmin;

    const roleSegment = useMemo(() => {
        if (isAdmin) return 'admin';
        if (isHRRole) return 'hr';
        return 'employee';
    }, [isAdmin, isHRRole]);

    // Determine effective mode:
    // Non-HR/non-admin employees can only view self mode.
    // For HR/Admin: check URL pathname first (employees-attendance vs my-attendance), then initialMode, then role default.
    const effectiveMode = useMemo(() => {
        if (!canManageEmployees) return 'self';
        if (location.pathname.includes('/employees-attendance')) return 'employees';
        if (location.pathname.includes('/my-attendance')) return 'self';
        if (initialMode) return initialMode;
        return isAdmin ? 'employees' : 'self';
    }, [canManageEmployees, location.pathname, initialMode, isAdmin]);

    const isSelfView = effectiveMode === 'self';
    const isEmployeesView = effectiveMode === 'employees';

    const {
        attendanceRecords,
        todayStatus,
        summaryMetrics,
        employeesList,
        selectedMonth,
        employeeMonthlySummary,
        pagination,
        loading,
        actionLoading,
        loadAttendanceList,
        loadTodayStatus,
        loadSummaryMetrics,
        loadEmployeesList,
        handleCheckIn,
        handleCheckOut,
        handleForceCheckOut,
        handleManualCorrection,
        changeMonth,
    } = useAttendance();

    // Modal state for HR manual correction
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);

    // Track current month range for self-view so refresh uses same window
    const employeeDateRangeRef = useRef(null);
    const employeesListRef = useRef(employeesList);
    useEffect(() => {
        employeesListRef.current = employeesList;
    }, [employeesList]);

    // Initial and route-change data fetching
    useEffect(() => {
        if (isSelfView) {
            if (canPunch) {
                loadTodayStatus();
            }
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
            const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
            employeeDateRangeRef.current = { dateFrom: firstDay, dateTo: lastDay };
            loadAttendanceList({
                scope: 'self',
                excludeHr: false,
                dateFrom: firstDay,
                dateTo: lastDay,
                page: 1,
            });
        } else if (isEmployeesView) {
            loadSummaryMetrics({ excludeHr: true });
            loadEmployeesList();
            loadAttendanceList({ excludeHr: true, scope: undefined, page: 1 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveMode]);

    // AdvancedTable → server-side re-fetch handler
    const initializedRef = useRef(false);
    const handleTableChange = useCallback(
        ({ activeTab, page, rowsPerPage, columnFilters, searchTerm }) => {
            if (!initializedRef.current) {
                initializedRef.current = true;
                return;
            }

            const params = {
                page: page || 1,
                limit: rowsPerPage || 10,
                search: typeof searchTerm === 'string' ? searchTerm.trim() : '',
            };

            if (isSelfView) {
                params.scope = 'self';
                params.excludeHr = false;
                if (columnFilters?.attendanceDate) {
                    params.dateFrom = columnFilters.attendanceDate;
                    params.dateTo = columnFilters.attendanceDate;
                } else if (employeeDateRangeRef.current) {
                    params.dateFrom = employeeDateRangeRef.current.dateFrom;
                    params.dateTo = employeeDateRangeRef.current.dateTo;
                }
            } else {
                params.excludeHr = true;
                params.scope = undefined;
                if (columnFilters?.attendanceDate) {
                    params.dateFrom = columnFilters.attendanceDate;
                    params.dateTo = columnFilters.attendanceDate;
                }
                const currentEmployees = employeesListRef.current;
                if (
                    columnFilters?.employeeName &&
                    Array.isArray(currentEmployees) &&
                    currentEmployees.length > 0
                ) {
                    const nameFilter = Array.isArray(columnFilters.employeeName)
                        ? columnFilters.employeeName[0]
                        : columnFilters.employeeName;
                    const match = currentEmployees.find(
                        (e) => `${e.firstName || ''} ${e.lastName || ''}`.trim() === nameFilter,
                    );
                    if (match) params.employeeId = match.id;
                }
            }

            // Map tab id → status API param
            if (activeTab && activeTab !== 'all') {
                params.status = activeTab;
            } else {
                params.status = 'ALL';
            }

            loadAttendanceList(params);
        },
        [isSelfView, loadAttendanceList],
    );

    // Refresh data handler
    const handleRefresh = useCallback(async () => {
        if (isSelfView) {
            const refreshParams = {
                page: 1,
                scope: 'self',
                ...(employeeDateRangeRef.current || {}),
            };
            await Promise.all([
                canPunch ? loadTodayStatus() : Promise.resolve(),
                loadAttendanceList(refreshParams),
            ]);
        } else {
            await Promise.all([
                loadAttendanceList({ page: 1, excludeHr: true }),
                loadSummaryMetrics({ excludeHr: true }),
            ]);
        }
    }, [isSelfView, canPunch, loadTodayStatus, loadAttendanceList, loadSummaryMetrics]);

    // Row Actions
    const handleViewRecord = useCallback(
        (record) => {
            const id = record.rawRecord?.id || record.id;
            const subSegment = isEmployeesView ? 'employees-attendance' : 'my-attendance';
            navigate(`/dashboard/${roleSegment}/attendance/${subSegment}/${id}`);
        },
        [navigate, roleSegment, isEmployeesView],
    );

    const handleOpenEdit = useCallback((record) => {
        setEditingRecord(record.rawRecord || record);
        setIsCorrectionModalOpen(true);
    }, []);

    const handleSaveCorrection = useCallback(
        async (recordId, payload) => {
            await handleManualCorrection(recordId, payload);
            setIsCorrectionModalOpen(false);
            setEditingRecord(null);
        },
        [handleManualCorrection],
    );

    const handleForceCheckOutAction = useCallback(
        async (record) => {
            const target = record.rawRecord || record;
            if (window.confirm('Are you sure you want to force check out this session?')) {
                await handleForceCheckOut(target.id);
            }
        },
        [handleForceCheckOut],
    );

    // Transform raw attendance records into table-friendly structure for AdvancedTable
    const tableData = useMemo(() => {
        const list = Array.isArray(attendanceRecords) ? attendanceRecords : [];
        return list.map((r) => {
            const emp = r.employee || {};
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
            return {
                ...r,
                employeeName: fullName,
                employeeCode: emp.employeeCode || r.employeeId?.slice(0, 8) || '',
                profileImage: emp.profileImage || '',
                workedHoursNumeric: parseFloat(r.workedHours || 0),
                rawRecord: r,
            };
        });
    }, [attendanceRecords]);

    // Status filter tabs for AdvancedTable
    const tabs = useMemo(
        () => [
            {
                id: 'all',
                label: 'All Records',
                count: isEmployeesView
                    ? (summaryMetrics?.totalRecords ?? pagination?.total)
                    : pagination?.total,
            },
            {
                id: 'PRESENT',
                label: 'Present',
                count: isEmployeesView ? summaryMetrics?.presentCount : undefined,
            },
            {
                id: 'LATE',
                label: 'Late',
                count: isEmployeesView ? summaryMetrics?.lateCount : undefined,
            },
            {
                id: 'ABSENT',
                label: 'Absent',
                count: isEmployeesView ? summaryMetrics?.absentCount : undefined,
            },
            {
                id: 'HALF_DAY',
                label: 'Half Day',
                count: isEmployeesView ? summaryMetrics?.halfDayCount : undefined,
            },
        ],
        [isEmployeesView, summaryMetrics, pagination?.total],
    );

    // Filter configuration for AdvancedTable filter panel
    const filterConfig = useMemo(() => {
        const configs = [
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                options: ['PRESENT', 'LATE', 'ABSENT', 'HALF_DAY'],
            },
            {
                key: 'attendanceDate',
                label: 'Attendance Date',
                type: 'date',
            },
        ];

        if (isEmployeesView && employeesList && employeesList.length > 0) {
            const safeEmps = Array.isArray(employeesList)
                ? employeesList
                : Array.isArray(employeesList.employees)
                  ? employeesList.employees
                  : [];
            const empNames = Array.from(
                new Set(
                    safeEmps
                        .map((e) => `${e.firstName || ''} ${e.lastName || ''}`.trim())
                        .filter(Boolean),
                ),
            );
            if (empNames.length > 0) {
                configs.push({
                    key: 'employeeName',
                    label: 'Employee Name',
                    type: 'select',
                    options: empNames,
                });
            }
        }

        return configs;
    }, [isEmployeesView, employeesList]);

    // Columns specification for AdvancedTable
    const columns = useMemo(() => {
        const cols = [];

        // 1. Employee Profile Column (shown only in Employees Attendance management view)
        if (isEmployeesView) {
            cols.push({
                key: 'employeeName',
                label: 'Employee',
                searchable: true,
                sortable: true,
                render: (_val, row) => {
                    return (
                        <div
                            className="employee-profile-cell"
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <CircularAvatar
                                src={row.profileImage}
                                name={row.employeeName}
                                size="md"
                            />
                            <div
                                className="employee-info-text"
                                style={{ display: 'flex', flexDirection: 'column' }}
                            >
                                <span
                                    className="emp-name"
                                    style={{ fontWeight: 600, fontSize: '13px' }}
                                >
                                    {row.employeeName}
                                </span>
                                <span
                                    className="emp-code"
                                    style={{
                                        fontSize: '11px',
                                        color: 'var(--color-text-secondary, #6b7280)',
                                    }}
                                >
                                    {row.employeeCode}
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
            sortable: true,
            render: (val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} style={{ color: 'var(--color-text-secondary, #6b7280)' }} />
                    <span>{formatDate(val)}</span>
                </div>
            ),
        });

        // 3. Check-In Time
        cols.push({
            key: 'checkInTime',
            label: 'Check In',
            sortable: true,
            render: (val) => {
                const timeStr = formatTime(val);
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
            sortable: true,
            render: (val, row) => {
                const timeStr = formatTime(val);
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
            key: 'workedHoursNumeric',
            label: 'Worked Hours',
            sortable: true,
            render: (val) => {
                if (val > 0) {
                    return <strong>{val.toFixed(2)} hrs</strong>;
                }
                return <span style={{ color: 'var(--color-text-muted, #9ca3af)' }}>0.00 hrs</span>;
            },
        });

        // 6. Status Chip
        cols.push({
            key: 'status',
            label: 'Status',
            sortable: true,
            render: (val, row) => {
                const badgeVariant = getStatusVariant(val);

                return (
                    <div
                        className="status-chip-wrapper"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Badge variant={badgeVariant} showDot>
                            {val || 'UNKNOWN'}
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
            render: (_val, row) => {
                const hasOpenPunch = !row.checkOutTime && row.checkInTime;

                return (
                    <div
                        className="row-action-cluster"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRecord(row)}
                            title="View Record Details"
                            aria-label="View record details"
                        >
                            <Eye size={15} />
                        </Button>

                        {isEmployeesView && canManageEmployees && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(row)}
                                title="Manual Correction"
                                aria-label="Edit record"
                            >
                                <Edit3 size={15} />
                            </Button>
                        )}

                        {isEmployeesView && canManageEmployees && hasOpenPunch && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleForceCheckOutAction(row)}
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
    }, [
        isEmployeesView,
        canManageEmployees,
        handleViewRecord,
        handleOpenEdit,
        handleForceCheckOutAction,
    ]);

    // Custom Grid Card Renderer for AdvancedTable's Grid Mode
    const renderGridCard = useCallback(
        (row) => {
            const hasOpenPunch = !row.checkOutTime && row.checkInTime;
            const badgeVariant = getStatusVariant(row.status);
            const workedHrs = parseFloat(row.workedHours || 0);

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
                                {isEmployeesView && (
                                    <CircularAvatar
                                        src={row.profileImage}
                                        name={row.employeeName}
                                        size="md"
                                    />
                                )}
                                <div>
                                    <h4
                                        style={{
                                            margin: 0,
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: 'var(--color-text-primary, #111827)',
                                        }}
                                    >
                                        {isEmployeesView
                                            ? row.employeeName
                                            : formatDate(row.attendanceDate)}
                                    </h4>
                                    {isEmployeesView && (
                                        <span
                                            style={{
                                                fontSize: '11px',
                                                color: 'var(--color-text-secondary, #6b7280)',
                                            }}
                                        >
                                            {row.employeeCode}
                                        </span>
                                    )}
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
                        <Button variant="ghost" size="sm" onClick={() => handleViewRecord(row)}>
                            <Eye size={14} style={{ marginRight: '4px' }} />
                            View
                        </Button>
                        {isEmployeesView && canManageEmployees && (
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(row)}>
                                <Edit3 size={14} style={{ marginRight: '4px' }} />
                                Edit
                            </Button>
                        )}
                        {isEmployeesView && canManageEmployees && hasOpenPunch && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleForceCheckOutAction(row)}
                                style={{ color: 'var(--color-danger, #ef4444)' }}
                            >
                                <LogOut size={14} style={{ marginRight: '4px' }} />
                                End Shift
                            </Button>
                        )}
                    </div>
                </Card>
            );
        },
        [
            isEmployeesView,
            canManageEmployees,
            handleViewRecord,
            handleOpenEdit,
            handleForceCheckOutAction,
        ],
    );

    return (
        <div className="attendance-page-container">
            {/* Contextual Header */}
            <AttendanceHeader
                title={isEmployeesView ? 'Employees Attendance' : 'My Attendance'}
                subtitle={
                    isEmployeesView
                        ? 'Company-wide attendance monitoring, shift compliance, and employee punch records'
                        : 'View and track your daily work hours, punch history, and monthly shift records'
                }
                isHR={isEmployeesView}
                onRefresh={handleRefresh}
                isRefreshing={loading}
            />

            {/* Quick Punch Widget — shown in My Attendance view for roles that can punch */}
            {isSelfView && canPunch && (
                <AttendanceQuickWidget
                    todayStatus={todayStatus}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    isActionLoading={actionLoading}
                />
            )}

            {/* Admin notice shown in place of punch widget for pure ADMIN role */}
            {isEmployeesView && isAdmin && <AdminAttendanceNotice />}

            {/* Summary Cards: Team summary for Employees Attendance; Personal Monthly stats for My Attendance */}
            <AttendanceSummaryCards
                isHR={isEmployeesView}
                summaryMetrics={summaryMetrics}
                employeeMonthlySummary={employeeMonthlySummary}
                selectedMonth={selectedMonth}
                onMonthChange={(offsetOrDate) => changeMonth(offsetOrDate, { scope: 'self' })}
            />

            {/* AdvancedTable — server-side driven with API filter wiring */}
            <div className="attendance-table-card attendance-advanced-table-section">
                <AdvancedTable
                    columns={columns}
                    data={tableData}
                    loading={loading}
                    tabs={tabs}
                    tabFilterKey="status"
                    filterConfig={filterConfig}
                    showFilter={true}
                    searchable={true}
                    searchPlaceholder={
                        isEmployeesView
                            ? 'Search employee name, code, date, notes...'
                            : 'Search date, notes...'
                    }
                    showSortDropdown={true}
                    showColumnSorting={true}
                    showSerialNumber={true}
                    showColumnToggle={true}
                    showViewToggle={true}
                    renderCard={renderGridCard}
                    gridColumns={3}
                    showExport={true}
                    showRefresh={true}
                    onRefresh={handleRefresh}
                    showRowsPerPage={true}
                    showResultsCount={true}
                    showPagination={true}
                    initialRowsPerPage={10}
                    serverSide={true}
                    totalCount={pagination?.total ?? tableData.length}
                    onTableChange={handleTableChange}
                />
            </div>

            {/* HR Manual Correction Dialog (only available in Employees Attendance view) */}
            {isEmployeesView && canManageEmployees && (
                <AttendanceCorrectionModal
                    isOpen={isCorrectionModalOpen}
                    onClose={() => {
                        setIsCorrectionModalOpen(false);
                        setEditingRecord(null);
                    }}
                    record={editingRecord}
                    onSave={handleSaveCorrection}
                    isSubmitting={actionLoading}
                />
            )}
        </div>
    );
}
