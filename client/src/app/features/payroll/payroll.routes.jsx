import { Banknote } from 'lucide-react';
import { PayrollProvider } from './context/payroll.context';
import PayrunsListPage from './pages/PayrunsListPage/PayrunsListPage';
import PayrunDetailPage from './pages/PayrunDetailPage/PayrunDetailPage';

export default {
    // Multi-Role RBAC: roles authorized to access Payroll feature
    allowedRoles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],

    // Navigation Metadata for the Sidebar and Topbar Breadcrumbs
    navItem: {
        label: 'Payroll',
        path: '/dashboard/user/payroll/payruns',
        icon: <Banknote size={18} />,
        roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
        subTabs: ['Payruns'],
    },

    // Auto-discovered Feature Routes
    routes: [
        {
            path: 'payroll/payruns',
            element: (
                <PayrollProvider>
                    <PayrunsListPage />
                </PayrollProvider>
            ),
        },
        {
            path: 'payroll/payruns/:id',
            element: (
                <PayrollProvider>
                    <PayrunDetailPage />
                </PayrollProvider>
            ),
        },
    ],
};
