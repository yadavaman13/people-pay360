import { useState, useMemo } from 'react';
import { getAvatarUrl, DEFAULT_AVATAR_URL } from '@/utils/avatar';
import './CircularAvatar.scss';

/**
 * Generate 2-letter uppercase initials from full name
 */
function getInitials(name = '') {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * CircularAvatar Component
 * Follows specs from docs/client-docs/components/data-display/CircularAvatar.md
 *
 * @param {string} src - Image URL for avatar
 * @param {string} name - User's full name (for initials and alt text)
 * @param {'sm' | 'md' | 'lg' | 'xl'} size - Avatar diameter preset (default: 'md')
 * @param {'online' | 'offline' | 'busy' | 'away'} status - Optional miniature status dot
 * @param {string} className - Additional CSS class
 */
export default function CircularAvatar({
    src = '',
    name = '',
    size = 'md',
    status,
    className = '',
    alt,
    ...props
}) {
    const [prevSrc, setPrevSrc] = useState(src);
    const [imageError, setImageError] = useState(false);

    // Reset error when src changes
    if (src !== prevSrc) {
        setPrevSrc(src);
        setImageError(false);
    }

    const resolvedSrc = useMemo(() => {
        if (!src) return null;
        return getAvatarUrl(src);
    }, [src]);

    const initials = useMemo(() => getInitials(name), [name]);
    const displayAlt = alt || name || 'User avatar';

    return (
        <div
            className={`shared-circular-avatar size-${size} ${className}`}
            title={name || displayAlt}
            {...props}
        >
            <div className="avatar-inner">
                {resolvedSrc && !imageError ? (
                    <img
                        src={resolvedSrc}
                        alt={displayAlt}
                        className="avatar-img"
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                ) : initials ? (
                    <span className="avatar-fallback">{initials}</span>
                ) : (
                    <img
                        src={DEFAULT_AVATAR_URL}
                        alt={displayAlt}
                        className="avatar-img"
                        loading="lazy"
                    />
                )}
            </div>

            {status && (
                <span
                    className={`avatar-status-dot status-${status}`}
                    aria-label={`Status: ${status}`}
                />
            )}
        </div>
    );
}
