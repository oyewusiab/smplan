import { useState, useMemo } from 'react';
import type { Hymn } from '../../types';
import { Music, Edit2, List, AlertCircle } from 'lucide-react';

interface HymnPickerProps {
  label?: string;
  hymnNumber?: string;
  hymnTitle?: string;
  onHymnChange: (number: string, title: string) => void;
  hymns: Hymn[];
  placeholder?: string;
  recentlyUsedWarning?: string;
  className?: string;
}

export function HymnPicker({
  label,
  hymnNumber = '',
  hymnTitle = '',
  onHymnChange,
  hymns,
  placeholder = 'Select hymn...',
  recentlyUsedWarning,
  className = '',
}: HymnPickerProps) {
  const [customMode, setCustomMode] = useState(false);

  // Sorted hymns list
  const sortedHymns = useMemo(() => {
    return [...hymns].sort((a, b) => {
      const numA = parseInt(String(a.number), 10);
      const numB = parseInt(String(b.number), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
  }, [hymns]);

  // Find if current hymn is in the hymns directory
  const matchedHymn = useMemo(() => {
    if (!hymnTitle && !hymnNumber) return undefined;
    const numClean = (hymnNumber || '').trim();
    const titleClean = (hymnTitle || '').trim().toLowerCase();

    if (numClean) {
      const byNum = sortedHymns.find(
        (h) => String(h.number).trim() === numClean || parseInt(String(h.number), 10) === parseInt(numClean, 10)
      );
      if (byNum) return byNum;
    }

    if (titleClean) {
      const byTitle = sortedHymns.find((h) => (h.title || '').toLowerCase() === titleClean);
      if (byTitle) return byTitle;
    }

    return undefined;
  }, [sortedHymns, hymnNumber, hymnTitle]);

  const selectedValue = useMemo(() => {
    if (!hymnTitle && !hymnNumber) return '';
    if (matchedHymn) return `${matchedHymn.number}`;
    return '__CUSTOM_VAL__';
  }, [matchedHymn, hymnNumber, hymnTitle]);

  const handleSelectHymn = (selectedNum: string) => {
    if (selectedNum === '__CUSTOM__') {
      setCustomMode(true);
      return;
    }
    if (!selectedNum) {
      onHymnChange('', '');
      return;
    }
    if (selectedNum === '__CUSTOM_VAL__') {
      return;
    }
    const match = sortedHymns.find((h) => String(h.number) === selectedNum);
    if (match) {
      onHymnChange(String(match.number), match.title);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
            <Music className="h-3.5 w-3.5 text-blue-600" />
            <span>{label}</span>
          </label>
          <button
            type="button"
            onClick={() => setCustomMode(!customMode)}
            className="text-2xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
            title={customMode ? 'Switch to hymn dropdown' : 'Switch to manual type input'}
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

      {!customMode ? (
        <div className="relative">
          <select
            value={selectedValue}
            onChange={(e) => handleSelectHymn(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs truncate"
          >
            <option value="">{placeholder}</option>
            {selectedValue === '__CUSTOM_VAL__' && (
              <option value="__CUSTOM_VAL__">
                {hymnNumber ? `#${hymnNumber} — ` : ''}{hymnTitle || 'Custom Musical Item'} (Custom)
              </option>
            )}
            {sortedHymns.map((h) => (
              <option key={h.number} value={`${h.number}`}>
                #{h.number} — {h.title}
              </option>
            ))}
            <option value="__CUSTOM__">✏️ + Custom / Other Hymn or Music...</option>
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-3 sm:col-span-3">
            <input
              type="text"
              placeholder="Hymn #"
              value={hymnNumber}
              onChange={(e) => onHymnChange(e.target.value, hymnTitle)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs text-center"
            />
          </div>
          <div className="col-span-9 sm:col-span-9">
            <input
              type="text"
              placeholder="Hymn Title"
              value={hymnTitle}
              onChange={(e) => onHymnChange(hymnNumber, e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>
      )}

      {recentlyUsedWarning && (
        <p className="text-2xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{recentlyUsedWarning}</span>
        </p>
      )}
    </div>
  );
}

interface SingleMusicPickerProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  hymns: Hymn[];
  placeholder?: string;
  className?: string;
}

export function SingleMusicPicker({
  label,
  value,
  onChange,
  hymns,
  placeholder = 'Select music or type...',
  className = '',
}: SingleMusicPickerProps) {
  const [customMode, setCustomMode] = useState(false);

  const sortedHymns = useMemo(() => {
    return [...hymns].sort((a, b) => {
      const numA = parseInt(String(a.number), 10);
      const numB = parseInt(String(b.number), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
  }, [hymns]);

  // Find if value matches any hymn
  const matchedHymn = useMemo(() => {
    if (!value || !value.trim()) return undefined;
    const valClean = value.trim().toLowerCase();

    // 1. Exact match with formatted hymn string "Hymn #143 — Let the Holy Spirit Guide"
    const exactFormatted = sortedHymns.find(
      (h) => `Hymn #${h.number} — ${h.title}`.toLowerCase() === valClean
    );
    if (exactFormatted) return exactFormatted;

    // 2. Exact match with hymn title
    const titleMatch = sortedHymns.find((h) => (h.title || '').toLowerCase() === valClean);
    if (titleMatch) return titleMatch;

    // 3. Match by hymn number (e.g. "143", "Hymn #143", "#143", "Hymn 143")
    const numMatch = valClean.match(/^(?:hymn\s*#?|#)?\s*(\d+)\b/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      const byNum = sortedHymns.find((h) => parseInt(String(h.number), 10) === num);
      if (byNum) return byNum;
    }

    // 4. Substring in hymn title
    const subMatch = sortedHymns.find((h) => (h.title || '').length > 3 && valClean.includes((h.title || '').toLowerCase()));
    if (subMatch) return subMatch;

    return undefined;
  }, [sortedHymns, value]);

  const selectedSelectValue = useMemo(() => {
    if (!value || !value.trim()) return '';
    if (matchedHymn) return `Hymn #${matchedHymn.number} — ${matchedHymn.title}`;
    return value.trim();
  }, [value, matchedHymn]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
            <Music className="h-3.5 w-3.5 text-blue-600" />
            <span>{label}</span>
          </label>
          <button
            type="button"
            onClick={() => setCustomMode(!customMode)}
            className="text-2xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 cursor-pointer"
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

      {!customMode ? (
        <select
          value={selectedSelectValue}
          onChange={(e) => {
            if (e.target.value === '__CUSTOM__') {
              setCustomMode(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs truncate"
        >
          <option value="">{placeholder}</option>
          {/* If selected value is a custom selection (e.g. "Organist Selection", "Choir Item") and not in hymns list */}
          {selectedSelectValue && !sortedHymns.some((h) => `Hymn #${h.number} — ${h.title}` === selectedSelectValue) && (
            <option value={selectedSelectValue}>
              🎵 {selectedSelectValue}
            </option>
          )}
          {sortedHymns.map((h) => (
            <option key={h.number} value={`Hymn #${h.number} — ${h.title}`}>
              Hymn #{h.number} — {h.title}
            </option>
          ))}
          <option value="__CUSTOM__">✏️ + Custom / Other Musical Selection...</option>
        </select>
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs"
        />
      )}
    </div>
  );
}
