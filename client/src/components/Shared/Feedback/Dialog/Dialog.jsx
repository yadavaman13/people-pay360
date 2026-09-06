import { useEffect, isValidElement } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/Shared/Buttons/Button/Button';
import './Dialog.scss';

const CloseIcon = () => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

function Dialog({
    isOpen = false,
    onClose,
    title,
    variant = 'primary', // primary | danger | success | warning
    size = 'md', // sm | md | lg | xl
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    closeOnBackdrop = true,
    showCloseIcon = true,
    confirmLoading = false,
    confirmDisabled = false,
    isConfirmLoading = false,
    footer,
    children,
}) {
    const effectiveConfirmLoading = Boolean(confirmLoading || isConfirmLoading);
    const isConfirmActionDisabled = Boolean(confirmDisabled || effectiveConfirmLoading);

    // Prevent scrolling on background when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Close modal on Escape key press
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !effectiveConfirmLoading) {
                onClose && onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, effectiveConfirmLoading]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        // Only close if user clicked directly on the overlay backdrop
        if (
            closeOnBackdrop &&
            !effectiveConfirmLoading &&
            e.target.classList.contains('shared-dialog-overlay')
        ) {
            onClose && onClose();
        }
    };

    const handleConfirmClick = (e) => {
        if (isConfirmActionDisabled) return;
        onConfirm && onConfirm(e);
    };

    // Render modal content
    const modalContent = (
        <div className="shared-dialog-overlay" onClick={handleBackdropClick} role="presentation">
            <div
                className={`shared-dialog-card size-${size} variant-${variant}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                {/* Header */}
                <div className="shared-dialog-header">
                    <h3
                        id="dialog-title"
                        className="dialog-title-text"
                        title={typeof title === 'string' ? title : undefined}
                    >
                        {title}
                    </h3>
                    {showCloseIcon && (
                        <button
                            type="button"
                            className="dialog-close-btn"
                            onClick={onClose}
                            aria-label="Close dialog"
                            disabled={effectiveConfirmLoading}
                        >
                            <CloseIcon />
                        </button>
                    )}
                </div>

                {/* Content Body */}
                <div className="shared-dialog-body">{children}</div>

                {/* Footer Actions */}
                {footer !== undefined ? (
                    footer ? (
                        isValidElement(footer) &&
                        footer.props?.className?.includes('shared-dialog-footer') ? (
                            footer
                        ) : (
                            <div className="shared-dialog-footer">{footer}</div>
                        )
                    ) : null
                ) : (
                    Boolean(cancelText || confirmText) && (
                        <div className="shared-dialog-footer">
                            {cancelText && (
                                <Button
                                    preset="cancel"
                                    onClick={onClose}
                                    label={cancelText}
                                    disabled={effectiveConfirmLoading}
                                />
                            )}
                            {confirmText && (
                                <Button
                                    preset="save"
                                    onClick={handleConfirmClick}
                                    label={confirmText}
                                    variant={variant}
                                    loading={effectiveConfirmLoading}
                                    disabled={isConfirmActionDisabled}
                                />
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );

    // Mount at document body using React Portals
    return createPortal(modalContent, document.body);
}

export default Dialog;
