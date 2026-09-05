import ProtectedRoute from '@/app/features/auth/components/ProtectedRoute';

/**
 * Dynamic Feature Route Loader
 *
 * Automatically scans all `*.routes.jsx` files in `src/app/features/`
 * using Vite's `import.meta.glob` and aggregates them by target layout:
 *
 * - `userRoutes`: Injected into `/dashboard/user/`
 * - `adminRoutes`: Injected into `/dashboard/admin/`
 * - `publicRoutes`: Injected at root level `/`
 * - `featureNavItems`: Aggregated sidebar navigation item metadata
 *
 * Supported feature export formats:
 * 1. Unified Multi-Role RBAC Format (Recommended):
 *    export default {
 *        allowedRoles: ['admin', 'manager', 'sales_rep'],
 *        navItem: { label: 'Leads', path: '/dashboard/user/leads', icon: 'Users', roles: [...] },
 *        routes: [ { path: 'leads', element: <LeadsPage /> } ]
 *    }
 *
 * 2. Explicit named route arrays:
 *    export default { userRoutes: [...], adminRoutes: [...], publicRoutes: [...] }
 *
 * 3. Target-based format:
 *    export default { target: 'user' | 'admin' | 'both' | 'public', routes: [...] }
 */

const routeModules = import.meta.glob('./features/**/*.routes.jsx', { eager: true });

const DEFAULT_TAB = { activeTab: 'Analytics', activeSubTab: 'Insight' };

function formatSegmentToTitle(segment) {
    if (!segment) return '';
    if (segment.toLowerCase() === 'ai') return 'AI';
    return segment
        .split(/[-_\s]+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function cleanPathSegment(path) {
    if (!path) return '';
    return path.replace(/^\/?dashboard\/(?:(?:user|admin)\/)?/, '').replace(/^\/+|\/+$/g, '');
}

// Registry mapping path keys to navigation metadata
const featureNavRegistry = new Map();

function registerNavEntry(path, label, subTabs = [], isExplicit = false) {
    const cleaned = cleanPathSegment(path);
    if (!cleaned) return;

    const segments = cleaned.split('/').filter(Boolean);
    const primary = segments[0];

    const existingCleaned = featureNavRegistry.get(cleaned);
    if (existingCleaned?.isExplicit && !isExplicit) {
        return;
    }

    const entry = {
        label: label || segments.map(formatSegmentToTitle).join(' '),
        subTabs: (subTabs || []).map((s) =>
            typeof s === 'string' ? s : s.label || formatSegmentToTitle(s),
        ),
        isExplicit,
    };

    featureNavRegistry.set(cleaned, entry);
    if (primary && (!featureNavRegistry.has(primary) || isExplicit)) {
        featureNavRegistry.set(primary, entry);
    }
}

// Build navigation registry immediately on module load
function initFeatureNavRegistry() {
    Object.values(routeModules).forEach((module) => {
        const config = module.default || module;
        const configs = Array.isArray(config) ? config : [config];

        configs.forEach((cfg) => {
            if (!cfg) return;

            // 1. Explicit navItem has highest priority
            if (cfg.navItem) {
                const items = Array.isArray(cfg.navItem) ? cfg.navItem : [cfg.navItem];
                items.forEach((item) => {
                    registerNavEntry(item.path, item.label, item.subTabs, true);
                });
            }

            // 2. Scan route definitions for paths and children
            const scanRoutes = (routesList) => {
                if (!routesList) return;
                const list = Array.isArray(routesList) ? routesList : [routesList];
                list.forEach((route) => {
                    if (!route?.path) return;
                    const childSubTabs = (route.children || [])
                        .map((c) => c.path)
                        .filter((p) => p && p !== '*' && !p.includes(':'))
                        .map(formatSegmentToTitle);
                    registerNavEntry(route.path, null, childSubTabs, false);
                });
            };

            scanRoutes(cfg.userRoutes);
            scanRoutes(cfg.adminRoutes);
            scanRoutes(cfg.routes);
        });
    });
}

initFeatureNavRegistry();

/**
 * Resolves activeTab and activeSubTab from current pathname dynamically
 * using the feature routes registry and convention-based fallbacks.
 */
export function resolveNavState(pathname) {
    if (!pathname) return DEFAULT_TAB;

    const match = pathname.match(/\/dashboard\/(?:(?:user|admin)\/)?([^/]+)(?:\/([^/]+))?/);
    if (!match) return DEFAULT_TAB;

    const [, primary, secondary] = match;
    const fullSubPath = secondary ? `${primary}/${secondary}` : primary;

    const entry = featureNavRegistry.get(fullSubPath) || featureNavRegistry.get(primary);

    if (entry) {
        let activeSubTab = '';
        if (entry.subTabs && entry.subTabs.length > 0) {
            if (secondary) {
                const found = entry.subTabs.find(
                    (s) => s.toLowerCase() === secondary.toLowerCase(),
                );
                activeSubTab = found || formatSegmentToTitle(secondary);
            } else {
                activeSubTab = entry.subTabs[0];
            }
        }
        return {
            activeTab: entry.label,
            activeSubTab,
        };
    }

    return {
        activeTab: formatSegmentToTitle(primary),
        activeSubTab: secondary ? formatSegmentToTitle(secondary) : '',
    };
}

export function loadFeatureRoutes() {
    const userRoutes = [];
    const adminRoutes = [];
    const publicRoutes = [];
    const featureNavItems = [];

    const processRouteConfig = (config) => {
        if (!config) return;

        // Collect navItem metadata if present
        if (config.navItem) {
            const items = Array.isArray(config.navItem) ? config.navItem : [config.navItem];
            items.forEach((item) => {
                featureNavItems.push(item);
            });
        }

        // Format 1: Explicit target arrays (userRoutes, adminRoutes, publicRoutes)
        if (config.userRoutes) {
            userRoutes.push(
                ...(Array.isArray(config.userRoutes) ? config.userRoutes : [config.userRoutes]),
            );
        }
        if (config.adminRoutes) {
            adminRoutes.push(
                ...(Array.isArray(config.adminRoutes) ? config.adminRoutes : [config.adminRoutes]),
            );
        }
        if (config.publicRoutes) {
            publicRoutes.push(
                ...(Array.isArray(config.publicRoutes)
                    ? config.publicRoutes
                    : [config.publicRoutes]),
            );
        }

        // Format 2: Unified Multi-Role RBAC (allowedRoles & routes)
        if (config.allowedRoles && config.routes) {
            const rawRoutes = Array.isArray(config.routes) ? config.routes : [config.routes];
            const protectedRoutes = rawRoutes.map((route) => ({
                ...route,
                element: (
                    <ProtectedRoute allowedRoles={config.allowedRoles}>
                        {route.element}
                    </ProtectedRoute>
                ),
            }));

            userRoutes.push(...protectedRoutes);
            adminRoutes.push(...protectedRoutes);
        }

        // Format 3: target & routes specification
        if (config.target && config.routes) {
            const routesList = Array.isArray(config.routes) ? config.routes : [config.routes];

            if (config.target === 'user') {
                userRoutes.push(...routesList);
            } else if (config.target === 'admin') {
                adminRoutes.push(...routesList);
            } else if (config.target === 'both' || config.target === 'all') {
                userRoutes.push(...routesList);
                adminRoutes.push(...routesList);
            } else if (config.target === 'public') {
                publicRoutes.push(...routesList);
            }
        }
    };

    Object.values(routeModules).forEach((module) => {
        const config = module.default || module;

        if (Array.isArray(config)) {
            config.forEach(processRouteConfig);
        } else {
            processRouteConfig(config);
        }
    });

    return {
        userRoutes,
        adminRoutes,
        publicRoutes,
        featureNavItems,
        featureNavRegistry,
    };
}
