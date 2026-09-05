import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import { useAttendance } from '../hooks/useAttendance';
import Button from '@/components/Shared/Buttons/Button/Button';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import CircularAvatar from '@/components/Shared/DataDisplay/CircularAvatar/CircularAvatar';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/Shared/DataDisplay/Card/Card';
import Timeline from '@/components/Shared/DataDisplay/Timeline/Timeline';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import AttendanceCorrectionModal from '../components/AttendanceCorrectionModal';
import { ArrowLeft, Edit3, LogOut, Clock, ShieldCheck, User, Calendar } from 'lucide-react';
import '../Attendance.scss';

const HR_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];

function formatDateTime(isoString) {
    if (!isoString) return '—';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleString([], {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch {
        return isoString;
    }
}

export default function AttendanceDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isHR = useMemo(() => {
        const userRole = (user?.role || '').toUpperCase();
        return HR_ROLES.includes(userRole);
    }, [user?.role]);

    const {
        selectedRecord,
        loading,
        actionLoading,
        loadAttendanceById,
        handleManualCorrection,
        handleForceCheckOut,
    } = useAttendance();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            loadAttendanceById(id).catch(() => {});
        }
    }, [id, loadAttendanceById]);

    const record = selectedRecord;
    const emp = record?.employee || {};
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
    const hasOpenPunch = record && !record.checkOutTime && record.checkInTime;

    const workedHoursNum = parseFloat(record?.workedHours) || 0;
    const overtimeHours = workedHoursNum > 8 ? (workedHoursNum - 8).toFixed(2) : '0.00';

    const handleSaveCorrection = async (recordId, payload) => {
        await handleManualCorrection(recordId, payload);
        setIsEditModalOpen(false);
    };

    const handleForceCheckOutAction = async () => {
        if (window.confirm('Are you sure you want to force check out this open session?')) {
            await handleForceCheckOut(record.id);
        }
    };

    if (loading && !record) {
        return (
            <div className="attendance-detail-container">
                <Card style={{ padding: '48px', textAlign: 'center' }}>
                    <div
                        style={{ color: 'var(--color-text-secondary, #6b7280)', fontSize: '15px' }}
                    >
                        Loading attendance record details...
                    </div>
                </Card>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="attendance-detail-container">
                <div className="detail-nav-bar" style={{ marginBottom: '16px' }}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/dashboard/user/attendance')}
                    >
                        <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                        Back to Attendance
                    </Button>
                </div>
                <Card style={{ padding: '48px', textAlign: 'center' }}>
                    <EmptyState
                        icon={Calendar}
                        title="Attendance Record Not Found"
                        description="The requested attendance record could not be loaded or you do not have permission to view it."
                        variant="inline"
                        action={{
                            label: 'Back to Attendance',
                            onClick: () => navigate('/dashboard/user/attendance'),
                            icon: ArrowLeft,
                        }}
                    />
                </Card>
            </div>
        );
    }

    let badgeVariant = 'neutral';
    if (record.status === 'PRESENT') badgeVariant = 'success';
    else if (record.status === 'LATE') badgeVariant = 'warning';
    else if (record.status === 'ABSENT') badgeVariant = 'danger';
    else if (record.status === 'HALF_DAY') badgeVariant = 'warning';

    const punches = record.punches || [];

    // Map punches to shared Timeline component item format
    const timelineItems = punches.map((punch, index) => {
        const isOpen = !punch.checkOutTime;
        const workedStr = punch.workedHours
            ? `${parseFloat(punch.workedHours).toFixed(2)} hrs`
            : isOpen
              ? 'In Progress'
              : '0.00 hrs';
        return {
            title: `Punch Session #${index + 1}`,
            subtitle: `${formatDateTime(punch.checkInTime)} → ${punch.checkOutTime ? formatDateTime(punch.checkOutTime) : 'Session Active'}`,
            description: punch.notes ? `Note: "${punch.notes}"` : undefined,
            badge: workedStr,
            variant: isOpen ? 'primary' : 'success',
            active: isOpen,
        };
    });

    return (
        <div className="attendance-detail-container">
            {/* Top Navigation Bar */}
            <div className="detail-nav-bar">
                <div className="back-action-group">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/dashboard/user/attendance')}
                    >
                        <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                        Back to Attendance
                    </Button>
                    <h2 className="detail-heading">Attendance Record: {fullName}</h2>
                </div>

                <div className="detail-top-actions">
                    {isHR && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Edit3 size={15} style={{ marginRight: '6px' }} />
                            Edit Record
                        </Button>
                    )}

                    {isHR && hasOpenPunch && (
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleForceCheckOutAction}
                            isLoading={actionLoading}
                        >
                            <LogOut size={15} style={{ marginRight: '6px' }} />
                            Force Check Out
                        </Button>
                    )}
                </div>
            </div>

            {/* 2-Column Overview Cards */}
            <div className="detail-overview-grid">
                {/* Employee & Shift Summary Card */}
                <Card className="detail-card">
                    <CardHeader>
                        <CardTitle
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '15px',
                            }}
                        >
                            <User size={16} />
                            Employee & Shift Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Profile header with CircularAvatar */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                marginBottom: '16px',
                                paddingBottom: '16px',
                                borderBottom: '1px solid var(--color-border-subtle, #f3f4f6)',
                            }}
                        >
                            <CircularAvatar src={emp.profileImage} name={fullName} size="lg" />
                            <div>
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: 'var(--color-text-primary, #111827)',
                                    }}
                                >
                                    {fullName}
                                </h3>
                                <span
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--color-text-secondary, #6b7280)',
                                    }}
                                >
                                    {emp.employeeCode || record.employeeId?.slice(0, 8)} •{' '}
                                    {emp.email || 'No email'}
                                </span>
                            </div>
                        </div>

                        <div className="info-field-list">
                            <div className="info-row">
                                <span className="info-label">Full Name:</span>
                                <span className="info-val">{fullName}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Employee Code:</span>
                                <span className="info-val">
                                    {emp.employeeCode || record.employeeId?.slice(0, 8)}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Email Address:</span>
                                <span className="info-val">{emp.email || '—'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Shift Standard:</span>
                                <span className="info-val">General (09:00 AM - 06:00 PM)</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Current Status:</span>
                                <span className="info-val">
                                    <Badge variant={badgeVariant} showDot>
                                        {record.status}
                                    </Badge>
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Timing & Duration Details Card */}
                <Card className="detail-card">
                    <CardHeader>
                        <CardTitle
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '15px',
                            }}
                        >
                            <Clock size={16} />
                            Timing & Worked Duration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="info-field-list" style={{ marginTop: '6px' }}>
                            <div className="info-row">
                                <span className="info-label">Attendance Date:</span>
                                <span className="info-val">{record.attendanceDate}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">First Check-In:</span>
                                <span className="info-val">
                                    {formatDateTime(record.checkInTime)}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Final Check-Out:</span>
                                <span className="info-val">
                                    {record.checkOutTime
                                        ? formatDateTime(record.checkOutTime)
                                        : '— (Open Session)'}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Calculated Hours:</span>
                                <span className="info-val">
                                    <strong
                                        style={{
                                            fontSize: '15px',
                                            color: 'var(--color-primary, #3b82f6)',
                                        }}
                                    >
                                        {workedHoursNum.toFixed(2)} hrs
                                    </strong>
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Overtime Hours:</span>
                                <span className="info-val">{overtimeHours} hrs</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Punch Sessions Timeline Card */}
            <Card className="punches-timeline-card" style={{ marginTop: '16px' }}>
                <CardHeader>
                    <CardTitle
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '15px',
                        }}
                    >
                        <Clock size={16} />
                        Punch Sessions Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {punches.length === 0 ? (
                        <div
                            style={{
                                color: 'var(--color-text-secondary, #6b7280)',
                                fontSize: '13px',
                                padding: '12px 0',
                            }}
                        >
                            No discrete multi-punch breakdown recorded. Primary times: In:{' '}
                            {formatDateTime(record.checkInTime)} | Out:{' '}
                            {formatDateTime(record.checkOutTime)}
                        </div>
                    ) : (
                        <Timeline items={timelineItems} mode="vertical" align="left" />
                    )}
                </CardContent>
            </Card>

            {/* Compliance & Audit Trail Card */}
            <Card className="audit-trail-card" style={{ marginTop: '16px' }}>
                <CardHeader>
                    <CardTitle
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '15px',
                            color: 'var(--color-text-primary, #111827)',
                        }}
                    >
                        <ShieldCheck
                            size={18}
                            style={{
                                color: record.isManuallyCorrected
                                    ? 'var(--color-warning, #f59e0b)'
                                    : 'var(--color-success, #10b981)',
                            }}
                        />
                        Compliance & Audit Trail
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="audit-body">
                        <div>
                            Manual Correction:{' '}
                            <strong>
                                {record.isManuallyCorrected
                                    ? 'Yes (Adjusted by HR)'
                                    : 'No (Automated Punch)'}
                            </strong>
                        </div>
                        {record.isManuallyCorrected && (
                            <div
                                className="audit-reason"
                                style={{
                                    marginTop: '8px',
                                    padding: '10px 14px',
                                    background: 'var(--color-bg-subtle, #fef3c7)',
                                    borderRadius: '8px',
                                    color: 'var(--color-warning-text, #92400e)',
                                    fontSize: '13px',
                                }}
                            >
                                <strong>Reason for Correction:</strong>{' '}
                                {record.correctionReason || 'Not specified'}
                            </div>
                        )}
                        <div
                            className="audit-meta"
                            style={{
                                marginTop: '10px',
                                fontSize: '12px',
                                color: 'var(--color-text-secondary, #6b7280)',
                            }}
                        >
                            Last Modified: {formatDateTime(record.updatedAt || record.createdAt)}
                            {record.correctedBy && ` by Admin/HR User (${record.correctedBy})`}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* HR Manual Correction Modal */}
            {isHR && (
                <AttendanceCorrectionModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    record={record}
                    onSave={handleSaveCorrection}
                    isSubmitting={actionLoading}
                />
            )}
        </div>
    );
}
