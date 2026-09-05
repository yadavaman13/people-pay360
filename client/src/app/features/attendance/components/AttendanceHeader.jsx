import Button from '@/components/Shared/Buttons/Button/Button';
import { RotateCw, Download } from 'lucide-react';

export default function AttendanceHeader({
    isHR = false,
    onRefresh,
    onExport,
    isRefreshing = false,
}) {
    return (
        <header className="attendance-header">
            <div className="header-text">
                <h1 className="page-title">
                    {isHR ? 'Attendance & Time Tracking' : 'My Attendance'}
                </h1>
                <p className="page-subtitle">
                    {isHR
                        ? 'Company-wide attendance monitoring, shift compliance, and employee punch records'
                        : 'View and track your daily work hours, punch history, and monthly shift records'}
                </p>
            </div>

            <div className="header-actions">
                {onRefresh && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                    >
                        <RotateCw
                            size={16}
                            className={isRefreshing ? 'animate-spin' : ''}
                            style={{ marginRight: '6px' }}
                        />
                        Refresh
                    </Button>
                )}

                {onExport && (
                    <Button variant="secondary" size="sm" onClick={onExport}>
                        <Download size={16} style={{ marginRight: '6px' }} />
                        Export Records
                    </Button>
                )}
            </div>
        </header>
    );
}
