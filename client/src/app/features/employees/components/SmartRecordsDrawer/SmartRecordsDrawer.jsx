import React, { useState } from 'react';
import Drawer from '@/components/Shared/Feedback/Drawer/Drawer';
import Badge from '@/components/Shared/DataDisplay/Badge/Badge';
import Button from '@/components/Shared/Buttons/Button/Button';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import { Plus, Calendar, FileText, Clock, CreditCard } from 'lucide-react';
import './SmartRecordsDrawer.scss';

/**
 * SmartRecordsDrawer — Slide-over drawer opening from Image 3 Smart Buttons.
 */
function SmartRecordsDrawer({
    isOpen,
    onClose,
    type,
    title,
    records,
    loading,
    employeeId,
    onAddBankAccount,
    onSetPrimaryBankAccount,
    _onDeleteBankAccount,
}) {
    // Local state for Add Bank Account form
    const [showAddBank, setShowAddBank] = useState(false);
    const [bankFormData, setBankFormData] = useState({
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
        accountType: 'SAVINGS',
        isPrimary: true,
    });
    const [bankSubmitting, setBankSubmitting] = useState(false);

    const handleBankSubmit = async (e) => {
        e.preventDefault();
        setBankSubmitting(true);
        try {
            await onAddBankAccount(employeeId, bankFormData);
            setShowAddBank(false);
            setBankFormData({
                bankName: '',
                accountNumber: '',
                accountHolderName: '',
                ifscCode: '',
                accountType: 'SAVINGS',
                isPrimary: true,
            });
        } catch (err) {
            console.error('Add bank account error:', err);
        } finally {
            setBankSubmitting(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return 'Present';
        return new Date(d).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '—';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="lg"
            position="right"
            className="smart-records-drawer"
        >
            <div className="smart-records-drawer__content">
                {loading ? (
                    <div className="smart-drawer-spinner">
                        <Spinner size="lg" />
                        <p>Loading records...</p>
                    </div>
                ) : type === 'contracts' ? (
                    // ── CONTRACTS TAB ──────────────────────────────────────────
                    <div className="contracts-records-view">
                        <div className="section-intro">
                            <FileText size={18} className="intro-icon" />
                            <p>
                                Contract history and applicable compensation structures for this
                                employee.
                            </p>
                        </div>

                        {!records || records.length === 0 ? (
                            <p className="empty-hint">No contracts registered for this employee.</p>
                        ) : (
                            <div className="records-list">
                                {records.map((c) => {
                                    const isActive = (c.status || '').toUpperCase() === 'ACTIVE';
                                    return (
                                        <div
                                            key={c.id}
                                            className={`contract-item-card ${isActive ? 'is-active-contract' : ''}`}
                                        >
                                            <div className="contract-header">
                                                <div className="contract-wage">
                                                    <span className="wage-amount">
                                                        {formatCurrency(c.wage)}
                                                    </span>
                                                    <span className="wage-period">/ month</span>
                                                </div>
                                                <Badge
                                                    variant={isActive ? 'success' : 'neutral'}
                                                    showDot={isActive}
                                                >
                                                    {c.status || 'Draft'}
                                                </Badge>
                                            </div>
                                            <div className="contract-details">
                                                <div className="detail-row">
                                                    <span className="detail-label">Period:</span>
                                                    <span className="detail-value">
                                                        {formatDate(c.startDate)} →{' '}
                                                        {formatDate(c.endDate)}
                                                    </span>
                                                </div>
                                                {c.salaryStructure && (
                                                    <div className="detail-row">
                                                        <span className="detail-label">
                                                            Structure:
                                                        </span>
                                                        <span className="detail-value">
                                                            {c.salaryStructure.name ||
                                                                c.salaryStructure}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : type === 'attendance' ? (
                    // ── ATTENDANCE TAB ─────────────────────────────────────────
                    <div className="attendance-records-view">
                        <div className="section-intro">
                            <Clock size={18} className="intro-icon" />
                            <p>Recent daily attendance logs and worked hours.</p>
                        </div>

                        {!records || records.length === 0 ? (
                            <p className="empty-hint">No attendance records logged.</p>
                        ) : (
                            <div className="records-table-wrapper">
                                <table className="records-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Check-In</th>
                                            <th>Check-Out</th>
                                            <th>Worked Hours</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map((rec) => (
                                            <tr key={rec.id}>
                                                <td>{formatDate(rec.date)}</td>
                                                <td>
                                                    {rec.checkIn
                                                        ? new Date(rec.checkIn).toLocaleTimeString(
                                                              [],
                                                              {
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              },
                                                          )
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {rec.checkOut
                                                        ? new Date(rec.checkOut).toLocaleTimeString(
                                                              [],
                                                              {
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              },
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="font-semibold">
                                                    {rec.workedHours
                                                        ? `${rec.workedHours} hrs`
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <Badge
                                                        variant={
                                                            rec.status === 'PRESENT'
                                                                ? 'success'
                                                                : rec.status === 'ABSENT'
                                                                  ? 'danger'
                                                                  : 'warning'
                                                        }
                                                    >
                                                        {rec.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : type === 'timeoff' ? (
                    // ── TIME OFF TAB ───────────────────────────────────────────
                    <div className="timeoff-records-view">
                        <div className="section-intro">
                            <Calendar size={18} className="intro-icon" />
                            <p>Leave requests and active time-off allocation balances.</p>
                        </div>

                        {/* Allocations summary */}
                        {records?.allocations && records.allocations.length > 0 && (
                            <div className="allocations-summary-block">
                                <h4 className="block-title">Leave Allocations</h4>
                                <div className="allocations-grid">
                                    {records.allocations.map((a) => (
                                        <div key={a.id} className="allocation-pill-card">
                                            <span className="allocation-type">
                                                {a.timeOffType?.name || a.type || 'Leave'}
                                            </span>
                                            <div className="allocation-days">
                                                <span className="remaining">
                                                    {a.remainingDays ?? a.allocatedDays ?? 0}
                                                </span>
                                                <span className="total">
                                                    / {a.allocatedDays ?? 0} days remaining
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Requests List */}
                        <div className="requests-block">
                            <h4 className="block-title">Recent Leave Requests</h4>
                            {!records?.requests || records.requests.length === 0 ? (
                                <p className="empty-hint">No leave requests submitted.</p>
                            ) : (
                                <div className="records-list">
                                    {records.requests.map((r) => (
                                        <div key={r.id} className="request-card">
                                            <div className="request-header">
                                                <span className="request-type">
                                                    {r.timeOffType?.name || 'Leave Request'}
                                                </span>
                                                <Badge
                                                    variant={
                                                        r.status === 'APPROVED'
                                                            ? 'success'
                                                            : r.status === 'REFUSED'
                                                              ? 'danger'
                                                              : 'warning'
                                                    }
                                                >
                                                    {r.status}
                                                </Badge>
                                            </div>
                                            <div className="request-period">
                                                {formatDate(r.startDate)} → {formatDate(r.endDate)}{' '}
                                                ({r.duration} days)
                                            </div>
                                            {r.reason && (
                                                <p className="request-reason">{r.reason}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : type === 'bank' ? (
                    // ── BANK ACCOUNTS TAB ──────────────────────────────────────
                    <div className="bank-records-view">
                        <div className="section-intro">
                            <CreditCard size={18} className="intro-icon" />
                            <p>
                                Bank accounts registered for salary disbursement. Exactly one
                                primary account is required for payroll processing.
                            </p>
                        </div>

                        {!showAddBank ? (
                            <div className="bank-actions-top">
                                <Button
                                    variant="primary"
                                    icon={Plus}
                                    onClick={() => setShowAddBank(true)}
                                >
                                    Add Bank Account
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleBankSubmit} className="add-bank-inline-form">
                                <h4 className="form-title">Add Bank Account</h4>
                                <div className="form-grid">
                                    <InputField
                                        label="Bank Name"
                                        placeholder="e.g. HDFC Bank"
                                        value={bankFormData.bankName}
                                        onChange={(e) =>
                                            setBankFormData({
                                                ...bankFormData,
                                                bankName: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputField
                                        label="Account Number"
                                        placeholder="e.g. 50100234567801"
                                        value={bankFormData.accountNumber}
                                        onChange={(e) =>
                                            setBankFormData({
                                                ...bankFormData,
                                                accountNumber: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputField
                                        label="Account Holder Name"
                                        placeholder="e.g. Aarav Mehta"
                                        value={bankFormData.accountHolderName}
                                        onChange={(e) =>
                                            setBankFormData({
                                                ...bankFormData,
                                                accountHolderName: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <InputField
                                        label="IFSC Code"
                                        placeholder="e.g. HDFC0001234"
                                        value={bankFormData.ifscCode}
                                        onChange={(e) =>
                                            setBankFormData({
                                                ...bankFormData,
                                                ifscCode: e.target.value.toUpperCase(),
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="form-buttons">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setShowAddBank(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        loading={bankSubmitting}
                                    >
                                        Save Account
                                    </Button>
                                </div>
                            </form>
                        )}

                        {/* Account cards list */}
                        {!records || records.length === 0 ? (
                            <div className="bank-warning-box">
                                <strong>⚠️ Missing Bank Details</strong>
                                <p>
                                    This employee does not have a registered bank account. Add a
                                    bank account to avoid payroll pre-finalization warnings.
                                </p>
                            </div>
                        ) : (
                            <div className="bank-cards-list">
                                {records.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className={`bank-card ${acc.isPrimary ? 'is-primary' : ''}`}
                                    >
                                        <div className="bank-card-header">
                                            <div className="bank-title">
                                                <strong>{acc.bankName}</strong>
                                                <span className="account-type">
                                                    ({acc.accountType})
                                                </span>
                                            </div>
                                            {acc.isPrimary ? (
                                                <Badge variant="success" showDot>
                                                    Primary Account
                                                </Badge>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        onSetPrimaryBankAccount(employeeId, acc.id)
                                                    }
                                                >
                                                    Set as Primary
                                                </Button>
                                            )}
                                        </div>
                                        <div className="bank-card-body">
                                            <div className="card-item">
                                                <span className="label">Account Number:</span>
                                                <span className="value font-mono">
                                                    {acc.accountNumber}
                                                </span>
                                            </div>
                                            <div className="card-item">
                                                <span className="label">Account Holder:</span>
                                                <span className="value">
                                                    {acc.accountHolderName}
                                                </span>
                                            </div>
                                            <div className="card-item">
                                                <span className="label">IFSC Code:</span>
                                                <span className="value font-mono">
                                                    {acc.ifscCode}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </Drawer>
    );
}

export default React.memo(SmartRecordsDrawer);
