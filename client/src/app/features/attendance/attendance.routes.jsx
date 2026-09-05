import { AttendanceProvider } from './context/attendance.context';
import AttendancePage from './pages/AttendancePage';
import AttendanceDetailPage from './pages/AttendanceDetailPage';

const employeeRoutes = [
    {
        path: 'attendance',
        children: [
            {
                index: true,
                element: (
                    <AttendanceProvider>
                        <AttendancePage mode="self" />
                    </AttendanceProvider>
                ),
            },
            {
                path: 'my-attendance',
                children: [
                    {
                        index: true,
                        element: (
                            <AttendanceProvider>
                                <AttendancePage mode="self" />
                            </AttendanceProvider>
                        ),
                    },
                    {
                        path: ':id',
                        element: (
                            <AttendanceProvider>
                                <AttendanceDetailPage />
                            </AttendanceProvider>
                        ),
                    },
                ],
            },
            {
                path: ':id',
                element: (
                    <AttendanceProvider>
                        <AttendanceDetailPage />
                    </AttendanceProvider>
                ),
            },
        ],
    },
];

const hrRoutes = [
    {
        path: 'attendance',
        children: [
            {
                index: true,
                element: (
                    <AttendanceProvider>
                        <AttendancePage mode="self" />
                    </AttendanceProvider>
                ),
            },
            {
                path: 'my-attendance',
                children: [
                    {
                        index: true,
                        element: (
                            <AttendanceProvider>
                                <AttendancePage mode="self" />
                            </AttendanceProvider>
                        ),
                    },
                    {
                        path: ':id',
                        element: (
                            <AttendanceProvider>
                                <AttendanceDetailPage />
                            </AttendanceProvider>
                        ),
                    },
                ],
            },
            {
                path: 'employees-attendance',
                children: [
                    {
                        index: true,
                        element: (
                            <AttendanceProvider>
                                <AttendancePage mode="employees" />
                            </AttendanceProvider>
                        ),
                    },
                    {
                        path: ':id',
                        element: (
                            <AttendanceProvider>
                                <AttendanceDetailPage />
                            </AttendanceProvider>
                        ),
                    },
                ],
            },
            {
                path: ':id',
                element: (
                    <AttendanceProvider>
                        <AttendanceDetailPage />
                    </AttendanceProvider>
                ),
            },
        ],
    },
];

const adminRoutes = [
    {
        path: 'attendance',
        children: [
            {
                index: true,
                element: (
                    <AttendanceProvider>
                        <AttendancePage mode="employees" />
                    </AttendanceProvider>
                ),
            },
            {
                path: 'employees-attendance',
                children: [
                    {
                        index: true,
                        element: (
                            <AttendanceProvider>
                                <AttendancePage mode="employees" />
                            </AttendanceProvider>
                        ),
                    },
                    {
                        path: ':id',
                        element: (
                            <AttendanceProvider>
                                <AttendanceDetailPage />
                            </AttendanceProvider>
                        ),
                    },
                ],
            },
            {
                path: ':id',
                element: (
                    <AttendanceProvider>
                        <AttendanceDetailPage />
                    </AttendanceProvider>
                ),
            },
        ],
    },
];

export default {
    userRoutes: employeeRoutes,
    hrRoutes,
    adminRoutes,
    navItem: [
        {
            label: 'Attendance',
            path: '/dashboard/user/attendance',
            icon: 'Clock',
            roles: ['EMPLOYEE'],
        },
        {
            label: 'Attendance',
            path: '/dashboard/hr/attendance',
            subTabs: ['My Attendance', 'Employees Attendance'],
            icon: 'Clock',
            roles: ['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
        },
        {
            label: 'Attendance',
            path: '/dashboard/admin/attendance',
            subTabs: ['Employees Attendance'],
            icon: 'Clock',
            roles: ['ADMIN'],
        },
    ],
};
