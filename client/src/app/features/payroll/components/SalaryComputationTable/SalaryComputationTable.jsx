import { useMemo } from 'react';
import AdvancedTable from '@/components/Shared/DataDisplay/AdvancedTable/AdvancedTable';
import { computationColumns } from '../../pages/PayslipDetailPage/salaryComputationTable.config';
import './SalaryComputationTable.scss';

function SalaryComputationTable({
    lines = [],
    breakdown = null,
    grossAmount = '0',
    netAmount = '0',
    isLoading = false,
}) {
    // Construct ordered rows for Table:
    // Earnings (Basic + Allowances) -> Gross Salary row -> Deductions -> Net Salary row
    const tableData = useMemo(() => {
        const basicLines =
            breakdown?.basic && breakdown.basic.length > 0
                ? breakdown.basic
                : lines.filter((l) => l.category === 'BASIC');

        const allowanceLines =
            breakdown?.allowances && breakdown.allowances.length > 0
                ? breakdown.allowances
                : lines.filter((l) => l.category === 'ALLOWANCE');

        const deductionLines =
            breakdown?.deductions && breakdown.deductions.length > 0
                ? breakdown.deductions
                : lines.filter((l) => l.category === 'DEDUCTION');

        const otherLines =
            breakdown?.other && breakdown.other.length > 0
                ? breakdown.other
                : lines.filter(
                      (l) =>
                          !['BASIC', 'ALLOWANCE', 'DEDUCTION', 'GROSS', 'NET'].includes(l.category),
                  );

        const grossRow = {
            id: 'summary-gross',
            name: 'Gross Salary',
            category: 'GROSS',
            amount: grossAmount,
            code: 'GROSS',
            isSummary: true,
        };

        const netRow = {
            id: 'summary-net',
            name: 'Net Salary',
            category: 'NET',
            amount: netAmount,
            code: 'NET',
            isSummary: true,
        };

        return [
            ...basicLines,
            ...allowanceLines,
            ...otherLines,
            grossRow,
            ...deductionLines,
            netRow,
        ];
    }, [lines, breakdown, grossAmount, netAmount]);

    return (
        <div className="salary-computation-section">
            <h3 className="computation-title">Salary Computation</h3>

            <div className="computation-table-card">
                <AdvancedTable
                    columns={computationColumns}
                    data={tableData}
                    loading={isLoading}
                    showPagination={false}
                />
            </div>
        </div>
    );
}

export default SalaryComputationTable;
