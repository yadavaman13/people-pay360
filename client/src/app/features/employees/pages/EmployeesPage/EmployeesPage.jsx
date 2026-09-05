import { useEffect, useMemo, useContext, useState } from 'react';
import { useNavigate } from 'react-router';
import { EmployeesContext } from '../../context/employees.context';
import { useEmployees } from '../../hooks';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import KanbanGrid from '../../components/KanbanGrid/KanbanGrid';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Button from '@/components/Shared/Buttons/Button/Button';
import { getAvatarUrl } from '@/utils/avatar';
import { Plus, Search, AlertCircle, CheckCircle } from 'lucide-react';
import './EmployeesPage.scss';

function EmployeesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const role = (user?.role || '').toUpperCase();
    const canCreateEmployee = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(role);

    // 1. Read Path: Read state directly from EmployeesContext per FEATURE_DEVELOPMENT_GUIDE.md
    const { employees, totalCount, tableParams, viewMode, metadata, loading, notification } =
        useContext(EmployeesContext);

    // 2. Action Path: Call useEmployees for action handlers only
    const {
        loadEmployees,
        handleSearchChange,
        handleViewModeChange,
        handleTableChange,
        loadMetadata,
        dismissNotification,
    } = useEmployees();

    const [searchInput, setSearchInput] = useState(tableParams.search || '');
    const [selectedDept, setSelectedDept] = useState('');

    useEffect(() => {
        loadEmployees();
        loadMetadata();
    }, [loadEmployees, loadMetadata]);

    const onSearchInputChange = (e) => {
        const val = e.target.value;
        setSearchInput(val);
        handleSearchChange(val);
    };

    const handleDeptFilter = (deptId) => {
        setSelectedDept(deptId);
        loadEmployees({ page: 1, departmentId: deptId || undefined });
    };

    const handleCardClick = (employee) => {
        navigate(`/dashboard/user/employees/${employee.id}`);
    };

    const handleAddNew = () => {
        navigate('/dashboard/user/employees/new');
    };

    // Columns for List View matching Image 2
    const listColumns = useMemo(
        () => [
            {
                key: 'fullName',
                label: 'Employee',
                sortable: true,
                render: (_val, row) => {
                    const firstName = row.firstName || '';
                    const lastName = row.lastName || '';
                    const initials =
                        `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'EM';
                    const avatarUrl = getAvatarUrl(row.profileImage || row.user?.profileImage);

                    return (
                        <div className="employee-list-name-cell">
                            <div className="avatar-square">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={`${firstName} ${lastName}`.trim()}
                                        className="table-avatar-img"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>
                            <div className="name-box">
                                <span className="full-name font-semibold">
                                    {`${firstName} ${lastName}`.trim() || '—'}
                                </span>
                                <span className="emp-code">{row.employeeCode}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                key: 'email',
                label: 'Work Email',
                sortable: true,
                render: (val) => <span className="work-email-cell">{val || '—'}</span>,
            },
            {
                key: 'jobPosition',
                label: 'Job Position',
                sortable: true,
                render: (_val, row) => (
                    <span className="job-position-cell">
                        {row.jobPosition?.title || row.jobTitle || '—'}
                    </span>
                ),
            },
            {
                key: 'department',
                label: 'Department',
                sortable: true,
                render: (_val, row) => (
                    <span className="department-cell">
                        {row.department?.name || row.departmentName || 'General'}
                    </span>
                ),
            },
            {
                key: 'status',
                label: 'Status',
                sortable: true,
                render: (val) => {
                    const isAct = (val || '').toUpperCase() === 'ACTIVE';
                    const isDraft = (val || '').toUpperCase() === 'DRAFT';
                    const isSuspended = (val || '').toUpperCase() === 'SUSPENDED';
                    return (
                        <span
                            className={`status-indicator status--${
                                isAct
                                    ? 'active'
                                    : isDraft
                                      ? 'draft'
                                      : isSuspended
                                        ? 'suspended'
                                        : 'neutral'
                            }`}
                        >
                            <span className="status-dot" />
                            <span className="status-text">
                                {val === 'ACTIVE'
                                    ? 'Active'
                                    : val === 'DRAFT'
                                      ? 'Draft'
                                      : val === 'SUSPENDED'
                                        ? 'Suspended'
                                        : val || 'Active'}
                            </span>
                        </span>
                    );
                },
            },
        ],
        [],
    );

    // Augmented data for AdvancedTable
    const tableData = useMemo(() => {
        return employees.map((emp) => ({
            ...emp,
            fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
            jobPositionTitle: emp.jobPosition?.title || '',
            departmentName: emp.department?.name || '',
        }));
    }, [employees]);

    return (
        <div className="employees-page">
            {/* Notification Banner */}
            {notification && (
                <div className={`notification-banner banner--${notification.type}`}>
                    <div className="banner-content">
                        {notification.type === 'danger' ? (
                            <AlertCircle size={18} />
                        ) : (
                            <CheckCircle size={18} />
                        )}
                        <div>
                            <strong>{notification.title}: </strong>
                            <span>{notification.message}</span>
                        </div>
                    </div>
                    <button type="button" className="banner-close" onClick={dismissNotification}>
                        ✕
                    </button>
                </div>
            )}

            {/* Header matching Image 1 & 2 */}
            <div className="employees-page__header">
                <div className="title-area">
                    <h1 className="main-title">Employees</h1>
                    <p className="subtitle">
                        {viewMode === 'kanban'
                            ? 'Default view: Kanban'
                            : 'List view for sort, filter and bulk scanning'}
                    </p>
                </div>
            </div>

            {/* Action Bar matching Image 1 & 2 */}
            <div className="employees-page__action-bar">
                <div className="left-actions">
                    {canCreateEmployee && (
                        <Button
                            variant="primary"
                            icon={Plus}
                            onClick={handleAddNew}
                            className="new-employee-btn"
                        >
                            NEW
                        </Button>
                    )}

                    <div className="search-box-wrapper">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchInput}
                            onChange={onSearchInputChange}
                            className="search-input"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                className="search-clear-btn"
                                onClick={() => {
                                    setSearchInput('');
                                    handleSearchChange('');
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Department Quick Filter */}
                    <div className="department-filter">
                        <select
                            value={selectedDept}
                            onChange={(e) => handleDeptFilter(e.target.value)}
                            className="dept-select"
                        >
                            <option value="">All Departments</option>
                            {(metadata.departments || []).map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {totalCount > 0 && (
                        <div className="roster-count-badge">
                            {totalCount} {totalCount === 1 ? 'Employee' : 'Employees'}
                        </div>
                    )}
                </div>

                {/* View Switcher: [ Kanban ] | [ List ] matching Image 1 & 2 */}
                <div className="view-switcher-group" role="group" aria-label="View Mode">
                    <button
                        type="button"
                        className={`switcher-btn ${viewMode === 'kanban' ? 'is-active' : ''}`}
                        onClick={() => handleViewModeChange('kanban')}
                        aria-pressed={viewMode === 'kanban'}
                    >
                        Kanban
                    </button>
                    <button
                        type="button"
                        className={`switcher-btn ${viewMode === 'list' ? 'is-active' : ''}`}
                        onClick={() => handleViewModeChange('list')}
                        aria-pressed={viewMode === 'list'}
                    >
                        List
                    </button>
                </div>
            </div>

            {/* View Mode Content */}
            <div className="employees-page__content">
                {viewMode === 'kanban' ? (
                    <KanbanGrid
                        employees={employees}
                        loading={loading}
                        onCardClick={handleCardClick}
                        onAddNew={canCreateEmployee ? handleAddNew : undefined}
                    />
                ) : (
                    <div className="list-view-container">
                        <AdvancedTable
                            data={tableData}
                            columns={listColumns}
                            loading={loading}
                            showPagination={true}
                            totalCount={totalCount}
                            onTableChange={handleTableChange}
                            initialRowsPerPage={12}
                            onRowClick={(row) => handleCardClick(row)}
                            className="employees-list-table"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default EmployeesPage;
