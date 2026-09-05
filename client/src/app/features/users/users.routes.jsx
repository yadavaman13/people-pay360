import UserManagement from './UserManagement/UserManagement';

export default {
    navItem: {
        label: 'Users',
        path: '/dashboard/admin/users',
        roles: ['ADMIN'],
    },
    adminRoutes: [
        {
            path: 'users',
            element: <UserManagement />,
        },
    ],
};
