import { useMemo } from 'react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Tooltip from '@/components/Shared/DataDisplay/Tooltip/Tooltip';
import './SalaryStructuresTable.scss';

/**
 * SCR-PAY-006: Enterprise AdvancedTable implementation for Salary Structures
 * Adheres to minimal-by-default architecture and theme tokens.
 */
function SalaryStructuresTable({
    structures = [],
    onRowClick,
    isLoading = false,
    totalCount = 0,
    onTableChange,
    searchTerm = '',
    filterConfig = [],
    onRefresh,
}) {
    const columns = useMemo(
        () => [
            {
                key: 'name',
                label: 'Structure Name',
                sortable: true,
                render: (_, row) => (
                    <div
                        className="salary-structures-table__name-cell"
                        onClick={() => onRowClick?.(row.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onRowClick?.(row.id);
                            }
                        }}
                    >
                        <span className="structure-name-text">
                            {row.name || 'Unnamed Structure'}
                        </span>
                        {row.code && <span className="structure-code-badge">{row.code}</span>}
                    </div>
                ),
            },
            {
                key: 'rulesCount',
                label: 'Rules',
                sortable: true,
                type: 'numeric',
                render: (_, row) => {
                    const count = Number(row.rulesCount) || 0;
                    return (
                        <span className="rules-count-text">
                            {count} {count === 1 ? 'rule' : 'rules'}
                        </span>
                    );
                },
            },
            {
                key: 'employees',
                label: 'Employees',
                sortable: false,
                render: () => (
                    <Tooltip
                        content="Employee association count requires API update"
                        position="top"
                    >
                        <span className="api-gap-indicator">—</span>
                    </Tooltip>
                ),
            },
            {
                key: 'isActive',
                label: 'Active',
                sortable: true,
                render: (_, row) => {
                    const isActive = row.isActive !== false;
                    return (
                        <Badge variant={isActive ? 'success' : 'neutral'} dot={isActive} size="sm">
                            {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    );
                },
            },
        ],
        [onRowClick],
    );

    return (
        <div className="salary-structures-table-wrapper">
            <AdvancedTable
                columns={columns}
                data={structures}
                loading={isLoading}
                serverSide={true}
                totalCount={totalCount}
                onTableChange={onTableChange}
                searchable={true}
                searchTerm={searchTerm}
                searchPlaceholder="Search structures..."
                showColumnSorting={true}
                showSortDropdown={true}
                showFilter={true}
                filterConfig={filterConfig}
                showRefresh={true}
                onRefresh={onRefresh}
                showRowsPerPage={true}
                showResultsCount={true}
                showPagination={true}
                showSerialNumber={false}
                initialRowsPerPage={50}
                className="salary-structures-table"
            />
        </div>
    );
}

export default SalaryStructuresTable;
