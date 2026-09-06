import { Navigate, Outlet } from 'react-router';
import { CalendarOff } from 'lucide-react';
import ProtectedRoute from '@/app/features/auth/components/ProtectedRoute';
import { TimeOffProvider } from './context/time-off.context';

import TimeOffRequestsPage from './pages/Requests/TimeOffRequestsPage';
import NewTimeOffRequestPage from './pages/Requests/NewTimeOffRequestPage';
import TimeOffRequestDetailPage from './pages/Requests/TimeOffRequestDetailPage';

import AllocationsListPage from './pages/Allocations/AllocationsListPage';
import NewAllocationPage from './pages/Allocations/NewAllocationPage';
import AllocationDetailPage from './pages/Allocations/AllocationDetailPage';

import TimeOffTypesListPage from './pages/Types/TimeOffTypesListPage';
import NewTimeOffTypePage from './pages/Types/NewTimeOffTypePage';
import TimeOffTypeDetailPage from './pages/Types/TimeOffTypeDetailPage';

const HR_ADMIN_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'];

export default {
    // Multi-Role RBAC: specify all authorized roles for Time Off
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'],

    // Sidebar navigation metadata tailored by role segment
    navItem: [
        {
            label: 'Time Off',
            path: '/dashboard/employee/time-off/requests',
            icon: <CalendarOff size={18} />,
            roles: ['EMPLOYEE'],
            subTabs: ['Requests'],
        },
        {
            label: 'Time Off',
            path: '/dashboard/hr/time-off/requests',
            icon: <CalendarOff size={18} />,
            roles: ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
            subTabs: ['Requests', 'Allocations', 'Time Off Types'],
        },
        {
            label: 'Time Off',
            path: '/dashboard/admin/time-off/requests',
            icon: <CalendarOff size={18} />,
            roles: ['ADMIN'],
            subTabs: ['Requests', 'Allocations', 'Time Off Types'],
        },
    ],

    // Auto-discovered routes injected into layout by routes.loader.jsx
    routes: [
        {
            path: 'time-off',
            element: (
                <TimeOffProvider>
                    <Outlet />
                </TimeOffProvider>
            ),
            children: [
                {
                    index: true,
                    element: <Navigate to="requests" replace />,
                },
                // ── Requests Routes (Employee + HR + Admin) ──
                {
                    path: 'requests',
                    children: [
                        {
                            index: true,
                            element: <TimeOffRequestsPage />,
                        },
                        {
                            path: 'new',
                            element: <NewTimeOffRequestPage />,
                        },
                        {
                            path: ':id',
                            element: <TimeOffRequestDetailPage />,
                        },
                    ],
                },
                // ── Allocations Routes (HR + Admin Only) ──
                {
                    path: 'allocations',
                    element: (
                        <ProtectedRoute allowedRoles={HR_ADMIN_ROLES}>
                            <Outlet />
                        </ProtectedRoute>
                    ),
                    children: [
                        {
                            index: true,
                            element: <AllocationsListPage />,
                        },
                        {
                            path: 'new',
                            element: <NewAllocationPage />,
                        },
                        {
                            path: ':id',
                            element: <AllocationDetailPage />,
                        },
                    ],
                },
                // ── Time Off Types Routes (HR + Admin Only) ──
                {
                    path: 'types',
                    element: (
                        <ProtectedRoute allowedRoles={HR_ADMIN_ROLES}>
                            <Outlet />
                        </ProtectedRoute>
                    ),
                    children: [
                        {
                            index: true,
                            element: <TimeOffTypesListPage />,
                        },
                        {
                            path: 'new',
                            element: <NewTimeOffTypePage />,
                        },
                        {
                            path: ':id',
                            element: <TimeOffTypeDetailPage />,
                        },
                    ],
                },
                // Alias for subtab routing segment 'time-off-types' -> 'types'
                {
                    path: 'time-off-types',
                    element: <Navigate to="../types" replace />,
                },
            ],
        },
    ],
};
