import { Plus } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import SearchBar from '@/components/Shared/Form/SearchBar/SearchBar';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import './PayslipsFilterBar.scss';

/**
 * Filter & Action Bar for Payslips List Screen
 */
function PayslipsFilterBar({
    searchQuery = '',
    onSearchChange,
    selectedPayrunId = 'ALL',
    onPayrunChange,
    payrunOptions = [],
    onNewClick,
    isLoading = false,
    canCreate = true,
}) {
    const handleSearchInput = (e) => {
        const val = e?.target ? e.target.value : e || '';
        if (onSearchChange) onSearchChange(val);
    };

    const handleClearSearch = () => {
        if (onSearchChange) onSearchChange('');
    };

    return (
        <div className="payslips-filter-bar">
            {canCreate && (
                <div className="payslips-filter-bar__new">
                    <Button
                        variant="primary"
                        onClick={onNewClick}
                        icon={<Plus size={16} />}
                        disabled={isLoading}
                        className="payslips-filter-bar__btn-new"
                    >
                        NEW
                    </Button>
                </div>
            )}

            <div className="payslips-filter-bar__search">
                <SearchBar
                    value={searchQuery}
                    onChange={handleSearchInput}
                    onClear={handleClearSearch}
                    placeholder="Search payslips..."
                    placeholderOptions={[
                        'by employee name',
                        'by employee code',
                        'by payrun period',
                    ]}
                    className="payslips-filter-bar__search-input"
                />
            </div>

            <div className="payslips-filter-bar__period">
                <Dropdown
                    options={payrunOptions}
                    value={selectedPayrunId}
                    onChange={(val) => {
                        const nextVal = typeof val === 'object' && val !== null ? val.value : val;
                        if (onPayrunChange) onPayrunChange(nextVal || 'ALL');
                    }}
                    placeholder="Period: All"
                    disabled={isLoading}
                    className="payslips-filter-bar__period-dropdown"
                />
            </div>
        </div>
    );
}

export default PayslipsFilterBar;
