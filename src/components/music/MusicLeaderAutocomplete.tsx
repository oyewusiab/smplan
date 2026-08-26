import { useState, useRef, useEffect } from 'react';
import { User, AlertTriangle, X, Check } from 'lucide-react';
import type { Member } from '../../types';
import { cn } from '../../utils/cn';

interface MusicLeaderAutocompleteProps {
  label: string;
  value: string;
  genderValue?: 'M' | 'F' | '';
  onChange: (name: string, gender: 'M' | 'F' | '') => void;
  members: Member[];
  roleType?: 'director' | 'accompanist';
  dateStr?: string;
  unavailableMembers?: Record<string, string[]>; // name -> dates[]
  disabled?: boolean;
  className?: string;
}

export function MusicLeaderAutocomplete({
  label,
  value,
  genderValue = '',
  onChange,
  members,
  roleType = 'director',
  dateStr,
  unavailableMembers = {},
  disabled = false,
  className,
}: MusicLeaderAutocompleteProps) {
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

  // Format clean name
  const cleanQuery = query.replace(/^(Sister|Brother|Sis\.|Bro\.|Elder)\s+/i, '').trim().toLowerCase();

  const filteredMembers = members.filter((m) => {
    if (!cleanQuery) return true;
    const nameMatch = m.name.toLowerCase().includes(cleanQuery);
    const orgMatch = m.organisation?.toLowerCase().includes(cleanQuery);
    return nameMatch || orgMatch;
  }).slice(0, 10);

  // Check if current selection is marked unavailable for date
  const selectedCleanName = value.replace(/^(Sister|Brother|Sis\.|Bro\.|Elder)\s+/i, '').trim();
  const isUnavailable = Boolean(
    dateStr &&
    selectedCleanName &&
    unavailableMembers[selectedCleanName.toLowerCase()]?.includes(dateStr)
  );

  const handleSelect = (m: Member) => {
    const rawName = m.name.replace(/^(Sister|Brother|Sis\.|Bro\.|Elder)\s+/i, '').trim();
    const gender = (m.gender || (m.organisation === 'Relief Society' || m.organisation === 'Young Women' || m.organisation === 'Primary' ? 'F' : 'M')) as 'M' | 'F';
    const prefix = gender === 'F' ? 'Sister' : 'Brother';
    const formattedName = `${prefix} ${rawName}`;

    setQuery(formattedName);
    onChange(formattedName, gender);
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
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
        {genderValue && (
          <span className={cn(
            'px-1.5 py-0.2 rounded text-[10px] font-bold',
            genderValue === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
          )}>
            {genderValue === 'F' ? 'Sister (F)' : 'Brother (M)'}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <User className="h-4 w-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={roleType === 'director' ? 'e.g. Sister Jane Doe' : 'e.g. Brother Bob Smith'}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            // Auto update if typed manually
            onChange(e.target.value, genderValue);
          }}
          className={cn(
            'w-full rounded-lg border bg-white pl-9 pr-8 py-2 text-sm transition-all focus:outline-none focus:ring-2',
            isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : isUnavailable
              ? 'border-amber-400 bg-amber-50/50'
              : 'border-slate-300 hover:border-slate-400',
            disabled && 'bg-slate-50 cursor-not-allowed opacity-75'
          )}
        />

        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Unavailable Warning alert pill */}
      {isUnavailable && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>Notice: Member is marked out of town / away on {dateStr}.</span>
        </div>
      )}

      {/* Dropdown for Member Directory */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filteredMembers.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              No members found in directory. You can type the name directly.
            </div>
          ) : (
            <ul className="p-1 space-y-1">
              {filteredMembers.map((m) => {
                const isSelected = query.toLowerCase().includes(m.name.toLowerCase());
                const mCleanName = m.name.replace(/^(Sister|Brother|Sis\.|Bro\.|Elder)\s+/i, '').trim();
                const mAway = Boolean(
                  dateStr && unavailableMembers[mCleanName.toLowerCase()]?.includes(dateStr)
                );

                return (
                  <li
                    key={m.name}
                    onClick={() => handleSelect(m)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors',
                      isSelected ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0',
                        m.gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {m.gender || (m.name.startsWith('Sister') ? 'F' : 'M')}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-900 truncate">
                            {m.gender === 'F' && !m.name.startsWith('Sister') ? `Sister ${m.name}` :
                             m.gender === 'M' && !m.name.startsWith('Brother') ? `Brother ${m.name}` : m.name}
                          </span>
                          {mAway && (
                            <span className="shrink-0 px-1 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-medium">
                              Away
                            </span>
                          )}
                        </div>
                        {m.organisation && (
                          <p className="text-[10px] text-slate-400 truncate">{m.organisation}</p>
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
