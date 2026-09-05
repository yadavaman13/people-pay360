import { useState, useEffect, useMemo, useContext } from 'react';
import { UsersContext } from '../context/users.context';
import { useUsers } from '../hooks';
import CreateUserModal from './CreateUserModal/CreateUserModal';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Button from '@/components/Shared/Buttons/Button/Button';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/Shared/Feedback/Alert/Alert';
import { UserPlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import './UserManagement.scss';

const ROLE_DISPLAY_MAP = {
    EMPLOYEE: 'Employee',
    HR_MANAGER: 'HR Manager',
    HR_PAYROLL_USER: 'HR Payroll User',
    HR_PAYROLL_MANAGER: 'HR Payroll Manager',
    ADMIN: 'Admin',
};

function UserManagement() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // 1. Read Path: Read state directly from UsersContext per FEATURE_DEVELOPMENT_GUIDE.md
    const { users, totalCount, loading, error, notification } = useContext(UsersContext);

    // 2. Action Path: Call useUsers for action handlers only
    const { loadUsers, handleTableChange, handleUserCreated, dismissNotification } = useUsers();

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // Augmented dataset for searching and sorting in AdvancedTable
    const tableData = useMemo(() => {
        return users.map((u) => {
            const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—';
            const roleName = ROLE_DISPLAY_MAP[u.role] || u.role;
            const statusName = u.isActive ? 'Active' : 'Inactive';
            const verifiedName = u.emailVerified ? 'Verified' : 'Pending';

            return {
                ...u,
                fullName,
                roleName,
                statusName,
                verifiedName,
            };
        });
    }, [users]);

    const columns = useMemo(
        () => [
            {
                key: 'fullName',
                label: 'User',
                sortable: true,
                render: (_val, row) => {
                    const initials =
                        `${(row.firstName || '')[0] || ''}${(row.lastName || '')[0] || ''}`.toUpperCase();
                    return (
                        <div className="user-name-cell">
                            <div className="avatar-circle">{initials}</div>
                            <div className="name-details">
                                <span className="full-name">{row.fullName}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'email',
                label: 'Email',
                sortable: true,
                render: (val) => <span className="user-email-cell">{val}</span>,
            },
            {
                key: 'roleName',
                label: 'Role',
                sortable: true,
                render: (val) => (
                    <span className="user-role-cell">
                        <span className="role-text">{val}</span>
                    </span>
                ),
            },
            {
                key: 'statusName',
                label: 'Status',
                sortable: true,
                render: (_val, row) => (
                    <Badge variant={row.isActive ? 'success' : 'neutral'} type="light">
                        {row.statusName}
                    </Badge>
                ),
            },
            {
                key: 'verifiedName',
                label: 'Email Verified',
                sortable: true,
                render: (_val, row) => (
                    <span
                        className={`verification-tag ${row.emailVerified ? 'verified' : 'unverified'}`}
                    >
                        {row.verifiedName}
                    </span>
                ),
            },
            {
                key: 'createdAt',
                label: 'Created At',
                sortable: true,
                render: (val) => <span className="date-cell">{formatDate(val)}</span>,
            },
        ],
        [],
    );

    const filterConfig = useMemo(
        () => [
            {
                key: 'roleName',
                label: 'Role',
                type: 'select',
                options: [
                    'Admin',
                    'HR Payroll Manager',
                    'HR Manager',
                    'HR Payroll User',
                    'Employee',
                ],
            },
            {
                key: 'statusName',
                label: 'Status',
                type: 'select',
                options: ['Active', 'Inactive'],
            },
            {
                key: 'verifiedName',
                label: 'Email Verified',
                type: 'select',
                options: ['Verified', 'Pending'],
            },
        ],
        [],
    );

    return (
        <div className="user-management-page">
            <header className="user-management-header">
                <div className="header-info">
                    <div className="title-row">
                        <h1 className="header-title">User Accounts</h1>
                    </div>
                    <p className="header-subtitle">
                        Create and manage team members, roles, and administrative access for
                        PeoplePay360.
                    </p>
                </div>

                <div className="header-actions">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="create-user-btn"
                    >
                        <UserPlus size={16} />
                        <span>Create User</span>
                    </Button>
                </div>
            </header>

            {notification && (
                <div className="notification-banner-wrapper">
                    <Alert
                        variant={notification.type === 'success' ? 'success' : 'warning'}
                        className="notification-banner"
                    >
                        <div className="banner-inner">
                            {notification.type === 'success' ? (
                                <CheckCircle2 className="banner-icon" size={20} />
                            ) : (
                                <AlertTriangle className="banner-icon" size={20} />
                            )}
                            <div className="banner-text">
                                <AlertTitle>{notification.title}</AlertTitle>
                                <AlertDescription>{notification.message}</AlertDescription>
                            </div>
                            <button
                                type="button"
                                className="banner-dismiss"
                                onClick={dismissNotification}
                            >
                                &times;
                            </button>
                        </div>
                    </Alert>
                </div>
            )}

            {error && (
                <Alert variant="danger" className="error-banner">
                    <AlertTitle>Error Loading Users</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="user-table-wrapper">
                <AdvancedTable
                    columns={columns}
                    data={tableData}
                    loading={loading}
                    serverSide={true}
                    totalCount={totalCount}
                    onTableChange={handleTableChange}
                    searchable={true}
                    searchPlaceholder="Search users by name, email, or role..."
                    showColumnSorting={true}
                    showSortDropdown={true}
                    showFilter={true}
                    filterConfig={filterConfig}
                    showRefresh={true}
                    onRefresh={() => loadUsers()}
                    showRowsPerPage={true}
                    showResultsCount={true}
                    showSerialNumber={false}
                    initialRowsPerPage={10}
                />
            </div>

            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onUserCreated={handleUserCreated}
            />
        </div>
    );
}

export default UserManagement;
