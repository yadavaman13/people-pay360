import { useState } from 'react';
import { useUsers } from '../hooks';
import CreateUserModal from './CreateUserModal/CreateUserModal';
import Button from '@/components/Shared/Buttons/Button/Button';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/Shared/Feedback/Alert/Alert';
import {
    UserPlus,
    Search,
    Users,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Shield,
} from 'lucide-react';
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
    const {
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
    } = useUsers();

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div className="user-management-page">
            <header className="user-management-header">
                <div className="header-info">
                    <div className="title-row">
                        <Users className="header-icon" size={24} />
                        <h1 className="header-title">User Accounts</h1>
                    </div>
                    <p className="header-subtitle">
                        Create and manage team members, roles, and administrative access for
                        PeoplePay360.
                    </p>
                </div>

                <div className="header-actions">
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={fetchUsers}
                        disabled={loading}
                        className="refresh-btn"
                    >
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                    </Button>

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
                                onClick={() => setNotification(null)}
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

            <div className="user-filters-bar">
                <div className="search-input-box">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-field"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="search-clear"
                            onClick={() => setSearchQuery('')}
                        >
                            &times;
                        </button>
                    )}
                </div>

                <div className="role-filter-box">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="role-filter-select"
                    >
                        <option value="ALL">All Roles</option>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="HR_MANAGER">HR Manager</option>
                        <option value="HR_PAYROLL_USER">HR Payroll User</option>
                        <option value="HR_PAYROLL_MANAGER">HR Payroll Manager</option>
                        <option value="ADMIN">Administrator</option>
                    </select>
                </div>
            </div>

            <div className="users-table-card">
                {loading ? (
                    <div className="table-state-wrapper">
                        <RefreshCw size={28} className="spinning text-muted" />
                        <p>Loading user accounts...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="table-state-wrapper">
                        <Shield size={36} className="text-muted" />
                        <h3>No users found</h3>
                        <p>
                            {searchQuery || roleFilter !== 'ALL'
                                ? 'No accounts match the current filter criteria.'
                                : 'No user accounts available. Create your first user account.'}
                        </p>
                    </div>
                ) : (
                    <div className="table-scroll-container">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Email Verified</th>
                                    <th>Created At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => {
                                    const roleLabel = ROLE_DISPLAY_MAP[u.role] || u.role;
                                    const initials =
                                        `${(u.firstName || '')[0] || ''}${(u.lastName || '')[0] || ''}`.toUpperCase();

                                    return (
                                        <tr key={u.id}>
                                            <td className="user-name-cell">
                                                <div className="avatar-circle">{initials}</div>
                                                <div className="name-details">
                                                    <span className="full-name">
                                                        {u.firstName} {u.lastName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="user-email-cell">{u.email}</td>
                                            <td className="user-role-cell">
                                                <span className="role-text">{roleLabel}</span>
                                            </td>
                                            <td>
                                                <Badge
                                                    variant={u.isActive ? 'success' : 'neutral'}
                                                    type="light"
                                                >
                                                    {u.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <span
                                                    className={`verification-tag ${u.emailVerified ? 'verified' : 'unverified'}`}
                                                >
                                                    {u.emailVerified ? 'Verified' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="date-cell">{formatDate(u.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
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
