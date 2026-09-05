import { Navigate } from 'react-router';
import { useAuth } from '@/app/features/auth/hooks/useAuth';

export default function DashboardIndex() {
    const { user } = useAuth();
    const roleUpper = (user?.role || '').toUpperCase();
    if (roleUpper === 'ADMIN') {
        return <Navigate to="admin" replace />;
    }
    if (['HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(roleUpper)) {
        return <Navigate to="hr" replace />;
    }
    return <Navigate to="user" replace />;
}
