import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import Checkbox from '@/components/Shared/Form/Checkbox/Checkbox';
import Button from '@/components/Shared/Buttons/Button/Button';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '—';
    const num = Number(amount);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(num);
}

function formatDateShort(dateStr) {
    if (!dateStr) return '—';
    try {
        const [year, month, day] = dateStr.split('-');
        const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
        ];
        const m = months[parseInt(month, 10) - 1] || month;
        return `${m} ${parseInt(day, 10)}, ${year}`;
    } catch {
        return dateStr;
    }
}

function PayrunWizardStep2Employees({
    eligible = [],
    ineligible = [],
    selectedIds = [],
    onToggleSelect,
    onToggleSelectAll,
    onCreatePayrun,
    onBack,
    isLoading = false,
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEligible = useMemo(() => {
        if (!searchQuery.trim()) return eligible;
        const q = searchQuery.trim().toLowerCase();
        return eligible.filter((item) => {
            const emp = item.employee || {};
            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
            const code = (emp.employeeCode || '').toLowerCase();
            const dept = (emp.departmentName || '').toLowerCase();
            const title = (emp.jobTitle || '').toLowerCase();
            return (
                fullName.includes(q) || code.includes(q) || dept.includes(q) || title.includes(q)
            );
        });
    }, [eligible, searchQuery]);

    const isAllSelected =
        filteredEligible.length > 0 &&
        filteredEligible.every((item) => selectedIds.includes(item.employee?.id));

    const selectedCount = selectedIds.length;
    const totalCount = eligible.length;

    return (
        <div className="payrun-wizard-step2">
            {/* Search and Selection Counter Header */}
            <div className="payrun-wizard-step2__toolbar">
                <div className="payrun-wizard-step2__search-box">
                    <Search size={16} className="payrun-wizard-step2__search-icon" />
                    <input
                        type="text"
                        className="payrun-wizard-step2__search-input"
                        placeholder="Search employees by name, code, department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="payrun-wizard-step2__counter">
                    <span className="payrun-wizard-step2__counter-badge">
                        {selectedCount} / {totalCount} selected
                    </span>
                </div>
            </div>

            {/* Ineligible notice if any */}
            {ineligible.length > 0 && (
                <div className="payrun-wizard-step2__notice">
                    Note: {ineligible.length}{' '}
                    {ineligible.length === 1 ? 'employee was' : 'employees were'} excluded due to
                    missing active contracts or matching salary structures.
                </div>
            )}

            {/* Employee Selection Table */}
            <div className="payrun-wizard-step2__table-container">
                {filteredEligible.length === 0 ? (
                    <EmptyState
                        title="No Employees Found"
                        description={
                            searchQuery
                                ? 'No employees match your search query.'
                                : 'No eligible employees found for this salary structure in the selected period.'
                        }
                    />
                ) : (
                    <table className="payrun-wizard-step2__table">
                        <thead>
                            <tr>
                                <th className="payrun-wizard-step2__th-checkbox">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onChange={onToggleSelectAll}
                                        id="payrun-wizard-select-all"
                                    />
                                </th>
                                <th>Employee</th>
                                <th>Department / Title</th>
                                <th>Start Date</th>
                                <th className="payrun-wizard-step2__th-wage">Wage</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEligible.map((item) => {
                                const emp = item.employee || {};
                                const contract = item.contract || {};
                                const isChecked = selectedIds.includes(emp.id);
                                const fullName =
                                    `${emp.firstName || ''} ${emp.lastName || ''}`.trim() ||
                                    'Unnamed';

                                return (
                                    <tr
                                        key={emp.id}
                                        className={`payrun-wizard-step2__row ${isChecked ? 'is-selected' : ''}`}
                                        onClick={() => onToggleSelect(emp.id)}
                                    >
                                        <td
                                            className="payrun-wizard-step2__td-checkbox"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                checked={isChecked}
                                                onChange={() => onToggleSelect(emp.id)}
                                                id={`emp-select-${emp.id}`}
                                            />
                                        </td>
                                        <td className="payrun-wizard-step2__td-employee">
                                            <div className="payrun-wizard-step2__emp-name">
                                                {fullName}
                                            </div>
                                            <div className="payrun-wizard-step2__emp-code">
                                                {emp.employeeCode}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="payrun-wizard-step2__emp-dept">
                                                {emp.departmentName || '—'}
                                            </div>
                                            <div className="payrun-wizard-step2__emp-title">
                                                {emp.jobTitle || '—'}
                                            </div>
                                        </td>
                                        <td>{formatDateShort(contract.startDate)}</td>
                                        <td className="payrun-wizard-step2__td-wage">
                                            {formatCurrency(contract.wage)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="payrun-wizard-modal__footer">
                <Button
                    variant="secondary"
                    onClick={onBack}
                    disabled={isLoading}
                    className="payrun-wizard-modal__btn-back"
                >
                    Back
                </Button>
                <Button
                    variant="primary"
                    onClick={onCreatePayrun}
                    loading={isLoading}
                    disabled={isLoading || selectedCount === 0}
                    className="payrun-wizard-modal__btn-create"
                >
                    Create payrun ({selectedCount})
                </Button>
            </div>
        </div>
    );
}

export default PayrunWizardStep2Employees;
