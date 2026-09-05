import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import Sidebar from '@/components/Shared/Navigation/Sidebar/Sidebar';
import MainContent from './MainContent/MainContent';
import Topbar from '@/components/Shared/Navigation/Topbar/Topbar';
import Dialog from '@/components/Shared/Feedback/Dialog';
import { Drawer, NotificationFeed } from '@/components/Shared/Feedback/Drawer';
import { useAuth } from '../../auth/hooks/useAuth';
import { useDerivedProfile } from '../../auth/hooks/useDerivedProfile';
import { loadFeatureRoutes } from '@/app/routes.loader';
import { Home as HomeIcon, Users as UsersIcon, UserCheck as EmployeesIcon } from 'lucide-react';
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

    const { featureNavItems } = loadFeatureRoutes();

    const NAV_ICON_MAP = {
        Home: <HomeIcon size={20} />,
        Users: <UsersIcon size={20} />,
        Employees: <EmployeesIcon size={20} />,
    };

    // Remove duplicate labels if any (and prevent duplicate Home/Settings entries in main sidebar)
    const uniqueFeatureItems = [];
    const seenLabels = new Set(['Home', 'Settings']);
    featureNavItems.forEach((item) => {
        if (!seenLabels.has(item.label)) {
            seenLabels.add(item.label);
            uniqueFeatureItems.push(item);
        }
    });

    const sidebarNavItems = [
        {
            label: 'Home',
            icon: <HomeIcon size={20} />,
            path: `/dashboard/${roleSegment}/home`,
        },
        ...uniqueFeatureItems.map((item) => ({
            ...item,
            icon: item.icon || NAV_ICON_MAP[item.label] || <UsersIcon size={20} />,
        })),
    ];

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
