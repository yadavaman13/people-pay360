import { useState, useEffect, useMemo, useCallback } from 'react';
import { adminListUsers } from '../services/users.api';

/**
 * useUsers — Custom hook for managing the User Accounts table state and actions.
 * Follows the 4-layer architecture (UI -> Hook -> State -> API).
 *
 * @returns {object} Table data, filter states, loading/error states, and handlers
 */
export function useUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [notification, setNotification] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminListUsers(false);
            setUsers(data.users || []);
        } catch (err) {
            console.error('Failed to load users:', err);
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUserCreated = useCallback(
        (newUser, emailFailed) => {
            fetchUsers();
            if (emailFailed) {
                setNotification({
                    type: 'warning',
                    title: 'User Created (Email Failed)',
                    message: `Account created for ${newUser.firstName} ${newUser.lastName} (${newUser.email}), but credentials email failed to deliver. Instruct the user to use the Forgot Password flow.`,
                });
            } else {
                setNotification({
                    type: 'success',
                    title: 'User Created Successfully',
                    message: `Account created for ${newUser.firstName} ${newUser.lastName}. Login credentials and temporary password were sent to ${newUser.email}.`,
                });
            }
        },
        [fetchUsers],
    );

    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch =
                !searchQuery ||
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, searchQuery, roleFilter]);

    return {
        users,
        filteredUsers,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        roleFilter,
        setRoleFilter,
        notification,
        setNotification,
        fetchUsers,
        handleUserCreated,
    };
}
