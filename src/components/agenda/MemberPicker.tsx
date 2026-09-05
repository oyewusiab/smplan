import { useState, useMemo } from 'react';
import type { Member } from '../../types';
import { Edit2, List } from 'lucide-react';
import { stripAllHonorifics, namesMatch } from '../../utils/memberTitle';

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

export function parseNameWithPrefix(raw: unknown, defaultPrefix = 'Brother') {
  const rawStr = String(raw ?? '').trim();
  if (!rawStr) return { prefix: defaultPrefix, name: '' };
  const { baseName, detectedTitle } = stripAllHonorifics(rawStr);
  return { prefix: detectedTitle || defaultPrefix, name: baseName };
}

export function MemberPicker({
  label,
  value,
  onChange,
  members = [],
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
    let list = Array.isArray(members) ? members : [];
    if (filterGender === 'M') {
      list = list.filter((m) => String(m?.gender || '').toUpperCase() === 'M' || !m?.gender);
    } else if (filterGender === 'F') {
      list = list.filter((m) => String(m?.gender || '').toUpperCase() === 'F');
    }
    return [...list].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [members, filterGender]);

  const { prefix, name } = parseNameWithPrefix(value, defaultPrefix);

  // Robust matching to find corresponding member in filtered list
  const matchedMember = useMemo(() => {
    const nameTrimmed = String(name ?? '').trim();
    if (!nameTrimmed) return undefined;
    const nameClean = nameTrimmed.toLowerCase();
    const valStr = String(value ?? '');

    // 1. Direct match on m.name
    const exact = filteredMembers.find((m) => String(m?.name || '').trim().toLowerCase() === nameClean);
    if (exact) return exact;

    // 2. Base name match on m.name (stripping any honorifics that might be in m.name)
    const baseMatch = filteredMembers.find((m) => {
      const { baseName } = stripAllHonorifics(m?.name);
      return baseName.trim().toLowerCase() === nameClean;
    });
    if (baseMatch) return baseMatch;

    // 3. Match using robust namesMatch
    const robustMatch = filteredMembers.find((m) => namesMatch(m?.name, nameTrimmed) || namesMatch(m?.name, valStr));
    if (robustMatch) return robustMatch;

    return undefined;
  }, [filteredMembers, name, value]);

  // Selected value to bind to <select>
  const selectedSelectValue = useMemo(() => {
    const nameTrimmed = String(name ?? '').trim();
    if (!nameTrimmed) return '';
    if (matchedMember) return matchedMember.name;
    return nameTrimmed;
  }, [name, matchedMember]);

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
    const cleanBase = stripAllHonorifics(selectedMemberName).baseName || String(selectedMemberName ?? '').trim();
    const memberObj = filteredMembers.find((m) => m.name === selectedMemberName || namesMatch(m.name, cleanBase));
    let newPref = prefix;
    if (memberObj) {
      if (memberObj.gender === 'F' && (prefix === 'Brother' || prefix === 'Elder' || prefix === 'Bishop')) {
        newPref = 'Sister';
      } else if (memberObj.gender === 'M' && prefix === 'Sister') {
        newPref = 'Brother';
      }
    }
    if (showPrefix) {
      onChange(`${newPref} ${cleanBase}`);
    } else {
      onChange(cleanBase);
    }
  };

  const handleCustomInputChange = (typedName: string) => {
    const cleanBase = stripAllHonorifics(typedName).baseName;
    const found = filteredMembers.find((m) => namesMatch(m.name, cleanBase) || String(m.name || '').toLowerCase() === String(typedName || '').toLowerCase());
    let newPref = prefix;
    if (found) {
      if (found.gender === 'F' && (prefix === 'Brother' || prefix === 'Elder' || prefix === 'Bishop')) {
        newPref = 'Sister';
      } else if (found.gender === 'M' && prefix === 'Sister') {
        newPref = 'Brother';
      }
    }
    if (showPrefix) {
      onChange(cleanBase ? `${newPref} ${cleanBase}` : (String(typedName || '').trim() ? `${newPref} ${String(typedName).trim()}` : ''));
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
        <div className="flex-1 relative min-w-0 flex items-center gap-1">
          {!customMode ? (
            <select
              value={selectedSelectValue}
              onChange={(e) => handleSelectMember(e.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 ${selectPy} font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs truncate`}
            >
              <option value="">{placeholder}</option>
              {/* If selected name is custom and not in filteredMembers, render it as an active option so it never looks blank */}
              {selectedSelectValue && !filteredMembers.some((m) => m.name === selectedSelectValue) && (
                <option value={selectedSelectValue}>
                  {selectedSelectValue} (Selected)
                </option>
              )}
              {filteredMembers.map((m) => (
                <option key={m.member_id || m.name} value={m.name}>
                  {m.name} {m.calling ? `— (${m.calling})` : m.organisation ? `— (${m.organisation})` : ''}
                </option>
              ))}
              <option value="__CUSTOM__">✏️ + Custom / Other Name...</option>
            </select>
          ) : (
            <div className="relative w-full">
              <input
                type="text"
                placeholder={placeholder}
                value={name}
                onChange={(e) => handleCustomInputChange(e.target.value)}
                list={`member_datalist_${defaultPrefix}`}
                className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 ${py} font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs`}
              />
              <datalist id={`member_datalist_${defaultPrefix}`}>
                {filteredMembers.map((m) => (
                  <option key={m.name} value={m.name} />
                ))}
              </datalist>
            </div>
          )}

          {/* Quick inline mode switcher button when no label */}
          {!label && (
            <button
              type="button"
              onClick={() => setCustomMode(!customMode)}
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title={customMode ? 'Switch to dropdown' : 'Switch to custom entry'}
            >
              {customMode ? <List className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
