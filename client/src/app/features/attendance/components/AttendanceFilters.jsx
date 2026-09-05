import { useState, useEffect } from 'react';
import SearchBar from '@/components/Shared/Form/SearchBar/SearchBar';
import DatePicker from '@/components/Shared/Form/DatePicker/DatePicker';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Card, CardContent } from '@/components/Shared/DataDisplay/Card/Card';
import { RotateCcw } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PRESENT', label: 'Present' },
    { value: 'LATE', label: 'Late Arrival' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'HALF_DAY', label: 'Half Day' },
    { value: 'MANUAL_CORRECTION', label: 'Manually Corrected' },
];

export default function AttendanceFilters({
    filters,
    onFilterChange,
    employeesList = [],
    isHR = false,
    onReset,
}) {
    const [searchLocal, setSearchLocal] = useState(filters.search || '');
    const [prevSearch, setPrevSearch] = useState(filters.search || '');

    // Synchronize local search state with parent if reset from outside
    if ((filters.search || '') !== prevSearch) {
        setPrevSearch(filters.search || '');
        setSearchLocal(filters.search || '');
    }

    // Debounce search by 300ms
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchLocal !== (filters.search || '')) {
                onFilterChange({ search: searchLocal });
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchLocal, filters.search, onFilterChange]);

    const safeEmployees = Array.isArray(employeesList)
        ? employeesList
        : Array.isArray(employeesList?.employees)
          ? employeesList.employees
          : [];

    const employeeOptions = [
        { value: '', label: 'All Employees' },
        ...safeEmployees.map((emp) => ({
            value: emp.id,
            label: `${emp.firstName || ''} ${emp.lastName || ''} (${emp.employeeCode || 'N/A'})`.trim(),
        })),
    ];

    return (
        <Card className="attendance-filters-card">
            <CardContent>
                <div className="filters-form-row">
                    {/* Search Bar */}
                    <div className="filter-item search-item">
                        <span className="filter-label">Search</span>
                        <SearchBar
                            value={searchLocal}
                            onChange={(e) => setSearchLocal(e.target.value)}
                            onClear={() => setSearchLocal('')}
                            placeholder={
                                isHR ? 'Search employee name or code...' : 'Search records...'
                            }
                        />
                    </div>

                    {/* Date Picker */}
                    <div className="filter-item">
                        <span className="filter-label">Date</span>
                        <DatePicker
                            value={filters.dateFrom}
                            onChange={(val) =>
                                onFilterChange({
                                    dateFrom: val,
                                    dateTo: val,
                                })
                            }
                            placeholder="Select Date"
                            clearable
                        />
                    </div>

                    {/* Status Dropdown */}
                    <div className="filter-item">
                        <span className="filter-label">Status</span>
                        <Dropdown
                            options={STATUS_OPTIONS}
                            value={filters.status}
                            onChange={(val) => onFilterChange({ status: val || 'ALL' })}
                            placeholder="Filter by Status"
                        />
                    </div>

                    {/* Employee Selector Dropdown (HR only) */}
                    {isHR && (
                        <div className="filter-item">
                            <span className="filter-label">Employee</span>
                            <Dropdown
                                options={employeeOptions}
                                value={filters.employeeId || ''}
                                onChange={(val) => onFilterChange({ employeeId: val || '' })}
                                placeholder="Select Employee"
                                searchable
                            />
                        </div>
                    )}

                    {/* Reset Filters */}
                    <div className="filter-actions">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearchLocal('');
                                onReset && onReset();
                            }}
                            title="Reset all filters"
                        >
                            <RotateCcw size={14} style={{ marginRight: '6px' }} />
                            Reset
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
