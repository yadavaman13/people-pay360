import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import App from './App';
import { loadFeatureRoutes } from './routes.loader';

// Auto-discover all *.routes.jsx across all feature modules
const { userRoutes, adminRoutes, publicRoutes } = loadFeatureRoutes();

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
                path: '*',
                element: <Navigate to="/login" replace />,
            },
        ],
    },
]);
