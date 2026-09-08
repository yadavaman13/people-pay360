import { useContext, useCallback } from 'react';
import { SchedulesContext } from '../context/SchedulesContext';
import * as schedulesApi from '../services/schedules.api';
import { useToast } from '@/components/Shared/Feedback/Toast/index';

export function useSchedules() {
    const context = useContext(SchedulesContext);
    if (!context) {
        throw new Error('useSchedules must be used within a SchedulesProvider');
    }

    const { setSchedules, setSelectedSchedule, setLoading, setError } = context;
    const { addToast } = useToast();

    /**
     * Load all working schedules from API
     * @param {object} [params={}] - { isActive, page, limit }
     */
    const loadSchedules = useCallback(
        async (params = {}) => {
            setLoading((prev) => ({ ...prev, list: true }));
            setError(null);
            try {
                const response = await schedulesApi.fetchSchedules(params);
                setSchedules(response.data || []);
                return response;
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to load schedules';
                setError(msg);
                addToast(msg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, list: false }));
            }
        },
        [setLoading, setError, setSchedules, addToast],
    );

    /**
     * Load full schedule detail (with lines[] and weeklyHours)
     * @param {string} id
     */
    const loadScheduleDetail = useCallback(
        async (id) => {
            setLoading((prev) => ({ ...prev, detail: true }));
            setError(null);
            try {
                const response = await schedulesApi.fetchScheduleById(id);
                setSelectedSchedule(response.data || null);
                return response.data;
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to load schedule details';
                setError(msg);
                addToast(msg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, detail: false }));
            }
        },
        [setLoading, setError, setSelectedSchedule, addToast],
    );

    /**
     * Create a new working schedule with optional shift lines
     * @param {object} payload - { name, description, timezone, lines[] }
     */
    const handleCreateSchedule = useCallback(
        async (payload) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                const response = await schedulesApi.createSchedule(payload);
                const newSchedule = response.data;
                // Optimistically prepend to list
                setSchedules((prev) => [newSchedule, ...prev]);
                addToast('Working schedule created successfully', 'success');
                return newSchedule;
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to create schedule';
                addToast(msg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, setSchedules, addToast],
    );

    /**
     * Update schedule metadata (name, description, timezone, isActive)
     * @param {string} id
     * @param {object} payload
     */
    const handleUpdateSchedule = useCallback(
        async (id, payload) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                const response = await schedulesApi.updateSchedule(id, payload);
                const updated = response.data;
                // Sync list and detail
                setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
                setSelectedSchedule(updated);
                addToast('Schedule updated successfully', 'success');
                return updated;
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to update schedule';
                addToast(msg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, setSchedules, setSelectedSchedule, addToast],
    );

    /**
     * Replace all shift lines atomically (PUT)
     * @param {string} id
     * @param {Array} lines
     */
    const handleReplaceLines = useCallback(
        async (id, lines) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                const response = await schedulesApi.replaceScheduleLines(id, lines);
                // Refresh the detail view with updated lines and weeklyHours
                await loadScheduleDetail(id);
                addToast('Schedule shift lines updated successfully', 'success');
                return response.data;
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to update shift lines';
                addToast(msg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, addToast, loadScheduleDetail],
    );

    /**
     * Soft-delete (deactivate) a working schedule
     * @param {string} id
     */
    const handleDeleteSchedule = useCallback(
        async (id) => {
            setLoading((prev) => ({ ...prev, action: true }));
            try {
                await schedulesApi.deleteSchedule(id);
                setSchedules((prev) => prev.filter((s) => s.id !== id));
                addToast('Schedule deactivated successfully', 'success');
            } catch (err) {
                const msg =
                    err.response?.data?.message || err.message || 'Failed to delete schedule';
                addToast(msg, 'error');
                throw err;
            } finally {
                setLoading((prev) => ({ ...prev, action: false }));
            }
        },
        [setLoading, setSchedules, addToast],
    );

    // Return ACTION HANDLERS ONLY — no state re-exports per FEATURE_DEVELOPMENT_GUIDE.md
    return {
        loadSchedules,
        loadScheduleDetail,
        handleCreateSchedule,
        handleUpdateSchedule,
        handleReplaceLines,
        handleDeleteSchedule,
    };
}

export default useSchedules;
