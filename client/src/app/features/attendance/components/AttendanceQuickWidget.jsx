import { useState, useEffect } from 'react';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import CircularAvatar from '@/components/Shared/DataDisplay/CircularAvatar/CircularAvatar';
import { Card, CardContent } from '@/components/Shared/DataDisplay/Card/Card';
import Button from '@/components/Shared/Buttons/Button/Button';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { Clock, LogIn, LogOut, CheckCircle2 } from 'lucide-react';

/**
 * Splits seconds into padded { hrs, mins, secs }
 */
function parseDuration(seconds) {
    const s = Math.max(0, seconds || 0);
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(Math.floor(s % 60)).padStart(2, '0');
    return { hrs, mins, secs };
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

    const { hrs, mins, secs } = parseDuration(elapsedSeconds);

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
                {/* Left: User Profile + Modern Stopwatch */}
                <div className="punch-timer-section">
                    <div className="widget-profile-row">
                        <CircularAvatar src={profileImage} name={userFullName} size="md" />
                        <div className="profile-details">
                            <div className="name-badge-row">
                                <h3 className="widget-user-name">{userFullName}</h3>
                                <Badge
                                    variant={isCheckedIn ? 'success' : 'neutral'}
                                    type="light"
                                    showDot
                                    className="widget-status-badge"
                                >
                                    {isCheckedIn ? 'Clocked In' : 'Not Clocked In'}
                                </Badge>
                            </div>
                            <span className="widget-user-meta">
                                {user?.role || 'EMPLOYEE'} •{' '}
                                {todayStatus?.employee?.employeeCode || 'Self Service'}
                            </span>
                        </div>
                    </div>

                    <div
                        className="stopwatch-display"
                        aria-label={`Elapsed time: ${hrs}h ${mins}m ${secs}s`}
                    >
                        <div className="stopwatch-segment">
                            <span className="stopwatch-val">{hrs}</span>
                            <span className="stopwatch-unit">h</span>
                        </div>
                        <span className="stopwatch-sep">:</span>
                        <div className="stopwatch-segment">
                            <span className="stopwatch-val">{mins}</span>
                            <span className="stopwatch-unit">m</span>
                        </div>
                        <span className="stopwatch-sep">:</span>
                        <div className="stopwatch-segment">
                            <span className="stopwatch-val">{secs}</span>
                            <span className="stopwatch-unit">s</span>
                        </div>
                    </div>

                    <div className="timer-caption">
                        {isCheckedIn && activePunch?.checkInTime
                            ? `Started at ${new Date(activePunch.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Punch in to start recording your active work session'}
                    </div>
                </div>

                {/* Right: Actions, Notes & Shift Metadata */}
                <div className="punch-action-section">
                    <div className="shift-meta-strip">
                        <span className="meta-chip">
                            <Clock size={12} className="meta-icon" />
                            Shift: 09:00 AM - 06:00 PM
                        </span>
                        <span className="meta-chip">
                            Today:{' '}
                            {todayStatus?.totalWorkedHours
                                ? `${Number(todayStatus.totalWorkedHours).toFixed(2)} hrs`
                                : '0.00 hrs'}
                        </span>
                        <span className="meta-chip">
                            <CheckCircle2 size={12} className="meta-icon" />
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

                    <div className="punch-button-cluster">
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            className="punch-submit-btn check-in-btn"
                            onClick={handleCheckIn}
                            loading={isActionLoading && !isCheckedIn}
                            disabled={isActionLoading || isCheckedIn || !canPunchIn}
                            icon={<LogIn size={15} />}
                        >
                            Check In Shift
                        </Button>

                        <Button
                            type="button"
                            variant={isCheckedIn ? 'danger' : 'secondary'}
                            size="md"
                            className="punch-submit-btn check-out-btn"
                            onClick={handleCheckOut}
                            loading={isActionLoading && isCheckedIn}
                            disabled={isActionLoading || !isCheckedIn}
                            icon={<LogOut size={15} />}
                        >
                            Check Out Shift
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
