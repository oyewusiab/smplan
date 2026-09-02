import { useState, useMemo } from 'react';
import type { Member } from '../../types';
import { User, Edit2, List } from 'lucide-react';

interface MemberPickerProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  members: Member[];
  filterGender?: 'M' | 'F';
  prefixOptions?: string[];
  defaultPrefix?: string;
  placeholder?: string;
  showPrefix?: boolean;
  size?: 'sm' | 'md' | 'xs';
  className?: string;
}

export function parseNameWithPrefix(raw: string | undefined, defaultPrefix = 'Brother') {
  if (!raw) return { prefix: defaultPrefix, name: '' };
  const match = raw.match(/^(Brother|Sister|Elder|Bishop|President|Bro\.|Sis\.|Pres\.)\s+(.*)$/i);
  if (match) {
    let p = match[1];
    if (/^bro/i.test(p)) p = 'Brother';
    if (/^sis/i.test(p)) p = 'Sister';
    if (/^pres/i.test(p)) p = 'President';
    return { prefix: p, name: match[2].trim() };
  }
  return { prefix: defaultPrefix, name: raw.trim() };
}

export function MemberPicker({
  label,
  value,
  onChange,
  members,
  filterGender,
  prefixOptions = ['Brother', 'Sister', 'Elder', 'Bishop', 'President'],
  defaultPrefix = 'Brother',
  placeholder = 'Select member...',
  showPrefix = true,
  size = 'sm',
  className = '',
}: MemberPickerProps) {
  const [customMode, setCustomMode] = useState(false);

  // Filtered members by gender if requested
  const filteredMembers = useMemo(() => {
    let list = members;
    if (filterGender === 'M') {
      list = members.filter((m) => (m.gender || '').toUpperCase() === 'M' || !m.gender);
    } else if (filterGender === 'F') {
      list = members.filter((m) => (m.gender || '').toUpperCase() === 'F');
    }
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members, filterGender]);

  const { prefix, name } = parseNameWithPrefix(value, defaultPrefix);

  // Check if current name matches any member in directory
  const isMemberInList = useMemo(() => {
    if (!name) return false;
    return filteredMembers.some((m) => m.name.toLowerCase() === name.toLowerCase());
  }, [filteredMembers, name]);

  const handlePrefixChange = (newPrefix: string) => {
    if (!showPrefix) {
      onChange(name);
      return;
    }
    onChange(name ? `${newPrefix} ${name}` : newPrefix);
  };

  const handleSelectMember = (selectedMemberName: string) => {
    if (selectedMemberName === '__CUSTOM__') {
      setCustomMode(true);
      return;
    }
    if (!selectedMemberName) {
      onChange('');
      return;
    }
    const memberObj = filteredMembers.find((m) => m.name === selectedMemberName);
    let newPref = prefix;
    if (memberObj) {
      if (memberObj.gender === 'F' && (prefix === 'Brother' || prefix === 'Elder' || prefix === 'Bishop')) {
        newPref = 'Sister';
      } else if (memberObj.gender === 'M' && prefix === 'Sister') {
        newPref = 'Brother';
      }
    }
    if (showPrefix) {
      onChange(`${newPref} ${selectedMemberName}`);
    } else {
      onChange(selectedMemberName);
    }
  };

  const handleCustomInputChange = (typedName: string) => {
    const found = filteredMembers.find((m) => m.name.toLowerCase() === typedName.toLowerCase());
    let newPref = prefix;
    if (found) {
      if (found.gender === 'F' && (prefix === 'Brother' || prefix === 'Elder' || prefix === 'Bishop')) {
        newPref = 'Sister';
      } else if (found.gender === 'M' && prefix === 'Sister') {
        newPref = 'Brother';
      }
    }
    if (showPrefix) {
      onChange(typedName ? `${newPref} ${typedName}` : '');
    } else {
      onChange(typedName);
    }
  };

  const py = size === 'xs' ? 'py-1 text-xs' : 'py-1.5 text-xs';
  const selectPy = size === 'xs' ? 'py-1 text-xs' : 'py-1.5 text-xs';

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

      <div className="flex items-center gap-1.5">
        {/* Optional Prefix Selector Dropdown */}
        {showPrefix && (
          <select
            value={prefix}
            onChange={(e) => handlePrefixChange(e.target.value)}
            className={`w-24 shrink-0 rounded-lg border border-slate-300 bg-white px-2 ${selectPy} font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs`}
          >
            {prefixOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Member Name: Dropdown Selection vs Manual Input */}
        <div className="flex-1 relative min-w-0">
          {!customMode && (isMemberInList || !name || filteredMembers.length > 0) ? (
            <select
              value={name}
              onChange={(e) => handleSelectMember(e.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 ${selectPy} font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs truncate`}
            >
              <option value="">{placeholder}</option>
              {filteredMembers.map((m) => (
                <option key={m.member_id || m.name} value={m.name}>
                  {m.name} {m.calling ? `— (${m.calling})` : m.organisation ? `— (${m.organisation})` : ''}
                </option>
              ))}
              <option value="__CUSTOM__">✏️ + Custom / Other Name...</option>
            </select>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder={placeholder}
                value={name}
                onChange={(e) => handleCustomInputChange(e.target.value)}
                className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 ${py} font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs`}
              />
              {name && !isMemberInList && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
                  Custom
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
