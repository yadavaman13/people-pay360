import { db } from '../../config/database.config.js';
import { employees } from '../../db/schema/employees.schema.js';
import { bankAccounts } from '../../db/schema/bank_accounts.schema.js';
import { contracts } from '../../db/schema/contracts.schema.js';
import { workingSchedules, scheduleLines } from '../../db/schema/working_schedules.schema.js';
import { salaryStructures, salaryRules } from '../../db/schema/salary.schema.js';
import { createAndLoginTestUser } from './auth-helper.js';

/**
 * Creates an employee record linked to an existing or newly created user
 */
export async function createTestEmployee({ user = null, role = 'EMPLOYEE', overrides = {} } = {}) {
    let authUser = user;
    let authCookie = null;
    let authHeader = null;

    if (!authUser) {
        const testUserSession = await createAndLoginTestUser({ role });
        authUser = testUserSession.user;
        authCookie = testUserSession.cookie;
        authHeader = testUserSession.authHeader;
    }

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 100000);

    const [emp] = await db
        .insert(employees)
        .values({
            userId: authUser.id,
            employeeCode: `EMP-${timestamp}-${random}`,
            firstName: authUser.firstName || 'Test',
            lastName: authUser.lastName || 'Employee',
            email: authUser.email,
            hireDate: '2026-01-01',
            status: 'ACTIVE',
            isActive: true,
            ...overrides,
        })
        .returning();

    // Create primary active bank account so payroll audit checks pass cleanly
    await db.insert(bankAccounts).values({
        employeeId: emp.id,
        bankName: 'HDFC Bank',
        accountNumber: `999${timestamp.toString().slice(-6)}${random}`,
        accountHolderName: `${emp.firstName} ${emp.lastName}`,
        ifscCode: 'HDFC0001234',
        accountType: 'SAVINGS',
        isPrimary: true,
        isActive: true,
    });

    return {
        employee: emp,
        user: authUser,
        cookie: authCookie,
        authHeader: authHeader,
    };
}

/**
 * Creates a standard working schedule with 5 weekday slots (Mon-Fri, 9:00 - 18:00, 60m break)
 */
export async function createTestSchedule(overrides = {}) {
    const timestamp = Date.now();
    const [schedule] = await db
        .insert(workingSchedules)
        .values({
            name: `Test Schedule ${timestamp}`,
            description: 'Standard 40hr/wk office schedule',
            timezone: 'Asia/Kolkata',
            isActive: true,
            ...overrides,
        })
        .returning();

    const lines = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        scheduleId: schedule.id,
        dayOfWeek,
        startTime: '09:00:00',
        endTime: '18:00:00',
        breakMinutes: 60,
    }));

    const createdLines = await db.insert(scheduleLines).values(lines).returning();

    return {
        schedule,
        lines: createdLines,
    };
}

/**
 * Creates a standard salary structure with basic rules (BASIC, HRA, PF)
 */
export async function createTestSalaryStructureWithRules(overrides = {}) {
    const timestamp = Date.now();
    const [structure] = await db
        .insert(salaryStructures)
        .values({
            name: `Executive Pay Structure ${timestamp}`,
            code: `EXEC-${timestamp}`,
            description: 'Standard executive salary structure',
            isActive: true,
            ...overrides,
        })
        .returning();

    // Create Basic Rule
    const [basicRule] = await db
        .insert(salaryRules)
        .values({
            structureId: structure.id,
            name: 'Basic Pay',
            code: 'BASIC',
            category: 'BASIC',
            computationType: 'PERCENTAGE',
            percentageRate: '50.00',
            percentageBaseCode: 'WAGE',
            sequenceOrder: 1,
            isActive: true,
        })
        .returning();

    // Create HRA Rule (40% of Basic)
    const [hraRule] = await db
        .insert(salaryRules)
        .values({
            structureId: structure.id,
            name: 'House Rent Allowance',
            code: 'HRA',
            category: 'ALLOWANCE',
            computationType: 'PERCENTAGE',
            percentageRate: '40.00',
            percentageBaseCode: 'BASIC',
            sequenceOrder: 2,
            isActive: true,
        })
        .returning();

    // Create PF Rule (12% of Basic deduction)
    const [pfRule] = await db
        .insert(salaryRules)
        .values({
            structureId: structure.id,
            name: 'Provident Fund',
            code: 'PF',
            category: 'DEDUCTION',
            computationType: 'PERCENTAGE',
            percentageRate: '12.00',
            percentageBaseCode: 'BASIC',
            sequenceOrder: 3,
            isActive: true,
        })
        .returning();

    return {
        structure,
        rules: [basicRule, hraRule, pfRule],
    };
}

/**
 * Creates an active employment contract for an employee
 */
export async function createTestContract({ employeeId, salaryStructureId, overrides = {} }) {
    const [contract] = await db
        .insert(contracts)
        .values({
            employeeId,
            salaryStructureId,
            startDate: '2026-01-01',
            endDate: null,
            wage: '60000.00',
            status: 'ACTIVE',
            ...overrides,
        })
        .returning();

    return contract;
}
