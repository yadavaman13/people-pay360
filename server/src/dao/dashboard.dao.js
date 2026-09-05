import { db } from '../config/database.config.js';
import { payruns, payslips } from '../db/schema/payroll.schema.js';
import { employees } from '../db/schema/employees.schema.js';
import { contracts } from '../db/schema/contracts.schema.js';
import { departments } from '../db/schema/departments.schema.js';
import { bankAccounts } from '../db/schema/bank_accounts.schema.js';
import { attendanceRecords } from '../db/schema/attendance.schema.js';
import { timeOffTypes, timeOffAllocations, timeOffRequests } from '../db/schema/time_off.schema.js';
import { eq, and, or, gte, lte, sql, desc, asc, ne, inArray, isNull } from 'drizzle-orm';

/**
 * 1. GET DASHBOARD SUMMARY KPI METRICS
 */
export async function getDashboardSummary({
    periodStart,
    periodEnd,
    departmentId,
    employeeType,
    userRole,
    employeeId,
} = {}) {
    // A. Role Scoping: EMPLOYEE sees personal summary
    if (userRole === 'EMPLOYEE' && employeeId) {
        return getEmployeePersonalSummary({ employeeId, periodStart, periodEnd });
    }

    // B. Build date and department conditions
    const payslipConditions = [];
    const empConditions = [eq(employees.isActive, true)];
    const attendanceConditions = [];
    const timeOffConditions = [eq(timeOffRequests.status, 'APPROVED')];

    if (departmentId) {
        payslipConditions.push(eq(employees.departmentId, departmentId));
        empConditions.push(eq(employees.departmentId, departmentId));
        attendanceConditions.push(eq(employees.departmentId, departmentId));
        timeOffConditions.push(eq(employees.departmentId, departmentId));
    }

    if (periodStart) {
        payslipConditions.push(gte(payslips.periodStart, periodStart));
        attendanceConditions.push(gte(attendanceRecords.attendanceDate, periodStart));
        timeOffConditions.push(gte(timeOffRequests.startDate, periodStart));
    }

    if (periodEnd) {
        payslipConditions.push(lte(payslips.periodEnd, periodEnd));
        attendanceConditions.push(lte(attendanceRecords.attendanceDate, periodEnd));
        timeOffConditions.push(lte(timeOffRequests.endDate, periodEnd));
    }

    // 1. Headcount
    const [headcountResult] = await db
        .select({
            totalEmployees: sql`COUNT(DISTINCT ${employees.id})`,
            activeEmployees: sql`COUNT(DISTINCT CASE WHEN ${employees.status} = 'ACTIVE' THEN ${employees.id} END)`,
        })
        .from(employees)
        .where(empConditions.length > 0 ? and(...empConditions) : undefined);

    // 2. Financial Metrics (Restricted for HR_MANAGER per BR-002)
    const isHrManager = userRole === 'HR_MANAGER';
    let financialMetrics = {
        totalNetPaid: '0.00',
        totalGross: '0.00',
        totalDeductions: '0.00',
        payslipsGenerated: 0,
        averageNetSalary: '0.00',
        payrollAccessRestricted: isHrManager,
    };

    if (!isHrManager) {
        const [finResult] = await db
            .select({
                totalNetPaid: sql`COALESCE(SUM(CASE WHEN ${payslips.status} IN ('VALIDATED', 'PAID') THEN CAST(${payslips.netAmount} AS NUMERIC) ELSE 0 END), 0.00)`,
                totalGross: sql`COALESCE(SUM(CAST(${payslips.grossAmount} AS NUMERIC)), 0.00)`,
                totalDeductions: sql`COALESCE(SUM(CAST(${payslips.deductionAmount} AS NUMERIC)), 0.00)`,
                payslipsGenerated: sql`COUNT(${payslips.id})`,
                averageNetSalary: sql`COALESCE(AVG(CASE WHEN ${payslips.status} IN ('VALIDATED', 'PAID') THEN CAST(${payslips.netAmount} AS NUMERIC) END), 0.00)`,
            })
            .from(payslips)
            .innerJoin(employees, eq(payslips.employeeId, employees.id))
            .where(payslipConditions.length > 0 ? and(...payslipConditions) : undefined);

        if (finResult) {
            financialMetrics = {
                totalNetPaid: Number(finResult.totalNetPaid || 0).toFixed(2),
                totalGross: Number(finResult.totalGross || 0).toFixed(2),
                totalDeductions: Number(finResult.totalDeductions || 0).toFixed(2),
                payslipsGenerated: Number(finResult.payslipsGenerated || 0),
                averageNetSalary: Number(finResult.averageNetSalary || 0).toFixed(2),
                payrollAccessRestricted: false,
            };
        }
    }

    // 3. Time Off Summary
    const [leaveResult] = await db
        .select({
            approvedDays: sql`COALESCE(SUM(CAST(${timeOffRequests.numberOfDays} AS NUMERIC)), 0.00)`,
            pendingRequestsCount: sql`COUNT(CASE WHEN ${timeOffRequests.status} = 'PENDING' THEN 1 END)`,
        })
        .from(timeOffRequests)
        .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
        .where(timeOffConditions.length > 0 ? and(...timeOffConditions) : undefined);

    // 4. Attendance Health
    const [attResult] = await db
        .select({
            totalRecords: sql`COUNT(${attendanceRecords.id})`,
            presentCount: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'PRESENT' THEN 1 END)`,
            lateCount: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'LATE' THEN 1 END)`,
            absentCount: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'ABSENT' THEN 1 END)`,
            missingCheckouts: sql`COUNT(CASE WHEN ${attendanceRecords.checkOutTime} IS NULL AND ${attendanceRecords.attendanceDate} < CURRENT_DATE THEN 1 END)`,
        })
        .from(attendanceRecords)
        .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(attendanceConditions.length > 0 ? and(...attendanceConditions) : undefined);

    const totalAtt = Number(attResult?.totalRecords || 0);
    const presentAtt = Number(attResult?.presentCount || 0);
    const lateAtt = Number(attResult?.lateCount || 0);
    const attendanceHealthRate =
        totalAtt > 0 ? (((presentAtt + lateAtt) / totalAtt) * 100).toFixed(1) : '100.0';

    // 5. Payrun Batch Lifecycle Counts
    const [payrunCounts] = await db
        .select({
            totalPayruns: sql`COUNT(${payruns.id})`,
            draftPayruns: sql`COUNT(CASE WHEN ${payruns.status} = 'DRAFT' THEN 1 END)`,
            computedPayruns: sql`COUNT(CASE WHEN ${payruns.status} = 'COMPUTED' THEN 1 END)`,
            validatedPayruns: sql`COUNT(CASE WHEN ${payruns.status} = 'VALIDATED' THEN 1 END)`,
            paidPayruns: sql`COUNT(CASE WHEN ${payruns.status} = 'PAID' THEN 1 END)`,
        })
        .from(payruns);

    return {
        workforce: {
            totalEmployees: Number(headcountResult?.totalEmployees || 0),
            activeEmployees: Number(headcountResult?.activeEmployees || 0),
        },
        payroll: financialMetrics,
        timeOff: {
            approvedDays: Number(leaveResult?.approvedDays || 0).toFixed(1),
            pendingRequestsCount: Number(leaveResult?.pendingRequestsCount || 0),
        },
        attendance: {
            healthRate: `${attendanceHealthRate}%`,
            totalRecords: totalAtt,
            presentCount: presentAtt,
            lateCount: lateAtt,
            absentCount: Number(attResult?.absentCount || 0),
            missingCheckouts: Number(attResult?.missingCheckouts || 0),
        },
        payruns: {
            total: Number(payrunCounts?.totalPayruns || 0),
            draft: Number(payrunCounts?.draftPayruns || 0),
            computed: Number(payrunCounts?.computedPayruns || 0),
            validated: Number(payrunCounts?.validatedPayruns || 0),
            paid: Number(payrunCounts?.paidPayruns || 0),
        },
    };
}

/**
 * Personal summary for EMPLOYEE role
 */
async function getEmployeePersonalSummary({ employeeId, periodStart, periodEnd }) {
    // 1. Employee Profile & Active Contract
    const [emp] = await db
        .select({
            id: employees.id,
            employeeCode: employees.employeeCode,
            firstName: employees.firstName,
            lastName: employees.lastName,
            departmentName: departments.name,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(eq(employees.id, employeeId));

    const [activeContract] = await db
        .select({
            wage: contracts.wage,
            status: contracts.status,
            startDate: contracts.startDate,
            endDate: contracts.endDate,
        })
        .from(contracts)
        .where(and(eq(contracts.employeeId, employeeId), eq(contracts.status, 'ACTIVE')))
        .limit(1);

    // 2. Personal Payslips
    const payslipConditions = [eq(payslips.employeeId, employeeId)];
    if (periodStart) payslipConditions.push(gte(payslips.periodStart, periodStart));
    if (periodEnd) payslipConditions.push(lte(payslips.periodEnd, periodEnd));

    const [payslipStats] = await db
        .select({
            totalNetReceived: sql`COALESCE(SUM(CASE WHEN ${payslips.status} = 'PAID' THEN CAST(${payslips.netAmount} AS NUMERIC) ELSE 0 END), 0.00)`,
            lastNetSalary: sql`COALESCE((SELECT CAST(net_amount AS NUMERIC) FROM payslips WHERE employee_id = ${employeeId} ORDER BY period_end DESC LIMIT 1), 0.00)`,
            payslipsCount: sql`COUNT(${payslips.id})`,
        })
        .from(payslips)
        .where(and(...payslipConditions));

    // 3. Personal Time Off Balances
    const allocations = await db
        .select({
            typeCode: timeOffTypes.code,
            typeName: timeOffTypes.name,
            totalDays: timeOffAllocations.totalDays,
            usedDays: timeOffAllocations.usedDays,
            remainingDays: sql`CAST(${timeOffAllocations.totalDays} AS NUMERIC) - CAST(${timeOffAllocations.usedDays} AS NUMERIC)`,
        })
        .from(timeOffAllocations)
        .innerJoin(timeOffTypes, eq(timeOffAllocations.typeId, timeOffTypes.id))
        .where(
            and(
                eq(timeOffAllocations.employeeId, employeeId),
                eq(timeOffAllocations.status, 'APPROVED'),
            ),
        );

    // 4. Personal Attendance
    const attConditions = [eq(attendanceRecords.employeeId, employeeId)];
    if (periodStart) attConditions.push(gte(attendanceRecords.attendanceDate, periodStart));
    if (periodEnd) attConditions.push(lte(attendanceRecords.attendanceDate, periodEnd));

    const [attStats] = await db
        .select({
            totalDays: sql`COUNT(${attendanceRecords.id})`,
            presentDays: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'PRESENT' THEN 1 END)`,
            lateDays: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'LATE' THEN 1 END)`,
            absentDays: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'ABSENT' THEN 1 END)`,
            totalHoursWorked: sql`COALESCE(SUM(CAST(${attendanceRecords.workedHours} AS NUMERIC)), 0.00)`,
        })
        .from(attendanceRecords)
        .where(and(...attConditions));

    return {
        employee: emp,
        contract: activeContract || null,
        payroll: {
            contractMonthlyWage: activeContract?.wage || '0.00',
            totalNetReceived: Number(payslipStats?.totalNetReceived || 0).toFixed(2),
            lastNetSalary: Number(payslipStats?.lastNetSalary || 0).toFixed(2),
            payslipsCount: Number(payslipStats?.payslipsCount || 0),
        },
        timeOff: {
            allocations: allocations.map((a) => ({
                code: a.typeCode,
                name: a.typeName,
                total: Number(a.totalDays).toFixed(1),
                used: Number(a.usedDays).toFixed(1),
                remaining: Number(a.remainingDays).toFixed(1),
            })),
        },
        attendance: {
            totalDays: Number(attStats?.totalDays || 0),
            presentDays: Number(attStats?.presentDays || 0),
            lateDays: Number(attStats?.lateDays || 0),
            absentDays: Number(attStats?.absentDays || 0),
            totalHoursWorked: Number(attStats?.totalHoursWorked || 0).toFixed(1),
        },
    };
}

/**
 * 2. GET SALARY COST BY DEPARTMENT
 */
export async function getSalaryByDepartment({
    periodStart,
    periodEnd,
    departmentId,
    employeeType,
} = {}) {
    const conditions = [eq(departments.isActive, true)];
    if (departmentId) {
        conditions.push(eq(departments.id, departmentId));
    }

    const payslipFilterSql = [];
    if (periodStart) payslipFilterSql.push(sql`p.period_start >= ${periodStart}`);
    if (periodEnd) payslipFilterSql.push(sql`p.period_end <= ${periodEnd}`);

    const payslipWhereClause =
        payslipFilterSql.length > 0 ? sql`WHERE ${sql.join(payslipFilterSql, sql` AND `)}` : sql``;

    // Aggregate payslip expenditure joined with department; fallback to active contract wages if no payslips yet
    const result = await db
        .select({
            departmentId: departments.id,
            departmentName: departments.name,
            departmentCode: departments.code,
            employeeCount: sql`COUNT(DISTINCT ${employees.id})`,
            totalGross: sql`COALESCE((
                SELECT SUM(CAST(p.gross_amount AS NUMERIC))
                FROM payslips p
                INNER JOIN employees e ON p.employee_id = e.id
                ${payslipWhereClause}
                ${payslipFilterSql.length > 0 ? sql`AND` : sql`WHERE`} e.department_id = ${departments.id}
            ), 0.00)`,
            totalNet: sql`COALESCE((
                SELECT SUM(CAST(p.net_amount AS NUMERIC))
                FROM payslips p
                INNER JOIN employees e ON p.employee_id = e.id
                ${payslipWhereClause}
                ${payslipFilterSql.length > 0 ? sql`AND` : sql`WHERE`} e.department_id = ${departments.id}
            ), 0.00)`,
            totalBudgetedWage: sql`COALESCE((
                SELECT SUM(CAST(c.wage AS NUMERIC))
                FROM contracts c
                INNER JOIN employees e ON c.employee_id = e.id
                WHERE e.department_id = ${departments.id} AND c.status = 'ACTIVE'
            ), 0.00)`,
        })
        .from(departments)
        .leftJoin(
            employees,
            and(eq(employees.departmentId, departments.id), eq(employees.isActive, true)),
        )
        .where(and(...conditions))
        .groupBy(departments.id, departments.name, departments.code)
        .orderBy(asc(departments.name));

    // Calculate total spend across departments for percentage distribution
    const grandTotalNet = result.reduce((acc, row) => acc + Number(row.totalNet || 0), 0);
    const grandBudget = result.reduce((acc, row) => acc + Number(row.totalBudgetedWage || 0), 0);

    return result
        .map((row) => {
            const net = Number(row.totalNet || 0);
            const budget = Number(row.totalBudgetedWage || 0);
            const effectiveAmount = grandTotalNet > 0 ? net : budget;
            const denominator =
                grandTotalNet > 0 ? grandTotalNet : grandBudget > 0 ? grandBudget : 1;
            const percentage = ((effectiveAmount / denominator) * 100).toFixed(1);

            return {
                departmentId: row.departmentId,
                name: row.departmentName,
                code: row.departmentCode,
                employeeCount: Number(row.employeeCount || 0),
                totalGross: Number(row.totalGross || 0).toFixed(2),
                totalNet: net.toFixed(2),
                totalBudgetedWage: budget.toFixed(2),
                percentage: `${percentage}%`,
            };
        })
        .sort((a, b) => Number(b.totalNet) - Number(a.totalNet));
}

/**
 * 3. GET MONTHLY NET SALARY TRENDS
 */
export async function getNetSalaryTrends({
    periodStart,
    periodEnd,
    departmentId,
    employeeType,
    monthsBack = 6,
} = {}) {
    const conditions = [];

    if (departmentId) {
        conditions.push(eq(employees.departmentId, departmentId));
    }
    if (periodStart) {
        conditions.push(gte(payslips.periodStart, periodStart));
    }
    if (periodEnd) {
        conditions.push(lte(payslips.periodEnd, periodEnd));
    }

    // Live query aggregating payslips by month
    const trendResults = await db
        .select({
            monthKey: sql`TO_CHAR(${payslips.periodStart}, 'YYYY-MM')`,
            periodLabel: sql`TO_CHAR(${payslips.periodStart}, 'Mon YYYY')`,
            totalNet: sql`COALESCE(SUM(CAST(${payslips.netAmount} AS NUMERIC)), 0.00)`,
            totalGross: sql`COALESCE(SUM(CAST(${payslips.grossAmount} AS NUMERIC)), 0.00)`,
            totalDeductions: sql`COALESCE(SUM(CAST(${payslips.deductionAmount} AS NUMERIC)), 0.00)`,
            payslipCount: sql`COUNT(${payslips.id})`,
        })
        .from(payslips)
        .innerJoin(employees, eq(payslips.employeeId, employees.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(
            sql`TO_CHAR(${payslips.periodStart}, 'YYYY-MM')`,
            sql`TO_CHAR(${payslips.periodStart}, 'Mon YYYY')`,
        )
        .orderBy(asc(sql`TO_CHAR(${payslips.periodStart}, 'YYYY-MM')`));

    // If payslips are present, return them
    if (trendResults.length > 0) {
        return trendResults.map((r) => ({
            month: r.monthKey,
            label: r.periodLabel,
            netSalary: Number(r.totalNet).toFixed(2),
            grossSalary: Number(r.totalGross).toFixed(2),
            deductions: Number(r.totalDeductions).toFixed(2),
            payslipCount: Number(r.payslipCount),
        }));
    }

    // Otherwise, generate recent months trend showing monthly active contract wage commitment
    const [activeWageResult] = await db
        .select({
            totalActiveWage: sql`COALESCE(SUM(CAST(${contracts.wage} AS NUMERIC)), 0.00)`,
            activeEmployees: sql`COUNT(DISTINCT ${contracts.employeeId})`,
        })
        .from(contracts)
        .innerJoin(employees, eq(contracts.employeeId, employees.id))
        .where(
            and(
                eq(contracts.status, 'ACTIVE'),
                departmentId ? eq(employees.departmentId, departmentId) : undefined,
            ),
        );

    const baseWage = Number(activeWageResult?.totalActiveWage || 0);
    const empCount = Number(activeWageResult?.activeEmployees || 0);

    const now = new Date();
    const fallbackSeries = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        fallbackSeries.push({
            month: monthKey,
            label,
            netSalary: (baseWage * 0.85).toFixed(2), // Estimated net after taxes
            grossSalary: baseWage.toFixed(2),
            deductions: (baseWage * 0.15).toFixed(2),
            payslipCount: empCount,
            isProjected: true,
        });
    }

    return fallbackSeries;
}

/**
 * 4. GET ATTENDANCE OVERVIEW & METRICS
 */
export async function getAttendanceMetrics({
    periodStart,
    periodEnd,
    departmentId,
    employeeType,
    userRole,
    employeeId,
} = {}) {
    const conditions = [];

    if (userRole === 'EMPLOYEE' && employeeId) {
        conditions.push(eq(attendanceRecords.employeeId, employeeId));
    } else if (departmentId) {
        conditions.push(eq(employees.departmentId, departmentId));
    }

    if (periodStart) {
        conditions.push(gte(attendanceRecords.attendanceDate, periodStart));
    }
    if (periodEnd) {
        conditions.push(lte(attendanceRecords.attendanceDate, periodEnd));
    }

    // KPI breakdown
    const [overview] = await db
        .select({
            totalRecords: sql`COUNT(${attendanceRecords.id})`,
            presentCount: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'PRESENT' THEN 1 END)`,
            lateCount: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'LATE' THEN 1 END)`,
            absentCount: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'ABSENT' THEN 1 END)`,
            halfDayCount: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'HALF_DAY' THEN 1 END)`,
            manualCorrections: sql`COUNT(CASE WHEN ${attendanceRecords.isManuallyCorrected} = true THEN 1 END)`,
            missingCheckouts: sql`COUNT(CASE WHEN ${attendanceRecords.checkOutTime} IS NULL AND ${attendanceRecords.attendanceDate} < CURRENT_DATE THEN 1 END)`,
            totalHours: sql`COALESCE(SUM(CAST(${attendanceRecords.workedHours} AS NUMERIC)), 0.00)`,
            avgHours: sql`COALESCE(AVG(CAST(${attendanceRecords.workedHours} AS NUMERIC)), 0.00)`,
        })
        .from(attendanceRecords)
        .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Daily breakdown for charts (past 14 days)
    const dailyBreakdown = await db
        .select({
            date: attendanceRecords.attendanceDate,
            present: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'PRESENT' THEN 1 END)`,
            late: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'LATE' THEN 1 END)`,
            absent: sql`COUNT(CASE WHEN ${attendanceRecords.status} = 'ABSENT' THEN 1 END)`,
            total: sql`COUNT(${attendanceRecords.id})`,
        })
        .from(attendanceRecords)
        .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(attendanceRecords.attendanceDate)
        .orderBy(desc(attendanceRecords.attendanceDate))
        .limit(14);

    const total = Number(overview?.totalRecords || 0);
    const present = Number(overview?.presentCount || 0);
    const late = Number(overview?.lateCount || 0);
    const attendanceCoverage = total > 0 ? (((present + late) / total) * 100).toFixed(1) : '100.0';

    return {
        summary: {
            totalRecords: total,
            presentCount: present,
            lateCount: late,
            absentCount: Number(overview?.absentCount || 0),
            halfDayCount: Number(overview?.halfDayCount || 0),
            manualCorrectionsCount: Number(overview?.manualCorrections || 0),
            missingCheckoutsCount: Number(overview?.missingCheckouts || 0),
            totalHoursWorked: Number(overview?.totalHours || 0).toFixed(1),
            averageHoursWorked: Number(overview?.avgHours || 0).toFixed(1),
            attendanceCoverageRate: `${attendanceCoverage}%`,
        },
        dailyTimeline: dailyBreakdown.reverse().map((d) => ({
            date: d.date,
            present: Number(d.present),
            late: Number(d.late),
            absent: Number(d.absent),
            total: Number(d.total),
        })),
    };
}

/**
 * 5. GET TIME OFF (LEAVE) METRICS
 */
export async function getTimeOffMetrics({
    periodStart,
    periodEnd,
    departmentId,
    employeeType,
    userRole,
    employeeId,
} = {}) {
    const conditions = [];

    if (userRole === 'EMPLOYEE' && employeeId) {
        conditions.push(eq(timeOffRequests.employeeId, employeeId));
    } else if (departmentId) {
        conditions.push(eq(employees.departmentId, departmentId));
    }

    if (periodStart) {
        conditions.push(gte(timeOffRequests.startDate, periodStart));
    }
    if (periodEnd) {
        conditions.push(lte(timeOffRequests.endDate, periodEnd));
    }

    // 1. Overall stats
    const [reqStats] = await db
        .select({
            totalRequests: sql`COUNT(${timeOffRequests.id})`,
            approvedDays: sql`COALESCE(SUM(CASE WHEN ${timeOffRequests.status} = 'APPROVED' THEN CAST(${timeOffRequests.numberOfDays} AS NUMERIC) ELSE 0 END), 0.00)`,
            pendingCount: sql`COUNT(CASE WHEN ${timeOffRequests.status} = 'PENDING' THEN 1 END)`,
            refusedCount: sql`COUNT(CASE WHEN ${timeOffRequests.status} = 'REFUSED' THEN 1 END)`,
            cancelledCount: sql`COUNT(CASE WHEN ${timeOffRequests.status} = 'CANCELLED' THEN 1 END)`,
        })
        .from(timeOffRequests)
        .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 2. Breakdown by Leave Type
    const typeBreakdown = await db
        .select({
            typeId: timeOffTypes.id,
            name: timeOffTypes.name,
            code: timeOffTypes.code,
            paidTimeOff: timeOffTypes.paidTimeOff,
            approvedDays: sql`COALESCE(SUM(CASE WHEN ${timeOffRequests.status} = 'APPROVED' THEN CAST(${timeOffRequests.numberOfDays} AS NUMERIC) ELSE 0 END), 0.00)`,
            requestsCount: sql`COUNT(${timeOffRequests.id})`,
        })
        .from(timeOffTypes)
        .leftJoin(
            timeOffRequests,
            and(
                eq(timeOffRequests.typeId, timeOffTypes.id),
                conditions.length > 0 ? and(...conditions) : undefined,
            ),
        )
        .where(eq(timeOffTypes.isActive, true))
        .groupBy(timeOffTypes.id, timeOffTypes.name, timeOffTypes.code, timeOffTypes.paidTimeOff)
        .orderBy(asc(timeOffTypes.name));

    // 3. Recent / Pending Requests List
    const recentRequests = await db
        .select({
            id: timeOffRequests.id,
            employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
            employeeCode: employees.employeeCode,
            typeName: timeOffTypes.name,
            typeCode: timeOffTypes.code,
            startDate: timeOffRequests.startDate,
            endDate: timeOffRequests.endDate,
            days: timeOffRequests.numberOfDays,
            status: timeOffRequests.status,
            reason: timeOffRequests.reason,
            createdAt: timeOffRequests.createdAt,
        })
        .from(timeOffRequests)
        .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
        .innerJoin(timeOffTypes, eq(timeOffRequests.typeId, timeOffTypes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(timeOffRequests.createdAt))
        .limit(6);

    return {
        summary: {
            totalRequests: Number(reqStats?.totalRequests || 0),
            approvedDays: Number(reqStats?.approvedDays || 0).toFixed(1),
            pendingCount: Number(reqStats?.pendingCount || 0),
            refusedCount: Number(reqStats?.refusedCount || 0),
            cancelledCount: Number(reqStats?.cancelledCount || 0),
        },
        byType: typeBreakdown.map((t) => ({
            id: t.typeId,
            name: t.name,
            code: t.code,
            paid: t.paidTimeOff,
            approvedDays: Number(t.approvedDays).toFixed(1),
            requestsCount: Number(t.requestsCount),
        })),
        recentRequests: recentRequests.map((r) => ({
            id: r.id,
            employee: r.employeeName,
            employeeCode: r.employeeCode,
            leaveType: r.typeName,
            leaveCode: r.typeCode,
            startDate: r.startDate,
            endDate: r.endDate,
            days: Number(r.days).toFixed(1),
            status: r.status,
            reason: r.reason,
            createdAt: r.createdAt,
        })),
    };
}

/**
 * 6. GET DEPARTMENT MULTI-DOMAIN BREAKDOWN
 */
export async function getDepartmentBreakdown({
    periodStart,
    periodEnd,
    departmentId,
    employeeType,
} = {}) {
    const conditions = [eq(departments.isActive, true)];
    if (departmentId) {
        conditions.push(eq(departments.id, departmentId));
    }

    const deptRows = await db
        .select({
            departmentId: departments.id,
            name: departments.name,
            code: departments.code,
            description: departments.description,
            managerId: departments.managerId,
            managerFirstName: sql`mgr.first_name`,
            managerLastName: sql`mgr.last_name`,
            headcount: sql`COUNT(DISTINCT ${employees.id})`,
            activeHeadcount: sql`COUNT(DISTINCT CASE WHEN ${employees.status} = 'ACTIVE' THEN ${employees.id} END)`,
            totalContractWage: sql`COALESCE((
                SELECT SUM(CAST(c.wage AS NUMERIC))
                FROM contracts c
                INNER JOIN employees e ON c.employee_id = e.id
                WHERE e.department_id = ${departments.id} AND c.status = 'ACTIVE'
            ), 0.00)`,
            totalApprovedLeaveDays: sql`COALESCE((
                SELECT SUM(CAST(tor.number_of_days AS NUMERIC))
                FROM time_off_requests tor
                INNER JOIN employees e ON tor.employee_id = e.id
                WHERE e.department_id = ${departments.id} AND tor.status = 'APPROVED'
            ), 0.00)`,
            totalAttendanceRecords: sql`COALESCE((
                SELECT COUNT(ar.id)
                FROM attendance_records ar
                INNER JOIN employees e ON ar.employee_id = e.id
                WHERE e.department_id = ${departments.id}
            ), 0)`,
            presentAttendanceRecords: sql`COALESCE((
                SELECT COUNT(ar.id)
                FROM attendance_records ar
                INNER JOIN employees e ON ar.employee_id = e.id
                WHERE e.department_id = ${departments.id} AND ar.status IN ('PRESENT', 'LATE')
            ), 0)`,
        })
        .from(departments)
        .leftJoin(
            employees,
            and(eq(employees.departmentId, departments.id), eq(employees.isActive, true)),
        )
        .leftJoin(sql`employees mgr`, sql`${departments.managerId} = mgr.id`)
        .where(and(...conditions))
        .groupBy(
            departments.id,
            departments.name,
            departments.code,
            departments.description,
            departments.managerId,
            sql`mgr.first_name`,
            sql`mgr.last_name`,
        )
        .orderBy(asc(departments.name));

    return deptRows
        .map((d) => {
            const totalAtt = Number(d.totalAttendanceRecords || 0);
            const presentAtt = Number(d.presentAttendanceRecords || 0);
            const attRate = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : '100.0';
            const headcount = Number(d.headcount || 0);
            const wage = Number(d.totalContractWage || 0);
            const avgSalary = headcount > 0 ? (wage / headcount).toFixed(2) : '0.00';

            return {
                id: d.departmentId,
                name: d.name,
                code: d.code,
                description: d.description,
                manager: d.managerFirstName
                    ? `${d.managerFirstName} ${d.managerLastName}`.trim()
                    : 'Unassigned',
                headcount,
                activeHeadcount: Number(d.activeHeadcount || 0),
                totalWageExpense: wage.toFixed(2),
                averageSalary: avgSalary,
                attendanceRate: `${attRate}%`,
                leaveDaysTaken: Number(d.totalApprovedLeaveDays || 0).toFixed(1),
            };
        })
        .sort((a, b) => b.headcount - a.headcount);
}

/**
 * 7. GET LIVE OPERATIONAL ALERTS ACROSS MODULES
 */
export async function getDashboardAlerts({ departmentId, userRole, employeeId } = {}) {
    const alerts = [];

    // A. PAYROLL ALERTS (Draft and Computed payruns needing action)
    if (userRole !== 'HR_MANAGER' && userRole !== 'EMPLOYEE') {
        const pendingPayruns = await db
            .select({
                id: payruns.id,
                name: payruns.name,
                status: payruns.status,
                periodStart: payruns.periodStart,
                periodEnd: payruns.periodEnd,
                totalEmployees: payruns.totalEmployees,
            })
            .from(payruns)
            .where(inArray(payruns.status, ['DRAFT', 'COMPUTED']))
            .orderBy(desc(payruns.createdAt))
            .limit(5);

        for (const pr of pendingPayruns) {
            if (pr.status === 'DRAFT') {
                alerts.push({
                    id: `payrun-draft-${pr.id}`,
                    module: 'PAYROLL',
                    severity: 'INFO',
                    title: 'Payrun in Draft',
                    message: `Payrun "${pr.name}" (${pr.periodStart} to ${pr.periodEnd}) has ${pr.totalEmployees} employee(s) and is pending calculation.`,
                    actionLink: `/dashboard/admin/payruns/${pr.id}`,
                });
            } else if (pr.status === 'COMPUTED') {
                alerts.push({
                    id: `payrun-computed-${pr.id}`,
                    module: 'PAYROLL',
                    severity: 'WARNING',
                    title: 'Payrun Awaiting Validation',
                    message: `Payrun "${pr.name}" is calculated. Please review warnings and perform validation gate before disbursing.`,
                    actionLink: `/dashboard/admin/payruns/${pr.id}`,
                });
            }
        }
    }

    // B. COMPLIANCE ALERTS (Active employees missing active primary bank accounts)
    const empConditions = [eq(employees.isActive, true), eq(employees.status, 'ACTIVE')];
    if (departmentId) empConditions.push(eq(employees.departmentId, departmentId));

    const empsMissingBank = await db
        .select({
            id: employees.id,
            employeeCode: employees.employeeCode,
            fullName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        })
        .from(employees)
        .leftJoin(
            bankAccounts,
            and(
                eq(bankAccounts.employeeId, employees.id),
                eq(bankAccounts.isPrimary, true),
                eq(bankAccounts.isActive, true),
            ),
        )
        .where(and(...empConditions, isNull(bankAccounts.id)))
        .limit(10);

    for (const emp of empsMissingBank) {
        alerts.push({
            id: `missing-bank-${emp.id}`,
            module: 'COMPLIANCE',
            severity: 'BLOCKER',
            title: 'Missing Bank Details',
            message: `Employee ${emp.fullName} (${emp.employeeCode}) has no active primary bank account. Direct deposit and payslips will be blocked.`,
            actionLink: `/dashboard/admin/employees/${emp.id}`,
        });
    }

    // C. CONTRACT ALERTS (Active employees without an active contract, or contracts expiring within 30 days)
    const empsWithoutContract = await db
        .select({
            id: employees.id,
            employeeCode: employees.employeeCode,
            fullName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        })
        .from(employees)
        .leftJoin(
            contracts,
            and(eq(contracts.employeeId, employees.id), eq(contracts.status, 'ACTIVE')),
        )
        .where(and(...empConditions, isNull(contracts.id)))
        .limit(10);

    for (const emp of empsWithoutContract) {
        alerts.push({
            id: `missing-contract-${emp.id}`,
            module: 'CONTRACT',
            severity: 'BLOCKER',
            title: 'No Active Contract',
            message: `Employee ${emp.fullName} (${emp.employeeCode}) has no active contract. Period wages cannot be calculated.`,
            actionLink: `/dashboard/admin/contracts/new?employeeId=${emp.id}`,
        });
    }

    // Expiring contracts (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    const expiringContracts = await db
        .select({
            contractId: contracts.id,
            endDate: contracts.endDate,
            employeeName: sql`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
            employeeCode: employees.employeeCode,
        })
        .from(contracts)
        .innerJoin(employees, eq(contracts.employeeId, employees.id))
        .where(
            and(
                eq(contracts.status, 'ACTIVE'),
                gte(contracts.endDate, todayStr),
                lte(contracts.endDate, thirtyDaysStr),
                departmentId ? eq(employees.departmentId, departmentId) : undefined,
            ),
        )
        .limit(10);

    for (const c of expiringContracts) {
        alerts.push({
            id: `expiring-contract-${c.contractId}`,
            module: 'CONTRACT',
            severity: 'WARNING',
            title: 'Contract Expiring Soon',
            message: `Contract for ${c.employeeName} (${c.employeeCode}) expires on ${c.endDate}. Review or renew to prevent payroll stoppage.`,
            actionLink: `/dashboard/admin/contracts/${c.contractId}`,
        });
    }

    // D. ATTENDANCE ALERTS (Missing check-outs on past dates)
    const [missingCheckoutCount] = await db
        .select({
            count: sql`COUNT(${attendanceRecords.id})`,
        })
        .from(attendanceRecords)
        .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
        .where(
            and(
                isNull(attendanceRecords.checkOutTime),
                sql`${attendanceRecords.attendanceDate} < CURRENT_DATE`,
                departmentId ? eq(employees.departmentId, departmentId) : undefined,
            ),
        );

    const openShiftCount = Number(missingCheckoutCount?.count || 0);
    if (openShiftCount > 0) {
        alerts.push({
            id: 'attendance-missing-checkouts',
            module: 'ATTENDANCE',
            severity: 'WARNING',
            title: 'Unclosed Attendance Shifts',
            message: `${openShiftCount} attendance log(s) have check-in punches with missing check-outs from past workdays. Manual correction needed.`,
            actionLink: '/dashboard/admin/attendance',
        });
    }

    // E. TIME OFF ALERTS (Pending leave requests requiring approval)
    const [pendingLeaves] = await db
        .select({
            count: sql`COUNT(${timeOffRequests.id})`,
        })
        .from(timeOffRequests)
        .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
        .where(
            and(
                eq(timeOffRequests.status, 'PENDING'),
                departmentId ? eq(employees.departmentId, departmentId) : undefined,
            ),
        );

    const pendingCount = Number(pendingLeaves?.count || 0);
    if (pendingCount > 0) {
        alerts.push({
            id: 'time-off-pending-approvals',
            module: 'TIME_OFF',
            severity: 'INFO',
            title: 'Pending Leave Requests',
            message: `${pendingCount} leave request(s) are awaiting review and approval by HR/Manager.`,
            actionLink: '/dashboard/admin/time-off',
        });
    }

    return alerts;
}
