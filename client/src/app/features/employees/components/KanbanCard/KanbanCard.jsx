import React, { useState } from 'react';
import { getAvatarUrl } from '@/utils/avatar';
import './KanbanCard.scss';

/**
 * KanbanCard — Clean, high-impact employee card matching Image 1 wireframe.
 *
 * Displays:
 * - Rounded square avatar box with ImageKit profile image or fallback initials
 * - Full name & Job position
 * - Department name
 * - Status pill with indicator dot (● Active)
 */
function KanbanCard({ employee, onClick }) {
    const [imgError, setImgError] = useState(false);

    if (!employee) return null;

    const firstName = employee.firstName || '';
    const lastName = employee.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || employee.name || 'Unnamed Employee';

    // Initials (e.g. "AM")
    const initials =
        `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() ||
        fullName.slice(0, 2).toUpperCase() ||
        'EM';

    const avatarSrc = getAvatarUrl(employee.profileImage || employee.user?.profileImage);

    const jobTitle =
        employee.jobPosition?.title || employee.jobTitle || employee.position || 'Not Assigned';

    const departmentName =
        employee.department?.name || employee.departmentName || employee.department || 'General';

    const rawStatus = (employee.status || 'ACTIVE').toLowerCase();
    const isStatusActive = rawStatus === 'active';
    const isStatusDraft = rawStatus === 'draft';
    const isStatusSuspended = rawStatus === 'suspended';

    const displayStatus =
        employee.status === 'ACTIVE'
            ? 'Active'
            : employee.status === 'DRAFT'
              ? 'Draft'
              : employee.status === 'SUSPENDED'
                ? 'Suspended'
                : employee.status === 'ARCHIVED'
                  ? 'Archived'
                  : employee.status || 'Active';

    return (
        <div
            className="employee-kanban-card"
            onClick={() => onClick && onClick(employee)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick && onClick(employee);
                }
            }}
        >
            <div className="employee-kanban-card__header">
                <div className="employee-kanban-card__avatar">
                    {!imgError && avatarSrc ? (
                        <img
                            src={avatarSrc}
                            alt={fullName}
                            className="avatar-img"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                <div className="employee-kanban-card__meta">
                    <h3 className="employee-kanban-card__name" title={fullName}>
                        {fullName}
                    </h3>
                    <p className="employee-kanban-card__title" title={jobTitle}>
                        {jobTitle}
                    </p>
                </div>
            </div>

            <div className="employee-kanban-card__footer">
                <span className="employee-kanban-card__department">{departmentName}</span>
                <div
                    className={`employee-kanban-card__status status--${
                        isStatusActive
                            ? 'active'
                            : isStatusDraft
                              ? 'draft'
                              : isStatusSuspended
                                ? 'suspended'
                                : 'neutral'
                    }`}
                >
                    <span className="status-dot" />
                    <span className="status-label">{displayStatus}</span>
                </div>
            </div>
        </div>
    );
}

export default React.memo(KanbanCard);
