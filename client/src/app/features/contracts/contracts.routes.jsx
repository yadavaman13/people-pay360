import { Outlet } from 'react-router';
import { FileText } from 'lucide-react';
import ProtectedRoute from '@/app/features/auth/components/ProtectedRoute';
import { ContractProvider } from './context/ContractContext';
import ContractsListPage from './pages/ContractsListPage';
import ContractFormPage from './pages/ContractFormPage';
import ContractDetailPage from './pages/ContractDetailPage';

export default {
    // Multi-Role RBAC: specify which roles can access this feature
    allowedRoles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],

    // Navigation metadata for Sidebar and Topbar Breadcrumbs
    navItem: {
        label: 'Contracts',
        path: '/dashboard/employee/contracts',
        icon: <FileText size={18} />,
        roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
    },

    // Feature routes auto-discovered by routes.loader.jsx
    routes: [
        {
            path: 'contracts',
            element: (
                <ContractProvider>
                    <Outlet />
                </ContractProvider>
            ),
            children: [
                {
                    index: true,
                    element: <ContractsListPage />,
                },
                {
                    path: 'new',
                    element: (
                        <ProtectedRoute
                            allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER']}
                        >
                            <ContractFormPage mode="create" />
                        </ProtectedRoute>
                    ),
                },
                {
                    path: ':id',
                    element: <ContractDetailPage />,
                },
                {
                    path: ':id/edit',
                    element: (
                        <ProtectedRoute
                            allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER']}
                        >
                            <ContractFormPage mode="edit" />
                        </ProtectedRoute>
                    ),
                },
            ],
        },
    ],
};
