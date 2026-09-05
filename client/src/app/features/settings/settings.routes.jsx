import { Navigate } from 'react-router';
import GeneralSettings from './GeneralSettings';
import AccountSettings from './AccountSettings';

export default {
    // Multi-Role RBAC: accessible to all authenticated system roles
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER', 'EMPLOYEE'],

    // Feature routes auto-discovered by routes.loader.jsx
    routes: [
        {
            path: 'settings',
            children: [
                {
                    index: true,
                    element: <Navigate to="general" replace />,
                },
                {
                    path: 'general',
                    element: <GeneralSettings />,
                },
                {
                    path: 'account',
                    element: <AccountSettings />,
                },
            ],
        },
    ],
};
