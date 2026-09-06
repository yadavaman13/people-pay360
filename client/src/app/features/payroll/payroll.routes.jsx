import { Banknote } from 'lucide-react';
import { Navigate } from 'react-router';
import { PayrollProvider } from './context/payroll.context';
import PayrunsListPage from './pages/PayrunsListPage/PayrunsListPage';
import PayrunDetailPage from './pages/PayrunDetailPage/PayrunDetailPage';
import PayslipsListPage from './pages/PayslipsListPage/PayslipsListPage';
import PayslipDetailPage from './pages/PayslipDetailPage/PayslipDetailPage';
import SalaryStructuresListPage from './pages/SalaryStructuresListPage/SalaryStructuresListPage';
import SalaryStructureDetailPage from './pages/SalaryStructureDetailPage/SalaryStructureDetailPage';
import SalaryRulesListPage from './pages/SalaryRulesListPage/SalaryRulesListPage';
import SalaryRuleDetailPage from './pages/SalaryRuleDetailPage/SalaryRuleDetailPage';

export default {
    // Multi-Role RBAC: roles authorized to access Payroll feature
    allowedRoles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],

    // Navigation Metadata for the Sidebar and Topbar Breadcrumbs
    navItem: {
        label: 'Payroll',
        path: '/dashboard/employee/payroll/payruns',
        icon: <Banknote size={18} />,
        roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'],
        subTabs: ['Payruns', 'Payslips', 'Salary Structures', 'Salary Rules'],
    },

    // Auto-discovered Feature Routes
    routes: [
        {
            path: 'payroll',
            element: <Navigate to="payruns" replace />,
        },
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
        {
            path: 'payroll/salary-structures',
            element: (
                <PayrollProvider>
                    <SalaryStructuresListPage />
                </PayrollProvider>
            ),
        },
        {
            path: 'payroll/salary-structures/:id',
            element: (
                <PayrollProvider>
                    <SalaryStructureDetailPage />
                </PayrollProvider>
            ),
        },
        {
            path: 'payroll/salary-rules',
            element: (
                <PayrollProvider>
                    <SalaryRulesListPage />
                </PayrollProvider>
            ),
        },
        {
            path: 'payroll/salary-rules/new',
            element: (
                <PayrollProvider>
                    <SalaryRuleDetailPage />
                </PayrollProvider>
            ),
        },
        {
            path: 'payroll/salary-rules/:id',
            element: (
                <PayrollProvider>
                    <SalaryRuleDetailPage />
                </PayrollProvider>
            ),
        },
    ],
};
