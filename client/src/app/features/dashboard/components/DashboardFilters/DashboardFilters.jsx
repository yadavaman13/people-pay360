import { useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import Button from '@/components/Shared/Buttons/Button/Button';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import './DashboardFilters.scss';

const DATE_PRESETS = [
    { key: 'THIS_MONTH', label: 'This Month' },
    { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { key: 'PREV_MONTH', label: 'Prev Month' },
    { key: 'THIS_YEAR', label: 'This Year' },
    { key: 'ALL_TIME', label: 'All Time' },
    { key: 'CUSTOM', label: 'Custom' },
];

/**
 * DashboardFilters — Period presets, custom date range, department filter,
 * employee type toggle, active filter count badge, and manual refresh.
 *
 * @param {Array} departments - Array of { id, name } for the department dropdown
 * @param {boolean} isRefreshing - Shows spinning refresh icon while fetching
 * @param {string} lastUpdatedLabel - Formatted "Last updated at HH:mm" text
 * @param {function} onRefresh - Manual refresh callback
 */
function DashboardFilters({
    departments = [],
    isRefreshing = false,
    lastUpdatedLabel = '',
    onRefresh = null,
}) {
    const {
        datePreset,
        periodStart,
        periodEnd,
        departmentId,
        employeeType,
        activeFilterCount,
        applyDatePreset,
        setCustomDateRange,
        setDepartmentId,
        setEmployeeType,
        resetFilters,
    } = useDashboard();

    const handlePresetClick = useCallback(
        (presetKey) => {
            if (presetKey !== 'CUSTOM') {
                applyDatePreset(presetKey);
            }
        },
        [applyDatePreset],
    );

    const handleStartDateChange = useCallback(
        (e) => setCustomDateRange(e.target.value, periodEnd),
        [setCustomDateRange, periodEnd],
    );

    const handleEndDateChange = useCallback(
        (e) => setCustomDateRange(periodStart, e.target.value),
        [setCustomDateRange, periodStart],
    );

    return (
        <div className="dashboard-filters">
            <div className="dashboard-filters-row">
                {/* Period Preset Pills */}
                <div className="dashboard-filters-presets">
                    {DATE_PRESETS.map((preset) => (
                        <button
                            key={preset.key}
                            className={`filter-preset-btn ${datePreset === preset.key ? 'is-active' : ''}`}
                            onClick={() => handlePresetClick(preset.key)}
                            aria-label={`Filter by ${preset.label}`}
                            aria-pressed={datePreset === preset.key}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Right Controls */}
                <div className="dashboard-filters-controls">
                    {activeFilterCount > 0 && (
                        <Badge variant="info" className="filter-count-badge">
                            {activeFilterCount} active
                        </Badge>
                    )}
                    <button
                        className="filter-reset-btn"
                        onClick={resetFilters}
                        title="Reset all filters"
                        aria-label="Reset all dashboard filters"
                    >
                        <X size={14} />
                        <span>Reset</span>
                    </button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onRefresh}
                        loading={isRefreshing}
                        icon={<RefreshCw size={14} className={isRefreshing ? 'spin-icon' : ''} />}
                        aria-label="Refresh dashboard data"
                        id="dashboard-refresh-btn"
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="dashboard-filters-row dashboard-filters-row--secondary">
                {/* Custom Date Range (visible only in CUSTOM mode) */}
                {datePreset === 'CUSTOM' && (
                    <div className="dashboard-filters-custom-range">
                        <div className="filter-date-group">
                            <label className="filter-date-label" htmlFor="dash-period-start">
                                From
                            </label>
                            <input
                                id="dash-period-start"
                                type="date"
                                className="filter-date-input"
                                value={periodStart}
                                onChange={handleStartDateChange}
                                max={periodEnd || undefined}
                                aria-label="Period start date"
                            />
                        </div>
                        <span className="filter-date-separator">—</span>
                        <div className="filter-date-group">
                            <label className="filter-date-label" htmlFor="dash-period-end">
                                To
                            </label>
                            <input
                                id="dash-period-end"
                                type="date"
                                className="filter-date-input"
                                value={periodEnd}
                                onChange={handleEndDateChange}
                                min={periodStart || undefined}
                                aria-label="Period end date"
                            />
                        </div>
                    </div>
                )}

                {/* Department Filter */}
                <div className="filter-select-group">
                    <label className="filter-select-label" htmlFor="dash-department">
                        Department
                    </label>
                    <select
                        id="dash-department"
                        className="filter-select"
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        aria-label="Filter by department"
                    >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Employee Type Segmented Toggle */}
                <div className="filter-segment-group">
                    <label className="filter-select-label">Type</label>
                    <div
                        className="filter-segment-btns"
                        role="radiogroup"
                        aria-label="Employee type filter"
                    >
                        {['', 'Full-time', 'Contract'].map((type) => (
                            <button
                                key={type || 'all'}
                                className={`filter-segment-btn ${employeeType === type ? 'is-active' : ''}`}
                                onClick={() => setEmployeeType(type)}
                                role="radio"
                                aria-checked={employeeType === type}
                                aria-label={type || 'All types'}
                            >
                                {type || 'All'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Last Updated */}
                {lastUpdatedLabel && (
                    <p className="filter-last-updated" aria-live="polite">
                        {lastUpdatedLabel}
                    </p>
                )}
            </div>
        </div>
    );
}

export default DashboardFilters;
