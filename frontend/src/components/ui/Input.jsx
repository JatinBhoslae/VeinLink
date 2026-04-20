import { cn } from '../../lib/utils';

export const Input = ({
  label,
  error,
  className,
  leftIcon,
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
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          className={cn(
            'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg',
            'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-400',
            'hover:border-gray-400 dark:hover:border-gray-500',
            leftIcon && 'pl-10',
            error && 'border-danger-500 focus:ring-danger-500',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
    </div>
  );
};

