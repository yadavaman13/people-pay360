import { useEffect, useRef } from 'react';
import { Bell, CheckCheck, ArrowRight } from 'lucide-react';
import './NotificationPopover.scss';

const PREVIEW_LIMIT = 3;

function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationPopover({ notifications = [], onViewAll, onClose }) {
    const ref = useRef(null);
    const unread = notifications.filter((n) => n.unread);
    const preview = notifications.slice(0, PREVIEW_LIMIT);
    const hasMore = notifications.length > PREVIEW_LIMIT;

    // Close on outside click
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                onClose?.();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    return (
        <div className="notif-popover" ref={ref} role="dialog" aria-label="Notifications">
            {/* Header */}
            <div className="notif-popover__header">
                <span className="notif-popover__title">
                    Notifications
                    {unread.length > 0 && (
                        <span className="notif-popover__unread-chip">{unread.length} new</span>
                    )}
                </span>
            </div>

            {/* Body */}
            <div className="notif-popover__body">
                {notifications.length === 0 ? (
                    <div className="notif-popover__empty">
                        <Bell size={28} strokeWidth={1.4} className="notif-popover__empty-icon" />
                        <p className="notif-popover__empty-title">You&apos;re all caught up!</p>
                        <p className="notif-popover__empty-desc">
                            No new activity yet — we&apos;ll ping you when something needs your
                            attention.
                        </p>
                    </div>
                ) : (
                    <ul className="notif-popover__list">
                        {preview.map((item) => (
                            <li
                                key={item.id}
                                className={`notif-popover__item${item.unread ? ' is-unread' : ''}`}
                            >
                                <div className="notif-popover__item-dot" />
                                <div className="notif-popover__item-content">
                                    <p className="notif-popover__item-text">
                                        <strong>{item.actor}</strong> {item.action}{' '}
                                        <em>{item.target}</em>
                                    </p>
                                    <span className="notif-popover__item-time">
                                        {item.timestamp ? timeAgo(item.timestamp) : ''}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer — only when there are more than PREVIEW_LIMIT */}
            {hasMore && (
                <div className="notif-popover__footer">
                    <button
                        type="button"
                        className="notif-popover__view-all"
                        onClick={() => {
                            onClose?.();
                            onViewAll?.();
                        }}
                    >
                        <CheckCheck size={14} />
                        View all {notifications.length} notifications
                        <ArrowRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
