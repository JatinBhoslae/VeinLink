import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  addYears, 
  subYears, 
  isSameDay, 
  isSameMonth, 
  isBefore, 
  isAfter, 
  parseISO, 
  getYear, 
  setYear, 
  setMonth,
  getMonth,
  isToday as isDateToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

export const DatePicker = ({
  label,
  value,
  onChange,
  min,
  max,
  className,
  error,
}) => {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : null;
  const initialMonth = selectedDate || new Date();
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const monthPickerRef = useRef(null);
  const yearPickerRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 0 });
  
  // Generate years for the year dropdown (20 years range)
  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    const years = [];
    for (let i = currentYear - 100; i <= currentYear + 10; i++) {
      years.push(i);
    }
    return years;
  }, []);
  
  // Months for the month dropdown
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target) && 
          !event.target.closest('.month-trigger')) {
        setShowMonthPicker(false);
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target) && 
          !event.target.closest('.year-trigger')) {
        setShowYearPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const clickedInsideTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const clickedInsidePopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!clickedInsideTrigger && !clickedInsidePopover) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePos = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let day = startDate;
    let done = false;
    while (!done) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(day);
        day = addDays(day, 1);
      }
      rows.push(days);
      done = day > endDate;
    }
    return rows;
  }, [currentMonth]);

  const isDisabled = (d) => {
    if (minDate && isBefore(d, minDate)) return true;
    if (maxDate && isAfter(d, maxDate)) return true;
    return false;
  };

  const handleSelect = useCallback((d) => {
    if (isDisabled(d)) return;
    const formattedDate = format(d, 'yyyy-MM-dd');
    onChange && onChange(formattedDate);
    setInputValue(formattedDate);
    setOpen(false);
  }, [onChange]);
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Basic validation for date format (yyyy-mm-dd)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(value)) {
      const date = parseISO(value);
      if (!isNaN(date.getTime())) {
        onChange && onChange(value);
      }
    }
  };
  
  const handleInputBlur = () => {
    setIsInputFocused(false);
    // Format the date on blur if it's a valid date
    if (value) {
      setInputValue(format(parseISO(value), 'yyyy-MM-dd'));
    }
  };
  
  const changeYear = (year) => {
    setCurrentMonth(setYear(currentMonth, year));
    setShowYearPicker(false);
  };
  
  const changeMonth = (month) => {
    setCurrentMonth(setMonth(currentMonth, month));
    setShowMonthPicker(false);
  };
  
  const handleKeyDown = (e, d) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(d);
    }
  };

  return (
    <div className="w-full" ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={isInputFocused ? inputValue : (value ? format(parseISO(value), 'yyyy-MM-dd') : '')}
            onChange={handleInputChange}
            onFocus={() => {
              setOpen(true);
              setIsInputFocused(true);
              setInputValue(value || '');
            }}
            onBlur={handleInputBlur}
            placeholder="YYYY-MM-DD"
            className={cn(
              'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500',
              error && 'border-danger-500 focus:ring-danger-500',
              className
            )}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            ref={triggerRef}
          >
            <CalendarDays className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        {open && createPortal(
          <div
            className="fixed z-[1000] w-80 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            style={{ top: popoverPos.top, left: popoverPos.left, minWidth: popoverPos.width }}
            ref={popoverRef}
          >
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-1 month-trigger"
                      onClick={() => {
                        setShowMonthPicker(!showMonthPicker);
                        setShowYearPicker(false);
                      }}
                    >
                      {format(currentMonth, 'MMMM')}
                      {showMonthPicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showMonthPicker && (
                      <div 
                        ref={monthPickerRef}
                        className="absolute z-10 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 grid grid-cols-3 gap-1"
                      >
                        {months.map((month, i) => (
                          <button
                            key={month}
                            type="button"
                            className={`text-xs p-1.5 rounded-md text-center ${
                              getMonth(currentMonth) === i
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => changeMonth(i)}
                          >
                            {month.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button
                      type="button"
                      className="px-2 py-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-1 year-trigger"
                      onClick={() => {
                        setShowYearPicker(!showYearPicker);
                        setShowMonthPicker(false);
                      }}
                    >
                      {format(currentMonth, 'yyyy')}
                      {showYearPicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showYearPicker && (
                      <div 
                        ref={yearPickerRef}
                        className="absolute z-10 mt-1 w-24 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 grid grid-cols-1 gap-1"
                      >
                        {years.map((year) => (
                          <button
                            key={year}
                            type="button"
                            className={`text-xs p-1.5 rounded-md text-center ${
                              getYear(currentMonth) === year
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => changeYear(year)}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 dark:text-gray-400">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                  <div key={i} className="h-6 flex items-center justify-center">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-7 gap-1">
                {weeks.map((week, wi) => (
                  week.map((d) => {
                    const disabled = isDisabled(d);
                    const selected = selectedDate && isSameDay(d, selectedDate);
                    const inMonth = isSameMonth(d, currentMonth);
                    const isToday = isSameDay(d, new Date());
                    return (
                      <button
                        type="button"
                        key={`${wi}-${d.toISOString()}`}
                        onClick={() => handleSelect(d)}
                        disabled={disabled}
                        className={cn(
                          'h-8 w-8 rounded-full text-sm flex items-center justify-center transition-all',
                          inMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
                          disabled && 'opacity-40 cursor-not-allowed',
                          selected && 'bg-primary-600 text-white font-medium',
                          !selected && !disabled && 'hover:bg-gray-100 dark:hover:bg-gray-700',
                          isToday && !selected && 'ring-1 ring-primary-500',
                          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                          'active:scale-95 transform transition-transform duration-75'
                        )}
                        onKeyDown={(e) => handleKeyDown(e, d)}
                        tabIndex={0}
                      >
                        {format(d, 'd')}
                      </button>
                    );
                  })
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
    </div>
  );
};
