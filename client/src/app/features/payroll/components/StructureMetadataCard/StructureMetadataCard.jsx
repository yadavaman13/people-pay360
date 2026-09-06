import InputField from '@/components/Shared/Form/InputField/InputField';
import Textarea from '@/components/Shared/Form/Textarea/Textarea';
import Checkbox from '@/components/Shared/Form/Checkbox/Checkbox';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import './StructureMetadataCard.scss';

/**
 * StructureMetadataCard
 * Displays Structure Name, Code, Active status, Rules count, and Description.
 * Switches between high-clarity View mode and editable Form inputs.
 */
function StructureMetadataCard({
    structure,
    isEditing = false,
    formData = {},
    onChange,
    errors = {},
}) {
    const rulesCount = structure?.rules?.length || 0;

    const handleCodeChange = (e) => {
        const raw = e.target.value.toUpperCase();
        onChange?.('code', raw);
    };

    return (
        <section className="structure-metadata-card">
            <div className="card-header">
                <h2 className="card-title">Structure Information</h2>
                <div className="card-badges">
                    <Badge variant={structure?.isActive ? 'success' : 'neutral'} showDot={true}>
                        {structure?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="info">
                        {rulesCount} {rulesCount === 1 ? 'Rule Attached' : 'Rules Attached'}
                    </Badge>
                </div>
            </div>

            {isEditing ? (
                <div className="card-edit-grid">
                    <div className="form-group name-group">
                        <InputField
                            label="Structure Name *"
                            id="edit-structure-name"
                            placeholder="e.g. Regular Salary"
                            value={formData.name || ''}
                            onChange={(e) => onChange?.('name', e.target.value)}
                            error={errors.name}
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group code-group">
                        <InputField
                            label="Structure Code *"
                            id="edit-structure-code"
                            placeholder="e.g. REG_SALARY"
                            value={formData.code || ''}
                            onChange={handleCodeChange}
                            error={errors.code}
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group full-width description-group">
                        <Textarea
                            label="Description"
                            id="edit-structure-description"
                            placeholder="Provide details on target employee grades or calculation rules..."
                            value={formData.description || ''}
                            onChange={(e) => onChange?.('description', e.target.value)}
                            error={errors.description}
                            maxLength={500}
                            rows={3}
                            hint="Maximum 500 characters"
                        />
                    </div>

                    <div className="form-group full-width active-toggle-group">
                        <Checkbox
                            id="edit-structure-active"
                            checked={Boolean(formData.isActive)}
                            onChange={(e) => onChange?.('isActive', e.target.checked)}
                            label="Active structure (available for employment contracts and payruns)"
                        />
                    </div>
                </div>
            ) : (
                <div className="card-view-grid">
                    <div className="view-field">
                        <span className="field-label">Structure Name</span>
                        <span className="field-value highlight-value">
                            {structure?.name || '—'}
                        </span>
                    </div>

                    <div className="view-field">
                        <span className="field-label">Structure Code</span>
                        <div className="field-value">
                            <span className="code-pill">{structure?.code || '—'}</span>
                        </div>
                    </div>

                    <div className="view-field">
                        <span className="field-label">Active Status</span>
                        <span className="field-value">
                            {structure?.isActive ? 'True (● Active)' : 'False (○ Inactive)'}
                        </span>
                    </div>

                    <div className="view-field">
                        <span className="field-label">Rules Configured</span>
                        <span className="field-value">
                            {rulesCount} Rules in computation pipeline
                        </span>
                    </div>

                    <div className="view-field full-width">
                        <span className="field-label">Description</span>
                        <p className="field-value description-text">
                            {structure?.description || 'No description provided.'}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}

export default StructureMetadataCard;
