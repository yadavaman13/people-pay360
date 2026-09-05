import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router';
import { Plus } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import Dropdown from '@/components/Shared/Form/Dropdown/Dropdown';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { useAuth } from '@/app/features/auth/hooks/useAuth';
import { fetchSalaryRules, fetchSalaryStructures } from '../../services/salaryRules.api';
import SalaryRulesTable from '../../components/SalaryRulesTable/SalaryRulesTable';
import SalaryRuleListCard from '../../components/SalaryRuleListCard/SalaryRuleListCard';
import { SALARY_RULES_FILTER_CONFIG } from './salaryRulesTable.config';
import './SalaryRulesListPage.scss';

/**
 * SCR-PAY-008: Salary Rules List Screen
 * Clean enterprise data view using AdvancedTable, following design tokens and theme palettes.
 */
function SalaryRulesListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user } = useAuth();

    // Determine current role segment for navigation ('admin', 'hr', or 'employee')
    const roleSegment = useMemo(() => {
        if (pathname.includes('/admin/')) return 'admin';
        if (pathname.includes('/hr/')) return 'hr';
        return 'employee';
    }, [pathname]);

    // Check RBAC permission for creation trigger
    const canCreate = useMemo(() => {
        const allowed = ['ADMIN', 'HR_PAYROLL_MANAGER'];
        return Boolean(user?.role && allowed.includes(user.role));
    }, [user?.role]);

    // Initial search params
    const initialStructureId = searchParams.get('structureId') || '';
    const initialPage = Math.max(1, Number(searchParams.get('page')) || 1);

    // State Layer
    const [rules, setRules] = useState([]);
    const [structures, setStructures] = useState([]);
    const [selectedStructureId, setSelectedStructureId] = useState(initialStructureId);
    const [pagination, setPagination] = useState({
        page: initialPage,
        limit: 50,
        totalCount: 0,
        totalPages: 1,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Active request tracking to prevent race conditions
    const activeRequestIdRef = useRef(0);

    // Load available salary structures for dropdown filter on mount
    useEffect(() => {
        let isMounted = true;
        async function loadStructures() {
            try {
                const res = await fetchSalaryStructures({ isActive: true, limit: 100 });
                if (isMounted && res?.data) {
                    setStructures(res.data);
                }
            } catch {
                // Non-blocking: structure filter falls back to empty options
            }
        }
        loadStructures();
        return () => {
            isMounted = false;
        };
    }, []);

    // Format structure options for Dropdown component
    const structureDropdownOptions = useMemo(() => {
        const defaultOption = { value: '', label: 'All Structures' };
        const structureOptions = structures.map((s) => ({
            value: s.id,
            label: s.name,
        }));
        return [defaultOption, ...structureOptions];
    }, [structures]);

    // Fetch salary rules from backend
    const loadRules = useCallback(
        async (structureId, page) => {
            const requestId = ++activeRequestIdRef.current;
            setIsLoading(true);
            setError(null);

            try {
                const params = {
                    page,
                    limit: pagination.limit,
                };
                if (structureId) {
                    params.structureId = structureId;
                }

                const res = await fetchSalaryRules(params);

                // Ignore stale response if a newer query has fired
                if (requestId !== activeRequestIdRef.current) return;

                const items = res?.data || [];
                setRules(items);

                if (res?.pagination) {
                    setPagination({
                        page: res.pagination.page || page,
                        limit: res.pagination.limit || pagination.limit,
                        totalCount: res.pagination.totalCount ?? items.length,
                        totalPages: res.pagination.totalPages || 1,
                    });
                } else {
                    setPagination((prev) => ({
                        ...prev,
                        page,
                        totalCount: items.length,
                        totalPages: Math.max(1, Math.ceil(items.length / prev.limit)),
                    }));
                }
            } catch (err) {
                if (requestId !== activeRequestIdRef.current) return;
                const errorMsg =
                    err?.response?.data?.message ||
                    err?.message ||
                    'Failed to retrieve salary rules';
                setError(errorMsg);
            } finally {
                if (requestId === activeRequestIdRef.current) {
                    setIsLoading(false);
                }
            }
        },
        [pagination.limit],
    );

    // Synchronize data load on structure filter or page changes
    useEffect(() => {
        loadRules(selectedStructureId, pagination.page);

        // Synchronize with URL search parameters cleanly
        const nextParams = {};
        if (selectedStructureId) {
            nextParams.structureId = selectedStructureId;
        }
        if (pagination.page > 1) {
            nextParams.page = String(pagination.page);
        }
        setSearchParams(nextParams, { replace: true });
    }, [selectedStructureId, pagination.page, loadRules, setSearchParams]);

    // Action Handlers
    const handleStructureChange = useCallback((val) => {
        setSelectedStructureId(val || '');
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, []);

    const handleTableChange = useCallback(
        (state) => {
            if (state?.page && state.page !== pagination.page) {
                setPagination((prev) => ({ ...prev, page: state.page }));
            }
        },
        [pagination.page],
    );

    const handleRetry = useCallback(() => {
        loadRules(selectedStructureId, pagination.page);
    }, [selectedStructureId, pagination.page, loadRules]);

    const handleRowClick = useCallback(
        (id) => {
            if (!id) return;
            navigate(`/dashboard/${roleSegment}/payroll/salary-rules/${id}`);
        },
        [navigate, roleSegment],
    );

    const handleStructureClick = useCallback(
        (structureId) => {
            if (!structureId) return;
            navigate(`/dashboard/${roleSegment}/payroll/salary-structures/${structureId}`);
        },
        [navigate, roleSegment],
    );

    const handleCreateClick = useCallback(() => {
        navigate(`/dashboard/${roleSegment}/payroll/salary-rules/new`, {
            state: { preselectedStructureId: selectedStructureId || undefined },
        });
    }, [navigate, roleSegment, selectedStructureId]);

    // Structure dropdown component to pass into AdvancedTable controlsLeft
    const structureFilterDropdown = useMemo(
        () => (
            <div className="structure-filter-control">
                <Dropdown
                    options={structureDropdownOptions}
                    value={selectedStructureId}
                    onChange={handleStructureChange}
                    placeholder="All Structures"
                    className="structure-dropdown"
                />
            </div>
        ),
        [structureDropdownOptions, selectedStructureId, handleStructureChange],
    );

    return (
        <div className="salary-rules-list-page">
            {/* 1. Header Section */}
            <header className="salary-rules-list-header">
                <div className="header-info">
                    <div className="title-row">
                        <h1 className="header-title">Salary Rules</h1>
                    </div>
                    <p className="header-subtitle">List view of salary computation rules</p>
                </div>

                {canCreate && (
                    <div className="header-actions">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleCreateClick}
                            className="create-rule-btn"
                        >
                            <Plus size={16} />
                            <span>New Rule</span>
                        </Button>
                    </div>
                )}
            </header>

            {/* 2. Error State Banner */}
            {error && (
                <div className="page-error-alert">
                    <Alert variant="danger">
                        <AlertTitle>Failed to load salary rules</AlertTitle>
                        <AlertDescription>
                            <span>{error}</span>
                            <div className="alert-retry-action">
                                <Button variant="secondary" size="sm" onClick={handleRetry}>
                                    Retry
                                </Button>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* 3. Enterprise AdvancedTable for Desktop & Tablet (>= 576px) */}
            <div className="table-container">
                <SalaryRulesTable
                    rules={rules}
                    onRowClick={handleRowClick}
                    onStructureClick={handleStructureClick}
                    isLoading={isLoading}
                    totalCount={pagination.totalCount}
                    onTableChange={handleTableChange}
                    filterConfig={SALARY_RULES_FILTER_CONFIG}
                    onRefresh={handleRetry}
                    controlsLeft={structureFilterDropdown}
                />
            </div>

            {/* 4. Mobile Card Roster (< 576px) */}
            <div className="cards-stack">
                <div className="mobile-structure-filter">{structureFilterDropdown}</div>
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                          <div key={`rule-card-skeleton-${i}`} className="mobile-card-skeleton" />
                      ))
                    : rules.map((rule) => (
                          <SalaryRuleListCard key={rule.id} rule={rule} onClick={handleRowClick} />
                      ))}
            </div>
        </div>
    );
}

export default SalaryRulesListPage;
