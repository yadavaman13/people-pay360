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
    timeOffRequests,
    attendanceRecords,
    attendancePunches,
    payruns,
    payrunEmployees,
    payslips,
    payslipLines,
} from './schema/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * ============================================================================
 * PEOPLEPAY360 — COMPREHENSIVE ENTERPRISE SEED PIPELINE
 * ============================================================================
 * Generates rich, realistic corporate data following domain business logic:
 *   - 8 Departments & 24 Job Positions
 *   - 4 Working Schedules with 28 Day-Slot Lines
 *   - 3 Salary Structures with 30 Sequenced Calculation Rules
 *   - 6 Leave Types, 100+ Allocations & 50+ Leave Requests
 *   - 50 Corporate Users & Employees (Hierarchy, Active/Probation, Indian Master Data)
 *   - 50 Bank Accounts (48 Active Primary, 2 Missing for Anomaly Alerts)
 *   - 55 Contracts (Active, Historical, Expiring for Anomaly Alerts)
 *   - 250+ Attendance Records & 400+ Punch Intervals
 *   - 6 Monthly Payruns (April–September 2026) with 175+ Payslips & 1,500+ Lines
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. MASTER SEED PERSONNEL (50 USERS & EMPLOYEES)
// ─────────────────────────────────────────────────────────────────────────────
const SEED_USERS_CONFIG = [
    // 1–21: Original Seed Users (Strictly Preserved Credentials & Roles)
    {
        empCode: 'EMP-001',
        firstName: 'Aryan',
        lastName: 'Patel',
        email: 'aryanpatel.me@gmail.com',
        plainPassword: 'Aryan@123',
        role: 'ADMIN',
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
        empCode: 'EMP-002',
        firstName: 'Itesh',
        lastName: 'Prajapati',
        email: 'iteshofficial@gmail.com',
        plainPassword: 'Itesh@123',
        role: 'ADMIN',
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
        empCode: 'EMP-003',
        firstName: 'Asr',
        lastName: 'Singh',
        email: 'asr24983@gmail.com',
        plainPassword: 'Asr@123',
        role: 'HR_PAYROLL_MANAGER',
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
        empCode: 'EMP-004',
        firstName: 'Ankur',
        lastName: 'Rajput',
        email: 'asrajput5656@gmail.com',
        plainPassword: 'Ankur@123',
        role: 'EMPLOYEE',
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
        empCode: 'EMP-005',
        firstName: 'Aman',
        lastName: 'Yadav',
        email: 'yadavaman1948@gmail.com',
        plainPassword: 'Aman@123',
        role: 'ADMIN',
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
        empCode: 'EMP-006',
        firstName: 'Leo',
        lastName: 'Patel',
        email: 'leopatel967@gmail.com',
        plainPassword: 'Leo@123',
        role: 'HR_MANAGER',
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
        empCode: 'EMP-007',
        firstName: 'Doom',
        lastName: 'Wiser',
        email: 'doomwiser@gmail.com',
        plainPassword: 'Doom@123',
        role: 'HR_MANAGER',
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
        empCode: 'EMP-008',
        firstName: 'Priya',
        lastName: 'Nair',
        email: 'hr@example.com',
        plainPassword: 'Priya@123',
        role: 'HR_MANAGER',
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
        empCode: 'EMP-009',
        firstName: 'Aman',
        lastName: 'Yadav',
        email: 'work.yadavaman@gmail.com',
        plainPassword: 'Aman@123',
        role: 'HR_MANAGER',
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
        empCode: 'EMP-010',
        firstName: 'Sky',
        lastName: 'High',
        email: 'skyh53624@gmail.com',
        plainPassword: 'Sky@123',
        role: 'HR_PAYROLL_MANAGER',
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
        empCode: 'EMP-011',
        firstName: 'Aman',
        lastName: 'Yadav',
        email: 'yadavaman1388@example.com',
        plainPassword: 'Aman@123',
        role: 'EMPLOYEE',
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
    {
        empCode: 'EMP-012',
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul.sharma@peoplepay360.internal',
        plainPassword: 'Rahul@123',
        role: 'EMPLOYEE',
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
        empCode: 'EMP-013',
        firstName: 'Sneha',
        lastName: 'Kulkarni',
        email: 'sneha.kulkarni@peoplepay360.internal',
        plainPassword: 'Sneha@123',
        role: 'HR_PAYROLL_USER',
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
        empCode: 'EMP-014',
        firstName: 'Vikram',
        lastName: 'Malhotra',
        email: 'vikram.malhotra@peoplepay360.internal',
        plainPassword: 'Vikram@123',
        role: 'EMPLOYEE',
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
        empCode: 'EMP-015',
        firstName: 'Ananya',
        lastName: 'Iyer',
        email: 'ananya.iyer@peoplepay360.internal',
        plainPassword: 'Ananya@123',
        role: 'EMPLOYEE',
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
        empCode: 'EMP-016',
        firstName: 'Rohan',
        lastName: 'Gupta',
        email: 'rohan.gupta@peoplepay360.internal',
        plainPassword: 'Rohan@123',
        role: 'HR_PAYROLL_USER',
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
        empCode: 'EMP-017',
        firstName: 'Pooja',
        lastName: 'Verma',
        email: 'pooja.verma@peoplepay360.internal',
        plainPassword: 'Pooja@123',
        role: 'EMPLOYEE',
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
        empCode: 'EMP-018',
        firstName: 'Deepak',
        lastName: 'Verma',
        email: 'deepak.verma@peoplepay360.internal',
        plainPassword: 'Deepak@123',
        role: 'EMPLOYEE',
        deptCode: 'MKT',
        positionCode: 'MKT-SPC',
        phone: '+91-9821889900',
        gender: 'Male',
        hireDate: '2025-04-10',
        wage: '65000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671218',
        ifscCode: 'SBIN0005678',
        contractExpiring: true, // triggers alert
    },
    {
        empCode: 'EMP-019',
        firstName: 'Kavita',
        lastName: 'Reddy',
        email: 'kavita.reddy@peoplepay360.internal',
        plainPassword: 'Kavita@123',
        role: 'EMPLOYEE',
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
        empCode: 'EMP-020',
        firstName: 'Rajesh',
        lastName: 'Deshmukh',
        email: 'rajesh.deshmukh@peoplepay360.internal',
        plainPassword: 'Rajesh@123',
        role: 'EMPLOYEE',
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
        empCode: 'EMP-021',
        firstName: 'Neha',
        lastName: 'Joshi',
        email: 'neha.joshi@peoplepay360.internal',
        plainPassword: 'Neha@123',
        role: 'EMPLOYEE',
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

    // 22–50: Additional Personnel (Extending to 50 Total Personnel)
    {
        empCode: 'EMP-022',
        firstName: 'Aditya',
        lastName: 'Saxena',
        email: 'aditya.saxena@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'SWE-SR',
        phone: '+91-9822223344',
        gender: 'Male',
        hireDate: '2024-11-01',
        wage: '145000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001222',
        ifscCode: 'ICIC0000456',
    },
    {
        empCode: 'EMP-023',
        firstName: 'Meera',
        lastName: 'Nambiar',
        email: 'meera.nambiar@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'PROD',
        positionCode: 'PROD-MGR',
        phone: '+91-9822334455',
        gender: 'Female',
        hireDate: '2024-08-15',
        wage: '150000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567823',
        ifscCode: 'HDFC0001234',
    },
    {
        empCode: 'EMP-024',
        firstName: 'Kunal',
        lastName: 'Bhatia',
        email: 'kunal.bhatia@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'PROD',
        positionCode: 'UI-DES',
        phone: '+91-9822445566',
        gender: 'Male',
        hireDate: '2025-01-10',
        wage: '95000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671224',
        ifscCode: 'SBIN0005678',
    },
    {
        empCode: 'EMP-025',
        firstName: 'Swati',
        lastName: 'Chatterjee',
        email: 'swati.chatterjee@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'LEGAL',
        positionCode: 'LEG-CNSL',
        phone: '+91-9822556677',
        gender: 'Female',
        hireDate: '2024-05-01',
        wage: '140000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034525',
        ifscCode: 'UTIB0000789',
    },
    {
        empCode: 'EMP-026',
        firstName: 'Varun',
        lastName: 'Menon',
        email: 'varun.menon@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'CX',
        positionCode: 'CX-LEAD',
        phone: '+91-9822667788',
        gender: 'Male',
        hireDate: '2024-09-01',
        wage: '85000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458926',
        ifscCode: 'KKBK0000123',
    },
    {
        empCode: 'EMP-027',
        firstName: 'Ritu',
        lastName: 'Singhal',
        email: 'ritu.singhal@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'CX',
        positionCode: 'CX-SPEC',
        phone: '+91-9822778899',
        gender: 'Female',
        hireDate: '2025-03-01',
        wage: '52000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567827',
        ifscCode: 'HDFC0001234',
        contractExpiring: true, // triggers alert
    },
    {
        empCode: 'EMP-028',
        firstName: 'Harish',
        lastName: 'Pillai',
        email: 'harish.pillai@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'DEVOPS',
        phone: '+91-9822889900',
        gender: 'Male',
        hireDate: '2024-10-15',
        wage: '135000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001228',
        ifscCode: 'ICIC0000456',
    },
    {
        empCode: 'EMP-029',
        firstName: 'Divya',
        lastName: 'Srinivasan',
        email: 'divya.srinivasan@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'FIN',
        positionCode: 'TAX-SPEC',
        phone: '+91-9822990011',
        gender: 'Female',
        hireDate: '2024-07-01',
        wage: '105000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671229',
        ifscCode: 'SBIN0005678',
    },
    {
        empCode: 'EMP-030',
        firstName: 'Sanjay',
        lastName: 'Mukherjee',
        email: 'sanjay.mukherjee@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'OPS',
        positionCode: 'OPS-ASC',
        phone: '+91-9823001122',
        gender: 'Male',
        hireDate: '2025-02-15',
        wage: '58000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034530',
        ifscCode: 'UTIB0000789',
    },
    {
        empCode: 'EMP-031',
        firstName: 'Tanvi',
        lastName: 'Kapoor',
        email: 'tanvi.kapoor@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'MKT',
        positionCode: 'SEO-LEAD',
        phone: '+91-9823112233',
        gender: 'Female',
        hireDate: '2024-12-01',
        wage: '88000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458931',
        ifscCode: 'KKBK0000123',
    },
    {
        empCode: 'EMP-032',
        firstName: 'Nikhil',
        lastName: 'Agrawal',
        email: 'nikhil.agrawal@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'QA-ENG',
        phone: '+91-9823223344',
        gender: 'Male',
        hireDate: '2025-04-01',
        wage: '68000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567832',
        ifscCode: 'HDFC0001234',
    },
    {
        empCode: 'EMP-033',
        firstName: 'Bhavna',
        lastName: 'Chawla',
        email: 'bhavna.chawla@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'HR',
        positionCode: 'TAL-ACQ',
        phone: '+91-9823334455',
        gender: 'Female',
        hireDate: '2025-01-20',
        wage: '82000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001233',
        ifscCode: 'ICIC0000456',
    },
    {
        empCode: 'EMP-034',
        firstName: 'Gaurav',
        lastName: 'Bansal',
        email: 'gaurav.bansal@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'SWE-SR',
        phone: '+91-9823445566',
        gender: 'Male',
        hireDate: '2024-06-15',
        wage: '150000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671234',
        ifscCode: 'SBIN0005678',
    },
    {
        empCode: 'EMP-035',
        firstName: 'Pallavi',
        lastName: 'Hegde',
        email: 'pallavi.hegde@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'PROD',
        positionCode: 'UI-DES',
        phone: '+91-9823556677',
        gender: 'Female',
        hireDate: '2025-02-01',
        wage: '90000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034535',
        ifscCode: 'UTIB0000789',
    },
    {
        empCode: 'EMP-036',
        firstName: 'Manish',
        lastName: 'Tiwari',
        email: 'manish.tiwari@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'CX',
        positionCode: 'CX-SPEC',
        phone: '+91-9823667788',
        gender: 'Male',
        hireDate: '2025-03-15',
        wage: '54000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458936',
        ifscCode: 'KKBK0000123',
        contractExpiring: true, // triggers alert
    },
    {
        empCode: 'EMP-037',
        firstName: 'Shreya',
        lastName: 'Sen',
        email: 'shreya.sen@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'LEGAL',
        positionCode: 'COMP-OFF',
        phone: '+91-9823778899',
        gender: 'Female',
        hireDate: '2024-09-10',
        wage: '115000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567837',
        ifscCode: 'HDFC0001234',
    },
    {
        empCode: 'EMP-038',
        firstName: 'Alok',
        lastName: 'Pandey',
        email: 'alok.pandey@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'SWE-JR',
        phone: '+91-9823889900',
        gender: 'Male',
        hireDate: '2025-06-01',
        wage: '72000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001238',
        ifscCode: 'ICIC0000456',
    },
    {
        empCode: 'EMP-039',
        firstName: 'Rashmi',
        lastName: 'Kulkarni',
        email: 'rashmi.kulkarni@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'FIN',
        positionCode: 'FIN-ANL',
        phone: '+91-9823990011',
        gender: 'Female',
        hireDate: '2025-01-05',
        wage: '84000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671239',
        ifscCode: 'SBIN0005678',
    },
    {
        empCode: 'EMP-040',
        firstName: 'Vivek',
        lastName: 'Rao',
        email: 'vivek.rao@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'OPS',
        positionCode: 'OPS-LEAD',
        phone: '+91-9824001122',
        gender: 'Male',
        hireDate: '2024-04-15',
        wage: '102000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034540',
        ifscCode: 'UTIB0000789',
    },
    {
        empCode: 'EMP-041',
        firstName: 'Shruti',
        lastName: 'Mishra',
        email: 'shruti.mishra@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'MKT',
        positionCode: 'CONTENT-MGR',
        phone: '+91-9824112233',
        gender: 'Female',
        hireDate: '2024-11-20',
        wage: '78000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458941',
        ifscCode: 'KKBK0000123',
    },
    {
        empCode: 'EMP-042',
        firstName: 'Tarun',
        lastName: 'Sethi',
        email: 'tarun.sethi@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'SEC-ENG',
        phone: '+91-9824223344',
        gender: 'Male',
        hireDate: '2024-03-01',
        wage: '165000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567842',
        ifscCode: 'HDFC0001234',
    },
    {
        empCode: 'EMP-043',
        firstName: 'Monica',
        lastName: 'Ghosh',
        email: 'monica.ghosh@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'HR',
        positionCode: 'HR-COOR',
        phone: '+91-9824334455',
        gender: 'Female',
        hireDate: '2025-05-15',
        wage: '48000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001243',
        ifscCode: 'ICIC0000456',
    },
    {
        empCode: 'EMP-044',
        firstName: 'Pradeep',
        lastName: 'Chauhan',
        email: 'pradeep.chauhan@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'CX',
        positionCode: 'CX-SPEC',
        phone: '+91-9824445566',
        gender: 'Male',
        hireDate: '2025-02-01',
        wage: '50000.00',
        bankName: 'State Bank of India',
        accountNumber: '304958671244',
        ifscCode: 'SBIN0005678',
    },
    {
        empCode: 'EMP-045',
        firstName: 'Archana',
        lastName: 'Nair',
        email: 'archana.nair@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'PROD',
        positionCode: 'UX-RES',
        phone: '+91-9824556677',
        gender: 'Female',
        hireDate: '2024-10-01',
        wage: '110000.00',
        bankName: 'Axis Bank',
        accountNumber: '918020034545',
        ifscCode: 'UTIB0000789',
    },
    {
        empCode: 'EMP-046',
        firstName: 'Karthik',
        lastName: 'Raman',
        email: 'karthik.raman@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'ARCHITECT',
        phone: '+91-9824667788',
        gender: 'Male',
        hireDate: '2023-08-01',
        wage: '240000.00',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '6012458946',
        ifscCode: 'KKBK0000123',
    },
    {
        empCode: 'EMP-047',
        firstName: 'Deepa',
        lastName: 'Joshi',
        email: 'deepa.joshi@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'FIN',
        positionCode: 'AUD-MGR',
        phone: '+91-9824778899',
        gender: 'Female',
        hireDate: '2024-05-10',
        wage: '125000.00',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567847',
        ifscCode: 'HDFC0001234',
    },
    {
        empCode: 'EMP-048',
        firstName: 'Sumit',
        lastName: 'Kashyap',
        email: 'sumit.kashyap@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'OPS',
        positionCode: 'FAC-MGR',
        phone: '+91-9824889900',
        gender: 'Male',
        hireDate: '2024-09-01',
        wage: '75000.00',
        bankName: 'ICICI Bank',
        accountNumber: '001105001248',
        ifscCode: 'ICIC0000456',
    },
    {
        empCode: 'EMP-049',
        firstName: 'Lavanya',
        lastName: 'Sundaram',
        email: 'lavanya.sundaram@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'MKT',
        positionCode: 'BRAND-LEAD',
        phone: '+91-9824990011',
        gender: 'Female',
        hireDate: '2025-06-15',
        wage: '98000.00',
        noBankDetails: true, // Intentionally missing bank details for Dashboard Anomaly Alert
    },
    {
        empCode: 'EMP-050',
        firstName: 'Chetan',
        lastName: 'Rawat',
        email: 'chetan.rawat@peoplepay360.internal',
        plainPassword: 'User@123',
        role: 'EMPLOYEE',
        deptCode: 'ENG',
        positionCode: 'SWE-JR',
        phone: '+91-9825001122',
        gender: 'Male',
        hireDate: '2025-07-01',
        wage: '65000.00',
        noBankDetails: true, // Intentionally missing bank details for Dashboard Anomaly Alert
    },
];

async function seed() {
    console.log('🚀 Starting PeoplePay360 Comprehensive Seed Pipeline...');
    const startTime = Date.now();

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        console.log('>>> Transaction BEGIN: Purging old data in referential order...');

        // Clean tables in reverse dependency order
        await client.query('DELETE FROM payslip_lines');
        await client.query('DELETE FROM payslips');
        await client.query('DELETE FROM payrun_employees');
        await client.query('DELETE FROM payruns');
        await client.query('DELETE FROM attendance_punches');
        await client.query('DELETE FROM attendance_records');
        await client.query('DELETE FROM time_off_requests');
        await client.query('DELETE FROM time_off_allocations');
        await client.query('DELETE FROM time_off_types');
        await client.query('DELETE FROM contracts');
        await client.query('DELETE FROM bank_accounts');
        await client.query('UPDATE employees SET manager_id = NULL');
        await client.query('DELETE FROM employees');
        await client.query('DELETE FROM job_positions');
        await client.query('DELETE FROM departments');
        await client.query('DELETE FROM schedule_lines');
        await client.query('DELETE FROM working_schedules');
        await client.query('DELETE FROM salary_rules');
        await client.query('DELETE FROM salary_structures');
        await client.query('DELETE FROM users');

        console.log('✓ Tables cleanly reset.');

        // ─────────────────────────────────────────────────────────────────────
        // 1. DEPARTMENTS (8 Units)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Departments (8)...');
        const deptDefs = [
            {
                name: 'Engineering & Technology',
                code: 'ENG',
                description: 'Core platform engineering, infrastructure and architecture',
            },
            {
                name: 'Human Resources',
                code: 'HR',
                description: 'People operations, talent acquisition and employee relations',
            },
            {
                name: 'Finance & Payroll',
                code: 'FIN',
                description: 'Financial management, compliance and payroll processing',
            },
            {
                name: 'Business Operations',
                code: 'OPS',
                description: 'Internal tooling, workplace facilities and corporate operations',
            },
            {
                name: 'Sales & Marketing',
                code: 'MKT',
                description: 'Brand growth, demand generation and corporate communications',
            },
            {
                name: 'Product & Design',
                code: 'PROD',
                description: 'Product lifecycle management, UI/UX design and research',
            },
            {
                name: 'Legal & Compliance',
                code: 'LEGAL',
                description: 'Statutory compliance, employment law and regulatory governance',
            },
            {
                name: 'Customer Experience',
                code: 'CX',
                description: 'Client onboarding, customer success and tier-1/2 support',
            },
        ];

        const deptMap = {};
        for (const d of deptDefs) {
            const res = await client.query(
                `INSERT INTO departments (name, code, description, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id, code`,
                [d.name, d.code, d.description],
            );
            deptMap[d.code] = res.rows[0].id;
        }
        console.log(`✓ ${Object.keys(deptMap).length} departments ready.`);

        // ─────────────────────────────────────────────────────────────────────
        // 2. JOB POSITIONS (24 Roles)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Job Positions (24)...');
        const posDefs = [
            { title: 'Principal Architect', code: 'ARCHITECT', deptCode: 'ENG' },
            { title: 'Senior Software Engineer', code: 'SWE-SR', deptCode: 'ENG' },
            { title: 'Software Engineer', code: 'SWE-JR', deptCode: 'ENG' },
            { title: 'Lead QA Engineer', code: 'QA-LEAD', deptCode: 'ENG' },
            { title: 'Quality Assurance Engineer', code: 'QA-ENG', deptCode: 'ENG' },
            { title: 'DevOps & Platform Engineer', code: 'DEVOPS', deptCode: 'ENG' },
            { title: 'Information Security Engineer', code: 'SEC-ENG', deptCode: 'ENG' },
            { title: 'Senior HR Manager', code: 'HR-MGR', deptCode: 'HR' },
            { title: 'HR Business Partner', code: 'HRBP', deptCode: 'HR' },
            { title: 'Talent Acquisition Lead', code: 'TAL-ACQ', deptCode: 'HR' },
            { title: 'HR Coordinator', code: 'HR-COOR', deptCode: 'HR' },
            { title: 'Senior Payroll Manager', code: 'PAY-MGR', deptCode: 'FIN' },
            { title: 'Lead Payroll Specialist', code: 'PAY-LEAD', deptCode: 'FIN' },
            { title: 'Senior Financial Analyst', code: 'FIN-ANL', deptCode: 'FIN' },
            { title: 'Tax & Compliance Specialist', code: 'TAX-SPEC', deptCode: 'FIN' },
            { title: 'Internal Audit Manager', code: 'AUD-MGR', deptCode: 'FIN' },
            { title: 'Operations Director', code: 'OPS-LEAD', deptCode: 'OPS' },
            { title: 'Operations Associate', code: 'OPS-ASC', deptCode: 'OPS' },
            { title: 'Facilities Manager', code: 'FAC-MGR', deptCode: 'OPS' },
            { title: 'Marketing Specialist', code: 'MKT-SPC', deptCode: 'MKT' },
            { title: 'SEO & Growth Lead', code: 'SEO-LEAD', deptCode: 'MKT' },
            { title: 'Content & Brand Manager', code: 'CONTENT-MGR', deptCode: 'MKT' },
            { title: 'Brand Marketing Lead', code: 'BRAND-LEAD', deptCode: 'MKT' },
            { title: 'Director of Product', code: 'PROD-MGR', deptCode: 'PROD' },
            { title: 'Senior UI/UX Designer', code: 'UI-DES', deptCode: 'PROD' },
            { title: 'UX Researcher', code: 'UX-RES', deptCode: 'PROD' },
            { title: 'Chief Legal Counsel', code: 'LEG-CNSL', deptCode: 'LEGAL' },
            { title: 'Compliance Officer', code: 'COMP-OFF', deptCode: 'LEGAL' },
            { title: 'Head of Customer Experience', code: 'CX-LEAD', deptCode: 'CX' },
            { title: 'Customer Success Specialist', code: 'CX-SPEC', deptCode: 'CX' },
        ];

        const posMap = {};
        for (const p of posDefs) {
            const res = await client.query(
                `INSERT INTO job_positions (title, code, department_id, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id, code`,
                [p.title, p.code, deptMap[p.deptCode]],
            );
            posMap[p.code] = res.rows[0].id;
        }
        console.log(`✓ ${Object.keys(posMap).length} job positions ready.`);

        // ─────────────────────────────────────────────────────────────────────
        // 3. WORKING SCHEDULES & LINES (4 Schedules, 28 Lines)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Working Schedules & Lines...');
        const schedDefs = [
            {
                name: 'Standard Corporate 40h (Mon-Fri 9-6)',
                desc: 'Standard 8 hours/day with 60-minute break',
                start: '09:00',
                end: '18:00',
                breakMin: 60,
                days: [1, 2, 3, 4, 5],
            },
            {
                name: 'Flexible Core 45h (Mon-Fri 9-7)',
                desc: 'Extended corporate schedule 9 hours/day with 60-minute break',
                start: '09:00',
                end: '19:00',
                breakMin: 60,
                days: [1, 2, 3, 4, 5],
            },
            {
                name: 'Morning Shift 35h (Mon-Fri 8-4)',
                desc: 'Early shift 7 hours/day with 60-minute break',
                start: '08:00',
                end: '16:00',
                breakMin: 60,
                days: [1, 2, 3, 4, 5],
            },
            {
                name: 'Part-Time 20h (Mon-Fri 4h/day)',
                desc: 'Afternoon half-shift 4 hours/day with 0-minute break',
                start: '13:00',
                end: '17:00',
                breakMin: 0,
                days: [1, 2, 3, 4, 5],
            },
        ];

        const schedMap = {};
        for (const s of schedDefs) {
            const res = await client.query(
                `INSERT INTO working_schedules (name, description, timezone, is_active, created_at, updated_at)
                 VALUES ($1, $2, 'Asia/Kolkata', true, NOW(), NOW()) RETURNING id`,
                [s.name, s.desc],
            );
            const schedId = res.rows[0].id;
            schedMap[s.name] = schedId;

            for (let day = 0; day <= 6; day++) {
                const isWorkDay = s.days.includes(day);
                const startTime = isWorkDay ? s.start : '09:00';
                const endTime = isWorkDay ? s.end : '09:01';
                const breakMin = isWorkDay ? s.breakMin : 0;
                await client.query(
                    `INSERT INTO schedule_lines (schedule_id, day_of_week, start_time, end_time, break_minutes, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                    [schedId, day, startTime, endTime, breakMin],
                );
            }
        }
        const defaultSchedId = Object.values(schedMap)[0];
        console.log(`✓ 4 working schedules & 28 schedule lines configured.`);

        // ─────────────────────────────────────────────────────────────────────
        // 4. SALARY STRUCTURES & SEQUENCED RULES (3 Structures, 30 Rules)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Salary Structures & Sequenced Rules...');
        const structDefs = [
            {
                name: 'Standard Corporate Monthly Structure',
                code: 'REG_MONTHLY',
                desc: 'Standard monthly executive and staff salary computation package',
            },
            {
                name: 'Engineering & Technology Executive Structure',
                code: 'TECH_EXEC',
                desc: 'High-allowance performance package for tech and leadership roles',
            },
            {
                name: 'Operations & Support Associate Structure',
                code: 'OPS_SUPPORT',
                desc: 'Hourly/shift aligned wage structure with overtime allowances',
            },
        ];

        const structMap = {};
        for (const st of structDefs) {
            const res = await client.query(
                `INSERT INTO salary_structures (name, code, description, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING id, code`,
                [st.name, st.code, st.desc],
            );
            structMap[st.code] = res.rows[0].id;

            // Define 10 ordered rules strictly sequenced 1 to 10
            const rules = [
                {
                    seq: 1,
                    code: 'BASIC',
                    name: 'Basic Salary',
                    cat: 'BASIC',
                    comp: 'PERCENTAGE',
                    base: 'WAGE',
                    rate: '50.0000',
                    expr: null,
                    fixed: null,
                },
                {
                    seq: 2,
                    code: 'HRA',
                    name: 'House Rent Allowance',
                    cat: 'ALLOWANCE',
                    comp: 'PERCENTAGE',
                    base: 'BASIC',
                    rate: '40.0000',
                    expr: null,
                    fixed: null,
                },
                {
                    seq: 3,
                    code: 'CONV',
                    name: 'Conveyance Allowance',
                    cat: 'ALLOWANCE',
                    comp: 'FIXED',
                    base: null,
                    rate: null,
                    expr: null,
                    fixed: '1600.00',
                },
                {
                    seq: 4,
                    code: 'SPECIAL',
                    name: 'Special Allowance',
                    cat: 'ALLOWANCE',
                    comp: 'FORMULA',
                    base: null,
                    rate: null,
                    expr: 'max(0, WAGE - (BASIC + HRA + CONV))',
                    fixed: null,
                },
                {
                    seq: 5,
                    code: 'GROSS',
                    name: 'Gross Earnings',
                    cat: 'GROSS',
                    comp: 'FORMULA',
                    base: null,
                    rate: null,
                    expr: 'BASIC + HRA + CONV + SPECIAL',
                    fixed: null,
                },
                {
                    seq: 6,
                    code: 'PF',
                    name: 'Employee Provident Fund (12%)',
                    cat: 'DEDUCTION',
                    comp: 'PERCENTAGE',
                    base: 'BASIC',
                    rate: '12.0000',
                    expr: null,
                    fixed: null,
                },
                {
                    seq: 7,
                    code: 'PT',
                    name: 'Professional Tax',
                    cat: 'DEDUCTION',
                    comp: 'FIXED',
                    base: null,
                    rate: null,
                    expr: null,
                    fixed: '200.00',
                },
                {
                    seq: 8,
                    code: 'TDS',
                    name: 'Tax Deducted at Source (TDS)',
                    cat: 'DEDUCTION',
                    comp: 'PERCENTAGE',
                    base: 'GROSS',
                    rate: '5.0000',
                    expr: null,
                    fixed: null,
                },
                {
                    seq: 9,
                    code: 'TOT_DED',
                    name: 'Total Deductions',
                    cat: 'DEDUCTION',
                    comp: 'FORMULA',
                    base: null,
                    rate: null,
                    expr: 'PF + PT + TDS',
                    fixed: null,
                },
                {
                    seq: 10,
                    code: 'NET',
                    name: 'Net Payable Salary',
                    cat: 'NET',
                    comp: 'FORMULA',
                    base: null,
                    rate: null,
                    expr: 'GROSS - TOT_DED',
                    fixed: null,
                },
            ];

            for (const r of rules) {
                await client.query(
                    `INSERT INTO salary_rules (structure_id, code, name, category, sequence_order, computation_type, fixed_amount, percentage_base_code, percentage_rate, formula_expression, is_active, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())`,
                    [
                        res.rows[0].id,
                        r.code,
                        r.name,
                        r.cat,
                        r.seq,
                        r.comp,
                        r.fixed,
                        r.base,
                        r.rate,
                        r.expr,
                    ],
                );
            }
        }
        const defaultStructId = structMap['REG_MONTHLY'];
        console.log(`✓ 3 salary structures & 30 sequenced calculation rules configured.`);

        // ─────────────────────────────────────────────────────────────────────
        // 5. TIME OFF TYPES (6 Policies)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Time Off Types (6)...');
        const leaveDefs = [
            {
                name: 'Paid Time Off / Annual Leave',
                code: 'ANNUAL',
                alloc: true,
                reqApp: true,
                paid: true,
                max: 15,
            },
            {
                name: 'Sick & Medical Leave',
                code: 'SICK',
                alloc: true,
                reqApp: true,
                paid: true,
                max: 10,
            },
            {
                name: 'Casual Leave',
                code: 'CASUAL',
                alloc: true,
                reqApp: true,
                paid: true,
                max: 8,
            },
            {
                name: 'Unpaid Leave / Loss of Pay',
                code: 'UNPAID',
                alloc: false,
                reqApp: true,
                paid: false,
                max: null,
            },
            {
                name: 'Parental Leave',
                code: 'PARENTAL',
                alloc: true,
                reqApp: true,
                paid: true,
                max: 90,
            },
            {
                name: 'Compensatory Off',
                code: 'COMP_OFF',
                alloc: true,
                reqApp: true,
                paid: true,
                max: 5,
            },
        ];

        const leaveMap = {};
        for (const l of leaveDefs) {
            const res = await client.query(
                `INSERT INTO time_off_types (name, code, allocation_required, request_approval_required, paid_time_off, max_days_per_request, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW()) RETURNING id, code`,
                [l.name, l.code, l.alloc, l.reqApp, l.paid, l.max],
            );
            leaveMap[l.code] = res.rows[0].id;
        }
        console.log(`✓ ${Object.keys(leaveMap).length} time off policies ready.`);

        // ─────────────────────────────────────────────────────────────────────
        // 6. USERS & EMPLOYEES (50 Personnel)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Hashing Passwords & Seeding 50 Personnel...');
        const userHashCache = {};
        const getHash = async (pw) => {
            if (!userHashCache[pw]) {
                userHashCache[pw] = await bcrypt.hash(pw, 10);
            }
            return userHashCache[pw];
        };

        const empMap = {}; // empCode -> employee DB record
        const userMap = {}; // email -> user DB record

        for (const u of SEED_USERS_CONFIG) {
            const hash = await getHash(u.plainPassword);

            // Insert user
            const userRes = await client.query(
                `INSERT INTO users (first_name, last_name, email, password, role, email_verified, is_active, is_deleted, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, true, true, false, NOW(), NOW())
                 RETURNING id, email, role`,
                [u.firstName, u.lastName, u.email, hash, u.role],
            );
            const userId = userRes.rows[0].id;
            userMap[u.email] = userRes.rows[0];

            // Insert employee
            const empRes = await client.query(
                `INSERT INTO employees (user_id, employee_code, first_name, last_name, email, phone, gender, hire_date, department_id, job_position_id, working_schedule_id, status, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'ACTIVE', true, NOW(), NOW())
                 RETURNING id, employee_code, first_name, last_name, email, department_id`,
                [
                    userId,
                    u.empCode,
                    u.firstName,
                    u.lastName,
                    u.email,
                    u.phone,
                    u.gender,
                    u.hireDate,
                    deptMap[u.deptCode],
                    posMap[u.positionCode],
                    defaultSchedId,
                ],
            );
            empMap[u.empCode] = {
                ...empRes.rows[0],
                wage: u.wage,
                bankName: u.bankName,
                accountNumber: u.accountNumber,
                ifscCode: u.ifscCode,
                noBankDetails: !!u.noBankDetails,
                contractExpiring: !!u.contractExpiring,
            };
        }
        console.log(`✓ 50 users and 50 employees successfully created.`);

        // Establish managerial hierarchy
        const topAdminId = empMap['EMP-001'].id; // Aryan Patel (Director/CEO)
        const engLeadId = empMap['EMP-005'].id; // Aman Yadav
        const hrLeadId = empMap['EMP-006'].id; // Leo Patel
        const finLeadId = empMap['EMP-003'].id; // Asr Singh
        const opsLeadId = empMap['EMP-015'].id; // Ananya Iyer

        for (const [code, emp] of Object.entries(empMap)) {
            let mgr = topAdminId;
            if (['EMP-001'].includes(code)) mgr = null;
            else if (
                [
                    'EMP-004',
                    'EMP-011',
                    'EMP-012',
                    'EMP-020',
                    'EMP-022',
                    'EMP-028',
                    'EMP-032',
                    'EMP-034',
                    'EMP-038',
                    'EMP-042',
                    'EMP-046',
                    'EMP-050',
                ].includes(code)
            )
                mgr = engLeadId;
            else if (
                ['EMP-007', 'EMP-008', 'EMP-009', 'EMP-021', 'EMP-033', 'EMP-043'].includes(code)
            )
                mgr = hrLeadId;
            else if (
                [
                    'EMP-010',
                    'EMP-013',
                    'EMP-014',
                    'EMP-016',
                    'EMP-029',
                    'EMP-039',
                    'EMP-047',
                ].includes(code)
            )
                mgr = finLeadId;
            else if (['EMP-017', 'EMP-030', 'EMP-040', 'EMP-048'].includes(code)) mgr = opsLeadId;

            if (mgr) {
                await client.query(`UPDATE employees SET manager_id = $1 WHERE id = $2`, [
                    mgr,
                    emp.id,
                ]);
            }
        }
        console.log(`✓ Organisational hierarchy established.`);

        // ─────────────────────────────────────────────────────────────────────
        // 7. BANK ACCOUNTS (50 Total: 48 Active, 2 Missing for Alerts)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Bank Accounts (48 Active, 2 Missing)...');
        for (const emp of Object.values(empMap)) {
            if (emp.noBankDetails) continue; // Skip to trigger missing bank details alert
            await client.query(
                `INSERT INTO bank_accounts (employee_id, bank_name, account_number, account_holder_name, ifsc_code, account_type, is_primary, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, 'SALARY', true, true, NOW(), NOW())`,
                [
                    emp.id,
                    emp.bankName || 'HDFC Bank',
                    emp.accountNumber || `50100${emp.employee_code.replace(/\D/g, '')}`,
                    `${emp.first_name} ${emp.last_name}`,
                    emp.ifscCode || 'HDFC0001234',
                ],
            );
        }
        console.log(`✓ Bank accounts configured with 2 deliberate missing alerts.`);

        // ─────────────────────────────────────────────────────────────────────
        // 8. CONTRACTS (50 Active + 5 Historical + 3 Expiring)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Contracts (55+ with 3 Expiring Anomaly Alerts)...');
        const contractMap = {}; // empId -> active contract DB record

        for (const emp of Object.values(empMap)) {
            const structureId = emp.wage > 150000 ? structMap['TECH_EXEC'] : defaultStructId;
            let startDate = '2025-01-01';
            let endDate = null; // Open ended default

            if (emp.contractExpiring) {
                // Expiring within 25 days from Sep 5, 2026 -> Sep 25, 2026
                startDate = '2025-10-01';
                endDate = '2026-09-25';
            }

            const res = await client.query(
                `INSERT INTO contracts (employee_id, salary_structure_id, start_date, end_date, wage, department_id, working_schedule_id, status, max_punches_per_day, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', 3, NOW(), NOW()) RETURNING id, employee_id, wage, salary_structure_id`,
                [
                    emp.id,
                    structureId,
                    startDate,
                    endDate,
                    emp.wage,
                    emp.department_id,
                    defaultSchedId,
                ],
            );
            contractMap[emp.id] = res.rows[0];
        }

        // Add 5 historical expired contracts to test contract history
        const seniorEmpCodes = ['EMP-001', 'EMP-002', 'EMP-005', 'EMP-006', 'EMP-046'];
        for (const code of seniorEmpCodes) {
            const emp = empMap[code];
            await client.query(
                `INSERT INTO contracts (employee_id, salary_structure_id, start_date, end_date, wage, department_id, working_schedule_id, status, max_punches_per_day, notes, created_at, updated_at)
                 VALUES ($1, $2, '2024-01-01', '2024-12-31', $3, $4, $5, 'EXPIRED', 3, 'Previous tenure contract renewed', NOW(), NOW())`,
                [
                    emp.id,
                    defaultStructId,
                    (parseFloat(emp.wage) * 0.85).toFixed(2),
                    emp.department_id,
                    defaultSchedId,
                ],
            );
        }
        console.log(`✓ 55 contracts registered.`);

        // ─────────────────────────────────────────────────────────────────────
        // 9. TIME OFF ALLOCATIONS & REQUESTS (100 Allocations, 50+ Requests)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Time Off Allocations & Requests...');
        const adminUserId = userMap['aryanpatel.me@gmail.com'].id;
        const allocMap = {}; // empId:typeCode -> allocId

        for (const emp of Object.values(empMap)) {
            // Allocate 15 Annual days and 10 Sick days
            const resA = await client.query(
                `INSERT INTO time_off_allocations (employee_id, type_id, total_days, used_days, validity_start, validity_end, status, approved_by, approved_at, created_at, updated_at)
                 VALUES ($1, $2, '15.00', '2.00', '2026-01-01', '2026-12-31', 'APPROVED', $3, NOW(), NOW(), NOW()) RETURNING id`,
                [emp.id, leaveMap['ANNUAL'], adminUserId],
            );
            allocMap[`${emp.id}:ANNUAL`] = resA.rows[0].id;

            const resS = await client.query(
                `INSERT INTO time_off_allocations (employee_id, type_id, total_days, used_days, validity_start, validity_end, status, approved_by, approved_at, created_at, updated_at)
                 VALUES ($1, $2, '10.00', '1.00', '2026-01-01', '2026-12-31', 'APPROVED', $3, NOW(), NOW(), NOW()) RETURNING id`,
                [emp.id, leaveMap['SICK'], adminUserId],
            );
            allocMap[`${emp.id}:SICK`] = resS.rows[0].id;
        }

        // Seed 40 Approved Leave Requests (Past Months)
        const allEmpsList = Object.values(empMap);
        for (let i = 0; i < 40; i++) {
            const emp = allEmpsList[i % allEmpsList.length];
            const typeCode = i % 3 === 0 ? 'SICK' : 'ANNUAL';
            const m = String((i % 5) + 3).padStart(2, '0'); // Months 03 to 07
            const dayStart = String((i % 20) + 1).padStart(2, '0');
            const dayEnd = String((i % 20) + 2).padStart(2, '0');

            await client.query(
                `INSERT INTO time_off_requests (employee_id, type_id, allocation_id, start_date, end_date, number_of_days, reason, status, reviewed_by, reviewed_at, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, '2.00', 'Family medical and planned personal leave', 'APPROVED', $6, NOW(), NOW(), NOW())`,
                [
                    emp.id,
                    leaveMap[typeCode],
                    allocMap[`${emp.id}:${typeCode}`],
                    `2026-${m}-${dayStart}`,
                    `2026-${m}-${dayEnd}`,
                    adminUserId,
                ],
            );
        }

        // Seed 6 PENDING Leave Requests (Upcoming: triggers dashboard pending approval alert)
        for (let i = 40; i < 46; i++) {
            const emp = allEmpsList[i];
            await client.query(
                `INSERT INTO time_off_requests (employee_id, type_id, allocation_id, start_date, end_date, number_of_days, reason, status, created_at, updated_at)
                 VALUES ($1, $2, $3, '2026-09-15', '2026-09-17', '2.00', 'Attending academic tech symposium', 'PENDING', NOW(), NOW())`,
                [emp.id, leaveMap['ANNUAL'], allocMap[`${emp.id}:ANNUAL`]],
            );
        }

        // Seed 5 REFUSED Leave Requests
        for (let i = 46; i < 50; i++) {
            const emp = allEmpsList[i];
            await client.query(
                `INSERT INTO time_off_requests (employee_id, type_id, allocation_id, start_date, end_date, number_of_days, reason, status, reviewed_by, reviewed_at, review_notes, created_at, updated_at)
                 VALUES ($1, $2, $3, '2026-08-10', '2026-08-12', '2.00', 'Emergency errand', 'REFUSED', $4, NOW(), 'Department critical sprint deployment', NOW(), NOW())`,
                [emp.id, leaveMap['CASUAL'], allocMap[`${emp.id}:ANNUAL`], adminUserId],
            );
        }
        console.log(`✓ 100 leave allocations and 51 leave requests seeded.`);

        // ─────────────────────────────────────────────────────────────────────
        // 10. ATTENDANCE RECORDS & PUNCHES (250+ Records, 450+ Punches)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding Multi-Week Attendance Records & Punches...');
        // Generate attendance for the last 10 workdays (late Aug - early Sep 2026) for 25 employees = 250 records
        const sampleEmps = allEmpsList.slice(0, 25);
        const workDates = [
            '2026-08-24',
            '2026-08-25',
            '2026-08-26',
            '2026-08-27',
            '2026-08-28',
            '2026-08-31',
            '2026-09-01',
            '2026-09-02',
            '2026-09-03',
            '2026-09-04',
        ];

        let attRecordCount = 0;
        let punchCount = 0;

        for (const dateStr of workDates) {
            for (let idx = 0; idx < sampleEmps.length; idx++) {
                const emp = sampleEmps[idx];
                const isLate = (idx + workDates.indexOf(dateStr)) % 8 === 0;
                const isAbsent = idx + workDates.indexOf(dateStr) === 17;
                const isMissingCheckout = dateStr === '2026-09-02' && idx === 3; // deliberate anomaly alert

                let status = 'PRESENT';
                let inTime = `${dateStr}T09:02:00+05:30`;
                let outTime = `${dateStr}T18:05:00+05:30`;
                let worked = '8.05';

                if (isAbsent) {
                    status = 'ABSENT';
                    inTime = null;
                    outTime = null;
                    worked = '0.00';
                } else if (isLate) {
                    status = 'LATE';
                    inTime = `${dateStr}T10:18:00+05:30`;
                    worked = '6.78';
                } else if (isMissingCheckout) {
                    status = 'PRESENT';
                    outTime = null;
                    worked = null;
                }

                const attRes = await client.query(
                    `INSERT INTO attendance_records (employee_id, attendance_date, check_in_time, check_out_time, worked_hours, status, is_manually_corrected, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW()) RETURNING id`,
                    [emp.id, dateStr, inTime, outTime, worked, status],
                );
                const attId = attRes.rows[0].id;
                attRecordCount++;

                if (inTime) {
                    // Morning punch
                    await client.query(
                        `INSERT INTO attendance_punches (attendance_record_id, check_in_time, check_out_time, worked_hours, notes, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, 'Biometric badge in/out', NOW(), NOW())`,
                        [
                            attId,
                            inTime,
                            outTime ? `${dateStr}T13:00:00+05:30` : null,
                            outTime ? '3.90' : null,
                        ],
                    );
                    punchCount++;

                    // Afternoon punch (if not open shift)
                    if (outTime) {
                        await client.query(
                            `INSERT INTO attendance_punches (attendance_record_id, check_in_time, check_out_time, worked_hours, notes, created_at, updated_at)
                             VALUES ($1, $2, $3, $4, 'Post-lunch session', NOW(), NOW())`,
                            [attId, `${dateStr}T14:00:00+05:30`, outTime, '4.08'],
                        );
                        punchCount++;
                    }
                }
            }
        }
        console.log(
            `✓ ${attRecordCount} attendance records and ${punchCount} punch sessions seeded.`,
        );

        // ─────────────────────────────────────────────────────────────────────
        // 11. HISTORICAL PAYRUNS, PAYSLIPS & LINES (6 Months, 175+ Payslips)
        // ─────────────────────────────────────────────────────────────────────
        console.log('📌 Seeding 6-Month Multi-Timeframe Historical Payroll (175+ Payslips)...');
        const monthsConfig = [
            {
                name: 'April 2026 Regular Corporate Payroll',
                start: '2026-04-01',
                end: '2026-04-30',
                payDate: '2026-05-01',
                status: 'PAID',
                empCount: 30,
            },
            {
                name: 'May 2026 Regular Corporate Payroll',
                start: '2026-05-01',
                end: '2026-05-31',
                payDate: '2026-06-01',
                status: 'PAID',
                empCount: 32,
            },
            {
                name: 'June 2026 Regular Corporate Payroll',
                start: '2026-06-01',
                end: '2026-06-30',
                payDate: '2026-07-01',
                status: 'PAID',
                empCount: 34,
            },
            {
                name: 'July 2026 Regular Corporate Payroll',
                start: '2026-07-01',
                end: '2026-07-31',
                payDate: '2026-08-01',
                status: 'PAID',
                empCount: 35,
            },
            {
                name: 'August 2026 Regular Corporate Payroll',
                start: '2026-08-01',
                end: '2026-08-31',
                payDate: '2026-09-01',
                status: 'VALIDATED',
                empCount: 35,
            },
            {
                name: 'September 2026 Executive In-Progress Payroll',
                start: '2026-09-01',
                end: '2026-09-30',
                payDate: '2026-10-01',
                status: 'DRAFT',
                empCount: 25,
            },
        ];

        let totalPayslipCount = 0;
        let totalPayslipLineCount = 0;

        for (const m of monthsConfig) {
            // 1. Create Payrun batch header
            const payrunRes = await client.query(
                `INSERT INTO payruns (name, structure_id, period_start, period_end, payment_date, status, created_by, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
                [m.name, defaultStructId, m.start, m.end, m.payDate, m.status, adminUserId],
            );
            const payrunId = payrunRes.rows[0].id;

            const batchEmps = allEmpsList.slice(0, m.empCount);
            let batchGross = 0;
            let batchDed = 0;
            let batchNet = 0;

            for (const emp of batchEmps) {
                const contract = contractMap[emp.id];
                const baseWage = parseFloat(contract.wage);

                // Compute standard salary breakdown lines
                const basic = baseWage * 0.5;
                const hra = basic * 0.4;
                const conv = 1600.0;
                const special = Math.max(0, baseWage - (basic + hra + conv));
                const gross = basic + hra + conv + special;

                const pf = basic * 0.12;
                const pt = 200.0;
                const tds = gross * 0.05;
                const totalDeductions = pf + pt + tds;
                const net = gross - totalDeductions;

                batchGross += gross;
                batchDed += totalDeductions;
                batchNet += net;

                // Insert into payrun_employees roster
                await client.query(
                    `INSERT INTO payrun_employees (payrun_id, employee_id, contract_id, eligibility_status, selection_status, created_at, updated_at)
                     VALUES ($1, $2, $3, 'ELIGIBLE', 'SELECTED', NOW(), NOW())`,
                    [payrunId, emp.id, contract.id],
                );

                // Insert payslip
                const slipStatus =
                    m.status === 'PAID' ? 'PAID' : m.status === 'VALIDATED' ? 'VALIDATED' : 'DRAFT';
                const slipRes = await client.query(
                    `INSERT INTO payslips (payrun_id, employee_id, contract_id, structure_id, contract_wage_snapshot, period_start, period_end, worked_days, gross_amount, deduction_amount, net_amount, status, paid_at, validated_at, computed_at, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, '22.00', $8, $9, $10, $11, $12, $13, NOW(), NOW(), NOW()) RETURNING id`,
                    [
                        payrunId,
                        emp.id,
                        contract.id,
                        defaultStructId,
                        baseWage.toFixed(2),
                        m.start,
                        m.end,
                        gross.toFixed(2),
                        totalDeductions.toFixed(2),
                        net.toFixed(2),
                        slipStatus,
                        m.status === 'PAID' ? `${m.payDate}T10:00:00Z` : null,
                        ['PAID', 'VALIDATED'].includes(m.status) ? `${m.payDate}T09:00:00Z` : null,
                    ],
                );
                const slipId = slipRes.rows[0].id;
                totalPayslipCount++;

                // Insert detailed sequenced lines into payslip_lines
                const lines = [
                    { seq: 1, code: 'BASIC', name: 'Basic Salary', cat: 'BASIC', amt: basic },
                    {
                        seq: 2,
                        code: 'HRA',
                        name: 'House Rent Allowance',
                        cat: 'ALLOWANCE',
                        amt: hra,
                    },
                    {
                        seq: 3,
                        code: 'CONV',
                        name: 'Conveyance Allowance',
                        cat: 'ALLOWANCE',
                        amt: conv,
                    },
                    {
                        seq: 4,
                        code: 'SPECIAL',
                        name: 'Special Allowance',
                        cat: 'ALLOWANCE',
                        amt: special,
                    },
                    { seq: 5, code: 'GROSS', name: 'Gross Salary', cat: 'GROSS', amt: gross },
                    {
                        seq: 6,
                        code: 'PF',
                        name: 'Employee Provident Fund',
                        cat: 'DEDUCTION',
                        amt: pf,
                    },
                    { seq: 7, code: 'PT', name: 'Professional Tax', cat: 'DEDUCTION', amt: pt },
                    { seq: 8, code: 'TDS', name: 'Income Tax (TDS)', cat: 'DEDUCTION', amt: tds },
                    {
                        seq: 9,
                        code: 'TOT_DED',
                        name: 'Total Deductions',
                        cat: 'DEDUCTION',
                        amt: totalDeductions,
                    },
                    { seq: 10, code: 'NET', name: 'Net Take Home Pay', cat: 'NET', amt: net },
                ];

                for (const l of lines) {
                    await client.query(
                        `INSERT INTO payslip_lines (payslip_id, code, name, category, sequence_order, computation_type, amount, created_at)
                         VALUES ($1, $2, $3, $4, $5, 'FORMULA', $6, NOW())`,
                        [slipId, l.code, l.name, l.cat, l.seq, l.amt.toFixed(2)],
                    );
                    totalPayslipLineCount++;
                }
            }

            // Freeze batch aggregates on payrun header
            await client.query(
                `UPDATE payruns 
                 SET total_employees = $1, total_gross = $2, total_deductions = $3, total_net = $4, computed_at = NOW(), validated_at = $5, paid_at = $6
                 WHERE id = $7`,
                [
                    batchEmps.length,
                    batchGross.toFixed(2),
                    batchDed.toFixed(2),
                    batchNet.toFixed(2),
                    ['PAID', 'VALIDATED'].includes(m.status) ? `${m.payDate}T09:00:00Z` : null,
                    m.status === 'PAID' ? `${m.payDate}T10:00:00Z` : null,
                    payrunId,
                ],
            );
        }
        console.log(
            `✓ 6 monthly payruns, ${totalPayslipCount} payslips and ${totalPayslipLineCount} breakdown lines seeded.`,
        );

        await client.query('COMMIT');
        console.log('\n>>> Transaction COMMIT: Enterprise seed pipeline finished successfully!');

        // Audit Verification
        const finalAudit = await client.query(`
            SELECT
                (SELECT count(*) FROM users) as users_count,
                (SELECT count(*) FROM employees) as employees_count,
                (SELECT count(*) FROM bank_accounts) as bank_accounts_count,
                (SELECT count(*) FROM contracts) as contracts_count,
                (SELECT count(*) FROM departments) as departments_count,
                (SELECT count(*) FROM job_positions) as job_positions_count,
                (SELECT count(*) FROM working_schedules) as working_schedules_count,
                (SELECT count(*) FROM schedule_lines) as schedule_lines_count,
                (SELECT count(*) FROM salary_structures) as salary_structures_count,
                (SELECT count(*) FROM salary_rules) as salary_rules_count,
                (SELECT count(*) FROM time_off_types) as time_off_types_count,
                (SELECT count(*) FROM time_off_allocations) as time_off_allocations_count,
                (SELECT count(*) FROM time_off_requests) as time_off_requests_count,
                (SELECT count(*) FROM attendance_records) as attendance_records_count,
                (SELECT count(*) FROM attendance_punches) as attendance_punches_count,
                (SELECT count(*) FROM payruns) as payruns_count,
                (SELECT count(*) FROM payrun_employees) as payrun_employees_count,
                (SELECT count(*) FROM payslips) as payslips_count,
                (SELECT count(*) FROM payslip_lines) as payslip_lines_count
        `);

        console.log('\n========================================================');
        console.log('🌟 PEOPLEPAY360 MASTER SEED AUDIT REPORT');
        console.log('========================================================');
        for (const [table, count] of Object.entries(finalAudit.rows[0])) {
            console.log(`  ✓ ${table.padEnd(30)}: ${String(count).padStart(5)} rows`);
        }
        console.log('========================================================');
        console.log(`⏱ Total Execution Time: ${((Date.now() - startTime) / 1000).toFixed(2)}s\n`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('>>> Transaction ROLLBACK due to error:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch((err) => {
    console.error('Fatal Seed Failure:', err);
    process.exit(1);
});
