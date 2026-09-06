import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import { useToast } from '@/components/Shared/Feedback/Toast';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import AllocationDecisionModal from '../../components/AllocationDecisionModal/AllocationDecisionModal';
import './AllocationsListPage.scss';

export default function AllocationsListPage() {
    const navigate = useNavigate();
    const { roleSegment, refreshCount, triggerRefresh } = useTimeOff();
    const { success: showSuccessToast, error: showErrorToast } = useToast();

    const [allocations, setAllocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Decision modal state
    const [decisionModal, setDecisionModal] = useState({
        isOpen: false,
        actionType: 'approve',
        allocation: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionRunning, setActionRunning] = useState(null);

    const loadAllocations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await timeOffApi.fetchAllocations();
            setAllocations(res?.data || []);
        } catch (err) {
            console.error('[AllocationsListPage] Error fetching allocations:', err);
            setError(err?.response?.data?.message || err?.message || 'Failed to load allocations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAllocations();
    }, [loadAllocations, refreshCount]);

    const handleDecisionConfirm = async () => {
        if (!decisionModal.allocation || isSubmitting) return;
        const targetId = decisionModal.allocation.id;
        const action = decisionModal.actionType;
        setIsSubmitting(true);
        setActionRunning({ id: targetId, type: action });

        try {
            if (action === 'approve') {
                await timeOffApi.approveAllocation(targetId);
            } else {
                await timeOffApi.refuseAllocation(targetId);
            }

            const newStatus = action === 'approve' ? 'APPROVED' : 'REFUSED';
            setAllocations((prev) =>
                prev.map((a) => (a.id === targetId ? { ...a, status: newStatus } : a)),
            );

            setDecisionModal({ isOpen: false, actionType: 'approve', allocation: null });

            showSuccessToast(
                action === 'approve'
                    ? 'Allocation approved successfully'
                    : 'Allocation refused successfully',
            );

            triggerRefresh();
            loadAllocations();
        } catch (err) {
            console.error('[AllocationsListPage] Decision action failed:', err);
            const errMsg =
                err?.response?.data?.message || err?.message || `Failed to ${action} allocation`;
            showErrorToast(errMsg);
        } finally {
            setIsSubmitting(false);
            setActionRunning(null);
        }
    };

    // Flatten data for seamless search, sorting, and filtering
    const tableData = useMemo(() => {
        return (allocations || []).map((a) => {
            const employeeName =
                [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(' ') ||
                a.employee?.email ||
                '—';
            const employeeCode = a.employee?.employeeCode || '';
            const timeOffTypeName = a.timeOffType?.name || '—';
            const paidStatus = a.timeOffType?.paidTimeOff ? 'Paid' : 'Unpaid';
            const validity =
                a.validityStart && a.validityEnd
                    ? `${a.validityStart} to ${a.validityEnd}`
                    : a.validityStart || a.validityEnd || '—';
            return {
                ...a,
                employeeName,
                employeeCode,
                timeOffTypeName,
                paidStatus,
                validity,
            };
        });
    }, [allocations]);

    const tabs = useMemo(
        () => [
            { id: 'all', label: 'All Allocations' },
            { id: 'PENDING', label: 'To Approve', filterFn: (r) => r.status === 'PENDING' },
            { id: 'APPROVED', label: 'Approved', filterFn: (r) => r.status === 'APPROVED' },
            { id: 'REFUSED', label: 'Refused', filterFn: (r) => r.status === 'REFUSED' },
        ],
        [],
    );

    // Filter configuration for AdvancedTable filter panel
    const filterConfig = useMemo(() => {
        const uniqueTypes = [
            ...new Set(
                (tableData || []).map((a) => a.timeOffTypeName).filter((v) => v && v !== '—'),
            ),
        ];
        const config = [];
        if (uniqueTypes.length > 0) {
            config.push({
                key: 'timeOffTypeName',
                label: 'Leave Type',
                type: 'select',
                options: uniqueTypes,
            });
        }
        return config;
    }, [tableData]);

    const columns = useMemo(
        () => [
            {
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
            },
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
                key: 'totalDays',
                label: 'Allocated',
                sortable: true,
                width: '110px',
                render: (val) => <strong>{val ? `${val} days` : '—'}</strong>,
            },
            {
                key: 'usedDays',
                label: 'Taken',
                sortable: true,
                width: '100px',
                render: (val) => (
                    <span className="text-muted">{val ? `${val} days` : '0 days'}</span>
                ),
            },
            {
                key: 'remainingDays',
                label: 'Remaining',
                sortable: true,
                width: '110px',
                render: (val) => (
                    <strong style={{ color: '#0f172a' }}>{val ? `${val} days` : '0 days'}</strong>
                ),
            },
            {
                key: 'validity',
                label: 'Validity Period',
                sortable: true,
                width: '180px',
                sortComparator: (a, b) => {
                    const startA = a.validityStart ? new Date(a.validityStart).getTime() : 0;
                    const startB = b.validityStart ? new Date(b.validityStart).getTime() : 0;
                    if (startA !== startB) {
                        return startA - startB;
                    }
                    const endA = a.validityEnd ? new Date(a.validityEnd).getTime() : 0;
                    const endB = b.validityEnd ? new Date(b.validityEnd).getTime() : 0;
                    return endA - endB;
                },
                render: (_, row) => (
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                        {row.validityStart && row.validityEnd
                            ? `${row.validityStart} to ${row.validityEnd}`
                            : row.validityStart || row.validityEnd || '—'}
                    </span>
                ),
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
                        label = 'To Approve';
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
                                        `/dashboard/${roleSegment}/time-off/allocations/${row.id}`,
                                    )
                                }
                                title="View details"
                            >
                                <Eye size={14} />
                                <span>View</span>
                            </Button>

                            {isPending && (
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
                                                allocation: row,
                                            })
                                        }
                                        title="Approve allocation"
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
                                                allocation: row,
                                            })
                                        }
                                        title="Refuse allocation"
                                    >
                                        <XCircle size={14} />
                                        <span>Refuse</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    );
                },
            },
        ],
        [navigate, roleSegment, actionRunning],
    );

    return (
        <div className="allocations-list-page">
            {/* Header Section */}
            <header className="page-header">
                <div className="header-info">
                    <div className="title-row">
                        <h1 className="header-title">Allocations</h1>
                    </div>
                    <p className="header-subtitle">
                        List view opened from Time Off ▼ → Allocations
                    </p>
                </div>

                <div className="header-actions">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() =>
                            navigate(`/dashboard/${roleSegment}/time-off/allocations/new`)
                        }
                        className="create-btn"
                    >
                        <Plus size={16} />
                        <span>New</span>
                    </Button>
                </div>
            </header>

            {error && (
                <Alert variant="danger">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Advanced Table */}
            <div className="table-wrapper">
                <AdvancedTable
                    columns={columns}
                    data={tableData}
                    tabs={tabs}
                    tabFilterKey="status"
                    showTabs={true}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Search allocations by employee, leave type..."
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

            {/* Decision Modal */}
            <AllocationDecisionModal
                isOpen={decisionModal.isOpen}
                onClose={() =>
                    setDecisionModal({ isOpen: false, actionType: 'approve', allocation: null })
                }
                actionType={decisionModal.actionType}
                allocation={decisionModal.allocation}
                onConfirm={handleDecisionConfirm}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
