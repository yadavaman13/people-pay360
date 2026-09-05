import { useMemo } from 'react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import { getPayrunColumns } from '../../pages/PayrunsListPage/payrunsTable.config';
import './PayrunsTable.scss';

/**
 * Enterprise Data Table wrapper for Payruns List (SCR-PAY-001)
 * Visible on Desktop & Tablet (>= 576px)
 */
function PayrunsTable({
    payruns = [],
    onRowClick,
    onDelete,
    canDelete = true,
    isLoading = false,
    totalCount = 0,
    onTableChange,
    filterConfig = [],
    onRefresh,
    searchTerm = '',
}) {
    const columns = useMemo(
        () =>
            getPayrunColumns({
                onRowNavigate: onRowClick,
                onDelete,
                canDelete,
            }),
        [onRowClick, onDelete, canDelete],
    );

    return (
        <div className="payruns-table-wrapper">
            <AdvancedTable
                columns={columns}
                data={payruns}
                loading={isLoading}
                serverSide={true}
                totalCount={totalCount}
                onTableChange={onTableChange}
                searchable={true}
                searchTerm={searchTerm}
                searchPlaceholder="Search payruns by name, structure, status..."
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
                initialRowsPerPage={20}
                className="payruns-table"
            />
        </div>
    );
}

export default PayrunsTable;
