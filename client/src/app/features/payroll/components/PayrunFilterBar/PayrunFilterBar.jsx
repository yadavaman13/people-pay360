import { Plus } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import SearchBar from '@/components/Shared/Form/SearchBar/SearchBar';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import './PayrunFilterBar.scss';

const YEAR_OPTIONS = [
    { value: 'All', label: 'All Years' },
    { value: '2026', label: '2026' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
];

const STATUS_OPTIONS = [
    { value: 'All', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'COMPUTED', label: 'Computed' },
    { value: 'VALIDATED', label: 'Validated' },
    { value: 'PAID', label: 'Paid' },
];

function PayrunFilterBar({
    searchQuery = '',
    onSearchChange,
    selectedYear = 'All',
    onYearChange,
    selectedStatus = 'All',
    onStatusChange,
    onNewClick,
    canCreate = true,
    isLoading = false,
}) {
    const handleSearch = (e) => {
        const val = e?.target ? e.target.value : e || '';
        if (onSearchChange) onSearchChange(val);
    };

    const handleClearSearch = () => {
        if (onSearchChange) onSearchChange('');
    };

    return (
        <div className="payrun-filter-bar">
            <div className="payrun-filter-bar__left">
                {canCreate && (
                    <Button
                        variant="primary"
                        onClick={onNewClick}
                        icon={<Plus size={16} />}
                        disabled={isLoading}
                        className="payrun-filter-bar__new-btn"
                    >
                        NEW
                    </Button>
                )}
            </div>

            <div className="payrun-filter-bar__center">
                <SearchBar
                    value={searchQuery}
                    onChange={handleSearch}
                    onClear={handleClearSearch}
                    placeholder="Search payruns..."
                    placeholderOptions={['by payrun name', 'by salary structure', 'by status']}
                    className="payrun-filter-bar__search"
                />
            </div>

            <div className="payrun-filter-bar__right">
                <div className="payrun-filter-bar__dropdown-wrapper">
                    <Dropdown
                        options={STATUS_OPTIONS}
                        value={selectedStatus}
                        onChange={(opt) => onStatusChange && onStatusChange(opt?.value || opt)}
                        placeholder="Status"
                        disabled={isLoading}
                    />
                </div>
                <div className="payrun-filter-bar__dropdown-wrapper">
                    <Dropdown
                        options={YEAR_OPTIONS}
                        value={selectedYear}
                        onChange={(opt) => onYearChange && onYearChange(opt?.value || opt)}
                        placeholder="Year"
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}

export default PayrunFilterBar;
