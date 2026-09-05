import { createContext, useState, useMemo } from 'react';

export const EmployeesContext = createContext(null);

/**
 * EmployeesProvider — Pure State Container for Employee Master & Self-Service.
 * Strictly follows the 4-layer architecture (State Layer) per FEATURE_DEVELOPMENT_GUIDE.md.
 *
 * Exposes:
 * 1. Read-only values to UI layer via useContext(EmployeesContext)
 * 2. State setters to Hooks layer via useEmployees()
 */
export function EmployeesProvider({ children }) {
    // 1. Employee list & view state
    const [employees, setEmployees] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        totalPages: 1,
        totalCount: 0,
    });
    const [tableParams, setTableParams] = useState({
        page: 1,
        limit: 12,
        search: '',
        status: '',
        departmentId: '',
    });
    // Default view mode is 'kanban' per Image 1 specifications
    const [viewMode, setViewMode] = useState('kanban');

    // 2. Form view & detailed inspection state
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [currentEmployeeSmartCounts, setCurrentEmployeeSmartCounts] = useState({
        contractsCount: 0,
        attendanceCount: 0,
        timeOffCount: 0,
        allocationsCount: 0,
        activeWage: null,
        activeContract: null,
        primaryBankAccount: null,
    });

    // 3. Smart records slide-over drawer state
    const [smartDrawer, setSmartDrawer] = useState({
        isOpen: false,
        type: null, // 'contracts' | 'attendance' | 'timeoff' | 'allocations' | 'bank'
        title: '',
        records: [],
        loading: false,
    });

    // 4. Lookups & Metadata (Departments, Positions, Schedules, Users)
    const [metadata, setMetadata] = useState({
        departments: [],
        jobPositions: [],
        schedules: [],
        availableUsers: [],
    });

    // 5. Async indicators & alerts
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);

    // Derived counts
    const activeCount = useMemo(
        () => employees.filter((e) => e.status === 'ACTIVE' || e.status === 'Active').length,
        [employees],
    );
    const draftCount = useMemo(
        () => employees.filter((e) => e.status === 'DRAFT' || e.status === 'Draft').length,
        [employees],
    );
    const suspendedCount = useMemo(
        () => employees.filter((e) => e.status === 'SUSPENDED' || e.status === 'Suspended').length,
        [employees],
    );

    const value = useMemo(
        () => ({
            // Read-only values (Consumed by UI)
            employees,
            totalCount,
            pagination,
            tableParams,
            viewMode,
            currentEmployee,
            currentEmployeeSmartCounts,
            smartDrawer,
            metadata,
            loading,
            formLoading,
            actionLoading,
            error,
            notification,
            activeCount,
            draftCount,
            suspendedCount,

            // Setters (Consumed by Hooks only)
            setEmployees,
            setTotalCount,
            setPagination,
            setTableParams,
            setViewMode,
            setCurrentEmployee,
            setCurrentEmployeeSmartCounts,
            setSmartDrawer,
            setMetadata,
            setLoading,
            setFormLoading,
            setActionLoading,
            setError,
            setNotification,
        }),
        [
            employees,
            totalCount,
            pagination,
            tableParams,
            viewMode,
            currentEmployee,
            currentEmployeeSmartCounts,
            smartDrawer,
            metadata,
            loading,
            formLoading,
            actionLoading,
            error,
            notification,
            activeCount,
            draftCount,
            suspendedCount,
        ],
    );

    return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>;
}
