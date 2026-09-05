import { Outlet } from 'react-router';
import { FileText } from 'lucide-react';
import { ContractProvider } from './context/ContractContext';
import ContractsListPage from './pages/ContractsListPage';
import ContractFormPage from './pages/ContractFormPage';
import ContractDetailPage from './pages/ContractDetailPage';
import ProtectedRoute from '@/app/features/auth/components/ProtectedRoute';

export default {
    navItem: {
        label: 'Contracts',
        path: '/dashboard/user/contracts',
        icon: FileText,
        roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
    },
    userRoutes: [
        {
            path: 'contracts',
            element: (
                <ProtectedRoute
                    allowedRoles={['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER']}
                >
                    <ContractProvider>
                        <Outlet />
                    </ContractProvider>
                </ProtectedRoute>
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
