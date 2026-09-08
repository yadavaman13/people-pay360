import { CalendarClock } from 'lucide-react';
import { SchedulesProvider } from './context/schedules.context';
import SchedulesListPage from './pages/SchedulesListPage/SchedulesListPage';
import ScheduleDetailPage from './pages/ScheduleDetailPage/ScheduleDetailPage';

/**
 * Working Schedules Feature Routes
 *
 * Route Strategy:
 *  - `employeeRoutes`: Injected under /dashboard/employee/ — all authenticated users
 *    (Employees see read-only list + detail; no create/edit/delete UI shown)
 *
 *  - `hrRoutes`: Injected under /dashboard/hr/ — HR_MANAGER, HR_PAYROLL_MANAGER, ADMIN
 *    (Full CRUD: create, edit metadata, replace shift lines, deactivate)
 *
 *  Both route sets share the same page components; RBAC gating is done inside the
 *  pages via `useAuth()` + `canManage` flag, matching the pattern used in
 *  AttendancePage and EmployeesPage.
 *
 *  The `navItem` is registered under both /employee and /hr paths so the sidebar
 *  correctly highlights "Working Schedule" for all roles.
 */

const scheduleRouteElements = [
    {
        path: 'schedules',
        element: (
            <SchedulesProvider>
                <SchedulesListPage />
            </SchedulesProvider>
        ),
    },
    {
        path: 'schedules/:id',
        element: (
            <SchedulesProvider>
                <ScheduleDetailPage />
            </SchedulesProvider>
        ),
    },
];

export default {
    // ── Employee routes: /dashboard/employee/schedules ───────────────────
    employeeRoutes: scheduleRouteElements,

    // ── HR routes: /dashboard/hr/schedules ──────────────────────────────
    hrRoutes: scheduleRouteElements,

    // ── Admin routes: /dashboard/admin/schedules ─────────────────────────
    adminRoutes: scheduleRouteElements,

    // ── Sidebar nav item (appears for HR/Admin roles in sidebar) ─────────
    navItem: [
        {
            label: 'Working Schedule',
            path: '/dashboard/employee/schedules',
            icon: <CalendarClock size={18} />,
            roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'],
        },
        {
            label: 'Working Schedule',
            path: '/dashboard/hr/schedules',
            icon: <CalendarClock size={18} />,
            roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
        },
    ],
};
