import { Outlet } from 'react-router';
import ProtectedRoute from '@/app/features/auth/components/ProtectedRoute';

/**
 * Dynamic Feature Route Loader
 *
 * Automatically scans all `*.routes.jsx` files in `src/app/features/`
 * using Vite's `import.meta.glob` and aggregates them by target layout:
 *
 * - `employeeRoutes`: Injected into `/dashboard/employee/`
 * - `hrRoutes`: Injected into `/dashboard/hr/`
 * - `adminRoutes`: Injected into `/dashboard/admin/`
 * - `publicRoutes`: Injected at root level `/`
 * - `featureNavItems`: Aggregated sidebar navigation item metadata
 *
 * Supported feature export formats:
 * 1. Unified Multi-Role RBAC Format (Recommended):
 *    export default {
 *        allowedRoles: ['ADMIN', 'HR', 'EMPLOYEE'],
 *        navItem: { label: 'Employees', path: '/dashboard/employee/employees', icon: 'UserCheck', roles: [...] },
 *        routes: [ { path: 'employees', element: <EmployeesPage /> } ]
 *    }
 *
 * 2. Explicit named route arrays:
 *    export default { userRoutes: [...], adminRoutes: [...], publicRoutes: [...] }
 *
 * 3. Target-based format:
 *    export default { target: 'user' | 'admin' | 'both' | 'public', routes: [...] }
 */

const routeModules = import.meta.glob('./features/**/*.routes.jsx', { eager: true });

const DEFAULT_TAB = { activeTab: 'Home', activeSubTab: '' };

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
    return path
        .replace(/^\/?dashboard\/(?:(?:employee|user|admin|hr)\/)?/, '')
        .replace(/^\/+|\/+$/g, '');
}

function extractRoleAndPath(path) {
    if (!path) return { role: null, cleaned: '' };
    const match = path.match(/^\/?dashboard\/(employee|user|admin|hr)\/(.*)$/);
    if (match) {
        return {
            role: match[1],
            cleaned: match[2].replace(/^\/+|\/+$/g, ''),
        };
    }
    return {
        role: null,
        cleaned: path.replace(/^\/?dashboard\//, '').replace(/^\/+|\/+$/g, ''),
    };
}

// Registry mapping path keys to navigation metadata
const featureNavRegistry = new Map();

function registerNavEntry(path, label, subTabs = [], isExplicit = false) {
    const { role, cleaned } = extractRoleAndPath(path);
    if (!cleaned) return;

    const segments = cleaned.split('/').filter(Boolean);
    const primary = segments[0];

    const entry = {
        label: label || segments.map(formatSegmentToTitle).join(' '),
        subTabs: (subTabs || []).map((s) =>
            typeof s === 'string' ? s : s.label || formatSegmentToTitle(s),
        ),
        isExplicit,
    };

    // 1. If role-scoped path, register under role key
    if (role) {
        featureNavRegistry.set(`${role}/${cleaned}`, entry);
        if (primary) {
            featureNavRegistry.set(`${role}/${primary}`, entry);
        }
        if (isExplicit && subTabs && subTabs.length > 0) {
            subTabs.forEach((sub) => {
                const subLabel =
                    typeof sub === 'string' ? sub : sub.label || formatSegmentToTitle(sub);
                const subKey = subLabel.toLowerCase().replace(/\s+/g, '-');
                featureNavRegistry.set(`${role}/${primary}/${subKey}`, entry);
            });
        }
    }

    // 2. Generic registration (fallback)
    const existingCleaned = featureNavRegistry.get(cleaned);
    if (!existingCleaned?.isExplicit || isExplicit) {
        featureNavRegistry.set(cleaned, entry);
    }

    const existingPrimary = featureNavRegistry.get(primary);
    // Don't overwrite an entry that has subtabs with one that doesn't unless explicit
    if (
        !existingPrimary ||
        (!existingPrimary.subTabs?.length && entry.subTabs?.length) ||
        isExplicit
    ) {
        featureNavRegistry.set(primary, entry);
    }

    if (isExplicit && subTabs && subTabs.length > 0) {
        subTabs.forEach((sub) => {
            const subLabel = typeof sub === 'string' ? sub : sub.label || formatSegmentToTitle(sub);
            const subKey = subLabel.toLowerCase().replace(/\s+/g, '-');
            featureNavRegistry.set(`${primary}/${subKey}`, entry);
        });
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

            scanRoutes(cfg.employeeRoutes);
            scanRoutes(cfg.userRoutes);
            scanRoutes(cfg.hrRoutes);
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

    const match = pathname.match(
        /\/dashboard\/(?:(employee|user|admin|hr)\/)?([^/]+)(?:\/([^/]+))?/,
    );
    if (!match) return DEFAULT_TAB;

    const [, role, primary, secondary] = match;
    const roleSubPath =
        role && secondary ? `${role}/${primary}/${secondary}` : role ? `${role}/${primary}` : null;
    const fullSubPath = secondary ? `${primary}/${secondary}` : primary;

    // Prioritize role-scoped explicit entries first, then generic fallback
    const roleSubEntry = roleSubPath ? featureNavRegistry.get(roleSubPath) : null;
    const rolePrimaryEntry = role ? featureNavRegistry.get(`${role}/${primary}`) : null;
    const fullEntry = featureNavRegistry.get(fullSubPath);
    const primaryEntry = featureNavRegistry.get(primary);

    const entry =
        (roleSubEntry?.isExplicit && roleSubEntry) ||
        (rolePrimaryEntry?.isExplicit && rolePrimaryEntry) ||
        (fullEntry?.isExplicit && fullEntry) ||
        (primaryEntry?.isExplicit && primaryEntry) ||
        roleSubEntry ||
        rolePrimaryEntry ||
        fullEntry ||
        primaryEntry;

    if (entry) {
        let activeSubTab = '';
        if (entry.subTabs && entry.subTabs.length > 0) {
            if (secondary) {
                const normalizedSecondary = secondary.toLowerCase().replace(/[-_\s]+/g, '');
                const found = entry.subTabs.find(
                    (s) => s.toLowerCase().replace(/[-_\s]+/g, '') === normalizedSecondary,
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
    const employeeRoutes = [];
    const hrRoutes = [];
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

        // Format 1: Explicit target arrays (employeeRoutes, userRoutes, hrRoutes, adminRoutes, publicRoutes)
        if (config.employeeRoutes) {
            employeeRoutes.push(
                ...(Array.isArray(config.employeeRoutes)
                    ? config.employeeRoutes
                    : [config.employeeRoutes]),
            );
        }
        if (config.userRoutes) {
            employeeRoutes.push(
                ...(Array.isArray(config.userRoutes) ? config.userRoutes : [config.userRoutes]),
            );
        }
        if (config.hrRoutes) {
            hrRoutes.push(
                ...(Array.isArray(config.hrRoutes) ? config.hrRoutes : [config.hrRoutes]),
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
                        {route.element || (route.children ? <Outlet /> : null)}
                    </ProtectedRoute>
                ),
            }));

            employeeRoutes.push(...protectedRoutes);
            hrRoutes.push(...protectedRoutes);
            adminRoutes.push(...protectedRoutes);
        }

        // Format 3: target & routes specification
        if (config.target && config.routes) {
            const routesList = Array.isArray(config.routes) ? config.routes : [config.routes];

            if (config.target === 'employee' || config.target === 'user') {
                employeeRoutes.push(...routesList);
            } else if (config.target === 'hr') {
                hrRoutes.push(...routesList);
            } else if (config.target === 'admin') {
                adminRoutes.push(...routesList);
            } else if (config.target === 'both' || config.target === 'all') {
                employeeRoutes.push(...routesList);
                hrRoutes.push(...routesList);
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
        employeeRoutes,
        userRoutes: employeeRoutes,
        hrRoutes,
        adminRoutes,
        publicRoutes,
        featureNavItems,
        featureNavRegistry,
    };
}
