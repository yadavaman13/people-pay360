import { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { EmployeesContext } from '../../context/employees.context';
import { useEmployees } from '../../hooks';
import SmartButtonsBar from '../../components/SmartButtonsBar/SmartButtonsBar';
import SmartRecordsDrawer from '../../components/SmartRecordsDrawer/SmartRecordsDrawer';
import Button from '@/components/Shared/Buttons/Button/Button';
import InputField from '@/components/Shared/Form/InputField/InputField';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Dialog from '@/components/Shared/Feedback/Dialog/Dialog';
import { getAvatarUrl } from '@/utils/avatar';
import { Save, X, Edit3, Trash2, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import './EmployeeFormPage.scss';

function EmployeeFormPage({ isNew = false }) {
    const { id: paramId } = useParams();
    const navigate = useNavigate();
    const isCreateMode = isNew || paramId === 'new';

    // 1. Read Path: Read state directly from EmployeesContext
    const {
        currentEmployee,
        currentEmployeeSmartCounts,
        smartDrawer,
        metadata,
        formLoading,
        actionLoading,
        notification,
        employees,
    } = useContext(EmployeesContext);

    // 2. Action Path: Call useEmployees for action handlers only
    const {
        loadEmployeeDetails,
        handleSaveEmployee,
        handleArchiveEmployee,
        openSmartRecordsDrawer,
        closeSmartRecordsDrawer,
        handleAddBankAccount,
        handleSetPrimaryBankAccount,
        handleDeleteBankAccount,
        loadMetadata,
        dismissNotification,
        handleUploadAvatar,
    } = useEmployees();

    const fileInputRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

    const [isEditing, setIsEditing] = useState(isCreateMode);
    const [activeTab, setActiveTab] = useState('work'); // 'work' | 'private'
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    // Controlled form state
    const [formData, setFormData] = useState({
        userId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: 'Male',
        dateOfBirth: '',
        address: '',
        hireDate: new Date().toISOString().split('T')[0],
        departmentId: '',
        jobPositionId: '',
        managerId: '',
        workingScheduleId: '',
        status: 'ACTIVE',
        notes: '',
        // Primary bank details
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        ifscCode: '',
    });

    useEffect(() => {
        loadMetadata();
        if (!isCreateMode && paramId) {
            loadEmployeeDetails(paramId);
        }
    }, [isCreateMode, paramId, loadEmployeeDetails, loadMetadata]);

    useEffect(() => {
        setAvatarPreview(null);
        setSelectedAvatarFile(null);
    }, [paramId]);

    // Populate formData when currentEmployee loads or changes
    useEffect(() => {
        if (!isCreateMode && currentEmployee) {
            setFormData({
                userId: currentEmployee.userId || '',
                firstName: currentEmployee.firstName || '',
                lastName: currentEmployee.lastName || '',
                email: currentEmployee.email || '',
                phone: currentEmployee.phone || '',
                gender: currentEmployee.gender || 'Male',
                dateOfBirth: currentEmployee.dateOfBirth
                    ? currentEmployee.dateOfBirth.split('T')[0]
                    : '',
                address: currentEmployee.address || '',
                hireDate: currentEmployee.hireDate ? currentEmployee.hireDate.split('T')[0] : '',
                departmentId: currentEmployee.departmentId || currentEmployee.department?.id || '',
                jobPositionId:
                    currentEmployee.jobPositionId || currentEmployee.jobPosition?.id || '',
                managerId: currentEmployee.managerId || currentEmployee.manager?.id || '',
                workingScheduleId:
                    currentEmployee.workingScheduleId || currentEmployee.workingSchedule?.id || '',
                status: currentEmployee.status || 'ACTIVE',
                notes: currentEmployee.notes || '',
                bankName: currentEmployeeSmartCounts.primaryBankAccount?.bankName || '',
                accountNumber: currentEmployeeSmartCounts.primaryBankAccount?.accountNumber || '',
                accountHolderName:
                    currentEmployeeSmartCounts.primaryBankAccount?.accountHolderName || '',
                ifscCode: currentEmployeeSmartCounts.primaryBankAccount?.ifscCode || '',
            });
        }
    }, [isCreateMode, currentEmployee, currentEmployeeSmartCounts.primaryBankAccount]);

    const handleChange = (field, value) => {
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            // Reset job position if department changes and position doesn't match
            if (field === 'departmentId' && value) {
                const currentPos = metadata.jobPositions.find((p) => p.id === next.jobPositionId);
                if (currentPos && currentPos.departmentId !== value) {
                    next.jobPositionId = '';
                }
            }
            return next;
        });
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);

        if (!isCreateMode && paramId) {
            setIsUploadingAvatar(true);
            try {
                await handleUploadAvatar(paramId, file);
            } catch (err) {
                console.error('Failed to upload avatar:', err);
            } finally {
                setIsUploadingAvatar(false);
            }
        } else {
            setSelectedAvatarFile(file);
        }
    };

    const handleSave = async () => {
        try {
            if (isCreateMode) {
                const created = await handleSaveEmployee(null, formData);
                if (created?.id) {
                    if (selectedAvatarFile) {
                        try {
                            await handleUploadAvatar(created.id, selectedAvatarFile);
                        } catch (err) {
                            console.error('Failed to upload avatar for new employee:', err);
                        }
                    }
                    navigate(`/dashboard/user/employees/${created.id}`);
                    setIsEditing(false);
                }
            } else {
                await handleSaveEmployee(paramId, formData);
                setIsEditing(false);
            }
        } catch (err) {
            console.error('Save employee error:', err);
        }
    };

    const handleDiscard = () => {
        if (isCreateMode) {
            navigate('/dashboard/user/employees');
        } else {
            setIsEditing(false);
            // Reset form from currentEmployee
            if (currentEmployee) {
                setFormData((prev) => ({
                    ...prev,
                    firstName: currentEmployee.firstName || '',
                    lastName: currentEmployee.lastName || '',
                    phone: currentEmployee.phone || '',
                    address: currentEmployee.address || '',
                    status: currentEmployee.status || 'ACTIVE',
                }));
            }
        }
    };

    const handleConfirmArchive = async () => {
        setShowArchiveConfirm(false);
        try {
            await handleArchiveEmployee(paramId);
            navigate('/dashboard/user/employees');
        } catch (err) {
            console.error('Archive employee error:', err);
        }
    };

    // Filter job positions by selected department
    const availablePositions = useMemo(() => {
        if (!formData.departmentId) return metadata.jobPositions;
        return metadata.jobPositions.filter(
            (p) => !p.departmentId || p.departmentId === formData.departmentId,
        );
    }, [formData.departmentId, metadata.jobPositions]);

    // Active manager candidates (exclude self)
    const availableManagers = useMemo(() => {
        return employees.filter((e) => e.id !== paramId && e.status === 'ACTIVE');
    }, [employees, paramId]);

    const activeSchedule = metadata.schedules.find((s) => s.id === formData.workingScheduleId);

    const firstName = formData.firstName || (!isCreateMode ? currentEmployee?.firstName : '') || '';
    const lastName = formData.lastName || (!isCreateMode ? currentEmployee?.lastName : '') || '';
    const fullName =
        `${firstName} ${lastName}`.trim() || (isCreateMode ? 'New Employee' : 'Employee Profile');
    const initials =
        `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || (isCreateMode ? 'NE' : 'EM');
    const avatarImage =
        avatarPreview ||
        getAvatarUrl(currentEmployee?.profileImage || currentEmployee?.user?.profileImage);

    const departmentName =
        metadata.departments.find((d) => d.id === formData.departmentId)?.name ||
        (!isCreateMode ? currentEmployee?.department?.name : '') ||
        'Not Assigned';

    const jobTitle =
        metadata.jobPositions.find((p) => p.id === formData.jobPositionId)?.title ||
        (!isCreateMode ? currentEmployee?.jobPosition?.title : '') ||
        'Role Not Assigned';

    const managerName = availableManagers.find((m) => m.id === formData.managerId)
        ? `${availableManagers.find((m) => m.id === formData.managerId).firstName} ${
              availableManagers.find((m) => m.id === formData.managerId).lastName
          }`
        : currentEmployee?.manager
          ? `${currentEmployee.manager.firstName} ${currentEmployee.manager.lastName}`
          : 'None (Top Level)';

    const hasPrimaryBank = Boolean(
        currentEmployeeSmartCounts.primaryBankAccount?.id ||
        (formData.bankName && formData.accountNumber),
    );

    if (formLoading && !currentEmployee && !isCreateMode) {
        return (
            <div className="employee-form-loading">
                <Spinner size="lg" />
                <p>Loading employee record...</p>
            </div>
        );
    }

    return (
        <div className="employee-form-page">
            {/* Notification Banner */}
            {notification && (
                <div className={`notification-banner banner--${notification.type}`}>
                    <div className="banner-content">
                        {notification.type === 'danger' ? (
                            <AlertCircle size={18} />
                        ) : (
                            <CheckCircle2 size={18} />
                        )}
                        <div>
                            <strong>{notification.title}: </strong>
                            <span>{notification.message}</span>
                        </div>
                    </div>
                    <button type="button" className="banner-close" onClick={dismissNotification}>
                        ✕
                    </button>
                </div>
            )}

            {/* Breadcrumb matching Image 3 wireframe */}
            <div className="employee-form-page__breadcrumb">
                <Link to="/dashboard/user/employees" className="breadcrumb-root">
                    Employees
                </Link>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-current">{fullName}</span>
            </div>

            <p className="employee-form-page__subtitle">
                Main employee form with related HR actions
            </p>

            {/* Top Action Bar matching Image 3 */}
            <div className="employee-form-page__action-bar">
                <div className="left-actions">
                    {!isEditing ? (
                        <Button
                            variant="secondary"
                            icon={Edit3}
                            onClick={() => setIsEditing(true)}
                            className="edit-btn"
                        >
                            EDIT
                        </Button>
                    ) : (
                        <div className="edit-controls">
                            <Button
                                variant="primary"
                                icon={Save}
                                onClick={handleSave}
                                loading={actionLoading}
                            >
                                SAVE
                            </Button>
                            <Button
                                variant="secondary"
                                icon={X}
                                onClick={handleDiscard}
                                disabled={actionLoading}
                            >
                                DISCARD
                            </Button>
                        </div>
                    )}

                    {!isCreateMode && !isEditing && (
                        <Button
                            variant="ghost"
                            icon={Trash2}
                            onClick={() => setShowArchiveConfirm(true)}
                            className="archive-btn"
                        >
                            Archive
                        </Button>
                    )}
                </div>

                {/* Smart Buttons on the right matching Image 3 wireframe */}
                {!isCreateMode && (
                    <SmartButtonsBar
                        timeOffCount={currentEmployeeSmartCounts.timeOffCount}
                        contractsCount={currentEmployeeSmartCounts.contractsCount}
                        attendanceCount={currentEmployeeSmartCounts.attendanceCount}
                        hasBankDetails={hasPrimaryBank}
                        onButtonClick={(type) => openSmartRecordsDrawer(type, paramId)}
                    />
                )}
            </div>

            {/* Profile Header Card matching Image 3 */}
            <div className="employee-form-card">
                <div className="employee-profile-header">
                    <div
                        className="profile-avatar-box has-upload"
                        onClick={handleAvatarClick}
                        role="button"
                        tabIndex={0}
                        title="Click to upload profile photo"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAvatarClick();
                            }
                        }}
                    >
                        {avatarImage ? (
                            <img src={avatarImage} alt={fullName} className="avatar-img" />
                        ) : (
                            <span>{initials}</span>
                        )}
                        <div className="avatar-upload-overlay">
                            <Camera size={18} />
                            <span>Upload</span>
                        </div>
                        {isUploadingAvatar && (
                            <div className="avatar-uploading-spinner">
                                <Spinner size="sm" />
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="profile-identity">
                        {!isEditing ? (
                            <h2 className="profile-name">{fullName}</h2>
                        ) : (
                            <div className="name-inputs-row">
                                <InputField
                                    label="First Name"
                                    value={formData.firstName}
                                    onChange={(e) => handleChange('firstName', e.target.value)}
                                    placeholder="First Name"
                                    required
                                />
                                <InputField
                                    label="Last Name"
                                    value={formData.lastName}
                                    onChange={(e) => handleChange('lastName', e.target.value)}
                                    placeholder="Last Name"
                                    required
                                />
                            </div>
                        )}

                        <div className="profile-role-line">
                            <span className="job-role">{jobTitle}</span>
                            <span className="dot-separator">•</span>
                            <span className="dept-name">{departmentName}</span>
                        </div>

                        <div className="profile-contact-line">
                            <span className="contact-email">
                                {formData.email ||
                                    (!isCreateMode ? currentEmployee?.email : '') ||
                                    'email@company.com'}
                            </span>
                            <span className="pipe-separator">|</span>
                            <span className="contact-phone">
                                {formData.phone ||
                                    (!isCreateMode ? currentEmployee?.phone : '') ||
                                    '+91 —'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form Tabs: [ Work Information ] | [ Private Information ] */}
                <div className="form-tabs-nav" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'work'}
                        className={`tab-btn ${activeTab === 'work' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('work')}
                    >
                        Work Information
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'private'}
                        className={`tab-btn ${activeTab === 'private' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('private')}
                    >
                        Private Information
                    </button>
                </div>

                {/* Tab 1: Work Information */}
                {activeTab === 'work' && (
                    <div className="form-tab-content work-info-tab">
                        <div className="fields-two-column-grid">
                            {/* Left Column */}
                            <div className="column-section">
                                <div className="field-group">
                                    <label className="field-label">Department</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">{departmentName}</div>
                                    ) : (
                                        <select
                                            value={formData.departmentId}
                                            onChange={(e) =>
                                                handleChange('departmentId', e.target.value)
                                            }
                                            className="form-select-control"
                                        >
                                            <option value="">Select Department</option>
                                            {metadata.departments.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Manager</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">{managerName}</div>
                                    ) : (
                                        <select
                                            value={formData.managerId}
                                            onChange={(e) =>
                                                handleChange('managerId', e.target.value)
                                            }
                                            className="form-select-control"
                                        >
                                            <option value="">No Manager (Top Level)</option>
                                            {availableManagers.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.firstName} {m.lastName} ({m.employeeCode})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Working Schedule</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {activeSchedule
                                                ? `${activeSchedule.name} (${activeSchedule.weeklyHours || 40} Hours / Week)`
                                                : currentEmployee?.workingSchedule?.name ||
                                                  'Standard 40 Hours / Week'}
                                        </div>
                                    ) : (
                                        <select
                                            value={formData.workingScheduleId}
                                            onChange={(e) =>
                                                handleChange('workingScheduleId', e.target.value)
                                            }
                                            className="form-select-control"
                                        >
                                            <option value="">Select Working Schedule</option>
                                            {metadata.schedules.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} ({s.weeklyHours || 40} Hours / Week)
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Company</label>
                                    <div className="field-display-box">PeoplePay360 Pvt Ltd</div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="column-section">
                                <div className="field-group">
                                    <label className="field-label">Job Position</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">{jobTitle}</div>
                                    ) : (
                                        <select
                                            value={formData.jobPositionId}
                                            onChange={(e) =>
                                                handleChange('jobPositionId', e.target.value)
                                            }
                                            className="form-select-control"
                                        >
                                            <option value="">Select Job Position</option>
                                            {availablePositions.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.title}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Work Location</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {formData.address || 'Headquarters'}
                                        </div>
                                    ) : (
                                        <InputField
                                            value={formData.address}
                                            onChange={(e) =>
                                                handleChange('address', e.target.value)
                                            }
                                            placeholder="e.g. Mumbai HQ / Bangalore"
                                        />
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Status</label>
                                    {!isEditing ? (
                                        <div className="field-display-box status-value">
                                            <span
                                                className={`status-pill pill--${formData.status.toLowerCase()}`}
                                            >
                                                ● {formData.status}
                                            </span>
                                        </div>
                                    ) : (
                                        <select
                                            value={formData.status}
                                            onChange={(e) => handleChange('status', e.target.value)}
                                            className="form-select-control"
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="DRAFT">Draft</option>
                                            <option value="SUSPENDED">Suspended</option>
                                            <option value="ARCHIVED">Archived</option>
                                        </select>
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Work Email</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {formData.email || '—'}
                                        </div>
                                    ) : (
                                        <InputField
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                            placeholder="name@company.com"
                                            required
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: Private Information */}
                {activeTab === 'private' && (
                    <div className="form-tab-content private-info-tab">
                        <div className="fields-two-column-grid">
                            {/* Personal Details */}
                            <div className="column-section">
                                <h4 className="section-title">Personal Contact & Identification</h4>

                                <div className="field-group">
                                    <label className="field-label">Personal Phone</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {formData.phone || '—'}
                                        </div>
                                    ) : (
                                        <InputField
                                            value={formData.phone}
                                            onChange={(e) => handleChange('phone', e.target.value)}
                                            placeholder="+91 98200 12345"
                                        />
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Gender</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {formData.gender || '—'}
                                        </div>
                                    ) : (
                                        <select
                                            value={formData.gender}
                                            onChange={(e) => handleChange('gender', e.target.value)}
                                            className="form-select-control"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Date of Birth</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {formData.dateOfBirth || '—'}
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            value={formData.dateOfBirth}
                                            onChange={(e) =>
                                                handleChange('dateOfBirth', e.target.value)
                                            }
                                            className="form-date-control"
                                        />
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Hire Date</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {formData.hireDate || '—'}
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            value={formData.hireDate}
                                            onChange={(e) =>
                                                handleChange('hireDate', e.target.value)
                                            }
                                            className="form-date-control"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="column-section">
                                <h4 className="section-title">Bank Account (Payroll Settlement)</h4>

                                <div className="field-group">
                                    <label className="field-label">Bank Name</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {currentEmployeeSmartCounts.primaryBankAccount
                                                ?.bankName ||
                                                formData.bankName ||
                                                '—'}
                                        </div>
                                    ) : (
                                        <InputField
                                            value={formData.bankName}
                                            onChange={(e) =>
                                                handleChange('bankName', e.target.value)
                                            }
                                            placeholder="e.g. HDFC Bank"
                                        />
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Account Number</label>
                                    {!isEditing ? (
                                        <div className="field-display-box font-mono">
                                            {currentEmployeeSmartCounts.primaryBankAccount
                                                ?.accountNumber ||
                                                formData.accountNumber ||
                                                '—'}
                                        </div>
                                    ) : (
                                        <InputField
                                            value={formData.accountNumber}
                                            onChange={(e) =>
                                                handleChange('accountNumber', e.target.value)
                                            }
                                            placeholder="Account Number"
                                        />
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">Account Holder Name</label>
                                    {!isEditing ? (
                                        <div className="field-display-box">
                                            {currentEmployeeSmartCounts.primaryBankAccount
                                                ?.accountHolderName ||
                                                formData.accountHolderName ||
                                                fullName}
                                        </div>
                                    ) : (
                                        <InputField
                                            value={formData.accountHolderName}
                                            onChange={(e) =>
                                                handleChange('accountHolderName', e.target.value)
                                            }
                                            placeholder="Account Holder Name"
                                        />
                                    )}
                                </div>

                                <div className="field-group">
                                    <label className="field-label">IFSC Code</label>
                                    {!isEditing ? (
                                        <div className="field-display-box font-mono">
                                            {currentEmployeeSmartCounts.primaryBankAccount
                                                ?.ifscCode ||
                                                formData.ifscCode ||
                                                '—'}
                                        </div>
                                    ) : (
                                        <InputField
                                            value={formData.ifscCode}
                                            onChange={(e) =>
                                                handleChange(
                                                    'ifscCode',
                                                    e.target.value.toUpperCase(),
                                                )
                                            }
                                            placeholder="e.g. HDFC0001234"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Useful Note matching Image 3 wireframe */}
            <div className="useful-note">
                Useful note: smart buttons should open related Contracts, Attendance and Time Off
                records filtered for the current employee.
            </div>

            {/* Smart Records Slide-Over Drawer */}
            <SmartRecordsDrawer
                isOpen={smartDrawer.isOpen}
                onClose={closeSmartRecordsDrawer}
                type={smartDrawer.type}
                title={smartDrawer.title}
                records={smartDrawer.records}
                loading={smartDrawer.loading}
                employeeId={paramId}
                onAddBankAccount={handleAddBankAccount}
                onSetPrimaryBankAccount={handleSetPrimaryBankAccount}
                onDeleteBankAccount={handleDeleteBankAccount}
            />

            {/* Archive Confirmation Dialog */}
            <Dialog
                isOpen={showArchiveConfirm}
                onClose={() => setShowArchiveConfirm(false)}
                title="Archive Employee Profile"
                size="md"
                variant="danger"
                footer={
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button
                            preset="cancel"
                            onClick={() => setShowArchiveConfirm(false)}
                            disabled={actionLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmArchive}
                            loading={actionLoading}
                        >
                            Confirm Archive
                        </Button>
                    </div>
                }
            >
                <div className="archive-dialog-body">
                    <p>
                        Are you sure you want to archive <strong>{fullName}</strong>?
                    </p>
                    <p className="note-text">
                        Archiving deactivates this employee from active rosters while securely
                        preserving all historical contracts, attendance logs, and payroll
                        calculations.
                    </p>
                </div>
            </Dialog>
        </div>
    );
}

export default EmployeeFormPage;
