export default {
    navItem: {
        label: 'Home',
        path: '/dashboard/user/home',
    },
    userRoutes: [
        {
            path: 'home',
            element: <div className="main-dashboard-placeholder">This is main dashboard</div>,
        },
    ],
    hrRoutes: [
        {
            path: 'home',
            element: <div className="main-dashboard-placeholder">This is HR dashboard</div>,
        },
    ],
    adminRoutes: [
        {
            path: 'home',
            element: <div className="main-dashboard-placeholder">This is Admin dashboard</div>,
        },
    ],
};
