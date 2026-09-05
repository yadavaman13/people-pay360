import { useContext, useCallback, useRef, useEffect } from 'react';
import { UsersContext } from '../context/users.context';
import { adminListUsers } from '../services/users.api';

const SORT_KEY_MAP = {
    fullName: 'firstName',
    roleName: 'role',
    statusName: 'isActive',
    verifiedName: 'emailVerified',
};

const ROLE_NAME_TO_ENUM = {
    Admin: 'ADMIN',
    'HR Payroll Manager': 'HR_PAYROLL_MANAGER',
    'HR Manager': 'HR_MANAGER',
    'HR Payroll User': 'HR_PAYROLL_USER',
    Employee: 'EMPLOYEE',
};

/**
 * useUsers — Orchestrates async API calls and updates the State layer (UsersContext).
 * Strictly follows the 4-layer architecture (Hooks Layer) per FEATURE_DEVELOPMENT_GUIDE.md.
 *
 * Exports ACTION HANDLERS ONLY without duplicating state variables or setters.
 *
 * @returns {object} Action handlers: loadUsers, handleTableChange, handleUserCreated, dismissNotification
 */
export function useUsers() {
    const context = useContext(UsersContext);
    if (!context) {
        throw new Error('useUsers must be used within a UsersProvider');
    }

    // Hook consumes setters and tableParams from the State layer
    const {
        tableParams,
        setUsers,
        setTotalCount,
        setPagination,
        setTableParams,
        setLoading,
        setError,
        setNotification,
    } = context;

    const searchDebounceTimerRef = useRef(null);
    const latestParamsRef = useRef(tableParams);

    // Keep latestParamsRef synchronized with state tableParams
    useEffect(() => {
        latestParamsRef.current = tableParams;
    }, [tableParams]);

    // Clear active timer on component unmount
    useEffect(() => {
        return () => {
            if (searchDebounceTimerRef.current) {
                clearTimeout(searchDebounceTimerRef.current);
            }
        };
    }, []);

    const loadUsers = useCallback(
        async (overrideParams = {}) => {
            const mergedParams = {
                ...latestParamsRef.current,
                ...overrideParams,
            };
            latestParamsRef.current = mergedParams;

            setLoading(true);
            setError(null);

            try {
                const data = await adminListUsers(mergedParams);
                const userList = data.users || [];
                setUsers(userList);

                if (data.pagination) {
                    setTotalCount(data.pagination.totalCount ?? data.pagination.total ?? 0);
                    setPagination(data.pagination);
                } else {
                    setTotalCount(userList.length);
                }

                setTableParams(mergedParams);
                return data;
            } catch (err) {
                console.error('Failed to load users:', err);
                const msg = err.response?.data?.message || err.message || 'Failed to load users';
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [setLoading, setError, setUsers, setTotalCount, setPagination, setTableParams],
    );

    const handleTableChange = useCallback(
        ({ page, rowsPerPage, searchTerm, sortConfig, columnFilters }) => {
            const mappedSortKey = sortConfig?.key
                ? SORT_KEY_MAP[sortConfig.key] || sortConfig.key
                : 'createdAt';
            const sortDir = sortConfig?.direction || 'desc';
            const trimmedSearch = typeof searchTerm === 'string' ? searchTerm.trim() : '';

            // Parse columnFilters
            let parsedRole;
            if (columnFilters?.roleName && columnFilters.roleName.length === 1) {
                const selectedRoleName = columnFilters.roleName[0];
                parsedRole = ROLE_NAME_TO_ENUM[selectedRoleName] || selectedRoleName;
            }

            let parsedIsActive;
            if (columnFilters?.statusName && columnFilters.statusName.length === 1) {
                parsedIsActive = columnFilters.statusName[0] === 'Active';
            }

            let parsedEmailVerified;
            if (columnFilters?.verifiedName && columnFilters.verifiedName.length === 1) {
                parsedEmailVerified = columnFilters.verifiedName[0] === 'Verified';
            }

            const isSearchChanged = trimmedSearch !== (latestParamsRef.current.search || '');
            const isFilterChanged =
                parsedRole !== latestParamsRef.current.role ||
                parsedIsActive !== latestParamsRef.current.isActive ||
                parsedEmailVerified !== latestParamsRef.current.emailVerified;

            if (isSearchChanged) {
                // Keystroke search: debounce by 300ms to avoid request flooding
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }

                searchDebounceTimerRef.current = setTimeout(() => {
                    loadUsers({
                        page: 1, // Reset to page 1 on new search
                        limit: rowsPerPage || latestParamsRef.current.limit || 10,
                        search: trimmedSearch,
                        sortBy: mappedSortKey,
                        sortDir,
                        role: parsedRole,
                        isActive: parsedIsActive,
                        emailVerified: parsedEmailVerified,
                    });
                }, 300);
            } else {
                // Immediate navigation on page change, page-size change, sort change, or filter change
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }

                loadUsers({
                    page: isFilterChanged ? 1 : page || 1,
                    limit: rowsPerPage || latestParamsRef.current.limit || 10,
                    search: trimmedSearch,
                    sortBy: mappedSortKey,
                    sortDir,
                    role: parsedRole,
                    isActive: parsedIsActive,
                    emailVerified: parsedEmailVerified,
                });
            }
        },
        [loadUsers],
    );

    const handleUserCreated = useCallback(
        async (newUser, emailFailed) => {
            await loadUsers();
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
        [loadUsers, setNotification],
    );

    const dismissNotification = useCallback(() => {
        setNotification(null);
    }, [setNotification]);

    // Return ACTION HANDLERS ONLY per FEATURE_DEVELOPMENT_GUIDE.md
    return {
        loadUsers,
        handleTableChange,
        handleUserCreated,
        dismissNotification,
    };
}
