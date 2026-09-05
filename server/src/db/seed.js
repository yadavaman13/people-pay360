import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, pool } from '../config/database.config.js';
import {
    users,
    departments,
    jobPositions,
    workingSchedules,
    scheduleLines,
    employees,
    bankAccounts,
    contracts,
    salaryStructures,
    salaryRules,
    timeOffTypes,
    timeOffAllocations,
} from './schema/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Seeded credentials requested:
 * 1. Admin: Aryan Patel | aryanpatel.me@gmail.com | Aryan@123
 * 2. Admin: Itesh Prajapati | iteshofficial@gmail.com | Itesh@123
 * 3. HR payroll manager: Asr Singh | asr24983@gmail.com | Asr@123
 * 4. Employee: Ankur | asrajput5656@gmail.com | Ankur@123
 * 5. Admin: Aman Yadav | yadavaman1948@gmail.com | Aman@123
 * 6. HR Manager: Leo Patel | leopatel967@gmail.com | Leo@123
 * 7. HR Manager: Doom Wiser | doomwiser@gmail.com | Doom@123
 * 8. HR Manager: Priya Nair | hr@example.com | Priya@123
 * 9. HR Manager: Aman Yadav | work.yadavaman@gmail.com | Aman@123
 * 10. HR payroll manager: Sky High | skyh53624@gmail.com | Sky@123
 * 11. Employee: Aman Yadav | yadavaman1388@example.com | Aman@123
 * Plus additional realistic Indian personnel (total <= 22 users, strictly < 30).
 */
const SEED_USERS_CONFIG = [
    {
        firstName: 'Aryan',
        lastName: 'Patel',
        email: 'aryanpatel.me@gmail.com',
        plainPassword: 'Aryan@123',
        role: 'ADMIN',
        empCode: 'EMP-001',
        deptCode: 'ENG',
        positionCode: 'SWE-SR',
        phone: '+91-9820112233',
        gender: 'Male',
        hireDate: '2025-01-15',
        wage: '160000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567801',
        ifscCode: 'HDFC0001234',
    },
    {
        firstName: 'Itesh',
        lastName: 'Prajapati',
        email: 'iteshofficial@gmail.com',
        plainPassword: 'Itesh@123',
        role: 'ADMIN',
        empCode: 'EMP-002',
        deptCode: 'ENG',
        positionCode: 'SWE-SR',
        phone: '+91-9820223344',
        gender: 'Male',
        hireDate: '2025-02-01',
        wage: '155000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001202',
        ifscCode: 'ICIC0000456',
    },
    {
        firstName: 'Asr',
        lastName: 'Singh',
        email: 'asr24983@gmail.com',
        plainPassword: 'Asr@123',
        role: 'HR_PAYROLL_MANAGER',
        empCode: 'EMP-003',
        deptCode: 'FIN',
        positionCode: 'PAY-MGR',
        phone: '+91-9820334455',
        gender: 'Male',
        hireDate: '2025-03-10',
        wage: '130000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671203',
        ifscCode: 'SBIN0005678',
    },
    {
        firstName: 'Ankur',
        lastName: 'Rajput',
        email: 'asrajput5656@gmail.com',
        plainPassword: 'Ankur@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-004',
        deptCode: 'ENG',
        positionCode: 'SWE-JR',
        phone: '+91-9820445566',
        gender: 'Male',
        hireDate: '2025-06-01',
        wage: '75000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034504',
        ifscCode: 'UTIB0000789',
    },
    {
        firstName: 'Aman',
        lastName: 'Yadav',
        email: 'yadavaman1948@gmail.com',
        plainPassword: 'Aman@123',
        role: 'ADMIN',
        empCode: 'EMP-005',
        deptCode: 'ENG',
        positionCode: 'SWE-SR',
        phone: '+91-9820556677',
        gender: 'Male',
        hireDate: '2025-01-01',
        wage: '170000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458905',
        ifscCode: 'KKBK0000123',
    },
    {
        firstName: 'Leo',
        lastName: 'Patel',
        email: 'leopatel967@gmail.com',
        plainPassword: 'Leo@123',
        role: 'HR_MANAGER',
        empCode: 'EMP-006',
        deptCode: 'HR',
        positionCode: 'HR-MGR',
        phone: '+91-9820667788',
        gender: 'Male',
        hireDate: '2025-04-15',
        wage: '120000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567806',
        ifscCode: 'HDFC0001234',
    },
    {
        firstName: 'Doom',
        lastName: 'Wiser',
        email: 'doomwiser@gmail.com',
        plainPassword: 'Doom@123',
        role: 'HR_MANAGER',
        empCode: 'EMP-007',
        deptCode: 'HR',
        positionCode: 'HRBP',
        phone: '+91-9820778899',
        gender: 'Male',
        hireDate: '2025-05-01',
        wage: '115000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001207',
        ifscCode: 'ICIC0000456',
    },
    {
        firstName: 'Priya',
        lastName: 'Nair',
        email: 'hr@example.com',
        plainPassword: 'Priya@123',
        role: 'HR_MANAGER',
        empCode: 'EMP-008',
        deptCode: 'HR',
        positionCode: 'HRBP',
        phone: '+91-9820889900',
        gender: 'Female',
        hireDate: '2025-03-01',
        wage: '118000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671208',
        ifscCode: 'SBIN0005678',
    },
    {
        firstName: 'Aman',
        lastName: 'Yadav',
        email: 'work.yadavaman@gmail.com',
        plainPassword: 'Aman@123',
        role: 'HR_MANAGER',
        empCode: 'EMP-009',
        deptCode: 'HR',
        positionCode: 'HR-MGR',
        phone: '+91-9820990011',
        gender: 'Male',
        hireDate: '2025-02-15',
        wage: '125000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034509',
        ifscCode: 'UTIB0000789',
    },
    {
        firstName: 'Sky',
        lastName: 'High',
        email: 'skyh53624@gmail.com',
        plainPassword: 'Sky@123',
        role: 'HR_PAYROLL_MANAGER',
        empCode: 'EMP-010',
        deptCode: 'FIN',
        positionCode: 'PAY-MGR',
        phone: '+91-9821001122',
        gender: 'Male',
        hireDate: '2025-03-20',
        wage: '135000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458910',
        ifscCode: 'KKBK0000123',
    },
    {
        firstName: 'Aman',
        lastName: 'Yadav',
        email: 'yadavaman1388@example.com',
        plainPassword: 'Aman@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-011',
        deptCode: 'ENG',
        positionCode: 'SWE-JR',
        phone: '+91-9821112233',
        gender: 'Male',
        hireDate: '2025-07-01',
        wage: '70000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567811',
        ifscCode: 'HDFC0001234',
    },
    // Additional Indian Personnel (Realistic Org Structure)
    {
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul.sharma@peoplepay360.internal',
        plainPassword: 'Rahul@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-012',
        deptCode: 'ENG',
        positionCode: 'QA-LEAD',
        phone: '+91-9821223344',
        gender: 'Male',
        hireDate: '2025-05-10',
        wage: '85000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001212',
        ifscCode: 'ICIC0000456',
    },
    {
        firstName: 'Sneha',
        lastName: 'Kulkarni',
        email: 'sneha.kulkarni@peoplepay360.internal',
        plainPassword: 'Sneha@123',
        role: 'HR_PAYROLL_USER',
        empCode: 'EMP-013',
        deptCode: 'FIN',
        positionCode: 'PAY-LEAD',
        phone: '+91-9821334455',
        gender: 'Female',
        hireDate: '2025-04-01',
        wage: '95000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671213',
        ifscCode: 'SBIN0005678',
    },
    {
        firstName: 'Vikram',
        lastName: 'Malhotra',
        email: 'vikram.malhotra@peoplepay360.internal',
        plainPassword: 'Vikram@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-014',
        deptCode: 'FIN',
        positionCode: 'FIN-ANL',
        phone: '+91-9821445566',
        gender: 'Male',
        hireDate: '2025-06-15',
        wage: '80000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034514',
        ifscCode: 'UTIB0000789',
    },
    {
        firstName: 'Ananya',
        lastName: 'Iyer',
        email: 'ananya.iyer@peoplepay360.internal',
        plainPassword: 'Ananya@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-015',
        deptCode: 'OPS',
        positionCode: 'OPS-LEAD',
        phone: '+91-9821556677',
        gender: 'Female',
        hireDate: '2025-02-01',
        wage: '105000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458915',
        ifscCode: 'KKBK0000123',
    },
    {
        firstName: 'Rohan',
        lastName: 'Gupta',
        email: 'rohan.gupta@peoplepay360.internal',
        plainPassword: 'Rohan@123',
        role: 'HR_PAYROLL_USER',
        empCode: 'EMP-016',
        deptCode: 'FIN',
        positionCode: 'PAY-LEAD',
        phone: '+91-9821667788',
        gender: 'Male',
        hireDate: '2025-05-20',
        wage: '92000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567816',
        ifscCode: 'HDFC0001234',
    },
    {
        firstName: 'Pooja',
        lastName: 'Verma',
        email: 'pooja.verma@peoplepay360.internal',
        plainPassword: 'Pooja@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-017',
        deptCode: 'OPS',
        positionCode: 'OPS-ASC',
        phone: '+91-9821778899',
        gender: 'Female',
        hireDate: '2025-08-01',
        wage: '55000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001217',
        ifscCode: 'ICIC0000456',
    },
    {
        firstName: 'Deepak',
        lastName: 'Verma',
        email: 'deepak.verma@peoplepay360.internal',
        plainPassword: 'Deepak@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-018',
        deptCode: 'MKT',
        positionCode: 'MKT-SPC',
        phone: '+91-9821889900',
        gender: 'Male',
        hireDate: '2025-04-10',
        wage: '65000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671218',
        ifscCode: 'SBIN0005678',
    },
    {
        firstName: 'Kavita',
        lastName: 'Reddy',
        email: 'kavita.reddy@peoplepay360.internal',
        plainPassword: 'Kavita@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-019',
        deptCode: 'MKT',
        positionCode: 'MKT-SPC',
        phone: '+91-9821990011',
        gender: 'Female',
        hireDate: '2025-05-15',
        wage: '68000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034519',
        ifscCode: 'UTIB0000789',
    },
    {
        firstName: 'Rajesh',
        lastName: 'Deshmukh',
        email: 'rajesh.deshmukh@peoplepay360.internal',
        plainPassword: 'Rajesh@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-020',
        deptCode: 'ENG',
        positionCode: 'SWE-JR',
        phone: '+91-9822001122',
        gender: 'Male',
        hireDate: '2025-07-15',
        wage: '72000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458920',
        ifscCode: 'KKBK0000123',
    },
    {
        firstName: 'Neha',
        lastName: 'Joshi',
        email: 'neha.joshi@peoplepay360.internal',
        plainPassword: 'Neha@123',
        role: 'EMPLOYEE',
        empCode: 'EMP-021',
        deptCode: 'HR',
        positionCode: 'HRBP',
        phone: '+91-9822112233',
        gender: 'Female',
        hireDate: '2025-06-01',
        wage: '90000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567821',
        ifscCode: 'HDFC0001234',
    },
];

async function seed() {
    console.log('🚀 Starting PeoplePay360 Seed Pipeline...');

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DEPARTMENTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📌 Seeding Departments...');
    const deptDefs = [
        {
            name: 'Engineering & Technology',
            code: 'ENG',
            description: 'Software engineering, QA and architecture',
        },
        {
            name: 'Human Resources',
            code: 'HR',
            description: 'People operations, talent and recruitment',
        },
        {
            name: 'Finance & Payroll',
            code: 'FIN',
            description: 'Accounting, tax compliance and payroll operations',
        },
        {
            name: 'Business Operations',
            code: 'OPS',
            description: 'Internal tooling, customer success and operations',
        },
        {
            name: 'Sales & Marketing',
            code: 'MKT',
            description: 'Revenue generation, brand and outreach',
        },
    ];

    const deptMap = {};
    for (const d of deptDefs) {
        const [existing] = await db.select().from(departments).where(eq(departments.code, d.code));
        if (existing) {
            deptMap[d.code] = existing;
        } else {
            const [created] = await db.insert(departments).values(d).returning();
            deptMap[d.code] = created;
        }
    }
    console.log(`✓ ${Object.keys(deptMap).length} departments ready.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. JOB POSITIONS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📌 Seeding Job Positions...');
    const posDefs = [
        { title: 'Senior Software Engineer', code: 'SWE-SR', deptCode: 'ENG' },
        { title: 'Software Engineer', code: 'SWE-JR', deptCode: 'ENG' },
        { title: 'Lead QA Engineer', code: 'QA-LEAD', deptCode: 'ENG' },
        { title: 'Senior HR Manager', code: 'HR-MGR', deptCode: 'HR' },
        { title: 'HR Business Partner', code: 'HRBP', deptCode: 'HR' },
        { title: 'Senior Payroll Manager', code: 'PAY-MGR', deptCode: 'FIN' },
        { title: 'Lead Payroll Specialist', code: 'PAY-LEAD', deptCode: 'FIN' },
        { title: 'Financial Analyst', code: 'FIN-ANL', deptCode: 'FIN' },
        { title: 'Operations Lead', code: 'OPS-LEAD', deptCode: 'OPS' },
        { title: 'Operations Associate', code: 'OPS-ASC', deptCode: 'OPS' },
        { title: 'Marketing Specialist', code: 'MKT-SPC', deptCode: 'MKT' },
    ];

    const posMap = {};
    for (const p of posDefs) {
        const [existing] = await db
            .select()
            .from(jobPositions)
            .where(eq(jobPositions.code, p.code));
        if (existing) {
            posMap[p.code] = existing;
        } else {
            const [created] = await db
                .insert(jobPositions)
                .values({
                    title: p.title,
                    code: p.code,
                    departmentId: deptMap[p.deptCode]?.id,
                })
                .returning();
            posMap[p.code] = created;
        }
    }
    console.log(`✓ ${Object.keys(posMap).length} job positions ready.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. WORKING SCHEDULES & LINES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📌 Seeding Working Schedule (Standard 40h)...');
    let [schedule] = await db
        .select()
        .from(workingSchedules)
        .where(eq(workingSchedules.name, 'Standard General Shift'));

    if (!schedule) {
        [schedule] = await db
            .insert(workingSchedules)
            .values({
                name: 'Standard General Shift',
                description: 'Monday to Friday, 9:00 AM - 6:00 PM IST (1 hour lunch break)',
                timezone: 'Asia/Kolkata',
                isActive: true,
            })
            .returning();

        // Add 5 weekday lines (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5)
        for (let day = 1; day <= 5; day++) {
            await db.insert(scheduleLines).values({
                scheduleId: schedule.id,
                dayOfWeek: day,
                startTime: '09:00:00',
                endTime: '18:00:00',
                breakMinutes: 60,
            });
        }
        console.log('✓ Created Standard General Shift and 5 weekday slots.');
    } else {
        console.log('✓ Standard General Shift already exists.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. SALARY STRUCTURE & RULES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📌 Seeding Salary Structure & Rules...');
    let [salaryStructure] = await db
        .select()
        .from(salaryStructures)
        .where(eq(salaryStructures.code, 'MONTHLY_REG'));

    if (!salaryStructure) {
        [salaryStructure] = await db
            .insert(salaryStructures)
            .values({
                name: 'Regular Monthly Structure',
                code: 'MONTHLY_REG',
                description:
                    'Standard Indian corporate compensation structure with Basic, HRA, PF and Tax deductions',
                isActive: true,
            })
            .returning();

        const ruleDefinitions = [
            {
                structureId: salaryStructure.id,
                code: 'BASIC',
                name: 'Basic Salary',
                category: 'BASIC',
                sequenceOrder: 1,
                computationType: 'PERCENTAGE',
                percentageBaseCode: 'WAGE',
                percentageRate: '50.0000',
            },
            {
                structureId: salaryStructure.id,
                code: 'HRA',
                name: 'House Rent Allowance',
                category: 'ALLOWANCE',
                sequenceOrder: 2,
                computationType: 'PERCENTAGE',
                percentageBaseCode: 'BASIC',
                percentageRate: '40.0000',
            },
            {
                structureId: salaryStructure.id,
                code: 'CONV',
                name: 'Conveyance Allowance',
                category: 'ALLOWANCE',
                sequenceOrder: 3,
                computationType: 'FIXED',
                fixedAmount: '3000.00',
            },
            {
                structureId: salaryStructure.id,
                code: 'SPECIAL',
                name: 'Special Allowance',
                category: 'ALLOWANCE',
                sequenceOrder: 4,
                computationType: 'FIXED',
                fixedAmount: '5000.00',
            },
            {
                structureId: salaryStructure.id,
                code: 'GROSS',
                name: 'Gross Earnings',
                category: 'GROSS',
                sequenceOrder: 5,
                computationType: 'FORMULA',
                formulaExpression: 'BASIC + HRA + CONV + SPECIAL',
            },
            {
                structureId: salaryStructure.id,
                code: 'PF',
                name: 'Provident Fund (Employee)',
                category: 'DEDUCTION',
                sequenceOrder: 6,
                computationType: 'PERCENTAGE',
                percentageBaseCode: 'BASIC',
                percentageRate: '12.0000',
            },
            {
                structureId: salaryStructure.id,
                code: 'PT',
                name: 'Professional Tax',
                category: 'DEDUCTION',
                sequenceOrder: 7,
                computationType: 'FIXED',
                fixedAmount: '200.00',
            },
            {
                structureId: salaryStructure.id,
                code: 'TDS',
                name: 'Income Tax (TDS)',
                category: 'DEDUCTION',
                sequenceOrder: 8,
                computationType: 'PERCENTAGE',
                percentageBaseCode: 'GROSS',
                percentageRate: '5.0000',
            },
            {
                structureId: salaryStructure.id,
                code: 'NET',
                name: 'Net Payable Salary',
                category: 'NET',
                sequenceOrder: 9,
                computationType: 'FORMULA',
                formulaExpression: 'GROSS - PF - PT - TDS',
            },
        ];

        for (const r of ruleDefinitions) {
            await db.insert(salaryRules).values(r);
        }
        console.log('✓ Created Regular Monthly Structure with 9 sequenced rules.');
    } else {
        console.log('✓ Regular Monthly Structure already exists.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. TIME OFF TYPES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📌 Seeding Time Off Types...');
    const leaveTypeDefs = [
        {
            name: 'Paid Annual Leave',
            code: 'ANNUAL',
            allocationRequired: true,
            requestApprovalRequired: true,
            paidTimeOff: true,
            maxDaysPerRequest: 10,
        },
        {
            name: 'Sick Leave',
            code: 'SICK',
            allocationRequired: true,
            requestApprovalRequired: true,
            paidTimeOff: true,
            maxDaysPerRequest: 5,
        },
        {
            name: 'Casual Leave',
            code: 'CASUAL',
            allocationRequired: true,
            requestApprovalRequired: true,
            paidTimeOff: true,
            maxDaysPerRequest: 3,
        },
        {
            name: 'Unpaid Leave (LWP)',
            code: 'UNPAID',
            allocationRequired: false,
            requestApprovalRequired: true,
            paidTimeOff: false,
            maxDaysPerRequest: null,
        },
    ];

    const leaveTypeMap = {};
    for (const lt of leaveTypeDefs) {
        const [existing] = await db
            .select()
            .from(timeOffTypes)
            .where(eq(timeOffTypes.code, lt.code));
        if (existing) {
            leaveTypeMap[lt.code] = existing;
        } else {
            const [created] = await db.insert(timeOffTypes).values(lt).returning();
            leaveTypeMap[lt.code] = created;
        }
    }
    console.log(`✓ ${Object.keys(leaveTypeMap).length} leave types ready.`);

    // ─────────────────────────────────────────────────────────────────────────
    // 6. USERS, EMPLOYEES, CONTRACTS, BANK ACCOUNTS & ALLOCATIONS
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`📌 Seeding ${SEED_USERS_CONFIG.length} Users & Complete Operational Records...`);

    let hrApproverUser = null;

    for (const uConfig of SEED_USERS_CONFIG) {
        // A. Users table (Find or Insert)
        let [userRecord] = await db.select().from(users).where(eq(users.email, uConfig.email));

        if (!userRecord) {
            const hashedPassword = await bcrypt.hash(uConfig.plainPassword, 10);
            [userRecord] = await db
                .insert(users)
                .values({
                    firstName: uConfig.firstName,
                    lastName: uConfig.lastName,
                    email: uConfig.email,
                    password: hashedPassword,
                    role: uConfig.role,
                    emailVerified: true,
                    isActive: true,
                    isDeleted: false,
                })
                .returning();
            console.log(`  + User: ${uConfig.email} [${uConfig.role}]`);
        } else {
            // Ensure correct role & password match
            const hashedPassword = await bcrypt.hash(uConfig.plainPassword, 10);
            await db
                .update(users)
                .set({
                    role: uConfig.role,
                    password: hashedPassword,
                    firstName: uConfig.firstName,
                    lastName: uConfig.lastName,
                })
                .where(eq(users.id, userRecord.id));
            console.log(`  = Updated User: ${uConfig.email} [${uConfig.role}]`);
        }

        if (uConfig.role === 'HR_MANAGER' || uConfig.role === 'ADMIN') {
            hrApproverUser = userRecord;
        }

        // B. Employees table (Find or Insert)
        let [employeeRecord] = await db
            .select()
            .from(employees)
            .where(eq(employees.userId, userRecord.id));

        if (!employeeRecord) {
            // Also check by employeeCode
            [employeeRecord] = await db
                .select()
                .from(employees)
                .where(eq(employees.employeeCode, uConfig.empCode));
        }

        if (!employeeRecord) {
            [employeeRecord] = await db
                .insert(employees)
                .values({
                    userId: userRecord.id,
                    employeeCode: uConfig.empCode,
                    firstName: uConfig.firstName,
                    lastName: uConfig.lastName,
                    email: uConfig.email,
                    phone: uConfig.phone,
                    gender: uConfig.gender,
                    hireDate: uConfig.hireDate,
                    departmentId: deptMap[uConfig.deptCode]?.id,
                    jobPositionId: posMap[uConfig.positionCode]?.id,
                    workingScheduleId: schedule.id,
                    status: 'ACTIVE',
                    isActive: true,
                })
                .returning();
            console.log(
                `    -> Employee: ${uConfig.empCode} (${uConfig.firstName} ${uConfig.lastName})`,
            );
        }

        // C. Bank Accounts (One primary active)
        const [existingBank] = await db
            .select()
            .from(bankAccounts)
            .where(eq(bankAccounts.employeeId, employeeRecord.id));

        if (!existingBank) {
            await db.insert(bankAccounts).values({
                employeeId: employeeRecord.id,
                bankName: uConfig.bankName,
                accountNumber: uConfig.accountNumber,
                accountHolderName: `${uConfig.firstName} ${uConfig.lastName}`,
                ifscCode: uConfig.ifscCode,
                accountType: 'SALARY',
                isPrimary: true,
                isActive: true,
            });
            console.log(`    -> Bank Account: ${uConfig.bankName} (${uConfig.accountNumber})`);
        }

        // D. Active Contract
        const [existingContract] = await db
            .select()
            .from(contracts)
            .where(
                and(eq(contracts.employeeId, employeeRecord.id), eq(contracts.status, 'ACTIVE')),
            );

        if (!existingContract) {
            await db.insert(contracts).values({
                employeeId: employeeRecord.id,
                salaryStructureId: salaryStructure.id,
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                wage: uConfig.wage,
                departmentId: deptMap[uConfig.deptCode]?.id,
                jobPositionId: posMap[uConfig.positionCode]?.id,
                workingScheduleId: schedule.id,
                status: 'ACTIVE',
                notes: 'Standard 2026 Annual Employment Contract',
            });
            console.log(`    -> Contract: ₹${uConfig.wage}/month (ACTIVE)`);
        }

        // E. Leave Allocations (Annual & Sick)
        const [existingAnnual] = await db
            .select()
            .from(timeOffAllocations)
            .where(
                and(
                    eq(timeOffAllocations.employeeId, employeeRecord.id),
                    eq(timeOffAllocations.typeId, leaveTypeMap['ANNUAL'].id),
                ),
            );

        if (!existingAnnual) {
            await db.insert(timeOffAllocations).values({
                employeeId: employeeRecord.id,
                typeId: leaveTypeMap['ANNUAL'].id,
                totalDays: '18.00',
                usedDays: '0.00',
                validityStart: '2026-01-01',
                validityEnd: '2026-12-31',
                status: 'APPROVED',
                approvedBy: hrApproverUser?.id || userRecord.id,
                approvedAt: new Date(),
            });
        }

        const [existingSick] = await db
            .select()
            .from(timeOffAllocations)
            .where(
                and(
                    eq(timeOffAllocations.employeeId, employeeRecord.id),
                    eq(timeOffAllocations.typeId, leaveTypeMap['SICK'].id),
                ),
            );

        if (!existingSick) {
            await db.insert(timeOffAllocations).values({
                employeeId: employeeRecord.id,
                typeId: leaveTypeMap['SICK'].id,
                totalDays: '12.00',
                usedDays: '0.00',
                validityStart: '2026-01-01',
                validityEnd: '2026-12-31',
                status: 'APPROVED',
                approvedBy: hrApproverUser?.id || userRecord.id,
                approvedAt: new Date(),
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. ORG HIERARCHY / MANAGERS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📌 Linking Department Managers and Reporting Lines...');
    const [hrManagerEmp] = await db
        .select()
        .from(employees)
        .where(eq(employees.employeeCode, 'EMP-006'));
    const [engLeadEmp] = await db
        .select()
        .from(employees)
        .where(eq(employees.employeeCode, 'EMP-001'));

    if (hrManagerEmp) {
        await db
            .update(departments)
            .set({ managerId: hrManagerEmp.id })
            .where(eq(departments.code, 'HR'));
    }
    if (engLeadEmp) {
        await db
            .update(departments)
            .set({ managerId: engLeadEmp.id })
            .where(eq(departments.code, 'ENG'));
    }

    console.log(
        '🎉 PeoplePay360 Database Seed Complete! Zero duplicates, full relational integrity.',
    );
}

async function main() {
    try {
        await seed();
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Error:', err);
        await pool.end();
        process.exit(1);
    }
}

main();
