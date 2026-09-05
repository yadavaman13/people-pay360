/**
 * Format numeric currency in INR format (e.g. ₹50,000 or compact ₹50k)
 * @param {number|string|null|undefined} amount
 * @param {object} [options]
 * @param {boolean} [options.compact=false]
 * @returns {string}
 */
export function formatCurrency(amount, { compact = false } = {}) {
    if (amount === null || amount === undefined || amount === '') return '₹0.00';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);

    if (compact && Math.abs(num) >= 1000) {
        return `₹${Math.round(num / 1000)}k`;
    }

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(num);
}

/**
 * Format start and end dates into a readable range (e.g. '01-Feb — 28-Feb')
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {string}
 */
export function formatDateRange(start, end) {
    if (!start && !end) return '—';

    const formatSingle = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
        ];
        const month = months[d.getMonth()];
        return `${day}-${month}`;
    };

    if (start && end) {
        return `${formatSingle(start)} — ${formatSingle(end)}`;
    }
    return formatSingle(start || end);
}

/**
 * Resolve Badge variant based on payslip status enum
 * @param {string} status - 'COMPUTED' | 'PAID' | 'VALIDATED' | 'SENT' | 'DRAFT'
 * @returns {'success'|'info'|'warning'|'neutral'}
 */
export function getPayslipStatusVariant(status) {
    switch (status?.toUpperCase()) {
        case 'PAID':
        case 'SENT':
        case 'COMPUTED':
            return 'success';
        case 'VALIDATED':
            return 'info';
        case 'DRAFT':
        default:
            return 'neutral';
    }
}

/**
 * Format raw status enum to user-friendly label (e.g. 'COMPUTED' -> 'Done')
 * @param {string} status
 * @returns {string}
 */
export function formatStatusText(status) {
    if (!status) return 'Draft';
    const upper = status.toUpperCase();
    if (upper === 'COMPUTED') return 'Done';
    return upper.charAt(0) + upper.slice(1).toLowerCase();
}
