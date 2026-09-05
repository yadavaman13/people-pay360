import Button from '@/components/Shared/Buttons/Button/Button';
import { RotateCw, Download } from 'lucide-react';

export default function AttendanceHeader({
    isHR = false,
    title,
    subtitle,
    onRefresh,
    onExport,
    isRefreshing = false,
}) {
    const defaultTitle = isHR ? 'Attendance & Time Tracking' : 'My Attendance';
    const defaultSubtitle = isHR
        ? 'Company-wide attendance monitoring, shift compliance, and employee punch records'
        : 'View and track your daily work hours, punch history, and monthly shift records';

    return (
        <header className="attendance-header">
            <div className="header-info">
                <div className="title-row">
                    <h1 className="header-title">{title || defaultTitle}</h1>
                </div>
                <p className="header-subtitle">{subtitle || defaultSubtitle}</p>
            </div>

            <div className="header-actions">
                {onRefresh && (
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="refresh-btn"
                    >
                        <RotateCw
                            size={16}
                            className={isRefreshing ? 'animate-spin' : ''}
                            style={{ marginRight: '6px' }}
                        />
                        <span>Refresh</span>
                    </Button>
                )}

                {onExport && (
                    <Button variant="secondary" size="md" onClick={onExport} className="export-btn">
                        <Download size={16} style={{ marginRight: '6px' }} />
                        <span>Export</span>
                    </Button>
                )}
            </div>
        </header>
    );
}
