import { Users } from 'lucide-react';
import { UsersProvider } from './context/users.context';
import UserManagement from './UserManagement/UserManagement';

export default {
    // Multi-Role RBAC: specify which roles can access this feature
    allowedRoles: ['ADMIN'],

    // Sidebar navigation metadata
    navItem: {
        label: 'Users',
        path: '/dashboard/admin/users',
        icon: <Users size={18} />,
        roles: ['ADMIN'],
    },

    // Feature routes auto-discovered by routes.loader.jsx
    routes: [
        {
            path: 'users',
            element: (
                <UsersProvider>
                    <UserManagement />
                </UsersProvider>
            ),
        },
    ],
};
