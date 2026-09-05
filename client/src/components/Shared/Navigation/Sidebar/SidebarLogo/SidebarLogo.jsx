import { Link } from 'react-router';
import { PanelLeftClose, PanelLeftOpen, X as CloseIcon } from 'lucide-react';
import Tooltip from '@/components/Shared/DataDisplay/Tooltip/Tooltip';
import logo from '@/assests/logo.png';
import oLogo from '@/assests/O-logo.png';
import './SidebarLogo.scss';

function SidebarLogo({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }) {
    return (
        <div className={`sidebar-logo-wrapper ${isCollapsed ? 'is-collapsed' : ''}`}>
            {isCollapsed ? (
                <>
                    <div className="collapsed-logo-only">
                        <img src={oLogo} alt="Odoo" className="collapsed-brand-icon" />
                    </div>
                    <div className="collapsed-expand-only">
                        <Tooltip
                            content="Expand sidebar"
                            position="right"
                            className="sidebar-tooltip-wrapper"
                        >
                            <button
                                type="button"
                                className="sidebar-toggle-btn collapsed-expand-btn"
                                onClick={onToggleCollapse}
                                aria-label="Expand sidebar"
                            >
                                <PanelLeftOpen size={18} />
                            </button>
                        </Tooltip>
                    </div>
                </>
            ) : (
                <>
                    <Link
                        to="/dashboard"
                        className="sidebar-brand-link"
                        aria-label="PeoplePay360 Dashboard"
                    >
                        <img src={logo} alt="Odoo" className="sidebar-brand-logo" />
                    </Link>

                    {isMobileOpen && onMobileClose ? (
                        <button
                            type="button"
                            className="sidebar-close-btn"
                            onClick={onMobileClose}
                            aria-label="Close sidebar"
                        >
                            <CloseIcon size={18} />
                        </button>
                    ) : (
                        <Tooltip content="Collapse sidebar" position="bottom">
                            <button
                                type="button"
                                className="sidebar-toggle-btn"
                                onClick={onToggleCollapse}
                                aria-label="Collapse sidebar"
                            >
                                <PanelLeftClose size={18} />
                            </button>
                        </Tooltip>
                    )}
                </>
            )}
        </div>
    );
}

export default SidebarLogo;
