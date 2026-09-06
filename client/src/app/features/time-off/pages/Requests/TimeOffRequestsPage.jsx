import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, CheckCircle, XCircle, Ban, Eye } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { useToast } from '@/components/Shared/Feedback/Toast';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import LeaveBalanceCards from '../../components/LeaveBalanceCards/LeaveBalanceCards';
import RequestDecisionModal from '../../components/RequestDecisionModal/RequestDecisionModal';
import './TimeOffRequestsPage.scss';

export default function TimeOffRequestsPage() {
    const navigate = useNavigate();
    const {
        isHR,
        isEmployee,
        roleSegment,
        balances,
        balancesLoading,
        refreshCount,
        triggerRefresh,
    } = useTimeOff();
    const { success: showSuccessToast, error: showErrorToast } = useToast();

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Decision modal state (Approve / Refuse)
    const [decisionModal, setDecisionModal] = useState({
        isOpen: false,
        actionType: 'approve',
        request: null,
    });
    const [isDecisionSubmitting, setIsDecisionSubmitting] = useState(false);
    const [actionRunning, setActionRunning] = useState(null);

    // Cancellation modal state (Employee cancelling their own pending request)
    const [cancelModal, setCancelModal] = useState({
        isOpen: false,
        request: null,
    });
    const [isCancelling, setIsCancelling] = useState(false);

    // Fetch requests
    const loadRequests = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await timeOffApi.fetchRequests();
            setRequests(res?.data || []);
        } catch (err) {
            console.error('[TimeOffRequestsPage] Failed to fetch requests:', err);
            setError(
                err?.response?.data?.message || err?.message || 'Failed to load time off requests',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRequests();
    }, [loadRequests, refreshCount]);

    // Handle Approve / Refuse confirmation
    const handleDecisionConfirm = async (reviewNotes) => {
        if (!decisionModal.request || isDecisionSubmitting) return;
        const targetId = decisionModal.request.id;
        const action = decisionModal.actionType;
        setIsDecisionSubmitting(true);
        setActionRunning({ id: targetId, type: action });

        try {
            if (action === 'approve') {
                await timeOffApi.approveRequest(targetId, reviewNotes);
            } else {
                await timeOffApi.refuseRequest(targetId, reviewNotes);
            }

            // Immediately update request status in UI
            const newStatus = action === 'approve' ? 'APPROVED' : 'REFUSED';
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === targetId
                        ? { ...r, status: newStatus, reviewNotes: reviewNotes || r.reviewNotes }
                        : r,
                ),
            );

            setDecisionModal({ isOpen: false, actionType: 'approve', request: null });

            showSuccessToast(
                action === 'approve'
                    ? 'Time off request approved successfully'
                    : 'Time off request refused successfully',
            );

            triggerRefresh();
            loadRequests();
        } catch (err) {
            console.error('[TimeOffRequestsPage] Decision action failed:', err);
            const errMsg =
                err?.response?.data?.message || err?.message || `Failed to ${action} request`;
            showErrorToast(errMsg);
        } finally {
            setIsDecisionSubmitting(false);
            setActionRunning(null);
        }
    };

    // Handle Employee Cancellation confirmation
    const handleCancelConfirm = async () => {
        if (!cancelModal.request || isCancelling) return;
        const targetId = cancelModal.request.id;
        setIsCancelling(true);
        try {
            await timeOffApi.cancelRequest(targetId);

            // Immediately update request status in UI
            setRequests((prev) =>
                prev.map((r) => (r.id === targetId ? { ...r, status: 'CANCELLED' } : r)),
            );

            setCancelModal({ isOpen: false, request: null });
            showSuccessToast('Time off request cancelled successfully');

            triggerRefresh();
            loadRequests();
        } catch (err) {
            const errMsg =
                err?.response?.data?.message || err?.message || 'Failed to cancel request';
            showErrorToast(errMsg);
        } finally {
            setIsCancelling(false);
        }
    };

    // Flatten data for seamless search, sorting, and filtering
    const tableData = useMemo(() => {
        return (requests || []).map((r) => {
            const employeeName =
                [r.employee?.firstName, r.employee?.lastName].filter(Boolean).join(' ') ||
                r.employee?.email ||
                '—';
            const employeeCode = r.employee?.employeeCode || '';
            const timeOffTypeName = r.timeOffType?.name || '—';
            const paidStatus = r.timeOffType?.paidTimeOff ? 'Paid' : 'Unpaid';
            return {
                ...r,
                employeeName,
                employeeCode,
                timeOffTypeName,
                paidStatus,
            };
        });
    }, [requests]);

    // Table tabs
    const tabs = useMemo(
        () => [
            { id: 'all', label: 'All Requests' },
            {
                id: 'PENDING',
                label: isHR ? 'To Approve' : 'Pending',
                filterFn: (r) => r.status === 'PENDING',
            },
            { id: 'APPROVED', label: 'Approved', filterFn: (r) => r.status === 'APPROVED' },
            { id: 'REFUSED', label: 'Refused', filterFn: (r) => r.status === 'REFUSED' },
        ],
        [isHR],
    );

    // Filter configuration for AdvancedTable filter panel (Employee, Time Off Type, Status, Start Date, End Date)
    const filterConfig = useMemo(() => {
        const uniqueEmployees = [
            ...new Set((tableData || []).map((r) => r.employeeName).filter((v) => v && v !== '—')),
        ].sort();

        const uniqueTypes = [
            ...new Set(
                (tableData || []).map((r) => r.timeOffTypeName).filter((v) => v && v !== '—'),
            ),
        ].sort();

        const uniqueStatuses = [...new Set((tableData || []).map((r) => r.status).filter(Boolean))];

        const config = [];

        // 1. Employee filter (matches existing Allocations filter UX)
        if (uniqueEmployees.length > 0) {
            config.push({
                key: 'employeeName',
                label: 'Employee',
                type: 'select',
                options: uniqueEmployees,
            });
        }

        // 2. Time Off Type filter
        if (uniqueTypes.length > 0) {
            config.push({
                key: 'timeOffTypeName',
                label: 'Time Off Type',
                type: 'select',
                options: uniqueTypes,
            });
        }

        // 3. Status filter
        config.push({
            key: 'status',
            label: 'Status',
            type: 'select',
            options:
                uniqueStatuses.length > 0
                    ? uniqueStatuses
                    : ['PENDING', 'APPROVED', 'REFUSED', 'CANCELLED'],
        });

        // 4. Start Date filter
        config.push({
            key: 'startDate',
            label: 'Start Date',
            type: 'date',
        });

        // 5. End Date filter
        config.push({
            key: 'endDate',
            label: 'End Date',
            type: 'date',
        });

        return config;
    }, [tableData]);

    // Column definitions
    const columns = useMemo(() => {
        const cols = [];

        if (isHR) {
            cols.push({
                key: 'employeeName',
                label: 'Employee',
                sortable: true,
                width: '220px',
                render: (_val, row) => (
                    <div className="timeoff-employee-cell">
                        <span className="emp-name">{row.employeeName}</span>
                        {row.employeeCode && <span className="emp-code">{row.employeeCode}</span>}
                    </div>
                ),
            });
        }

        cols.push(
            {
                key: 'timeOffTypeName',
                label: 'Leave Type',
                sortable: true,
                width: '180px',
                render: (_val, row) => (
                    <div className="timeoff-type-cell">
                        <span className="type-name">{row.timeOffTypeName}</span>
                        <span className="type-sub">{row.paidStatus}</span>
                    </div>
                ),
            },
            {
                key: 'startDate',
                label: 'Start Date',
                sortable: true,
                width: '130px',
                sortComparator: (a, b) => {
                    const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
                    const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
                    return timeA - timeB;
                },
                render: (val) => val || '—',
            },
            {
                key: 'endDate',
                label: 'End Date',
                sortable: true,
                width: '130px',
                sortComparator: (a, b) => {
                    const timeA = a.endDate ? new Date(a.endDate).getTime() : 0;
                    const timeB = b.endDate ? new Date(b.endDate).getTime() : 0;
                    return timeA - timeB;
                },
                render: (val) => val || '—',
            },
            {
                key: 'numberOfDays',
                label: 'Duration',
                sortable: true,
                width: '120px',
                render: (val) => <strong>{val ? `${val} Days` : '—'}</strong>,
            },
            {
                key: 'status',
                label: 'Status',
                sortable: true,
                width: '130px',
                render: (val) => {
                    let variant = 'default';
                    let label = val || 'PENDING';
                    if (val === 'APPROVED') {
                        variant = 'success';
                        label = 'Approved';
                    } else if (val === 'REFUSED') {
                        variant = 'danger';
                        label = 'Refused';
                    } else if (val === 'PENDING') {
                        variant = 'warning';
                        label = isHR ? 'To Approve' : 'Pending';
                    }
                    return <Badge variant={variant}>{label}</Badge>;
                },
            },
            {
                key: 'actions',
                label: 'Actions',
                width: '180px',
                render: (_, row) => {
                    const isPending = row.status === 'PENDING';

                    return (
                        <div className="row-actions">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    navigate(
                                        `/dashboard/${roleSegment}/time-off/requests/${row.id}`,
                                    )
                                }
                                title="View details"
                            >
                                <Eye size={14} />
                                <span>View</span>
                            </Button>

                            {isHR && isPending && (
                                <>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        loading={
                                            actionRunning?.id === row.id &&
                                            actionRunning?.type === 'approve'
                                        }
                                        disabled={Boolean(actionRunning)}
                                        onClick={() =>
                                            setDecisionModal({
                                                isOpen: true,
                                                actionType: 'approve',
                                                request: row,
                                            })
                                        }
                                        title="Approve request"
                                    >
                                        <CheckCircle size={14} />
                                        <span>Approve</span>
                                    </Button>

                                    <Button
                                        variant="danger"
                                        size="sm"
                                        loading={
                                            actionRunning?.id === row.id &&
                                            actionRunning?.type === 'refuse'
                                        }
                                        disabled={Boolean(actionRunning)}
                                        onClick={() =>
                                            setDecisionModal({
                                                isOpen: true,
                                                actionType: 'refuse',
                                                request: row,
                                            })
                                        }
                                        title="Refuse request"
                                    >
                                        <XCircle size={14} />
                                        <span>Refuse</span>
                                    </Button>
                                </>
                            )}

                            {isEmployee && isPending && (
                                <Button
                                    variant="danger"
                                    size="sm"
                                    disabled={Boolean(actionRunning) || isCancelling}
                                    onClick={() =>
                                        setCancelModal({
                                            isOpen: true,
                                            request: row,
                                        })
                                    }
                                    title="Cancel this request"
                                >
                                    <Ban size={14} />
                                    <span>Cancel</span>
                                </Button>
                            )}
                        </div>
                    );
                },
            },
        );

        return cols;
    }, [isHR, isEmployee, navigate, roleSegment, actionRunning, isCancelling]);

    return (
        <div className="time-off-requests-page">
            {/* Header section matching PeoplePay360 standards */}
            <header className="page-header">
                <div className="header-info">
                    <div className="title-row">
                        <h1 className="header-title">
                            {isHR ? 'Time Off Requests' : 'My Time Off Requests'}
                        </h1>
                    </div>
                    <p className="header-subtitle">
                        {isHR
                            ? 'List view of employee leave requests and approval workflows'
                            : 'View your leave balances and manage your leave requests'}
                    </p>
                </div>

                <div className="header-actions">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/requests/new`)}
                        className="create-request-btn"
                    >
                        <Plus size={16} />
                        <span>{isHR ? 'New' : 'New Request'}</span>
                    </Button>
                </div>
            </header>

            {error && (
                <Alert variant="danger">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Employee balance cards displayed above requests */}
            {isEmployee && (
                <section className="balance-section">
                    <h2 className="section-title">Leave Balance</h2>
                    <LeaveBalanceCards balances={balances} loading={balancesLoading} />
                </section>
            )}

            {/* Advanced Table with tabs, search, and pagination */}
            <div className="table-wrapper">
                <AdvancedTable
                    columns={columns}
                    data={tableData}
                    tabs={tabs}
                    tabFilterKey="status"
                    showTabs={true}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Search requests by employee, leave type..."
                    showSerialNumber={true}
                    showSortDropdown={true}
                    showColumnSorting={true}
                    showFilter={true}
                    filterConfig={filterConfig}
                    showRowsPerPage={true}
                    showResultsCount={true}
                    showPagination={true}
                    initialRowsPerPage={10}
                />
            </div>

            {/* HR Decision Modal (Approve / Refuse) */}
            <RequestDecisionModal
                isOpen={decisionModal.isOpen}
                onClose={() =>
                    setDecisionModal({ isOpen: false, actionType: 'approve', request: null })
                }
                actionType={decisionModal.actionType}
                request={decisionModal.request}
                onConfirm={handleDecisionConfirm}
                isSubmitting={isDecisionSubmitting}
            />

            {/* Employee Request Cancellation Dialog */}
            <Dialog
                isOpen={cancelModal.isOpen}
                onClose={() => setCancelModal({ isOpen: false, request: null })}
                title="Cancel Time Off Request"
                variant="danger"
                size="sm"
                confirmText="Yes, Cancel Request"
                cancelText="No, Keep Request"
                onConfirm={handleCancelConfirm}
                confirmLoading={isCancelling}
                confirmDisabled={isCancelling}
                isConfirmLoading={isCancelling}
            >
                <p>
                    Are you sure you want to cancel your leave request for{' '}
                    <strong>{cancelModal.request?.timeOffType?.name || 'Leave'}</strong> from{' '}
                    <strong>{cancelModal.request?.startDate}</strong> to{' '}
                    <strong>{cancelModal.request?.endDate}</strong> (
                    {cancelModal.request?.numberOfDays} Days)?
                </p>
            </Dialog>
        </div>
    );
}
