import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { resolveNavState } from '@/app/routes.loader';

/**
 * Derives { activeTab, activeSubTab } dynamically from the current URL pathname
 * and the feature route registry discovered by routes.loader.jsx.
 *
 * Developers adding new features define their routes and optional navItem in their
 * own feature's *.routes.jsx file. This hook resolves navigation state automatically
 * so no modifications or git conflicts occur in this shared hook.
 *
 * @returns {{ activeTab: string, activeSubTab: string }}
 */
export function useActiveNavTab() {
    const { pathname } = useLocation();

    return useMemo(() => resolveNavState(pathname), [pathname]);
}
