import { useParams, useNavigate } from 'react-router';
import {
    ArrowLeft,
    User,
    Wallet,
    CalendarDays,
    Building2,
    FileSignature,
    AlertCircle,
} from 'lucide-react';
import { useContractDetail } from '../hooks/useContractDetail';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import ContractStatusBadge from '../components/ContractStatusBadge/ContractStatusBadge';
import ExpiryWarningBadge from '../components/ExpiryWarningBadge/ExpiryWarningBadge';
import ContractActionBar from '../components/ContractActionBar/ContractActionBar';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './ContractDetailPage.scss';

function formatDisplayDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null || amount === '') return '—';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(num);
}

function ContractDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const { contract, loading, error, actionLoading, handleActivate, handleCancel, handleDelete } =
        useContractDetail(id);

    const userRole = (user?.role || '').toUpperCase();

    if (loading) {
        return (
            <div className="contract-detail-loading">
                <Spinner label="Loading contract details..." />
            </div>
        );
    }

    if (error || !contract) {
        return (
            <div className="contract-detail-page">
                <div className="detail-top-bar">
                    <button
                        type="button"
                        className="back-btn"
                        onClick={() => navigate('/dashboard/user/contracts')}
                    >
                        <ArrowLeft size={18} />
                        <span>Back to Contracts</span>
                    </button>
                </div>

                <div className="contract-not-found-card">
                    <Alert variant="danger">
                        <AlertTitle>Contract Error</AlertTitle>
                        <AlertDescription>
                            {error ||
                                'Contract record could not be found or you do not have permission to view it.'}
                        </AlertDescription>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => navigate('/dashboard/user/contracts')}
                            className="not-found-back-btn"
                        >
                            Return to Contracts List
                        </Button>
                    </Alert>
                </div>
            </div>
        );
    }

    const employeeName = contract.employee
        ? `${contract.employee.firstName || ''} ${contract.employee.lastName || ''}`.trim() ||
          'Unknown Employee'
        : 'Unknown Employee';

    const contractName =
        contract.contractName ||
        contract.notes?.split('\n')[0] ||
        (contract.salaryStructure?.name
            ? `${contract.salaryStructure.name} Contract`
            : 'Employment Contract');

    const startDateFormatted = formatDisplayDate(contract.startDate) || '—';
    const endDateFormatted = formatDisplayDate(contract.endDate) || 'Open-Ended (Permanent)';
    const wageFormatted = formatCurrency(contract.wage);
    const wageFrequency =
        (contract.wageType || 'MONTHLY').toLowerCase() === 'hourly' ? 'per hour' : 'per month';

    const isActive = contract.status === 'ACTIVE';

    return (
        <div className="contract-detail-page">
            {/* Top Navigation Bar */}
            <div className="detail-top-bar">
                <button
                    type="button"
                    className="back-btn"
                    onClick={() => navigate('/dashboard/user/contracts')}
                    aria-label="Back to Contracts"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Contracts</span>
                </button>
            </div>

            {/* Main Header Banner */}
            <div className="contract-header-card">
                <div className="header-meta">
                    <div className="category-tag-row">
                        <span className="contract-category-tag">Employment Contract</span>
                    </div>

                    <div className="title-and-badges">
                        <h1 className="contract-detail-title">{contractName}</h1>
                        <div className="badges-group">
                            <ContractStatusBadge status={contract.status} size="md" />
                            {contract.endDate && <ExpiryWarningBadge endDate={contract.endDate} />}
                        </div>
                    </div>

                    <div className="employee-profile-pill">
                        <div className="employee-avatar-circle">
                            <User size={13} />
                        </div>
                        <span className="employee-assigned-label">Assigned to:</span>
                        <span className="employee-name">{employeeName}</span>
                        {contract.employee?.employeeCode && (
                            <span className="employee-code-tag">
                                {contract.employee.employeeCode}
                            </span>
                        )}
                    </div>
                </div>

                <div className="header-actions-area">
                    <ContractActionBar
                        contract={contract}
                        userRole={userRole}
                        onActivate={handleActivate}
                        onCancel={handleCancel}
                        onDelete={handleDelete}
                        actionLoading={actionLoading}
                    />
                </div>
            </div>

            {/* Active Contract Payroll Impact Notice */}
            {isActive && (
                <div className="payroll-impact-notice">
                    <Alert variant="warning">
                        <div className="notice-inner">
                            <div className="notice-icon-box">
                                <AlertCircle size={18} />
                            </div>
                            <div className="notice-content">
                                <AlertTitle>Active Contract Payroll Notice</AlertTitle>
                                <AlertDescription>
                                    This contract is active and is referenced for payslip
                                    calculation in the current pay cycle. Modifying or cancelling
                                    this contract may trigger validation blockers during payroll
                                    execution.
                                </AlertDescription>
                            </div>
                        </div>
                    </Alert>
                </div>
            )}

            {/* Information Grid */}
            <div className="contract-info-grid">
                {/* 1. Compensation & Salary Structure */}
                <div className="info-card">
                    <div className="card-header">
                        <Wallet size={17} className="card-icon" />
                        <h2 className="card-title">Compensation & Structure</h2>
                    </div>
                    <div className="card-body">
                        <div className="info-row wage-row">
                            <span className="info-label">Gross Wage</span>
                            <div className="info-value wage-value-group">
                                <span className="wage-amount">{wageFormatted}</span>
                                <span className="wage-frequency">{wageFrequency}</span>
                            </div>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Salary Structure</span>
                            <span className="info-value">
                                {contract.salaryStructure?.name || '—'}
                                {contract.salaryStructure?.code && (
                                    <span className="sub-code">
                                        {' '}
                                        ({contract.salaryStructure.code})
                                    </span>
                                )}
                            </span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Wage Type</span>
                            <span className="info-value">{contract.wageType || 'MONTHLY'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Schedule & Period */}
                <div className="info-card">
                    <div className="card-header">
                        <CalendarDays size={17} className="card-icon" />
                        <h2 className="card-title">Schedule & Period</h2>
                    </div>
                    <div className="card-body">
                        <div className="info-row">
                            <span className="info-label">Start Date</span>
                            <span className="info-value">{startDateFormatted}</span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">End Date</span>
                            <span className="info-value">{endDateFormatted}</span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Working Schedule</span>
                            <span className="info-value">
                                {contract.workingSchedule?.name || 'Standard Organization Schedule'}
                            </span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Max Punches / Day</span>
                            <span className="info-value">
                                {contract.maxPunchesPerDay ?? 3} punches
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Department & Organization Assignment */}
                <div className="info-card">
                    <div className="card-header">
                        <Building2 size={17} className="card-icon" />
                        <h2 className="card-title">Organization Alignment</h2>
                    </div>
                    <div className="card-body">
                        <div className="info-row">
                            <span className="info-label">Department</span>
                            <span className="info-value">
                                {contract.department?.name || 'Organization Default'}
                            </span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Job Position</span>
                            <span className="info-value">
                                {contract.jobPosition?.title || 'Not specified'}
                            </span>
                        </div>

                        <div className="info-row">
                            <span className="info-label">Created On</span>
                            <span className="info-value">
                                {formatDisplayDate(contract.createdAt) || '—'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Notes and Specific Provisions */}
                <div className="info-card col-span-full">
                    <div className="card-header">
                        <FileSignature size={17} className="card-icon" />
                        <h2 className="card-title">Contract Terms & Notes</h2>
                    </div>
                    <div className="card-body">
                        {contract.notes ? (
                            <p className="contract-notes-text">{contract.notes}</p>
                        ) : (
                            <p className="empty-notes-text">
                                No additional terms or notes specified for this contract.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ContractDetailPage;
