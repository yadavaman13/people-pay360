import { Plus } from 'lucide-react';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import { useSalaryStructuresList } from '../../hooks/useSalaryStructuresList';
import SalaryStructuresTable from '../../components/SalaryStructuresTable/SalaryStructuresTable';
import SalaryStructureCard from '../../components/SalaryStructureCard/SalaryStructureCard';
import CreateSalaryStructureModal from '../../components/CreateSalaryStructureModal/CreateSalaryStructureModal';
import './SalaryStructuresListPage.scss';

/**
 * SCR-PAY-006: Salary Structures List Screen
 * Clean enterprise data view using AdvancedTable, following design tokens and theme palettes.
 */
function SalaryStructuresListPage() {
    const {
        structures,
        pagination,
        isLoading,
        error,
        searchQuery,
        filterConfig,
        isCreateModalOpen,
        canCreate,
        handleTableChange,
        handleRetry,
        handleRowClick,
        handleCreateSuccess,
        setIsCreateModalOpen,
    } = useSalaryStructuresList();

    return (
        <div className="salary-structures-list-page">
            {/* 1. Header Section */}
            <header className="salary-structures-list-header">
                <div className="header-info">
                    <div className="title-row">
                        <h1 className="header-title">Salary Structures</h1>
                    </div>
                    <p className="header-subtitle">
                        List view of salary structures and computation rules
                    </p>
                </div>

                {canCreate && (
                    <div className="header-actions">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="create-structure-btn"
                        >
                            <Plus size={16} />
                            <span>New Structure</span>
                        </Button>
                    </div>
                )}
            </header>

            {/* 2. Error State Banner */}
            {error && (
                <div className="page-error-alert">
                    <Alert variant="danger">
                        <AlertTitle>Failed to load salary structures</AlertTitle>
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
                <SalaryStructuresTable
                    structures={structures}
                    onRowClick={handleRowClick}
                    isLoading={isLoading}
                    totalCount={pagination.totalCount}
                    onTableChange={handleTableChange}
                    searchTerm={searchQuery}
                    filterConfig={filterConfig}
                    onRefresh={handleRetry}
                />
            </div>

            {/* 4. Mobile Card Roster (< 576px) */}
            <div className="cards-stack">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, i) => (
                          <div key={`mobile-skeleton-${i}`} className="mobile-card-skeleton" />
                      ))
                    : structures.map((structure) => (
                          <SalaryStructureCard
                              key={structure.id}
                              structure={structure}
                              onClick={handleRowClick}
                          />
                      ))}
            </div>

            {/* 5. Create Structure Modal */}
            <CreateSalaryStructureModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreateSuccess}
            />
        </div>
    );
}

export default SalaryStructuresListPage;
