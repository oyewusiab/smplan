import { useState, useRef, useEffect } from 'react';
import { User, Check, X } from 'lucide-react';
import type { Member } from '../../types';
import { cn } from '../../utils/cn';

interface MemberAutocompleteProps {
  label?: string;
  value: string;
  onChange: (name: string, phone?: string) => void;
  members: Member[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function MemberAutocomplete({
  label,
  value,
  onChange,
  members,
  placeholder = 'Select or type member name...',
  disabled = false,
  className,
  size = 'md',
}: MemberAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cleanQuery = query.replace(/^(Sister|Brother|Sis\.|Bro\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();

  const filteredMembers = members.filter((m) => {
    if (!cleanQuery) return true;
    const nameMatch = (m.name || '').toLowerCase().includes(cleanQuery);
    const orgMatch = (m.organisation || '').toLowerCase().includes(cleanQuery);
    const callingMatch = (m.calling || '').toLowerCase().includes(cleanQuery);
    return nameMatch || orgMatch || callingMatch;
  }).slice(0, 8);

  const handleSelect = (m: Member) => {
    const rawName = (m.name || '').replace(/^(Sister|Brother|Sis\.|Bro\.|Elder|Bishop|President)\s+/i, '').trim();
    const isFemale = m.gender === 'F' || m.organisation === 'Relief Society' || m.organisation === 'Young Women' || m.organisation === 'Primary';
    const prefix = isFemale ? 'Sis.' : 'Bro.';
    const formattedName = rawName ? `${prefix} ${rawName}` : m.name;

    setQuery(formattedName);
    onChange(formattedName, m.phone || '');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('', '');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
          <User className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            onChange(e.target.value);
          }}
          className={cn(
            'w-full rounded-lg border bg-white pl-8 pr-7 transition-all focus:outline-none focus:ring-2',
            size === 'sm' ? 'py-1 text-xs' : 'py-2 text-sm',
            isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-300 hover:border-slate-400',
            disabled && 'bg-slate-50 cursor-not-allowed opacity-75'
          )}
        />

        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filteredMembers.length === 0 ? (
            <div className="p-2.5 text-center text-xs text-slate-500">
              No matching members found. You can keep typing custom name.
            </div>
          ) : (
            <ul className="p-1 space-y-0.5">
              {filteredMembers.map((m) => {
                const isSelected = query.toLowerCase().includes((m.name || '').toLowerCase());
                const isFemale = m.gender === 'F' || m.organisation === 'Relief Society' || m.organisation === 'Young Women' || m.organisation === 'Primary';

                return (
                  <li
                    key={m.member_id || m.name}
                    onClick={() => handleSelect(m)}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs transition-colors',
                      isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                        isFemale ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {isFemale ? 'F' : 'M'}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-slate-900 truncate">
                          {m.name}
                        </span>
                        {(m.organisation || m.calling) && (
                          <span className="text-[10px] text-slate-400 ml-1.5 truncate">
                            • {m.calling || m.organisation}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
