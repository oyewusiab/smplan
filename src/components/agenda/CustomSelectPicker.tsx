import { useState, useMemo } from 'react';
import { Edit2, List } from 'lucide-react';

interface CustomSelectPickerProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function CustomSelectPicker({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  size = 'xs',
  className = '',
}: CustomSelectPickerProps) {
  const [customMode, setCustomMode] = useState(false);

  // Check if current value exists in predefined list
  const matchedOption = useMemo(() => {
    if (!value || !value.trim()) return '';
    const valClean = value.trim().toLowerCase();
    const exact = options.find((opt) => opt === value.trim());
    if (exact) return exact;
    const caseMatch = options.find((opt) => opt.toLowerCase() === valClean);
    if (caseMatch) return caseMatch;
    return '';
  }, [options, value]);

  const selectedValue = useMemo(() => {
    if (!value || !value.trim()) return '';
    if (matchedOption) return matchedOption;
    return value.trim();
  }, [value, matchedOption]);

  const py = size === 'xs' ? 'py-1 text-xs' : 'py-1.5 text-xs';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">{label}</label>
          <button
            type="button"
            onClick={() => setCustomMode(!customMode)}
            className="text-2xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
            title={customMode ? 'Switch to dropdown selection' : 'Switch to manual type input'}
          >
            {customMode ? (
              <>
                <List className="h-3 w-3" /> Select Dropdown
              </>
            ) : (
              <>
                <Edit2 className="h-3 w-3" /> Type Custom
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 w-full">
        {!customMode ? (
          <select
            value={selectedValue}
            onChange={(e) => {
              if (e.target.value === '__CUSTOM__') {
                setCustomMode(true);
              } else {
                onChange(e.target.value);
              }
            }}
            className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 ${py} font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs truncate`}
          >
            <option value="">{placeholder}</option>
            {/* If value is not in options list, render it as selected option */}
            {selectedValue && !options.includes(selectedValue) && (
              <option value={selectedValue}>
                {selectedValue} (Custom)
              </option>
            )}
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            <option value="__CUSTOM__">✏️ + Custom / Other...</option>
          </select>
        ) : (
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 ${py} font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs`}
          />
        )}

        <button
          type="button"
          onClick={() => setCustomMode(!customMode)}
          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          title={customMode ? 'Switch to dropdown' : 'Switch to custom entry'}
        >
          {customMode ? <List className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
