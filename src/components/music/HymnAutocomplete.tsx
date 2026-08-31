import { useState, useRef, useEffect } from 'react';
import { Search, Music, Play, Square, X, Sparkles, ExternalLink, Globe } from 'lucide-react';
import { BUNDLED_HYMNS, BundledHymn, getHymnChurchUrl, resolveHymnLink } from '../../data/bundledHymns';
import { playHymnAudioPreview, stopHymnAudio } from '../../utils/hymnAudioSynth';
import { cn } from '../../utils/cn';

interface HymnAutocompleteProps {
  label?: string;
  value: string;
  onChange: (value: string, hymn?: BundledHymn) => void;
  typeFilter?: 'Opening' | 'Sacrament' | 'Closing' | 'Intermediate' | 'Special' | 'General' | '';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  highlightTheme?: string;
  isSuggested?: boolean;
}

export function HymnAutocomplete({
  label,
  value,
  onChange,
  typeFilter,
  placeholder = 'Type hymn number or title…',
  disabled = false,
  className,
  highlightTheme,
  isSuggested,
}: HymnAutocompleteProps) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [playingNumber, setPlayingNumber] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      stopHymnAudio();
    };
  }, []);

  // Filter hymns
  const filteredHymns = BUNDLED_HYMNS.filter((hymn) => {
    const q = query.trim().toLowerCase();
    const themeMatch =
      hymn.theme?.toLowerCase().includes(q) ||
      hymn.themes?.some((t) => t.toLowerCase().includes(q));

    const matchesQuery =
      !q ||
      String(hymn.number).startsWith(q) ||
      String(hymn.number).includes(q) ||
      hymn.title.toLowerCase().includes(q) ||
      themeMatch;

    // If typeFilter is Sacrament, strictly show Sacrament hymns first or on focus
    if (typeFilter === 'Sacrament') {
      return matchesQuery && (hymn.type === 'Sacrament' || !q);
    }

    return matchesQuery;
  }).slice(0, 15);

  const handleSelect = (hymn: BundledHymn) => {
    const formatted = `${hymn.number} - ${hymn.title}`;
    setQuery(formatted);
    onChange(formatted, hymn);
    setIsOpen(false);
    setActiveIndex(-1);
    stopHymnAudio();
    setPlayingNumber(null);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(false);
    stopHymnAudio();
    setPlayingNumber(null);
    inputRef.current?.focus();
  };

  const handlePlayToggle = (e: React.MouseEvent, hymnNumber: number) => {
    e.stopPropagation();
    if (playingNumber === hymnNumber) {
      stopHymnAudio();
      setPlayingNumber(null);
    } else {
      setPlayingNumber(hymnNumber);
      playHymnAudioPreview(hymnNumber, () => {
        setPlayingNumber(null);
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredHymns.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredHymns.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredHymns.length) {
        handleSelect(filteredHymns[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const currentChurchLink = query.trim() ? resolveHymnLink(query) : null;

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
          <div className="flex items-center gap-2">
            {isSuggested && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                <Sparkles className="h-3 w-3" /> Thematic Match
              </span>
            )}
            {currentChurchLink && (
              <a
                href={currentChurchLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-0.5 rounded transition-colors"
                title={`Open ${query} on churchofjesuschrist.org`}
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-3 w-3" />
                <span>Church Site</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Music className="h-4 w-4" />
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
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full rounded-lg border bg-white pl-9 pr-16 py-2 text-sm transition-all focus:outline-none focus:ring-2',
            isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-300 hover:border-slate-400',
            disabled && 'bg-slate-50 cursor-not-allowed opacity-75'
          )}
        />

        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {currentChurchLink && (
            <a
              href={currentChurchLink}
              target="_blank"
              rel="noreferrer"
              title="Open song & sheet music on churchofjesuschrist.org"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {query && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Popup Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filteredHymns.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              <Search className="h-5 w-5 mx-auto mb-1.5 text-slate-300" />
              No matching hymns found. Try hymn number (e.g. 169) or title keyword.
            </div>
          ) : (
            <ul ref={listRef} className="p-1.5 space-y-1">
              {filteredHymns.map((hymn, idx) => {
                const isSelected = query.startsWith(`${hymn.number} -`);
                const isFocused = idx === activeIndex;
                const isPlaying = playingNumber === hymn.number;
                const themeList = hymn.themes && hymn.themes.length > 0
                  ? hymn.themes
                  : (hymn.theme ? hymn.theme.split(',').map((t) => t.trim()) : []);

                return (
                  <li
                    key={hymn.number}
                    onClick={() => handleSelect(hymn)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors',
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : isFocused
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          'flex h-6 w-8 items-center justify-center rounded font-mono text-[11px] font-bold shrink-0',
                          hymn.collection === 'New'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        )}
                      >
                        #{hymn.number}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-medium text-slate-900 truncate">{hymn.title}</span>
                          {hymn.collection === 'New' ? (
                            <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500 text-white">
                              NEW
                            </span>
                          ) : (
                            <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              Classic
                            </span>
                          )}
                        </div>

                        {/* Multi-theme pill badges */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                            {hymn.type}
                          </span>
                          {themeList.slice(0, 3).map((t, tIdx) => (
                            <span key={tIdx} className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                              {t}
                            </span>
                          ))}
                          {themeList.length > 3 && (
                            <span className="text-[9px] text-slate-400">+{themeList.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* View on Church Site */}
                      <a
                        href={hymn.link || getHymnChurchUrl(hymn)}
                        target="_blank"
                        rel="noreferrer"
                        title="View hymn & sheet music on churchofjesuschrist.org"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      {/* Audio Preview Action */}
                      <button
                        type="button"
                        title={isPlaying ? 'Stop audio preview' : 'Listen to piano melody preview'}
                        onClick={(e) => handlePlayToggle(e, hymn.number)}
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg border transition-all',
                          isPlaying
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm animate-pulse'
                            : 'bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-300'
                        )}
                      >
                        {isPlaying ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                      </button>
                    </div>
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
