import React from 'react';
import KanbanCard from '../KanbanCard/KanbanCard';
import EmptyState from '@/components/Shared/DataDisplay/EmptyState/EmptyState';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import { Users, UserPlus } from 'lucide-react';
import './KanbanGrid.scss';

/**
 * KanbanGrid — Responsive card grid matching Image 1 wireframe.
 */
function KanbanGrid({ employees = [], loading = false, onCardClick, onAddNew }) {
    if (loading && employees.length === 0) {
        return (
            <div className="employee-kanban-loading">
                <Spinner size="lg" />
                <p>Loading employee directory...</p>
            </div>
        );
    }

    if (!employees || employees.length === 0) {
        return (
            <div className="employee-kanban-empty">
                <EmptyState
                    icon={Users}
                    title="No employees found"
                    description="There are currently no employee records matching your active filters."
                    actionLabel={onAddNew ? 'Add New Employee' : undefined}
                    actionIcon={onAddNew ? UserPlus : undefined}
                    onActionClick={onAddNew || undefined}
                    variant="card"
                />
            </div>
        );
    }

    return (
        <div className="employee-kanban-grid">
            {employees.map((employee) => (
                <KanbanCard
                    key={employee.id || employee.employeeCode}
                    employee={employee}
                    onClick={onCardClick}
                />
            ))}
        </div>
    );
}

export default React.memo(KanbanGrid);
