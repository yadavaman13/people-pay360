import { useMemo, useState } from 'react';
import { ArrowUpDown, Download } from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from '@/components/Shared/DataDisplay/Card/Card';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import { formatINR, formatINRCompact } from '../../hooks/useDashboardData';
import './DepartmentBreakdownTable.scss';

const COLUMNS = [
    { key: 'name', label: 'Department', sortable: true },
    { key: 'headcount', label: 'Headcount', sortable: true, align: 'right' },
    { key: 'totalWageExpense', label: 'Total Wage', sortable: true, align: 'right' },
    { key: 'averageSalary', label: 'Avg Net', sortable: true, align: 'right' },
    { key: 'attendanceRate', label: 'Attendance', sortable: true, align: 'right' },
    { key: 'leaveDaysTaken', label: 'Leave Days', sortable: true, align: 'right' },
];

/**
 * DepartmentBreakdownTable — Sortable data table of per-department operational metrics.
 * Renders headcount, wage expense, avg salary, attendance rate, and leave days taken.
 *
 * @param {Array} data - Raw department breakdown from fetchDepartmentBreakdown()
 * @param {boolean} loading
 * @param {function} getCsvData - () => { headers, rows } for CSV download
 */
function DepartmentBreakdownTable({ data = [], loading = false, getCsvData }) {
    const [sortKey, setSortKey] = useState('totalWageExpense');
    const [sortDir, setSortDir] = useState('desc');

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sortedData = useMemo(() => {
        if (!data || data.length === 0) return [];
        return [...data].sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (typeof av === 'string') {
                return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
        });
    }, [data, sortKey, sortDir]);

    const handleExportCsv = () => {
        if (!getCsvData) return;
        const { headers, rows } = getCsvData();
        const content = [
            headers.join(','),
            ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'department_breakdown.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const renderCellValue = (col, row) => {
        const val = row[col.key];
        switch (col.key) {
            case 'totalWageExpense':
            case 'averageSalary':
                return (
                    <span title={formatINR(val)} className="table-cell-currency">
                        {formatINRCompact(val)}
                    </span>
                );
            case 'attendanceRate': {
                const rate = Number(val);
                const variant = rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger';
                return (
                    <Badge variant={variant}>
                        {typeof val === 'string' ? val : `${rate.toFixed(1)}%`}
                    </Badge>
                );
            }
            case 'headcount':
                return <span className="table-cell-number">{val}</span>;
            case 'leaveDaysTaken':
                return <span className="table-cell-number">{Number(val).toFixed(0)}</span>;
            default:
                return val;
        }
    };

    return (
        <Card className="dept-breakdown-card">
            <CardHeader className="dept-breakdown-header">
                <CardTitle className="dept-breakdown-title">Department Breakdown</CardTitle>
                <div className="dept-breakdown-actions">
                    <Badge variant="neutral">{data.length} departments</Badge>
                    {getCsvData && (
                        <Button
                            icon={<Download size={14} />}
                            onClick={handleExportCsv}
                            title="Export as CSV"
                            aria-label="Export department breakdown as CSV"
                            variant="ghost"
                            size="sm"
                        />
                    )}
                </div>
            </CardHeader>

            <CardContent className="dept-breakdown-content">
                {loading && (
                    <div className="dept-breakdown-loading">
                        <Spinner />
                    </div>
                )}
                {!loading && data.length === 0 && (
                    <EmptyState
                        title="No department data"
                        description="Department metrics will appear once employees are assigned."
                    />
                )}
                {!loading && data.length > 0 && (
                    <div className="dept-breakdown-table-wrapper">
                        <table
                            className="dept-breakdown-table"
                            aria-label="Department operational breakdown"
                        >
                            <thead>
                                <tr>
                                    {COLUMNS.map((col) => (
                                        <th
                                            key={col.key}
                                            className={`dept-table-th ${col.align === 'right' ? 'is-right' : ''} ${col.sortable ? 'is-sortable' : ''} ${sortKey === col.key ? 'is-sorted' : ''}`}
                                            onClick={
                                                col.sortable ? () => handleSort(col.key) : undefined
                                            }
                                            aria-sort={
                                                sortKey === col.key
                                                    ? sortDir === 'asc'
                                                        ? 'ascending'
                                                        : 'descending'
                                                    : 'none'
                                            }
                                        >
                                            <span className="dept-table-th-label">
                                                {col.label}
                                                {col.sortable && (
                                                    <ArrowUpDown
                                                        size={12}
                                                        className={`sort-icon ${sortKey === col.key ? 'sort-icon--active' : ''}`}
                                                    />
                                                )}
                                            </span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((row, idx) => (
                                    <tr key={row.id || idx} className="dept-table-row">
                                        {COLUMNS.map((col) => (
                                            <td
                                                key={col.key}
                                                className={`dept-table-td ${col.align === 'right' ? 'is-right' : ''}`}
                                            >
                                                {col.key === 'name' ? (
                                                    <div className="dept-name-cell">
                                                        <span className="dept-name">
                                                            {row.name}
                                                        </span>
                                                        {row.code && (
                                                            <span className="dept-code">
                                                                {row.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    renderCellValue(col, row)
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default DepartmentBreakdownTable;
