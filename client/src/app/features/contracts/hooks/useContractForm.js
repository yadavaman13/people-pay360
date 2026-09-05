import { useState, useEffect, useRef, useCallback } from 'react';
import * as contractsService from '../services/contracts.service';
import { useToast } from '@/components/Shared/Feedback/Toast';

const INITIAL_FORM_STATE = {
    employeeId: '',
    contractName: '',
    startDate: '',
    endDate: '',
    wageType: 'MONTHLY',
    wage: '',
    salaryStructureId: '',
    workingScheduleId: '',
    status: 'DRAFT',
    maxPunchesPerDay: 3,
    notes: '',
};

/**
 * Normalizes date to YYYY-MM-DD string
 */
export function toIsoDateString(val) {
    if (!val) return '';
    if (typeof val === 'string') {
        const trimmed = val.trim();
        // Check DD-MM-YYYY
        const dmy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmy) {
            const day = dmy[1].padStart(2, '0');
            const month = dmy[2].padStart(2, '0');
            const year = dmy[3];
            return `${year}-${month}-${day}`;
        }
        // Check YYYY-MM-DD
        const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (ymd) {
            const year = ymd[1];
            const month = ymd[2].padStart(2, '0');
            const day = ymd[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString().split('T')[0];
    }
    return String(val);
}

/**
 * Hook for managing contract creation and editing form state and API submission.
 */
export function useContractForm({ mode = 'create', contractId = null } = {}) {
    const [form, setForm] = useState(INITIAL_FORM_STATE);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loadingDependencies, setLoadingDependencies] = useState(true);

    const [salaryStructures, setSalaryStructures] = useState([]);
    const [workingSchedules, setWorkingSchedules] = useState([]);
    const [employees, setEmployees] = useState([]);

    const { success, error: toastError } = useToast();
    const abortControllerRef = useRef(null);

    // Fetch dropdown options and contract detail if in edit mode
    useEffect(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        const loadDependencies = async () => {
            setLoadingDependencies(true);
            try {
                const requests = [
                    contractsService.listSalaryStructures(),
                    contractsService.listWorkingSchedules(),
                    contractsService.searchEmployees(''),
                ];

                if (mode === 'edit' && contractId) {
                    requests.push(contractsService.getContractById(contractId));
                }

                const [structuresRes, schedulesRes, employeesRes, contractRes] =
                    await Promise.all(requests);

                const structures = structuresRes.data || structuresRes || [];
                const schedules = schedulesRes.data || schedulesRes || [];
                const empList = employeesRes.data || employeesRes || [];

                setSalaryStructures(Array.isArray(structures) ? structures : []);
                setWorkingSchedules(Array.isArray(schedules) ? schedules : []);
                setEmployees(Array.isArray(empList) ? empList : []);

                if (mode === 'edit' && contractRes) {
                    const c = contractRes.data || contractRes;
                    setForm({
                        employeeId: c.employeeId || '',
                        contractName:
                            c.contractName || c.notes?.split('\n')[0] || 'Employment Contract',
                        startDate: toIsoDateString(c.startDate),
                        endDate: toIsoDateString(c.endDate),
                        wageType: c.wageType || 'MONTHLY',
                        wage: c.wage || '',
                        salaryStructureId: c.salaryStructureId || '',
                        workingScheduleId: c.workingScheduleId || '',
                        status: c.status || 'DRAFT',
                        maxPunchesPerDay: c.maxPunchesPerDay ?? 3,
                        notes: c.notes || '',
                    });
                }
            } catch (err) {
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                    return;
                }
                const msg =
                    err.response?.data?.message || err.message || 'Failed to load form data';
                toastError(msg);
            } finally {
                setLoadingDependencies(false);
            }
        };

        loadDependencies();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [mode, contractId, toastError]);

    const handleFieldChange = useCallback((fieldName, value) => {
        setForm((prev) => ({
            ...prev,
            [fieldName]: value,
        }));

        setErrors((prev) => {
            if (prev[fieldName]) {
                const updated = { ...prev };
                delete updated[fieldName];
                return updated;
            }
            return prev;
        });
    }, []);

    const validate = () => {
        const nextErrors = {};

        if (mode === 'create' && !form.employeeId) {
            nextErrors.employeeId = 'Please select an employee';
        }

        if (!form.contractName || form.contractName.trim().length < 3) {
            nextErrors.contractName = 'Contract name must be between 3 and 150 characters';
        } else if (form.contractName.trim().length > 150) {
            nextErrors.contractName = 'Contract name must be between 3 and 150 characters';
        }

        const isoStartDate = toIsoDateString(form.startDate);
        const isoEndDate = toIsoDateString(form.endDate);

        if (!isoStartDate) {
            nextErrors.startDate = 'Start date is required';
        }

        if (isoEndDate && isoStartDate && isoEndDate < isoStartDate) {
            nextErrors.endDate = 'End date must be on or after the start date';
        }

        if (!form.wageType) {
            nextErrors.wageType = 'Please select a wage type';
        }

        const numericWage = Number(form.wage);
        if (form.wage === '' || form.wage === null || isNaN(numericWage) || numericWage <= 0) {
            nextErrors.wage = 'Wage must be a positive number';
        } else if (numericWage > 10000000) {
            nextErrors.wage = 'Wage cannot exceed 10,000,000';
        }

        if (!form.salaryStructureId) {
            nextErrors.salaryStructureId = 'Please select a salary structure';
        }

        if (form.notes && form.notes.trim().length > 1000) {
            nextErrors.notes = 'Notes cannot exceed 1000 characters';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if (isSubmitting) return { success: false };

        const isValid = validate();
        if (!isValid) {
            return { success: false, errors };
        }

        setIsSubmitting(true);

        const isoStartDate = toIsoDateString(form.startDate);
        const isoEndDate = toIsoDateString(form.endDate);

        const payload = {
            salaryStructureId: form.salaryStructureId,
            startDate: isoStartDate,
            endDate: isoEndDate || null,
            wage: Number(form.wage),
            workingScheduleId: form.workingScheduleId || null,
            status: form.status || 'DRAFT',
            maxPunchesPerDay: Number(form.maxPunchesPerDay || 3),
            notes: form.notes || form.contractName || null,
        };

        if (mode === 'create') {
            payload.employeeId = form.employeeId;
        }

        try {
            let res;
            if (mode === 'create') {
                res = await contractsService.createContract(payload);
                success(res.message || 'Contract created successfully');
            } else {
                res = await contractsService.updateContract(contractId, payload);
                success(res.message || 'Contract updated successfully');
            }

            const createdOrUpdated = res.data || res;
            return {
                success: true,
                id: createdOrUpdated.id || contractId,
                data: createdOrUpdated,
            };
        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;

            if (status === 409) {
                const conflictMsg =
                    data?.message ||
                    'An active contract already covers this date range for this employee';
                setErrors((prev) => ({
                    ...prev,
                    startDate: conflictMsg,
                    endDate: conflictMsg,
                    formBanner: conflictMsg,
                }));
                toastError(conflictMsg);
            } else if (status === 400 || status === 422) {
                const serverErrors = data?.errors;
                const fieldMap = {};

                if (Array.isArray(serverErrors)) {
                    serverErrors.forEach((errItem) => {
                        const key = errItem.path || errItem.param || errItem.field;
                        if (key) {
                            fieldMap[key] = errItem.msg || errItem.message;
                        }
                    });
                } else if (serverErrors && typeof serverErrors === 'object') {
                    Object.entries(serverErrors).forEach(([key, val]) => {
                        fieldMap[key] =
                            typeof val === 'string' ? val : val?.message || 'Invalid value';
                    });
                }

                if (Object.keys(fieldMap).length > 0) {
                    setErrors((prev) => ({ ...prev, ...fieldMap }));
                } else {
                    const fallbackMsg = data?.message || 'Validation error';
                    setErrors((prev) => ({ ...prev, formBanner: fallbackMsg }));
                    toastError(fallbackMsg);
                }
            } else if (status === 403) {
                toastError('You do not have permission to perform this action');
            } else {
                const genericMsg =
                    data?.message || err.message || 'Something went wrong. Please try again.';
                setErrors((prev) => ({ ...prev, formBanner: genericMsg }));
                toastError(genericMsg);
            }

            return { success: false, error: err };
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        form,
        errors,
        isSubmitting,
        loadingDependencies,
        salaryStructures,
        workingSchedules,
        employees,
        handleFieldChange,
        handleSubmit,
        validate,
    };
}
