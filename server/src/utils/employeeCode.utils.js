import { ORGANIZATION_CONFIG } from '../config/organization.config.js';

const INAPPROPRIATE_INITIALS = new Set([
    'ASS',
    'FUK',
    'SEX',
    'DIC',
    'DIK',
    'WTF',
    'TIT',
    'COK',
    'CUM',
    'FAG',
    'GAY',
    'NIG',
    'POO',
    'PEE',
    'SHI',
    'SLT',
    'CNT',
]);

const PARTICLES = new Set([
    'van',
    'von',
    'de',
    'der',
    'da',
    'di',
    'la',
    'le',
    'del',
    'du',
    'bin',
    'binti',
    'al',
    'el',
]);

/**
 * Clean and normalize organization code
 * @param {string} codeOrName
 * @returns {string} 2-6 character uppercase alphanumeric code
 */
export function cleanOrgCode(codeOrName) {
    if (!codeOrName || typeof codeOrName !== 'string') {
        return ORGANIZATION_CONFIG?.code || 'PP360';
    }
    const cleaned = codeOrName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length < 2) {
        return ORGANIZATION_CONFIG?.code || 'PP360';
    }
    return cleaned.slice(0, 6);
}

/**
 * Remove diacritics and normalize unicode string
 * @param {string} str
 * @returns {string}
 */
function normalizeAscii(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tokenize a name string into clean words
 * @param {string} name
 * @returns {string[]}
 */
function tokenizeName(name) {
    if (!name) return [];
    const normalized = normalizeAscii(name);
    // Split on whitespace, hyphens, apostrophes, underscores, dots
    const rawTokens = normalized.split(/[\s\-_.'’`]+/);
    return rawTokens.map((t) => t.trim()).filter((t) => t.length > 0);
}

/**
 * Extract initials from email prefix (e.g. raj.sharma@... -> RS)
 * @param {string} email
 * @returns {string|null}
 */
function extractEmailInitials(email) {
    if (!email || typeof email !== 'string') return null;
    const prefix = email.split('@')[0] || '';
    const cleanPrefix = normalizeAscii(prefix).replace(/[^a-zA-Z._-]/g, '');
    const tokens = cleanPrefix.split(/[._-]+/).filter((t) => t.length > 0);

    if (tokens.length >= 2) {
        return (tokens[0][0] + tokens[1][0]).toUpperCase();
    }
    if (tokens.length === 1 && tokens[0].length >= 2) {
        return tokens[0].slice(0, 2).toUpperCase();
    }
    return null;
}

/**
 * Extract 2-4 character uppercase initials for an employee from first/last name
 * @param {string} firstName
 * @param {string} [lastName]
 * @param {string} [email]
 * @returns {string}
 */
export function extractNameInitials(firstName = '', lastName = '', email = '') {
    const rawFirst = (firstName || '').trim();
    const rawLast = (lastName || '').trim();

    // Check if names contain Latin characters after normalization
    const firstNormalized = normalizeAscii(rawFirst);
    const lastNormalized = normalizeAscii(rawLast);
    const combinedLatin = `${firstNormalized} ${lastNormalized}`.replace(/[^a-zA-Z]/g, '');

    // Fallback for non-Latin / non-ASCII names (e.g., Hindi, Chinese, Cyrillic)
    if (combinedLatin.length === 0) {
        const emailInitials = extractEmailInitials(email);
        if (emailInitials) {
            return postProcessInitials(emailInitials);
        }
        return 'EP';
    }

    const firstTokens = tokenizeName(rawFirst)
        .map((t) => t.replace(/[^a-zA-Z]/g, ''))
        .filter(Boolean);
    const lastTokens = tokenizeName(rawLast)
        .map((t) => t.replace(/[^a-zA-Z]/g, ''))
        .filter(Boolean);

    let allTokens = [...firstTokens, ...lastTokens];

    // Filter particles if we have at least 2 non-particle tokens
    if (allTokens.length > 2) {
        const filtered = allTokens.filter((t) => !PARTICLES.has(t.toLowerCase()));
        if (filtered.length >= 2) {
            allTokens = filtered;
        }
    }

    let initials;

    if (allTokens.length === 0) {
        initials = 'EP';
    } else if (allTokens.length === 1) {
        // Mononym or single token
        const single = allTokens[0];
        if (single.length >= 2) {
            initials = single.slice(0, 2).toUpperCase();
        } else if (single.length === 1) {
            initials = `${single.toUpperCase()}X`;
        } else {
            initials = 'EP';
        }
    } else {
        // Multi-token: take first character of each token, up to 4 characters
        initials = allTokens
            .slice(0, 4)
            .map((t) => t[0].toUpperCase())
            .join('');
    }

    return postProcessInitials(initials);
}

/**
 * Post-process initials (padding, clamping, blacklist filter)
 * @param {string} token
 * @returns {string}
 */
function postProcessInitials(token) {
    let clean = (token || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (clean.length === 0) {
        return 'EP';
    }
    if (clean.length === 1) {
        clean = `${clean}X`;
    } else if (clean.length > 4) {
        clean = clean.slice(0, 4);
    }

    if (INAPPROPRIATE_INITIALS.has(clean)) {
        return 'EP';
    }

    return clean;
}

/**
 * Generate formatted employee code: {ORG}-{INITIALS}-{YEAR}-{SEQ:4}
 * @param {object} params
 * @param {string} params.firstName
 * @param {string} [params.lastName]
 * @param {string} [params.email]
 * @param {number|string} [params.year]
 * @param {number|string} params.sequenceNumber
 * @param {string} [params.orgCode]
 * @returns {string} e.g. 'PP360-JD-2026-0001'
 */
export function generateEmployeeCode({
    firstName,
    lastName = '',
    email = '',
    year = new Date().getFullYear(),
    sequenceNumber = 1,
    orgCode,
}) {
    const org = cleanOrgCode(orgCode || ORGANIZATION_CONFIG?.code || 'PP360');
    const initials = extractNameInitials(firstName, lastName, email);
    const yr = String(year || new Date().getFullYear()).slice(-4);
    const seq = String(sequenceNumber).padStart(4, '0');

    return `${org}-${initials}-${yr}-${seq}`;
}
