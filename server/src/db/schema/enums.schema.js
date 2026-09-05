/**
 * PeoplePay360 — PostgreSQL Enum Definitions
 *
 * Rules:
 *  1. ALL enum values are UPPERCASE strings (PostgreSQL best practice).
 *  2. This file is the single source of truth for every enum in the system.
 *  3. Never use free-form TEXT/VARCHAR for status, role, category, or type fields.
 *  4. When adding a new enum value, add it here AND run drizzle-kit generate.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Role enum (roleEnum / role_enum) is intentionally defined in
// users.schema.js to stay co-located with the users table (Option A).
// Import roleEnum from './users.schema.js' wherever needed.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Employee Status State Machine:
 *   DRAFT → ACTIVE → SUSPENDED → ACTIVE
 *   ACTIVE → ARCHIVED
 */
export const employeeStatusEnum = pgEnum('employee_status', [
    'DRAFT',
    'ACTIVE',
    'SUSPENDED',
    'ARCHIVED',
]);

// ─────────────────────────────────────────────────────────────────────────────
// CONTRACT LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contract Status State Machine:
 *   DRAFT → ACTIVE → EXPIRED (system) | CANCELLED (HR)
 *
 * Critical rule: Only one ACTIVE contract per employee at a time.
 * Enforced via EXCLUDE USING gist constraint on daterange(start_date, end_date).
 */
export const contractStatusEnum = pgEnum('contract_status', [
    'DRAFT',
    'ACTIVE',
    'EXPIRED',
    'CANCELLED',
]);

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attendance Status — derived from check-in/check-out data vs schedule.
 *
 *   PRESENT         — checked in and out within schedule tolerance
 *   LATE            — check_in > schedule_start + grace period
 *   ABSENT          — no check_in for the date
 *   HALF_DAY        — worked_hours < half of expected daily hours
 *   MANUAL_CORRECTION — HR edited the row; original data may have been wrong
 */
export const attendanceStatusEnum = pgEnum('attendance_status', [
    'PRESENT',
    'LATE',
    'ABSENT',
    'HALF_DAY',
    'MANUAL_CORRECTION',
]);

// ─────────────────────────────────────────────────────────────────────────────
// TIME OFF (LEAVE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Time Off Allocation Status State Machine:
 *   PENDING → APPROVED → (balance becomes available)
 *   PENDING → REFUSED
 */
export const allocationStatusEnum = pgEnum('allocation_status', ['PENDING', 'APPROVED', 'REFUSED']);

/**
 * Time Off Request Status State Machine:
 *   PENDING → APPROVED → (decrements allocation.used_days)
 *   PENDING → REFUSED  → (no allocation change)
 */
export const requestStatusEnum = pgEnum('request_status', [
    'PENDING',
    'APPROVED',
    'REFUSED',
    'CANCELLED',
]);

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Salary Rule Category — determines the role of the line in payslip computation.
 *
 * Sequence of categories in a typical computation:
 *   BASIC → ALLOWANCE → GROSS → DEDUCTION → NET
 *
 * Monetary convention:
 *   - BASIC, ALLOWANCE, GROSS: positive values added to running total
 *   - DEDUCTION: positive value SUBTRACTED during NET calculation
 *   - NET: final result
 *   - OTHER: informational / HR use
 */
export const ruleCategoryEnum = pgEnum('rule_category', [
    'BASIC',
    'ALLOWANCE',
    'GROSS',
    'DEDUCTION',
    'NET',
    'OTHER',
]);

/**
 * Computation Type — how a salary rule calculates its amount.
 *
 *   FIXED       → amount = fixed_amount (CHECK: fixed_amount IS NOT NULL)
 *   PERCENTAGE  → amount = context[percentage_base_code] * percentage_rate / 100
 *                 (CHECK: percentage_base_code IS NOT NULL AND percentage_rate IS NOT NULL)
 *   FORMULA     → amount = safeEval(formula_expression, context)
 *                 (CHECK: formula_expression IS NOT NULL)
 *                 NEVER use eval() — use a safe math parser (mathjs / custom tokenizer)
 */
export const computationTypeEnum = pgEnum('computation_type', ['FIXED', 'PERCENTAGE', 'FORMULA']);

// ─────────────────────────────────────────────────────────────────────────────
// PAYROLL PROCESSING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Payrun Status State Machine:
 *   DRAFT → COMPUTING → COMPUTED → VALIDATED → PAID → ARCHIVED
 *
 *   DRAFT      — created, employees being selected (2-step wizard)
 *   COMPUTING  — compute job is running
 *   COMPUTED   — all payslips generated; warnings visible
 *   VALIDATED  — HR Payroll User reviewed and approved
 *   PAID       — marked paid; payslips are immutable from this point
 *   ARCHIVED   — historical record
 */
export const payrunStatusEnum = pgEnum('payrun_status', [
    'DRAFT',
    'COMPUTING',
    'COMPUTED',
    'VALIDATED',
    'PAID',
    'ARCHIVED',
]);

/**
 * Payslip Status State Machine:
 *   DRAFT → COMPUTED → VALIDATED → PAID → SENT
 *
 * Immutability rule:
 *   Recompute ALLOWED  in: DRAFT, COMPUTED
 *   Recompute FORBIDDEN in: VALIDATED, PAID, SENT
 */
export const payslipStatusEnum = pgEnum('payslip_status', [
    'DRAFT',
    'COMPUTED',
    'VALIDATED',
    'PAID',
    'SENT',
]);

/**
 * Payrun Employee Eligibility Status.
 *   ELIGIBLE    — employee qualifies for this payrun period
 *   INELIGIBLE  — employee does not qualify (no contract, missing data, etc.)
 *   SKIPPED     — HR manually excluded this employee
 */
export const eligibilityStatusEnum = pgEnum('eligibility_status', [
    'ELIGIBLE',
    'INELIGIBLE',
    'SKIPPED',
]);

/**
 * Payrun Employee Selection Status.
 *   SELECTED  — HR has included this employee in the payrun
 *   EXCLUDED  — HR has explicitly excluded this employee
 */
export const selectionStatusEnum = pgEnum('selection_status', ['SELECTED', 'EXCLUDED']);

// ─────────────────────────────────────────────────────────────────────────────
// BANK / FINANCIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bank Account Type.
 */
export const bankAccountTypeEnum = pgEnum('bank_account_type', ['SAVINGS', 'CURRENT', 'SALARY']);
