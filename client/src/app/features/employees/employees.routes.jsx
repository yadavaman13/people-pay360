import { EmployeesProvider } from './context/employees.context';
import EmployeesPage from './pages/EmployeesPage/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage/EmployeeFormPage';

export default {
    // Multi-Role RBAC: specify which roles can access this feature
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],

    // Sidebar navigation metadata
    navItem: {
        label: 'Employees',
        path: '/dashboard/user/employees',
        roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
    },

    // Feature routes auto-discovered by routes.loader.jsx
    routes: [
        {
            path: 'employees',
            element: (
                <EmployeesProvider>
                    <EmployeesPage />
                </EmployeesProvider>
            ),
        },
        {
            path: 'employees/new',
            element: (
                <EmployeesProvider>
                    <EmployeeFormPage isNew={true} />
                </EmployeesProvider>
            ),
        },
        {
            path: 'employees/:id',
            element: (
                <EmployeesProvider>
                    <EmployeeFormPage />
                </EmployeesProvider>
            ),
        },
    ],
};
