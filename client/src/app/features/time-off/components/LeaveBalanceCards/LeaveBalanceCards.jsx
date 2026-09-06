import { Calendar } from 'lucide-react';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import './LeaveBalanceCards.scss';

export default function LeaveBalanceCards({ balances = [], loading = false }) {
    if (loading) {
        return (
            <div className="leave-balance-loading">
                <Spinner size="md" />
                <span>Loading leave balances...</span>
            </div>
        );
    }

    if (!balances || balances.length === 0) {
        return (
            <div className="leave-balance-empty">
                <Calendar size={20} className="empty-icon" />
                <span>No active leave allocations found for your account.</span>
            </div>
        );
    }

    return (
        <div className="leave-balance-grid">
            {balances.map((item) => {
                const total = Number(item.totalDays || 0);
                const used = Number(item.usedDays || 0);
                const remaining = Number(item.remainingDays || Math.max(0, total - used));
                const percentageUsed =
                    total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

                return (
                    <div key={item.typeId || item.typeName} className="balance-card">
                        <div className="balance-card-header">
                            <div className="type-meta">
                                <span className="type-badge">
                                    {item.paidTimeOff ? 'Paid' : 'Unpaid'}
                                </span>
                                <h3 className="type-title">{item.typeName}</h3>
                            </div>
                            <div className="remaining-chip">
                                <span className="chip-value">{remaining}</span>
                                <span className="chip-unit">Days Left</span>
                            </div>
                        </div>

                        <div className="progress-container">
                            <div className="progress-track">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${percentageUsed}%` }}
                                />
                            </div>
                            <div className="progress-labels">
                                <span>{percentageUsed}% utilized</span>
                                <span>{total} days total</span>
                            </div>
                        </div>

                        <div className="balance-card-footer">
                            <div className="stat-col">
                                <span className="stat-label">Allocated</span>
                                <span className="stat-value">{total}d</span>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-col">
                                <span className="stat-label">Taken</span>
                                <span className="stat-value text-muted">{used}d</span>
                            </div>
                            <div className="stat-divider" />
                            <div className="stat-col">
                                <span className="stat-label">Remaining</span>
                                <span className="stat-value text-accent">{remaining}d</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
