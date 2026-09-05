import InputField from '@/components/Shared/Form/InputField/InputField';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import DatePicker from '@/components/Shared/Form/DatePicker/DatePicker';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import { AlertTriangle } from 'lucide-react';
import './ContractFormFields.scss';

const WAGE_TYPE_OPTIONS = [
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'HOURLY', label: 'Hourly' },
];

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ACTIVE', label: 'Active' },
];

function ContractFormFields({
    form,
    onChange,
    errors = {},
    salaryStructures = [],
    workingSchedules = [],
    mode = 'create',
    disabled = false,
}) {
    const isEdit = mode === 'edit';

    const structureOptions = (salaryStructures || []).map((s) => ({
        value: s.id,
        label: s.name,
        description: s.code ? `Code: ${s.code}` : undefined,
    }));

    const scheduleOptions = (workingSchedules || []).map((w) => ({
        value: w.id,
        label: w.name,
        description: w.totalWeeklyHours ? `${w.totalWeeklyHours} hrs/week` : undefined,
    }));

    return (
        <div className="contract-form-fields">
            {errors.formBanner && (
                <div className="form-banner-error" role="alert">
                    <AlertTriangle size={18} className="banner-icon" />
                    <span>{errors.formBanner}</span>
                </div>
            )}

            <div className="form-grid">
                {/* 1. Employee */}
                <div className="form-grid-item col-span-2">
                    {isEdit ? (
                        <div className="locked-field-container">
                            <label className="locked-field-label">Employee ID</label>
                            <div className="locked-field-value">
                                <span>{form.employeeId || 'No employee assigned'}</span>
                                <span className="locked-tag">Cannot be changed in edit mode</span>
                            </div>
                        </div>
                    ) : (
                        <InputField
                            id="employeeId"
                            name="employeeId"
                            label="Employee ID *"
                            placeholder="Enter employee ID..."
                            value={form.employeeId}
                            onChange={(e) => onChange('employeeId', e.target.value)}
                            error={errors.employeeId}
                            disabled={disabled}
                        />
                    )}
                </div>

                {/* 2. Contract Name */}
                <div className="form-grid-item col-span-2">
                    <InputField
                        id="contractName"
                        name="contractName"
                        label="Contract Name *"
                        placeholder="e.g. Software Engineer 2026 Contract"
                        value={form.contractName}
                        onChange={(e) => onChange('contractName', e.target.value)}
                        error={errors.contractName}
                        disabled={disabled}
                    />
                </div>

                {/* 3. Start Date */}
                <div className="form-grid-item">
                    <DatePicker
                        label="Start Date *"
                        placeholder="DD-MM-YYYY"
                        value={form.startDate}
                        onChange={(formatted) => onChange('startDate', formatted)}
                        error={errors.startDate}
                        disabled={disabled}
                    />
                </div>

                {/* 4. End Date (Optional) */}
                <div className="form-grid-item">
                    <DatePicker
                        label="End Date (Leave blank for Open-Ended)"
                        placeholder="DD-MM-YYYY"
                        value={form.endDate}
                        onChange={(formatted) => onChange('endDate', formatted)}
                        error={errors.endDate}
                        disabled={disabled}
                    />
                </div>

                {/* 5. Wage Type */}
                <div className="form-grid-item">
                    <Dropdown
                        label="Wage Type *"
                        options={WAGE_TYPE_OPTIONS}
                        value={form.wageType}
                        onChange={(val) => onChange('wageType', val)}
                        error={errors.wageType}
                        disabled={disabled}
                    />
                </div>

                {/* 6. Wage Amount */}
                <div className="form-grid-item">
                    <InputField
                        id="wage"
                        name="wage"
                        type="number"
                        label={`Gross Wage * (${form.wageType === 'HOURLY' ? '₹ / hour' : '₹ / month'})`}
                        placeholder="e.g. 85000"
                        value={form.wage}
                        onChange={(e) => onChange('wage', e.target.value)}
                        error={errors.wage}
                        disabled={disabled}
                    />
                </div>

                {/* 7. Salary Structure */}
                <div className="form-grid-item">
                    <Dropdown
                        label="Salary Structure *"
                        placeholder="Select salary structure..."
                        options={structureOptions}
                        value={form.salaryStructureId}
                        onChange={(val) => onChange('salaryStructureId', val)}
                        error={errors.salaryStructureId}
                        searchable={true}
                        disabled={disabled}
                    />
                </div>

                {/* 8. Working Schedule */}
                <div className="form-grid-item">
                    <Dropdown
                        label="Working Schedule (Optional)"
                        placeholder="Select working schedule..."
                        options={scheduleOptions}
                        value={form.workingScheduleId}
                        onChange={(val) => onChange('workingScheduleId', val)}
                        error={errors.workingScheduleId}
                        searchable={true}
                        clearable={true}
                        disabled={disabled}
                    />
                </div>

                {/* 9. Status */}
                <div className="form-grid-item col-span-2">
                    <Dropdown
                        label="Initial Status *"
                        options={STATUS_OPTIONS}
                        value={form.status}
                        onChange={(val) => onChange('status', val)}
                        error={errors.status}
                        disabled={disabled}
                    />
                </div>

                {/* 10. Notes */}
                <div className="form-grid-item col-span-2">
                    <Textarea
                        id="contractNotes"
                        label="Notes & Terms (Optional)"
                        placeholder="Add special contract provisions, probation periods, or additional terms..."
                        value={form.notes}
                        onChange={(e) => onChange('notes', e.target.value)}
                        error={errors.notes}
                        maxLength={1000}
                        rows={4}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}

export default ContractFormFields;
