import { useMemo } from 'react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import { getPayslipColumns } from '../../pages/PayslipsListPage/payslipsTable.config';
import './PayslipsTable.scss';

/**
 * Enterprise Data Table wrapper for Payslips List
 * Visible on Desktop & Tablet (>= 576px)
 */
function PayslipsTable({
    payslips = [],
    onRowClick,
    isLoading = false,
    warningsMap = {},
    totalCount = 0,
    onTableChange,
    filterConfig = [],
    onRefresh,
}) {
    const columns = useMemo(
        () => getPayslipColumns(warningsMap, onRowClick),
        [warningsMap, onRowClick],
    );

    return (
        <div className="payslips-table-wrapper">
            <AdvancedTable
                columns={columns}
                data={payslips}
                loading={isLoading}
                serverSide={true}
                totalCount={totalCount}
                onTableChange={onTableChange}
                searchable={true}
                searchPlaceholder="Search payslips by employee name, code..."
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
                className="payslips-table"
            />
        </div>
    );
}

export default PayslipsTable;
