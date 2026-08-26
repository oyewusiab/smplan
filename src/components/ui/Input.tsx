import { cn } from '../../utils/cn';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
            {props.required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            {...props}
            className={cn(
              'block w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs',
              'placeholder:text-slate-400',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all duration-150',
              'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25',
              icon && 'pl-9.5',
              className
            )}
          />
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
            {props.required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          {...props}
          className={cn(
            'block w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs',
            'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all duration-150',
            'disabled:bg-slate-50 disabled:cursor-not-allowed',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25',
            className
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
            {props.required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          {...props}
          className={cn(
            'block w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs',
            'placeholder:text-slate-400 resize-y',
            'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 transition-all duration-150',
            'disabled:bg-slate-50 disabled:cursor-not-allowed',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25',
            className
          )}
        />
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
