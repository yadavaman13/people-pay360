import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { getAvatarUrl } from '@/utils/avatar';

/**
 * Format raw role string into clean, human-readable display title
 *
 * @param {string} role
 * @returns {string}
 */
export function formatRoleLabel(role) {
    if (!role) return 'Member';
    const normalized = role.toUpperCase();
    switch (normalized) {
        case 'ADMIN':
            return 'Administrator';
        case 'HR_MANAGER':
            return 'HR Manager';
        case 'HR_PAYROLL_MANAGER':
            return 'Payroll Manager';
        case 'HR_PAYROLL_USER':
            return 'Payroll User';
        case 'EMPLOYEE':
            return 'Employee';
        default:
            return role
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ');
    }
}

/**
 * Derives a display-ready profileData object from the authenticated user.
 * Any component that needs profile display info should call this hook directly
 * instead of receiving profileData as a prop.
 *
 * @returns {{ id, name, role, formattedRole, username, avatarUrl, initials, email }}
 */
export function useDerivedProfile() {
    const { user } = useAuth();

    return useMemo(() => {
        const name =
            user && user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '';
        const email = user ? user.email || '' : '';
        const role = user ? user.role || 'USER' : 'USER';

        const nameParts = name.trim().split(/\s+/);
        const initials =
            nameParts.length >= 2
                ? (nameParts[0][0] || '') + (nameParts[1][0] || '')
                : nameParts[0]
                  ? nameParts[0][0] || ''
                  : 'U';

        const username = email ? `@${email.split('@')[0]}` : '';

        return {
            id: user?.id || '',
            name,
            role,
            formattedRole: formatRoleLabel(role),
            username,
            avatarUrl: getAvatarUrl(user?.profileImage),
            initials: initials.toUpperCase(),
            email,
        };
    }, [user]);
}
