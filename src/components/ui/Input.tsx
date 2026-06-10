import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full" id={`input-container-${props.id || props.name}`}>
        {label && (
          <label 
            className="text-xs font-semibold text-slate-700 tracking-wide" 
            htmlFor={props.id || props.name}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`px-3 py-2 text-sm bg-white border rounded-lg shadow-sm transition-all outline-none focus:ring-2
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
              : 'border-slate-200 focus:border-blue-500 focus:ring-blue-50'
            } 
            disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-300 ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-slate-400">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
