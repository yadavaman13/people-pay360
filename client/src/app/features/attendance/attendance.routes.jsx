import { Outlet } from 'react-router';
import { Clock } from 'lucide-react';
import ProtectedRoute from '@/app/features/auth/components/ProtectedRoute';
import { AttendanceProvider } from './context/attendance.context';
import AttendancePage from './pages/AttendancePage';
import AttendanceDetailPage from './pages/AttendanceDetailPage';

export default {
    // Multi-Role RBAC: specify which roles can access this feature
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'],

    // Sidebar navigation metadata tailored for each role segment
    navItem: [
        {
            label: 'Attendance',
            path: '/dashboard/employee/attendance',
            icon: <Clock size={18} />,
            roles: ['EMPLOYEE'],
        },
        {
            label: 'Attendance',
            path: '/dashboard/hr/attendance',
            subTabs: ['My Attendance', 'Employees Attendance'],
            icon: <Clock size={18} />,
            roles: ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
        },
        {
            label: 'Attendance',
            path: '/dashboard/admin/attendance',
            subTabs: ['Employees Attendance'],
            icon: <Clock size={18} />,
            roles: ['ADMIN'],
        },
    ],

    // Unified Feature Routes auto-discovered by routes.loader.jsx
    routes: [
        {
            path: 'attendance',
            element: (
                <AttendanceProvider>
                    <Outlet />
                </AttendanceProvider>
            ),
            children: [
                {
                    index: true,
                    element: <AttendancePage />,
                },
                {
                    path: 'my-attendance',
                    children: [
                        {
                            index: true,
                            element: <AttendancePage mode="self" />,
                        },
                        {
                            path: ':id',
                            element: <AttendanceDetailPage />,
                        },
                    ],
                },
                {
                    path: 'employees-attendance',
                    element: (
                        <ProtectedRoute
                            allowedRoles={[
                                'ADMIN',
                                'HR_MANAGER',
                                'HR_PAYROLL_MANAGER',
                                'HR_PAYROLL_USER',
                            ]}
                        >
                            <Outlet />
                        </ProtectedRoute>
                    ),
                    children: [
                        {
                            index: true,
                            element: <AttendancePage mode="employees" />,
                        },
                        {
                            path: ':id',
                            element: <AttendanceDetailPage />,
                        },
                    ],
                },
                {
                    path: ':id',
                    element: <AttendanceDetailPage />,
                },
            ],
        },
    ],
};
