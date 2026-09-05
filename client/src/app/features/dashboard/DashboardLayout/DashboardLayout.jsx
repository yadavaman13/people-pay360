import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import Sidebar from '@/components/Shared/Navigation/Sidebar/Sidebar';
import MainContent from './MainContent/MainContent';
import Topbar from '@/components/Shared/Navigation/Topbar/Topbar';
import Dialog from '@/components/Shared/Feedback/Dialog';
import { Drawer, NotificationFeed } from '@/components/Shared/Feedback/Drawer';
import { useAuth } from '../../auth/hooks/useAuth';
import { useDerivedProfile } from '../../auth/hooks/useDerivedProfile';
import {
    Home as HomeIcon,
    Users as UsersIcon,
    UserCheck as EmployeesIcon,
    Clock as ClockIcon,
    FileText as FileTextIcon,
} from 'lucide-react';
import { loadFeatureRoutes } from '@/app/routes.loader';
import './DashboardLayout.scss';

function DashboardLayout({ onLogout }) {
    const navigate = useNavigate();
    const { user, handleLogout } = useAuth();
    const derivedProfile = useDerivedProfile();

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebar-collapsed') === 'true';
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [windowWidth, setWindowWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1200,
    );
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isVisuallyCollapsed =
        windowWidth <= 600 ? false : windowWidth <= 900 ? true : isSidebarCollapsed;

    const roleSegment = user?.role?.toLowerCase() === 'admin' ? 'admin' : 'user';

    const { featureNavItems } = useMemo(() => loadFeatureRoutes(), []);

    const sidebarNavItems = useMemo(() => {
        const items = [
            {
                label: 'Home',
                icon: <HomeIcon size={18} />,
                path: `/dashboard/${roleSegment}/home`,
            },
        ];

        (featureNavItems || []).forEach((item) => {
            if (!item || !item.label) return;
            // Skip Home (handled as primary) and Settings (handled in footer profile card)
            if (item.label === 'Home' || item.label === 'Settings') return;

            // Avoid duplicates
            if (items.some((i) => i.label === item.label)) return;

            let itemIcon = item.icon;
            if (!itemIcon || typeof itemIcon === 'string') {
                if (item.label === 'Users' || item.icon === 'Users')
                    itemIcon = <UsersIcon size={18} />;
                else if (
                    item.label === 'Employees' ||
                    item.icon === 'UserCheck' ||
                    item.icon === 'Employees'
                )
                    itemIcon = <EmployeesIcon size={18} />;
                else if (item.label === 'Contracts' || item.icon === 'FileText')
                    itemIcon = <FileTextIcon size={18} />;
                else if (item.label === 'Attendance' || item.icon === 'Clock')
                    itemIcon = <ClockIcon size={18} />;
                else itemIcon = <UsersIcon size={18} />;
            }

            items.push({
                ...item,
                icon: itemIcon,
            });
        });

        return items;
    }, [featureNavItems, roleSegment]);

    const handleToggleSidebar = () => {
        setIsSidebarCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar-collapsed', String(next));
            return next;
        });
    };

    const handleLogoutTrigger = () => {
        setShowLogoutModal(true);
    };

    const handleConfirmLogout = async () => {
        setShowLogoutModal(false);
        try {
            await handleLogout();
        } catch (err) {
            console.error('Logout error:', err);
        }
        if (onLogout) {
            onLogout();
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="dashboard-layout-container">
            <div
                className={`sidebar-mobile-backdrop ${isMobileMenuOpen ? 'visible' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
            />
            <Sidebar
                isCollapsed={isVisuallyCollapsed}
                onToggleCollapse={handleToggleSidebar}
                isMobileOpen={isMobileMenuOpen}
                onMobileClose={() => setIsMobileMenuOpen(false)}
                onLogoutRequest={handleLogoutTrigger}
                navItems={sidebarNavItems}
                userRole={user?.role}
                profile={derivedProfile}
                onNavigateGeneral={() => navigate(`/dashboard/${roleSegment}/settings/general`)}
                onNavigateAccount={() => navigate(`/dashboard/${roleSegment}/settings/account`)}
            />

            <div className="dashboard-right-pane">
                <Topbar
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                    onOpenDrawer={() => setIsNotificationDrawerOpen(true)}
                />

                <MainContent />
            </div>

            {/* Shared Modular Drawer for Notifications Feed */}
            <Drawer
                isOpen={isNotificationDrawerOpen}
                onClose={() => setIsNotificationDrawerOpen(false)}
                title="Feed"
                position="right"
                size="md"
                showOverlay={true}
                closeOnOverlayClick={true}
                closeOnEsc={true}
            >
                <NotificationFeed
                    onNotificationClick={(item) =>
                        alert(`Clicked notification: ${item.actor} ${item.action} ${item.target}`)
                    }
                />
            </Drawer>

            <Dialog
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                title="Confirm Logout"
                variant="danger"
                size="sm"
                confirmText="Yes"
                cancelText="No"
                onConfirm={handleConfirmLogout}
            >
                <p>
                    Are you sure you want to log out of your account? Any unsaved changes may be
                    lost.
                </p>
            </Dialog>
        </div>
    );
}

export default DashboardLayout;
