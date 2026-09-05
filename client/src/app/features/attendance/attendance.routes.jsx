import { AttendanceProvider } from './context/attendance.context';
import AttendancePage from './pages/AttendancePage';
import AttendanceDetailPage from './pages/AttendanceDetailPage';

export default {
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'],
    navItem: {
        label: 'Attendance',
        path: '/dashboard/user/attendance',
        icon: 'Clock',
        roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'],
    },
    routes: [
        {
            path: 'attendance',
            element: (
                <AttendanceProvider>
                    <AttendancePage />
                </AttendanceProvider>
            ),
        },
        {
            path: 'attendance/:id',
            element: (
                <AttendanceProvider>
                    <AttendanceDetailPage />
                </AttendanceProvider>
            ),
        },
    ],
};
