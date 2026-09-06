import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Eye } from 'lucide-react';
import { useTimeOff } from '../../context/time-off.context';
import * as timeOffApi from '../../services/time-off.api';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './TimeOffTypesListPage.scss';

export default function TimeOffTypesListPage() {
    const navigate = useNavigate();
    const { roleSegment, refreshCount } = useTimeOff();

    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadTypes = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await timeOffApi.fetchTimeOffTypes();
            setTypes(res?.data || []);
        } catch (err) {
            console.error('[TimeOffTypesListPage] Error fetching types:', err);
            setError(
                err?.response?.data?.message || err?.message || 'Failed to load time off types',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTypes();
    }, [loadTypes, refreshCount]);

    const columns = useMemo(
        () => [
            {
                key: 'name',
                label: 'Type Name',
                sortable: true,
                render: (_, row) => (
                    <div className="type-meta-cell">
                        <strong className="name-text">{row.name}</strong>
                        <span className="code-text">{row.code}</span>
                    </div>
                ),
            },
            {
                key: 'unit',
                label: 'Unit',
                sortable: true,
                render: () => <span>Days</span>,
            },
            {
                key: 'allocationRequired',
                label: 'Allocation',
                sortable: true,
                render: (val) => (
                    <Badge variant={val ? 'default' : 'neutral'}>
                        {val ? 'Required' : 'No Quota'}
                    </Badge>
                ),
            },
            {
                key: 'requestApprovalRequired',
                label: 'Approval',
                sortable: true,
                render: (val) => (
                    <Badge variant={val ? 'primary' : 'neutral'}>
                        {val ? 'Manager/HR' : 'Auto'}
                    </Badge>
                ),
            },
            {
                key: 'paidTimeOff',
                label: 'Paid / Unpaid',
                sortable: true,
                render: (val) => (
                    <span style={{ fontWeight: 500, color: val ? '#16a34a' : '#64748b' }}>
                        {val ? 'Paid Leave' : 'Unpaid Leave'}
                    </span>
                ),
            },
            {
                key: 'maxDaysPerRequest',
                label: 'Max Days / Req',
                sortable: true,
                render: (val) => <span>{val ? `${val} Days` : 'No Limit'}</span>,
            },
            {
                key: 'isActive',
                label: 'Status',
                sortable: true,
                render: (val) => (
                    <Badge variant={val ? 'success' : 'neutral'}>
                        {val ? 'Active' : 'Inactive'}
                    </Badge>
                ),
            },
            {
                key: 'actions',
                label: 'Actions',
                render: (_, row) => (
                    <div className="row-actions">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                navigate(`/dashboard/${roleSegment}/time-off/types/${row.id}`)
                            }
                            title="View or edit configuration"
                        >
                            <Eye size={14} />
                            <span>View / Edit</span>
                        </Button>
                    </div>
                ),
            },
        ],
        [navigate, roleSegment],
    );

    return (
        <div className="time-off-types-list-page">
            {/* Header Section */}
            <header className="page-header">
                <div className="header-info">
                    <div className="title-row">
                        <h1 className="header-title">Time Off Types</h1>
                    </div>
                    <p className="header-subtitle">
                        List view opened from Time Off ▼ → Time Off Types (leave policy rules &
                        quotas)
                    </p>
                </div>

                <div className="header-actions">
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => navigate(`/dashboard/${roleSegment}/time-off/types/new`)}
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
                    data={types}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Search time off types..."
                    showSerialNumber={true}
                    showSortDropdown={true}
                    showColumnSorting={true}
                    showRowsPerPage={true}
                    showResultsCount={true}
                    showPagination={true}
                    initialRowsPerPage={10}
                />
            </div>
        </div>
    );
}
