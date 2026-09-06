import { useState, useEffect, useRef, useCallback } from 'react';
import DatePickerInput from './subcomponents/DatePickerInput';
import DatePickerPopover from './subcomponents/DatePickerPopover';
import { formatDateToString, parseStringToDate } from './subcomponents/dateUtils';
import { useClickOutside } from '@/hooks/useClickOutside';
import './DatePicker.scss';

/**
 * Shared Modular DatePicker Component
 * Composes DatePickerInput and DatePickerPopover subcomponents.
 */
function DatePicker({
    value = '',
    onChange,
    label = '',
    placeholder = 'DD-MM-YYYY',
    showSelectedValue = true,
    selectedValuePrefix = 'Selected Value: ',
    disabled = false,
    error = '',
    min = null,
    minDate = null,
    max = null,
    maxDate = null,
    clearable = true,
    portal = false,
    align = 'left',
    className = '',
}) {
    const effectiveMin = minDate || min;
    const effectiveMax = maxDate || max;

    const [isOpen, setIsOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState(null);

    const parsedDate = parseStringToDate(value);
    const parsedMin = parseStringToDate(effectiveMin);
    const [viewDate, setViewDate] = useState(() => {
        if (parsedDate) return parsedDate;
        if (parsedMin && parsedMin > new Date()) return parsedMin;
        return new Date();
    });
    const containerRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        const d = parseStringToDate(value);
        if (d) {
            setViewDate(d);
        } else if (effectiveMin) {
            const m = parseStringToDate(effectiveMin);
            if (m) {
                setViewDate((prev) => (prev < m ? m : prev));
            }
        }
    }, [value, effectiveMin]);

    // Real-time position updating for portal mode with auto-flip and boundary clamping
    const updatePosition = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const POPOVER_WIDTH = 308;
        const POPOVER_HEIGHT = 340;

        let leftPos = rect.left;
        if (align === 'right') {
            leftPos = rect.right - POPOVER_WIDTH;
        }

        // Clamp horizontally so popover stays inside viewport
        if (typeof window !== 'undefined') {
            leftPos = Math.max(12, Math.min(leftPos, window.innerWidth - POPOVER_WIDTH - 12));
        }

        // Intelligent vertical auto-flip when space below is constrained
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldFlipTop = spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow;

        const topPos = shouldFlipTop ? Math.max(8, rect.top - POPOVER_HEIGHT - 4) : rect.bottom + 4;

        setPopoverPos({
            top: topPos,
            left: leftPos,
            width: POPOVER_WIDTH,
            zIndex: 99999,
        });
    }, [align]);

    useEffect(() => {
        if (!isOpen || !portal) return;

        updatePosition();

        const handleScroll = (e) => {
            if (popoverRef.current && popoverRef.current.contains(e.target)) return;
            setIsOpen(false);
        };
        const handleResize = () => {
            setIsOpen(false);
        };

        // capture: true catches scroll events from all scrollable parent containers
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen, portal, updatePosition]);

    // Click outside to close (supporting both inline & portal modes)
    useClickOutside([containerRef, popoverRef], () => setIsOpen(false), { enabled: isOpen });

    const handleSelectDate = (date) => {
        const formatted = formatDateToString(date);
        if (onChange) onChange(formatted, date);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        if (onChange) onChange('', null);
    };

    const handleTodayClick = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedMin && today < new Date(new Date(parsedMin).setHours(0, 0, 0, 0))) {
            return;
        }
        handleSelectDate(today);
        setViewDate(today);
    };

    const displayString = parsedDate
        ? formatDateToString(parsedDate)
        : typeof value === 'string'
          ? value
          : '';

    return (
        <div
            className={`shared-datepicker-container ${disabled ? 'is-disabled' : ''} ${error ? 'has-error' : ''} ${className}`}
            ref={containerRef}
        >
            {/* 1. Input Trigger Subcomponent */}
            <DatePickerInput
                label={label}
                displayString={displayString}
                placeholder={placeholder}
                isOpen={isOpen}
                disabled={disabled}
                clearable={clearable}
                onToggle={() => setIsOpen(!isOpen)}
                onClear={handleClear}
            />

            {/* 2. Popover Dropdown Subcomponent */}
            <DatePickerPopover
                isOpen={isOpen}
                disabled={disabled}
                portal={portal}
                popoverPos={popoverPos}
                popoverRef={popoverRef}
                parsedDate={parsedDate}
                onSelectDate={handleSelectDate}
                viewDate={viewDate}
                onViewDateChange={setViewDate}
                min={effectiveMin}
                max={effectiveMax}
                onTodayClick={handleTodayClick}
            />

            {showSelectedValue && (
                <div className="datepicker-selected-info">
                    {selectedValuePrefix}
                    <strong>{displayString || 'None'}</strong>
                </div>
            )}

            {error && <span className="datepicker-error-msg">{error}</span>}
        </div>
    );
}

export default DatePicker;
