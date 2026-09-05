import { Upload, Trash2, Plus, Pencil } from 'lucide-react';
import { DEFAULT_AVATAR_URL } from '@/utils/avatar';

export default function AvatarPreview({
    value,
    size,
    dragActive,
    fileInputRef,
    triggerFileInput,
    handleFileChange,
    handleDrag,
    handleDrop,
    handleRemoveClick,
    disabled = false,
}) {
    return (
        <>
            <div
                className={`avatar-preview-ring ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                style={{ width: `${size}px`, height: `${size}px` }}
            >
                <button
                    type="button"
                    className={`avatar-interactive-preview${disabled ? ' is-disabled' : ''}`}
                    onClick={triggerFileInput}
                    title={disabled ? undefined : 'Upload or Change Photo'}
                    disabled={disabled}
                >
                    {value && value !== DEFAULT_AVATAR_URL ? (
                        <img
                            src={value}
                            alt="Profile preview"
                            className="avatar-actual-image"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = DEFAULT_AVATAR_URL;
                            }}
                        />
                    ) : (
                        <img
                            src={DEFAULT_AVATAR_URL}
                            alt="Default profile preview"
                            className="avatar-actual-image"
                            referrerPolicy="no-referrer"
                        />
                    )}

                    {/* Hover overlay */}
                    <div className="avatar-hover-overlay">
                        {value &&
                        value !== 'https://ik.imagekit.io/2bzzjhgkg/defaul_profile_image.jpeg' ? (
                            <Pencil size={18} />
                        ) : (
                            <Plus size={20} />
                        )}
                        <span className="hover-text">
                            {value &&
                            value !== 'https://ik.imagekit.io/2bzzjhgkg/defaul_profile_image.jpeg'
                                ? 'Change'
                                : 'Upload'}
                        </span>
                    </div>
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="avatar-hidden-file-input"
                    onChange={handleFileChange}
                    disabled={disabled}
                />
            </div>

            {!disabled && (
                <div className="avatar-actions-buttons">
                    <button
                        type="button"
                        className="upload-action-btn primary-action"
                        onClick={triggerFileInput}
                    >
                        <Upload size={14} />
                        <span>
                            {value && value !== DEFAULT_AVATAR_URL
                                ? 'Change Image'
                                : 'Upload Image'}
                        </span>
                    </button>

                    {value && value !== DEFAULT_AVATAR_URL && (
                        <button
                            type="button"
                            className="upload-action-btn danger-action"
                            onClick={handleRemoveClick}
                        >
                            <Trash2 size={14} />
                            <span>Remove</span>
                        </button>
                    )}
                </div>
            )}

            <span className="upload-tip-text">
                Supported formats: JPEG, PNG, JPG, WEBP, GIF (max. 5MB).
                <br />
                Drag & drop or click preview to browse.
            </span>
        </>
    );
}
