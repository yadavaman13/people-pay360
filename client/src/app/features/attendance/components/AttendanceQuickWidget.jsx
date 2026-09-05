import { useState, useEffect } from 'react';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import CircularAvatar from '@/components/Shared/DataDisplay/CircularAvatar/CircularAvatar';
import { Card, CardContent } from '@/components/Shared/DataDisplay/Card/Card';
import Button from '@/components/Shared/Buttons/Button/Button';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { Clock, LogIn, LogOut, Info, ShieldCheck } from 'lucide-react';

/**
 * Formats seconds into HH:MM:SS display string
 */
function formatDuration(seconds) {
    if (seconds < 0) seconds = 0;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
}

export default function AttendanceQuickWidget({
    todayStatus,
    onCheckIn,
    onCheckOut,
    isActionLoading = false,
}) {
    const { user } = useAuth();
    const isCheckedIn = !!todayStatus?.isCurrentlyCheckedIn;
    const activePunch = todayStatus?.activePunch;

    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [notes, setNotes] = useState('');

    // ── Live session stopwatch timer ─────────────────────────────────────────
    useEffect(() => {
        if (!isCheckedIn || !activePunch?.checkInTime) {
            return;
        }

        const intervalId = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(intervalId);
    }, [isCheckedIn, activePunch?.checkInTime]);

    const elapsedSeconds =
        isCheckedIn && activePunch?.checkInTime
            ? Math.max(
                  0,
                  Math.floor((currentTime - new Date(activePunch.checkInTime).getTime()) / 1000),
              )
            : 0;

    // ── Check-In handler ─────────────────────────────────────────────────────
    const handleCheckIn = async () => {
        try {
            await onCheckIn(notes);
            setNotes('');
        } catch {
            // Errors are handled inside onCheckIn (toast displayed)
        }
    };

    // ── Check-Out handler ────────────────────────────────────────────────────
    const handleCheckOut = async () => {
        try {
            await onCheckOut(notes);
            setNotes('');
        } catch {
            // Errors are handled inside onCheckOut (toast displayed)
        }
    };

    const remainingPunches = todayStatus?.remainingPunches ?? 3;
    const punchesUsed = todayStatus?.punchesUsed ?? 0;
    const maxPunches = todayStatus?.maxPunchesPerDay ?? 3;
    const canPunchIn = todayStatus?.canCheckIn ?? (!isCheckedIn && remainingPunches > 0);

    const userFullName =
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Welcome Back';
    const profileImage = todayStatus?.employee?.profileImage || user?.profileImage;

    return (
        <Card className={`quick-punch-widget ${isCheckedIn ? 'is-checked-in' : ''}`}>
            <CardContent className="widget-content-grid">
                {/* Left: User Profile + Live Stopwatch */}
                <div className="punch-timer-section">
                    {/* User Profile Bar */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px',
                        }}
                    >
                        <CircularAvatar
                            src={profileImage}
                            name={userFullName}
                            size="lg"
                            status={isCheckedIn ? 'online' : 'offline'}
                        />
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: 'var(--color-text-primary, #111827)',
                                    }}
                                >
                                    {userFullName}
                                </h3>
                                <Badge
                                    variant={isCheckedIn ? 'success' : 'neutral'}
                                    size="sm"
                                    showDot
                                >
                                    {isCheckedIn ? 'Checked In' : 'Not Clocked In'}
                                </Badge>
                            </div>
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: 'var(--color-text-secondary, #6b7280)',
                                }}
                            >
                                {user?.role || 'EMPLOYEE'} •{' '}
                                {todayStatus?.employee?.employeeCode || 'Self Service'}
                            </span>
                        </div>
                    </div>

                    <div className="timer-clock">
                        {isCheckedIn ? formatDuration(elapsedSeconds) : '00h 00m 00s'}
                    </div>

                    <div className="timer-caption">
                        {isCheckedIn && activePunch?.checkInTime
                            ? `Started at ${new Date(activePunch.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Punch in to start recording your active work session'}
                    </div>
                </div>

                {/* Right: Actions, Notes & Shift Metadata */}
                <div className="punch-action-section">
                    <div className="shift-meta-pills">
                        <span className="meta-pill">
                            <Clock size={13} />
                            Shift: 09:00 AM - 06:00 PM
                        </span>
                        <span className="meta-pill">
                            <Info size={13} />
                            Today:{' '}
                            {todayStatus?.totalWorkedHours
                                ? `${Number(todayStatus.totalWorkedHours).toFixed(2)} hrs`
                                : '0.00 hrs'}
                        </span>
                        <span className="meta-pill">
                            <ShieldCheck size={13} />
                            Punches: {punchesUsed}/{maxPunches} ({remainingPunches} left)
                        </span>
                    </div>

                    <div className="notes-input-wrapper">
                        <InputField
                            id="punchNotes"
                            name="punchNotes"
                            placeholder={
                                isCheckedIn
                                    ? 'Optional check-out notes or handover comment...'
                                    : 'Optional check-in note (e.g. Remote, On-site)...'
                            }
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isActionLoading}
                        />
                    </div>

                    {/* Both buttons always visible — Check-Out disabled until checked in */}
                    <div className="punch-button-cluster">
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            className="punch-submit-btn"
                            onClick={handleCheckIn}
                            isLoading={isActionLoading && !isCheckedIn}
                            disabled={isActionLoading || isCheckedIn || !canPunchIn}
                        >
                            <LogIn size={16} style={{ marginRight: '8px' }} />
                            Check In Shift
                        </Button>

                        <Button
                            type="button"
                            variant="danger"
                            size="md"
                            className="punch-submit-btn"
                            onClick={handleCheckOut}
                            isLoading={isActionLoading && isCheckedIn}
                            disabled={isActionLoading || !isCheckedIn}
                        >
                            <LogOut size={16} style={{ marginRight: '8px' }} />
                            Check Out Shift
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
