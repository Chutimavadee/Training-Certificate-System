import React, { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options = [], children, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full" id={`select-container-${props.id || props.name}`}>
        {label && (
          <label 
            className="text-xs font-semibold text-slate-700 tracking-wide" 
            htmlFor={props.id || props.name}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg shadow-sm transition-all outline-none appearance-none cursor-pointer focus:ring-2
              ${error 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'
              } 
              disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
            {...props}
          >
            {children || options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 pointer-events-none flex items-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-400">{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
