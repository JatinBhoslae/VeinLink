import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export const Select = ({
  label,
  error,
  options = [],
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cn(
            'w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg',
            'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200 appearance-none cursor-pointer',
            'hover:border-gray-400 dark:hover:border-gray-500',
            error && 'border-danger-500 focus:ring-danger-500',
            className
          )}
          {...props}
        >
          {options.map((option, idx) => (
            <option
              key={option.key ?? `${option.value}-${idx}`}
              value={option.value}
              className="bg-white dark:bg-gray-700"
              disabled={option.disabled}
              hidden={option.hidden}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown 
            className="w-5 h-5 text-gray-400 dark:text-gray-500" 
            size={20}
          />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
    </div>
  );
};

