/**
 * Salary Rules Table & Category Configuration Constants and Utilities
 * Provides category color badge mappings and filter configuration for AdvancedTable.
 */

export const CATEGORY_CONFIG = {
    BASIC: {
        label: 'Basic',
        variant: 'info',
        className: 'category-badge-basic',
    },
    ALLOWANCE: {
        label: 'Allowance',
        variant: 'success',
        className: 'category-badge-allowance',
    },
    GROSS: {
        label: 'Gross',
        variant: 'neutral',
        className: 'category-badge-gross',
    },
    DEDUCTION: {
        label: 'Deduction',
        variant: 'warning',
        className: 'category-badge-deduction',
    },
    NET: {
        label: 'Net',
        variant: 'info',
        className: 'category-badge-net',
    },
    OTHER: {
        label: 'Other',
        variant: 'neutral',
        className: 'category-badge-other',
    },
};

/**
 * Filter configuration for AdvancedTable filter panel
 */
export const SALARY_RULES_FILTER_CONFIG = [
    {
        key: 'category',
        label: 'Category',
        type: 'select',
        options: ['BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET', 'OTHER'],
    },
];

/**
 * Returns the category configuration for a given category key
 * @param {string} category - Category string (e.g. 'BASIC', 'ALLOWANCE')
 * @returns {{ label: string, variant: string, className: string }}
 */
export function getCategoryConfig(category) {
    if (!category) {
        return {
            label: '—',
            variant: 'neutral',
            className: 'category-badge-other',
        };
    }
    const upper = String(category).toUpperCase();
    return (
        CATEGORY_CONFIG[upper] || {
            label: category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
            variant: 'neutral',
            className: 'category-badge-other',
        }
    );
}

/**
 * Client-side search filtering helper
 * Matches query against rule name, code, category, and structure name.
 * @param {Array<object>} rules - List of salary rule items
 * @param {string} query - Search query string
 * @returns {Array<object>} Filtered list of salary rules
 */
export function filterSalaryRules(rules = [], query = '') {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return rules;

    return rules.filter((rule) => {
        const nameMatch = rule.name?.toLowerCase().includes(trimmed);
        const codeMatch = rule.code?.toLowerCase().includes(trimmed);
        const categoryMatch = rule.category?.toLowerCase().includes(trimmed);
        const structureMatch = rule.structureName?.toLowerCase().includes(trimmed);
        const computationMatch = rule.computationType?.toLowerCase().includes(trimmed);

        return Boolean(
            nameMatch || codeMatch || categoryMatch || structureMatch || computationMatch,
        );
    });
}
