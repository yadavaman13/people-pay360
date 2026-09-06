import PayrollDashboardPage from './pages/PayrollDashboardPage';

export default {
    // Multi-Role RBAC: Home Dashboard insights are restricted to payroll managers/users and admin
    allowedRoles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],

    routes: [
        {
            path: 'home',
            element: <PayrollDashboardPage />,
        },
    ],
};
