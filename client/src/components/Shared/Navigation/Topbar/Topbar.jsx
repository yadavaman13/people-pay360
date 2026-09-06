import { Menu as MenuIcon } from 'lucide-react';
import Breadcrumbs from '@/components/Shared/Navigation/Breadcrumbs/Breadcrumbs';
import { useActiveNavTab } from '@/hooks/useActiveNavTab';
import './Topbar.scss';

function Topbar({ onMenuClick }) {
    const { activeTab, activeSubTab } = useActiveNavTab();

    return (
        <div className="shared-topbar-container">
            <button
                type="button"
                className="topbar-menu-trigger"
                onClick={onMenuClick}
                title="Open navigation menu"
            >
                <MenuIcon size={20} />
            </button>

            {/* Shared Standalone Breadcrumbs Component */}
            <Breadcrumbs activeTab={activeTab} activeSubTab={activeSubTab} />
        </div>
    );
}

export default Topbar;
