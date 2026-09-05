import { createContext, useState, useMemo } from 'react';

export const UsersContext = createContext(null);

/**
 * UsersProvider — Pure State Container for User Management feature.
 * Follows the 4-layer architecture (State Layer).
 *
 * Exposes:
 * 1. Read-only values to UI layer via useContext(UsersContext)
 * 2. State setters to Hooks layer via useUsers()
 */
export function UsersProvider({ children }) {
    const [users, setUsers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalCount: 0,
    });
    const [tableParams, setTableParams] = useState({
        page: 1,
        limit: 10,
        search: '',
        sortBy: 'createdAt',
        sortDir: 'desc',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);

    // Derived statistics
    const activeUsersCount = useMemo(() => users.filter((u) => u.isActive).length, [users]);

    const verifiedUsersCount = useMemo(() => users.filter((u) => u.emailVerified).length, [users]);

    const value = useMemo(
        () => ({
            // 1. Read-only values (consumed by UI via useContext)
            users,
            totalCount,
            pagination,
            tableParams,
            loading,
            error,
            notification,
            activeUsersCount,
            verifiedUsersCount,

            // 2. Setters (consumed by Hooks only)
            setUsers,
            setTotalCount,
            setPagination,
            setTableParams,
            setLoading,
            setError,
            setNotification,
        }),
        [
            users,
            totalCount,
            pagination,
            tableParams,
            loading,
            error,
            notification,
            activeUsersCount,
            verifiedUsersCount,
        ],
    );

    return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}
