import { describe, it, expect } from '@jest/globals';
import {
    extractNameInitials,
    generateEmployeeCode,
    cleanOrgCode,
} from '../../utils/employeeCode.utils.js';

describe('Employee Code & Initials Generator Edge Cases', () => {
    describe('extractNameInitials', () => {
        it('handles standard 2-part name (John Doe -> JD)', () => {
            expect(extractNameInitials('John', 'Doe')).toBe('JD');
        });

        it('handles mononym (single name) (Cher -> CH, Prince -> PR)', () => {
            expect(extractNameInitials('Cher', '')).toBe('CH');
            expect(extractNameInitials('Prince', null)).toBe('PR');
        });

        it('handles ultra-short name (A -> AX)', () => {
            expect(extractNameInitials('A', '')).toBe('AX');
        });

        it('handles compound / hyphenated names (Jean-Luc Picard-Smith -> JLPS)', () => {
            expect(extractNameInitials('Jean-Luc', 'Picard-Smith')).toBe('JLPS');
        });

        it("handles apostrophes and particles (O'Connor -> OC, Vincent van Gogh -> VG)", () => {
            expect(extractNameInitials("O'Connor", '')).toBe('OC');
            expect(extractNameInitials('Vincent', 'van Gogh')).toBe('VG');
        });

        it('handles accents and diacritics (Renée Müller -> RM, José Nuñez -> JN)', () => {
            expect(extractNameInitials('Renée', 'Müller')).toBe('RM');
            expect(extractNameInitials('José', 'Nuñez')).toBe('JN');
        });

        it('handles non-Latin / non-ASCII by falling back to email prefix (राज शर्मा -> RS)', () => {
            expect(extractNameInitials('राज', 'शर्मा', 'raj.sharma@example.com')).toBe('RS');
        });

        it('handles non-Latin without email by falling back to EP (李明 -> EP)', () => {
            expect(extractNameInitials('李明', '')).toBe('EP');
        });

        it('handles leading and trailing whitespace (   John   ,   Doe   -> JD)', () => {
            expect(extractNameInitials('   John   ', '   Doe   ')).toBe('JD');
        });

        it('filters inappropriate initials (e.g. ASS -> EP, FUK -> EP, SEX -> EP)', () => {
            expect(extractNameInitials('Alan Sam', 'Smith')).toBe('EP');
            expect(extractNameInitials('Fatima Underwood', 'Khan')).toBe('EP');
        });
    });

    describe('cleanOrgCode', () => {
        it('normalizes alphanumeric org codes', () => {
            expect(cleanOrgCode('PP360')).toBe('PP360');
        });

        it('strips non-alphanumeric chars from org name / code', () => {
            expect(cleanOrgCode('People-Pay & Co. (360)')).toBe('PEOPLE');
        });

        it('falls back to PP360 on empty or invalid input', () => {
            expect(cleanOrgCode('---')).toBe('PP360');
            expect(cleanOrgCode(null)).toBe('PP360');
        });
    });

    describe('generateEmployeeCode', () => {
        it('generates standard employee code format {ORG}-{INITIALS}-{YEAR}-{SEQ:4}', () => {
            const code = generateEmployeeCode({
                firstName: 'John',
                lastName: 'Doe',
                year: 2026,
                sequenceNumber: 1,
            });
            expect(code).toBe('PP360-JD-2026-0001');
        });

        it('pads sequence number to 4 digits', () => {
            const code = generateEmployeeCode({
                firstName: 'Anne-Marie',
                lastName: "O'Connor",
                year: 2026,
                sequenceNumber: 42,
            });
            expect(code).toBe('PP360-AMOC-2026-0042');
        });

        it('defaults year to current year if not supplied', () => {
            const currentYear = new Date().getFullYear();
            const code = generateEmployeeCode({
                firstName: 'Cher',
                lastName: '',
                sequenceNumber: 3,
            });
            expect(code).toBe(`PP360-CH-${currentYear}-0003`);
        });

        it('respects custom org code if provided in options', () => {
            const code = generateEmployeeCode({
                firstName: 'Vincent',
                lastName: 'van Gogh',
                year: 2026,
                sequenceNumber: 5,
                orgCode: 'APEX',
            });
            expect(code).toBe('APEX-VG-2026-0005');
        });
    });
});
