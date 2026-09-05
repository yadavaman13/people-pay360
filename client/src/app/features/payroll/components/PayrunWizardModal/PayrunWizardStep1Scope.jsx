import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import DatePicker from '@/components/Shared/Form/DatePicker/DatePicker';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Button from '@/components/Shared/Buttons/Button/Button';

function PayrunWizardStep1Scope({
    formData,
    onChange,
    onContinue,
    onCancel,
    isLoading = false,
    structures = [],
    errors = {},
}) {
    const structureOptions = structures.map((s) => ({
        value: s.id,
        label: `${s.name} (${s.code})`,
    }));

    const handleDateChange = (field) => (_formatted, dateObj) => {
        if (!dateObj) {
            onChange(field, '');
            return;
        }
        // Format to ISO date string YYYY-MM-DD
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        onChange(field, `${year}-${month}-${day}`);
    };

    return (
        <div className="payrun-wizard-step1">
            <div className="payrun-wizard-step1__intro">
                <p className="payrun-wizard-step1__desc">
                    Select a salary structure and payroll period to identify eligible employees for
                    this payrun.
                </p>
            </div>

            <div className="payrun-wizard-step1__form">
                <div className="payrun-wizard-step1__field">
                    <Dropdown
                        label="Salary Structure *"
                        options={structureOptions}
                        value={formData.salaryStructureId}
                        onChange={(opt) => onChange('salaryStructureId', opt?.value || opt || '')}
                        placeholder="Select Salary Structure"
                        error={errors.salaryStructureId}
                        disabled={isLoading}
                    />
                </div>

                <div className="payrun-wizard-step1__field-row">
                    <div className="payrun-wizard-step1__field">
                        <DatePicker
                            label="Period Start *"
                            value={formData.periodStart}
                            onChange={handleDateChange('periodStart')}
                            placeholder="DD-MM-YYYY"
                            error={errors.periodStart}
                            disabled={isLoading}
                            portal={true}
                            align="left"
                            showSelectedValue={false}
                        />
                    </div>
                    <div className="payrun-wizard-step1__field">
                        <DatePicker
                            label="Period End *"
                            value={formData.periodEnd}
                            onChange={handleDateChange('periodEnd')}
                            placeholder="DD-MM-YYYY"
                            error={errors.periodEnd}
                            disabled={isLoading}
                            min={formData.periodStart}
                            portal={true}
                            align="right"
                            showSelectedValue={false}
                        />
                    </div>
                </div>

                <div className="payrun-wizard-step1__field-row">
                    <div className="payrun-wizard-step1__field">
                        <InputField
                            label="Payrun Name (Optional)"
                            value={formData.name || ''}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder="Auto-generated if left empty"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="payrun-wizard-step1__field">
                        <DatePicker
                            label="Payment Date (Optional)"
                            value={formData.paymentDate || ''}
                            onChange={handleDateChange('paymentDate')}
                            placeholder="DD-MM-YYYY"
                            disabled={isLoading}
                            min={formData.periodStart || undefined}
                            portal={true}
                            align="right"
                            showSelectedValue={false}
                        />
                    </div>
                </div>
            </div>

            <div className="payrun-wizard-modal__footer">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="payrun-wizard-modal__btn-discard"
                >
                    Discard
                </Button>
                <Button
                    variant="primary"
                    onClick={onContinue}
                    loading={isLoading}
                    disabled={isLoading}
                    className="payrun-wizard-modal__btn-continue"
                >
                    Continue
                </Button>
            </div>
        </div>
    );
}

export default PayrunWizardStep1Scope;
