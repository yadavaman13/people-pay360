import React from 'react';
import { Calendar, FileText, Clock, CreditCard, AlertCircle } from 'lucide-react';
import './SmartButtonsBar.scss';

/**
 * SmartButtonsBar — Top-right interactive stat buttons matching Image 3 wireframe.
 *
 * Displays:
 * - [ Time Off X ]
 * - [ Contracts Y ]
 * - [ Attendance Z ]
 * - [ Bank Details ] (shows alert dot if missing primary bank account!)
 */
function SmartButtonsBar({
    timeOffCount = 0,
    contractsCount = 0,
    attendanceCount = 0,
    hasBankDetails = true,
    onButtonClick,
}) {
    return (
        <div className="smart-buttons-bar" role="toolbar" aria-label="Related HR Actions">
            {/* Time Off Smart Button */}
            <button
                type="button"
                className="smart-button smart-button--timeoff"
                onClick={() => onButtonClick && onButtonClick('timeoff')}
                title="View Leave Requests & Allocations"
            >
                <Calendar className="smart-button__icon" size={16} />
                <span className="smart-button__label">Time Off</span>
                <span className="smart-button__count">{timeOffCount}</span>
            </button>

            {/* Contracts Smart Button */}
            <button
                type="button"
                className="smart-button smart-button--contracts"
                onClick={() => onButtonClick && onButtonClick('contracts')}
                title="View Contracts & Salary Wage History"
            >
                <FileText className="smart-button__icon" size={16} />
                <span className="smart-button__label">Contracts</span>
                <span className="smart-button__count">{contractsCount}</span>
            </button>

            {/* Attendance Smart Button */}
            <button
                type="button"
                className="smart-button smart-button--attendance"
                onClick={() => onButtonClick && onButtonClick('attendance')}
                title="View Daily Attendance & Punch Logs"
            >
                <Clock className="smart-button__icon" size={16} />
                <span className="smart-button__label">Attendance</span>
                <span className="smart-button__count">{attendanceCount}</span>
            </button>

            {/* Bank Details Smart Button */}
            <button
                type="button"
                className={`smart-button smart-button--bank ${
                    !hasBankDetails ? 'has-warning' : ''
                }`}
                onClick={() => onButtonClick && onButtonClick('bank')}
                title={
                    hasBankDetails ? 'View Bank Accounts' : 'Warning: Missing Primary Bank Account!'
                }
            >
                {hasBankDetails ? (
                    <CreditCard className="smart-button__icon" size={16} />
                ) : (
                    <AlertCircle className="smart-button__icon warning-icon" size={16} />
                )}
                <span className="smart-button__label">Bank</span>
                <span className="smart-button__status-pill">
                    {hasBankDetails ? 'Active' : 'Missing'}
                </span>
            </button>
        </div>
    );
}

export default React.memo(SmartButtonsBar);
