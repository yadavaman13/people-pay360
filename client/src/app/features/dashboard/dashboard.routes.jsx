import PayrollDashboardPage from './pages/PayrollDashboardPage';

export default {
    employeeRoutes: [
        {
            path: 'home',
            element: <PayrollDashboardPage />,
        },
    ],
    adminRoutes: [
        {
            path: 'home',
            element: <PayrollDashboardPage />,
        },
    ],
};
