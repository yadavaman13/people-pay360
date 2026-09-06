import { useMemo } from 'react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import { getCategoryConfig } from '../../pages/SalaryRulesListPage/salaryRulesTable.config';
import './SalaryRulesTable.scss';

/**
 * SCR-PAY-008: Enterprise AdvancedTable implementation for Salary Rules
 * Exposed on Desktop & Tablet (>= 576px) with column sorting, filtering, and theme compliance.
 */
function SalaryRulesTable({
    rules = [],
    onRowClick,
    onStructureClick,
    isLoading = false,
    totalCount = 0,
    onTableChange,
    searchTerm = '',
    filterConfig = [],
    onRefresh,
    controlsLeft = null,
}) {
    const columns = useMemo(
        () => [
            {
                key: 'name',
                label: 'Rule Name',
                sortable: true,
                render: (_, row) => (
                    <div
                        className="salary-rules-table__name-cell"
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
                        <span className="rule-name-text">{row.name || 'Unnamed Rule'}</span>
                    </div>
                ),
            },
            {
                key: 'code',
                label: 'Code',
                sortable: true,
                render: (_, row) => <span className="rule-code-pill">{row.code || '—'}</span>,
            },
            {
                key: 'category',
                label: 'Category',
                sortable: true,
                render: (_, row) => {
                    const catConfig = getCategoryConfig(row.category);
                    return (
                        <Badge
                            variant={catConfig.variant}
                            className={`rule-category-badge ${catConfig.className}`}
                            size="sm"
                        >
                            {catConfig.label}
                        </Badge>
                    );
                },
            },
            {
                key: 'structureName',
                label: 'Structure',
                sortable: true,
                render: (_, row) => {
                    if (row.structureId) {
                        return (
                            <button
                                type="button"
                                className="structure-link-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStructureClick?.(row.structureId);
                                }}
                                title={`Go to ${row.structureName || 'Salary Structure'}`}
                            >
                                {row.structureName || 'Salary Structure'}
                            </button>
                        );
                    }
                    return (
                        <span className="structure-unassigned-text">
                            {row.structureName || 'Unassigned'}
                        </span>
                    );
                },
            },
            {
                key: 'sequenceOrder',
                label: 'Sequence',
                sortable: true,
                type: 'numeric',
                render: (_, row) => (
                    <span className="rule-sequence-badge">{row.sequenceOrder ?? '—'}</span>
                ),
            },
        ],
        [onRowClick, onStructureClick],
    );

    return (
        <div className="salary-rules-table-wrapper">
            <AdvancedTable
                columns={columns}
                data={rules}
                loading={isLoading}
                serverSide={false}
                totalCount={totalCount}
                onTableChange={onTableChange}
                searchable={true}
                searchTerm={searchTerm}
                searchPlaceholder="Search salary rules..."
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
                controlsLeft={controlsLeft}
                onRowClick={(row) => onRowClick?.(row.id)}
                className="salary-rules-table"
            />
        </div>
    );
}

export default SalaryRulesTable;
