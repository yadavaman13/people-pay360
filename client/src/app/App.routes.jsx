import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import App from './App';
import DashboardLayout from '@/app/features/dashboard/DashboardLayout/DashboardLayout';
import DashboardIndex from '@/app/features/dashboard/DashboardIndex';
import ProtectedRoute from '@/app/features/auth/components/ProtectedRoute';
import { loadFeatureRoutes } from './routes.loader';

// Auto-discover all *.routes.jsx across all feature modules
const {
    employeeRoutes = [],
    hrRoutes = [],
    adminRoutes = [],
    publicRoutes = [],
} = loadFeatureRoutes();

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            {
                index: true,
                element: <Navigate to="/login" replace />,
            },
            // Auto-discovered public feature routes (auth, showcase, etc.)
            ...publicRoutes,
            {
                path: 'dashboard',
                element: (
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                ),
                children: [
                    {
                        index: true,
                        element: <DashboardIndex />,
                    },
                    {
                        path: 'employee',
                        children: [
                            {
                                index: true,
                                element: <Navigate to="/dashboard/employee/home" replace />,
                            },
                            // Auto-discovered employee feature routes
                            ...employeeRoutes,
                            {
                                path: '*',
                                element: <Navigate to="/dashboard/employee/home" replace />,
                            },
                        ],
                    },
                    // Backward-compatibility redirect alias for any legacy links/bookmarks:
                    {
                        path: 'user/*',
                        element: <Navigate to="/dashboard/employee" replace />,
                    },
                    {
                        path: 'hr',
                        element: (
                            <ProtectedRoute
                                allowedRoles={[
                                    'HR_MANAGER',
                                    'HR_PAYROLL_MANAGER',
                                    'HR_PAYROLL_USER',
                                    'ADMIN',
                                ]}
                            >
                                <Outlet />
                            </ProtectedRoute>
                        ),
                        children: [
                            {
                                index: true,
                                element: <Navigate to="/dashboard/hr/attendance" replace />,
                            },
                            // Auto-discovered hr feature routes
                            ...hrRoutes,
                            {
                                path: '*',
                                element: <Navigate to="/dashboard/hr/attendance" replace />,
                            },
                        ],
                    },
                    {
                        path: 'admin',
                        element: (
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <Outlet />
                            </ProtectedRoute>
                        ),
                        children: [
                            {
                                index: true,
                                element: <Navigate to="/dashboard/admin/home" replace />,
                            },
                            // Auto-discovered admin feature routes
                            ...adminRoutes,
                            {
                                path: '*',
                                element: <Navigate to="/dashboard/admin/home" replace />,
                            },
                        ],
                    },
                ],
            },
            {
                path: '*',
                element: <Navigate to="/login" replace />,
            },
        ],
    },
]);
