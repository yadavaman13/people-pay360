import './ContractStatusBadge.scss';

const STATUS_CONFIG = {
    ACTIVE: {
        label: 'Active',
        className: 'status-active',
    },
    DRAFT: {
        label: 'Draft',
        className: 'status-draft',
    },
    EXPIRED: {
        label: 'Expired',
        className: 'status-expired',
    },
    CANCELLED: {
        label: 'Cancelled',
        className: 'status-cancelled',
    },
};

function ContractStatusBadge({ status = 'DRAFT', size = 'md' }) {
    const normalizedStatus = (status || 'DRAFT').toUpperCase();
    const config = STATUS_CONFIG[normalizedStatus] || {
        label: normalizedStatus,
        className: 'status-draft',
    };

    return (
        <span
            className={`contract-status-badge ${config.className} size-${size}`}
            data-status={normalizedStatus}
            aria-label={`Contract status: ${config.label}`}
        >
            <span className="status-dot" aria-hidden="true" />
            <span className="status-label">{config.label}</span>
        </span>
    );
}

export default ContractStatusBadge;
