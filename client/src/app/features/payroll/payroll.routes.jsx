import { Banknote } from 'lucide-react';
import { PayrollProvider } from './context/payroll.context';
import PayrunsListPage from './pages/PayrunsListPage/PayrunsListPage';
import PayrunDetailPage from './pages/PayrunDetailPage/PayrunDetailPage';
import PayslipsListPage from './pages/PayslipsListPage/PayslipsListPage';
import PayslipDetailPage from './pages/PayslipDetailPage/PayslipDetailPage';

export default {
    // Multi-Role RBAC: roles authorized to access Payroll feature
    allowedRoles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],

    // Navigation Metadata for the Sidebar and Topbar Breadcrumbs
    navItem: {
        label: 'Payroll',
        path: '/dashboard/user/payroll/payruns',
        icon: <Banknote size={18} />,
        roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
        subTabs: ['Payruns', 'Payslips'],
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
        {
            path: 'payroll/payslips',
            element: (
                <PayrollProvider>
                    <PayslipsListPage />
                </PayrollProvider>
            ),
        },
        {
            path: 'payroll/payslips/:id',
            element: (
                <PayrollProvider>
                    <PayslipDetailPage />
                </PayrollProvider>
            ),
        },
    ],
};
