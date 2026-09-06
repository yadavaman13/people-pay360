import { useContext, useCallback, useRef, useEffect } from 'react';
import { EmployeesContext } from '../context/employees.context';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import { useToast } from '@/components/Shared/Feedback/Toast';
import * as employeeApi from '../services/employee.api';

function dataURLtoBlob(dataurl) {
    try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch {
        return null;
    }
}

/**
 * useEmployees — Orchestrates async API calls and updates State layer (EmployeesContext).
 * Strictly follows the 4-layer architecture (Hooks Layer) per FEATURE_DEVELOPMENT_GUIDE.md.
 *
 * Exports ACTION HANDLERS ONLY without duplicating state variables or setters!
 */
export function useEmployees() {
    const { user: currentUser } = useAuth();
    const context = useContext(EmployeesContext);
    if (!context) {
        throw new Error('useEmployees must be used within an EmployeesProvider');
    }

    const {
        tableParams,
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
    } = context;

    const { success: toastSuccess, error: toastError } = useToast();

    const searchDebounceTimerRef = useRef(null);
    const latestParamsRef = useRef(tableParams);

    useEffect(() => {
        latestParamsRef.current = tableParams;
    }, [tableParams]);

    useEffect(() => {
        return () => {
            if (searchDebounceTimerRef.current) {
                clearTimeout(searchDebounceTimerRef.current);
            }
        };
    }, []);

    /**
     * Load filtered and paginated employee list
     */
    const loadEmployees = useCallback(
        async (overrideParams = {}) => {
            const mergedParams = {
                ...latestParamsRef.current,
                ...overrideParams,
            };
            latestParamsRef.current = mergedParams;

            setLoading(true);
            setError(null);

            try {
                const data = await employeeApi.fetchEmployees(mergedParams);
                const employeeList = data.data?.employees || data.employees || [];
                setEmployees(employeeList);

                const total = data.data?.total ?? data.total ?? employeeList.length;
                const page = data.data?.page ?? data.page ?? 1;
                const limit = data.data?.limit ?? data.limit ?? 12;
                const totalPages =
                    data.data?.totalPages ?? data.totalPages ?? Math.ceil(total / limit);

                setTotalCount(total);
                setPagination({ page, limit, totalPages, totalCount: total });
                setTableParams(mergedParams);
                return data;
            } catch (err) {
                console.error('Failed to load employees:', err);
                const msg =
                    err.response?.data?.message || err.message || 'Failed to load employees';
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [setLoading, setError, setEmployees, setTotalCount, setPagination, setTableParams],
    );

    /**
     * Handle search input change with 300ms debounce
     */
    const handleSearchChange = useCallback(
        (searchTerm) => {
            const trimmed = typeof searchTerm === 'string' ? searchTerm.trim() : '';

            if (searchDebounceTimerRef.current) {
                clearTimeout(searchDebounceTimerRef.current);
            }

            searchDebounceTimerRef.current = setTimeout(() => {
                loadEmployees({
                    page: 1,
                    search: trimmed,
                });
            }, 300);
        },
        [loadEmployees],
    );

    /**
     * Handle view mode change ('kanban' or 'list')
     */
    const handleViewModeChange = useCallback(
        (mode) => {
            setViewMode(mode);
        },
        [setViewMode],
    );

    /**
     * Handle table changes (pagination, sorting, filters) from AdvancedTable
     */
    const handleTableChange = useCallback(
        ({ page, rowsPerPage, searchTerm, sortConfig, columnFilters }) => {
            const trimmedSearch = typeof searchTerm === 'string' ? searchTerm.trim() : '';

            // Map department filter if selected
            let parsedDeptId;
            if (columnFilters?.departmentName && columnFilters.departmentName.length > 0) {
                const selectedDeptName = columnFilters.departmentName[0];
                const foundDept = (context.metadata?.departments || []).find(
                    (d) => d.name === selectedDeptName,
                );
                if (foundDept) parsedDeptId = foundDept.id;
            }

            // Map status filter if selected
            let parsedStatus;
            if (columnFilters?.status && columnFilters.status.length > 0) {
                parsedStatus = columnFilters.status[0].toUpperCase();
            }

            const isSearchChanged = trimmedSearch !== (latestParamsRef.current.search || '');
            const isFilterChanged =
                parsedDeptId !== latestParamsRef.current.departmentId ||
                parsedStatus !== latestParamsRef.current.status;

            if (isSearchChanged) {
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }
                searchDebounceTimerRef.current = setTimeout(() => {
                    loadEmployees({
                        page: 1,
                        limit: rowsPerPage || latestParamsRef.current.limit || 12,
                        search: trimmedSearch,
                        departmentId: parsedDeptId,
                        status: parsedStatus,
                        sortBy: sortConfig?.key || undefined,
                        sortDir: sortConfig?.direction || undefined,
                    });
                }, 300);
            } else {
                if (searchDebounceTimerRef.current) {
                    clearTimeout(searchDebounceTimerRef.current);
                }
                loadEmployees({
                    page: isFilterChanged ? 1 : page || 1,
                    limit: rowsPerPage || latestParamsRef.current.limit || 12,
                    search: trimmedSearch,
                    departmentId: parsedDeptId,
                    status: parsedStatus,
                    sortBy: sortConfig?.key || undefined,
                    sortDir: sortConfig?.direction || undefined,
                });
            }
        },
        [context.metadata?.departments, loadEmployees],
    );

    /**
     * Load single employee details and parallel Smart Button sub-resources
     */
    const loadEmployeeDetails = useCallback(
        async (id) => {
            setFormLoading(true);
            setError(null);

            try {
                // 1. Fetch employee core details with joins
                const empResponse = await employeeApi.fetchEmployeeById(id);
                const emp = empResponse.data || empResponse;
                setCurrentEmployee(emp);

                // 2. Fetch parallel sub-resources for Smart Buttons
                const [contractsRes, attendanceRes, timeOffRes, allocationsRes, bankRes] =
                    await Promise.allSettled([
                        employeeApi.fetchEmployeeContracts(id),
                        employeeApi.fetchEmployeeAttendance(id, { limit: 1 }),
                        employeeApi.fetchEmployeeTimeOff(id, { limit: 1 }),
                        employeeApi.fetchEmployeeAllocations(id, { limit: 1 }),
                        employeeApi.fetchEmployeeBankAccounts(id),
                    ]);

                const contracts =
                    contractsRes.status === 'fulfilled' ? contractsRes.value.data || [] : [];
                const attendanceTotal =
                    attendanceRes.status === 'fulfilled'
                        ? attendanceRes.value.pagination?.total || 0
                        : 0;
                const timeOffTotal =
                    timeOffRes.status === 'fulfilled' ? timeOffRes.value.pagination?.total || 0 : 0;
                const allocationsTotal =
                    allocationsRes.status === 'fulfilled'
                        ? allocationsRes.value.pagination?.total || 0
                        : 0;
                const bankAccounts = bankRes.status === 'fulfilled' ? bankRes.value.data || [] : [];

                const activeContract =
                    contracts.find((c) => c.status === 'ACTIVE' || c.status === 'Active') || null;
                const primaryBank = bankAccounts.find((b) => b.isPrimary && b.isActive) || null;

                setCurrentEmployeeSmartCounts({
                    contractsCount: contracts.length,
                    attendanceCount: attendanceTotal,
                    timeOffCount: timeOffTotal,
                    allocationsCount: allocationsTotal,
                    activeWage: activeContract ? activeContract.wage : null,
                    activeContract,
                    primaryBankAccount: primaryBank,
                    allBankAccounts: bankAccounts,
                });

                return emp;
            } catch (err) {
                console.error('Failed to load employee details:', err);
                const msg =
                    err.response?.data?.message || err.message || 'Failed to load employee details';
                setError(msg);
                throw err;
            } finally {
                setFormLoading(false);
            }
        },
        [setFormLoading, setError, setCurrentEmployee, setCurrentEmployeeSmartCounts],
    );

    /**
     * Load current user's employee profile (/me)
     */
    const loadMe = useCallback(async () => {
        setFormLoading(true);
        setError(null);
        try {
            const data = await employeeApi.fetchMe();
            const me = data.data || data;
            setCurrentEmployee(me);
            if (me.id) {
                await loadEmployeeDetails(me.id);
            }
            return me;
        } catch (err) {
            console.error('Failed to load self-profile:', err);
            const msg = err.response?.data?.message || err.message || 'No employee profile found';
            setError(msg);
            throw err;
        } finally {
            setFormLoading(false);
        }
    }, [loadEmployeeDetails, setFormLoading, setError, setCurrentEmployee]);

    /**
     * Create or update employee record
     */
    const handleSaveEmployee = useCallback(
        async (id, formData, avatarFile = null) => {
            setActionLoading(true);
            setError(null);

            try {
                let saved;
                if (id) {
                    const res = await employeeApi.updateEmployee(id, formData);
                    saved = res.data || res;
                    setNotification({
                        type: 'success',
                        title: 'Employee Updated',
                        message: `Employee ${saved.firstName} ${saved.lastName} (${saved.employeeCode}) was successfully updated.`,
                    });
                    toastSuccess('Employee updated successfully');
                } else {
                    let payload = formData;
                    const fileToUpload = avatarFile || formData?.avatarFile || formData?.avatar;
                    if (fileToUpload) {
                        const fd = new FormData();
                        Object.entries(formData).forEach(([k, v]) => {
                            if (
                                k !== 'avatar' &&
                                k !== 'avatarFile' &&
                                v !== undefined &&
                                v !== null &&
                                v !== ''
                            ) {
                                if (
                                    typeof v === 'object' &&
                                    !(v instanceof File) &&
                                    !(v instanceof Blob)
                                ) {
                                    fd.append(k, JSON.stringify(v));
                                } else {
                                    fd.append(k, v);
                                }
                            }
                        });
                        if (fileToUpload instanceof File || fileToUpload instanceof Blob) {
                            fd.append('avatar', fileToUpload, 'avatar.jpg');
                        } else if (
                            typeof fileToUpload === 'string' &&
                            fileToUpload.startsWith('data:')
                        ) {
                            const blob = dataURLtoBlob(fileToUpload);
                            if (blob) {
                                fd.append('avatar', blob, 'avatar.jpg');
                            }
                        }
                        payload = fd;
                    }

                    const res = await employeeApi.createEmployee(payload);
                    saved = res.data || res;

                    // Trigger welcome email endpoint after successful employee creation
                    if (saved?.id) {
                        try {
                            await employeeApi.sendEmployeeWelcomeEmail(saved.id);
                        } catch (emailErr) {
                            console.warn('Welcome email trigger note:', emailErr.message);
                        }
                    }

                    toastSuccess('Employee created and email sent');
                    setNotification({
                        type: 'success',
                        title: 'Employee Created',
                        message: 'Employee created and email sent',
                    });
                }
                setCurrentEmployee(saved);
                await loadEmployees();
                return saved;
            } catch (err) {
                console.error('Failed to save employee:', err);
                const msg = err.response?.data?.message || err.message || 'Failed to save employee';
                setError(msg);
                toastError(msg);
                setNotification({
                    type: 'danger',
                    title: 'Save Failed',
                    message: msg,
                });
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [
            setActionLoading,
            setError,
            setNotification,
            setCurrentEmployee,
            loadEmployees,
            toastSuccess,
            toastError,
        ],
    );

    /**
     * Trigger welcome email with temporary credentials for an employee
     */
    const handleSendWelcomeEmail = useCallback(
        async (id) => {
            setActionLoading(true);
            setError(null);
            try {
                const res = await employeeApi.sendEmployeeWelcomeEmail(id);
                toastSuccess('Welcome email sent successfully');
                setNotification({
                    type: 'success',
                    title: 'Email Sent',
                    message: 'Welcome email with login credentials has been sent.',
                });
                return res;
            } catch (err) {
                console.error('Failed to send welcome email:', err);
                const msg =
                    err.response?.data?.message || err.message || 'Failed to send welcome email';
                setError(msg);
                toastError(msg);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [setActionLoading, setError, setNotification, toastSuccess, toastError],
    );

    /**
     * Soft delete / archive employee
     */
    const handleArchiveEmployee = useCallback(
        async (id) => {
            setActionLoading(true);
            setError(null);

            try {
                const res = await employeeApi.deleteEmployee(id);
                setNotification({
                    type: 'warning',
                    title: 'Employee Archived',
                    message:
                        'Employee record has been archived. All historical contracts, attendance, and payroll records remain protected.',
                });
                await loadEmployees();
                return res.data || res;
            } catch (err) {
                console.error('Failed to archive employee:', err);
                const msg =
                    err.response?.data?.message || err.message || 'Failed to archive employee';
                setError(msg);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [setActionLoading, setError, setNotification, loadEmployees],
    );

    /**
     * Upload employee profile photo
     */
    const handleUploadAvatar = useCallback(
        async (id, file) => {
            setActionLoading(true);
            setError(null);

            try {
                const res = await employeeApi.uploadEmployeeAvatar(id, file);
                const imageUrl = res.data?.imageUrl || res.imageUrl;

                // Update current employee state with new photo URL
                setCurrentEmployee((prev) => (prev ? { ...prev, profileImage: imageUrl } : prev));

                // Update employee in roster list
                setEmployees((prev) =>
                    prev.map((emp) => (emp.id === id ? { ...emp, profileImage: imageUrl } : emp)),
                );

                setNotification({
                    type: 'success',
                    title: 'Photo Uploaded',
                    message: 'Employee profile photo updated successfully.',
                });

                return imageUrl;
            } catch (err) {
                console.error('Failed to upload employee photo:', err);
                const msg = err.response?.data?.message || err.message || 'Failed to upload photo';
                setError(msg);
                setNotification({
                    type: 'danger',
                    title: 'Upload Failed',
                    message: msg,
                });
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [setActionLoading, setError, setCurrentEmployee, setEmployees, setNotification],
    );

    /**
     * Open Smart Button Records Drawer with live on-demand data
     */
    const openSmartRecordsDrawer = useCallback(
        async (type, employeeId) => {
            setSmartDrawer((prev) => ({
                ...prev,
                isOpen: true,
                type,
                title:
                    type === 'contracts'
                        ? 'Contracts History'
                        : type === 'attendance'
                          ? 'Attendance Punch Log'
                          : type === 'timeoff'
                            ? 'Time Off Requests & Balances'
                            : 'Bank Accounts',
                loading: true,
                records: [],
            }));

            try {
                let records = [];
                if (type === 'contracts') {
                    const res = await employeeApi.fetchEmployeeContracts(employeeId);
                    records = res.data || [];
                } else if (type === 'attendance') {
                    const res = await employeeApi.fetchEmployeeAttendance(employeeId, {
                        limit: 50,
                    });
                    records = res.data || [];
                } else if (type === 'timeoff') {
                    const [reqRes, allocRes] = await Promise.allSettled([
                        employeeApi.fetchEmployeeTimeOff(employeeId, { limit: 50 }),
                        employeeApi.fetchEmployeeAllocations(employeeId, { limit: 50 }),
                    ]);
                    const requests = reqRes.status === 'fulfilled' ? reqRes.value.data || [] : [];
                    const allocations =
                        allocRes.status === 'fulfilled' ? allocRes.value.data || [] : [];
                    records = { requests, allocations };
                } else if (type === 'bank') {
                    const res = await employeeApi.fetchEmployeeBankAccounts(employeeId);
                    records = res.data || [];
                }

                setSmartDrawer((prev) => ({
                    ...prev,
                    records,
                    loading: false,
                }));
            } catch (err) {
                console.error('Failed to load smart drawer records:', err);
                setSmartDrawer((prev) => ({
                    ...prev,
                    loading: false,
                }));
            }
        },
        [setSmartDrawer],
    );

    const closeSmartRecordsDrawer = useCallback(() => {
        setSmartDrawer((prev) => ({
            ...prev,
            isOpen: false,
            type: null,
            records: [],
            loading: false,
        }));
    }, [setSmartDrawer]);

    /**
     * Add bank account for employee
     */
    const handleAddBankAccount = useCallback(
        async (employeeId, data) => {
            setActionLoading(true);
            try {
                const res = await employeeApi.addEmployeeBankAccount(employeeId, data);
                setNotification({
                    type: 'success',
                    title: 'Bank Account Added',
                    message: 'New bank account registered successfully.',
                });
                await loadEmployeeDetails(employeeId);
                return res.data || res;
            } catch (err) {
                console.error('Failed to add bank account:', err);
                const msg =
                    err.response?.data?.message || err.message || 'Failed to add bank account';
                setNotification({
                    type: 'danger',
                    title: 'Failed to Add Bank Account',
                    message: msg,
                });
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [setActionLoading, setNotification, loadEmployeeDetails],
    );

    /**
     * Set primary bank account
     */
    const handleSetPrimaryBankAccount = useCallback(
        async (employeeId, accountId) => {
            setActionLoading(true);
            try {
                await employeeApi.setPrimaryBankAccount(employeeId, accountId);
                setNotification({
                    type: 'success',
                    title: 'Primary Bank Account Updated',
                    message: 'Primary payment account has been updated.',
                });
                await loadEmployeeDetails(employeeId);
            } catch (err) {
                console.error('Failed to update primary bank account:', err);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [setActionLoading, setNotification, loadEmployeeDetails],
    );

    /**
     * Delete bank account
     */
    const handleDeleteBankAccount = useCallback(
        async (employeeId, accountId) => {
            setActionLoading(true);
            try {
                await employeeApi.deleteBankAccount(employeeId, accountId);
                setNotification({
                    type: 'warning',
                    title: 'Bank Account Removed',
                    message: 'Bank account record has been deactivated.',
                });
                await loadEmployeeDetails(employeeId);
            } catch (err) {
                console.error('Failed to delete bank account:', err);
                throw err;
            } finally {
                setActionLoading(false);
            }
        },
        [setActionLoading, setNotification, loadEmployeeDetails],
    );

    /**
     * Load metadata (departments, job positions, schedules, users) for forms and filters
     */
    const loadMetadata = useCallback(async () => {
        try {
            const fetchUsersPromise =
                currentUser?.role === 'ADMIN'
                    ? employeeApi.fetchUnassignedUsers()
                    : Promise.resolve({ users: [] });

            const [deptRes, schedRes, userRes, posRes] = await Promise.allSettled([
                employeeApi.fetchDepartments(),
                employeeApi.fetchWorkingSchedules(),
                fetchUsersPromise,
                employeeApi.fetchJobPositions(),
            ]);

            const departments = deptRes.status === 'fulfilled' ? deptRes.value.data || [] : [];
            const schedules = schedRes.status === 'fulfilled' ? schedRes.value.data || [] : [];
            const availableUsers = userRes.status === 'fulfilled' ? userRes.value.users || [] : [];
            const jobPositions = posRes.status === 'fulfilled' ? posRes.value.data || [] : [];

            setMetadata({
                departments,
                schedules,
                availableUsers,
                jobPositions,
            });
        } catch (err) {
            console.error('Failed to load metadata:', err);
        }
    }, [currentUser?.role, setMetadata]);

    const dismissNotification = useCallback(() => {
        setNotification(null);
    }, [setNotification]);

    // Return ACTION HANDLERS ONLY per FEATURE_DEVELOPMENT_GUIDE.md
    return {
        loadEmployees,
        handleSearchChange,
        handleViewModeChange,
        handleTableChange,
        loadEmployeeDetails,
        loadMe,
        handleSaveEmployee,
        handleArchiveEmployee,
        openSmartRecordsDrawer,
        closeSmartRecordsDrawer,
        handleAddBankAccount,
        handleSetPrimaryBankAccount,
        handleDeleteBankAccount,
        loadMetadata,
        dismissNotification,
        handleUploadAvatar,
        handleSendWelcomeEmail,
    };
}
