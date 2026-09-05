import PayrollDashboardPage from './pages/PayrollDashboardPage';

export default {
    userRoutes: [
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
