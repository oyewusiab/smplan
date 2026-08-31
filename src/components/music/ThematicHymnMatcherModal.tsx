import { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Sparkles, Music, Check, Play, Square, Search, BookOpen, ExternalLink, Globe } from 'lucide-react';
import { BUNDLED_HYMNS, BundledHymn, HYMN_THEME_CATEGORIES, getHymnChurchUrl } from '../../data/bundledHymns';
import { playHymnAudioPreview, stopHymnAudio } from '../../utils/hymnAudioSynth';
import { cn } from '../../utils/cn';

interface ThematicHymnMatcherModalProps {
  open: boolean;
  onClose: () => void;
  weekIndex: number;
  weekDateStr: string;
  speakerTopics: { name: string; topic: string }[];
  onApplyHymns: (hymns: { opening?: string; sacrament?: string; closing?: string }) => void;
}

export function ThematicHymnMatcherModal({
  open,
  onClose,
  weekIndex,
  weekDateStr,
  speakerTopics,
  onApplyHymns,
}: ThematicHymnMatcherModalProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>('Faith & Testimony');
  const [searchFilter, setSearchFilter] = useState('');
  const [playingNumber, setPlayingNumber] = useState<number | null>(null);

  // Selected hymns to apply
  const [chosenOpening, setChosenOpening] = useState<BundledHymn | null>(null);
  const [chosenSacrament, setChosenSacrament] = useState<BundledHymn | null>(null);
  const [chosenClosing, setChosenClosing] = useState<BundledHymn | null>(null);

  // Combine topics into a single search string for auto-matching
  const topicsCombined = speakerTopics.map(s => s.topic).join(' ');

  // Auto detect initial theme category from topics if available
  useMemo(() => {
    const text = topicsCombined.toLowerCase();
    if (text.includes('atonement') || text.includes('sacrament') || text.includes('savior') || text.includes('jesus')) {
      setSelectedTheme('Atonement & Sacrament');
    } else if (text.includes('prayer') || text.includes('revelation') || text.includes('guidance')) {
      setSelectedTheme('Prayer & Guidance');
    } else if (text.includes('temple') || text.includes('covenant') || text.includes('family') || text.includes('ancestor')) {
      setSelectedTheme('Temple & Covenants');
    } else if (text.includes('prophet') || text.includes('restoration') || text.includes('joseph smith')) {
      setSelectedTheme('Restoration & Prophets');
    } else if (text.includes('service') || text.includes('tithing') || text.includes('ministering') || text.includes('charity')) {
      setSelectedTheme('Service & Consecration');
    } else if (text.includes('sabbath') || text.includes('worship')) {
      setSelectedTheme('Sabbath & Worship');
    }
  }, [topicsCombined]);

  // Hymns matching category or search
  const categoryHymns = useMemo(() => {
    return BUNDLED_HYMNS.filter(h => {
      const q = searchFilter.toLowerCase();
      if (q) {
        return h.title.toLowerCase().includes(q) ||
               h.theme.toLowerCase().includes(q) ||
               h.themes?.some(t => t.toLowerCase().includes(q)) ||
               String(h.number).includes(q);
      }
      
      const themeParts = selectedTheme.toLowerCase().split('&').map(s => s.trim());
      const matchesCategoryTheme = themeParts.some(part =>
        h.theme.toLowerCase().includes(part) ||
        h.themes?.some(t => t.toLowerCase().includes(part))
      );

      return matchesCategoryTheme ||
             (selectedTheme === 'New Global Hymns' && h.collection === 'New') ||
             (selectedTheme === 'Atonement & Sacrament' && h.type === 'Sacrament');
    });
  }, [selectedTheme, searchFilter]);

  const openings = categoryHymns.filter(h => h.type === 'Opening' || h.type === 'General');
  const sacraments = BUNDLED_HYMNS.filter(h => h.type === 'Sacrament');
  const closings = categoryHymns.filter(h => h.type === 'Closing' || h.type === 'General' || h.type === 'Special');

  const handlePlayToggle = (num: number) => {
    if (playingNumber === num) {
      stopHymnAudio();
      setPlayingNumber(null);
    } else {
      setPlayingNumber(num);
      playHymnAudioPreview(num, () => setPlayingNumber(null));
    }
  };

  const handleApplyAll = () => {
    const result: { opening?: string; sacrament?: string; closing?: string } = {};
    if (chosenOpening) result.opening = `${chosenOpening.number} - ${chosenOpening.title}`;
    if (chosenSacrament) result.sacrament = `${chosenSacrament.number} - ${chosenSacrament.title}`;
    if (chosenClosing) result.closing = `${chosenClosing.number} - ${chosenClosing.title}`;

    onApplyHymns(result);
    stopHymnAudio();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        stopHymnAudio();
        onClose();
      }}
      title={`AI Thematic Hymn Matcher — Week ${weekIndex + 1} (${weekDateStr})`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 truncate max-w-sm">
            {chosenOpening || chosenSacrament || chosenClosing ? (
              <span className="font-medium text-blue-600">
                Selected: {chosenOpening ? `#${chosenOpening.number} ` : ''}
                {chosenSacrament ? `| #${chosenSacrament.number} ` : ''}
                {chosenClosing ? `| #${chosenClosing.number}` : ''}
              </span>
            ) : (
              'Click hymns below to match opening, sacrament, or closing'
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { stopHymnAudio(); onClose(); }}>Cancel</Button>
            <Button
              variant="primary"
              icon={<Check className="h-4 w-4" />}
              onClick={handleApplyAll}
              disabled={!chosenOpening && !chosenSacrament && !chosenClosing}
            >
              Apply Selected Hymns
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Context Talk Topics Box */}
        {speakerTopics.length > 0 && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900 mb-1.5">
              <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
              <span>Speaking Topics Context for this Sunday</span>
            </div>
            <div className="space-y-1">
              {speakerTopics.map((st, idx) => (
                <div key={idx} className="text-xs text-indigo-800 flex items-start gap-1.5">
                  <span className="font-semibold text-indigo-950">{idx + 1}. {st.name || 'Speaker'}:</span>
                  <span className="italic">{st.topic || 'General Gospel Topic'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Theme Tabs & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {HYMN_THEME_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedTheme(cat);
                  setSearchFilter('');
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  selectedTheme === cat && !searchFilter
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search theme or title…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* 3 Columns: Opening, Sacrament, Closing Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Opening Column */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Recommended Opening
              </span>
              {chosenOpening && (
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                  #{chosenOpening.number}
                </span>
              )}
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-64 flex-1 pr-1">
              {openings.slice(0, 6).map((h) => {
                const isSelected = chosenOpening?.number === h.number;
                const isPlaying = playingNumber === h.number;
                return (
                  <div
                    key={h.number}
                    className={cn(
                      'p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-1.5',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
                    )}
                    onClick={() => setChosenOpening(isSelected ? null : h)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">#{h.number} — {h.title}</p>
                      <p className={cn('text-[10px] truncate', isSelected ? 'text-blue-100' : 'text-slate-500')}>
                        {h.theme}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={h.link || getHymnChurchUrl(h)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open & assess on churchofjesuschrist.org"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'h-6 w-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? 'text-blue-100 hover:text-white' : 'text-slate-400 hover:text-blue-600'
                        )}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayToggle(h.number);
                        }}
                        className={cn(
                          'h-6 w-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? 'bg-blue-700 text-white' : 'text-slate-400 hover:text-blue-600'
                        )}
                      >
                        {isPlaying ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sacrament Column */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Sacrament Hymns
              </span>
              {chosenSacrament && (
                <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                  #{chosenSacrament.number}
                </span>
              )}
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-64 flex-1 pr-1">
              {sacraments.slice(0, 6).map((h) => {
                const isSelected = chosenSacrament?.number === h.number;
                const isPlaying = playingNumber === h.number;
                return (
                  <div
                    key={h.number}
                    className={cn(
                      'p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-1.5',
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-purple-300'
                    )}
                    onClick={() => setChosenSacrament(isSelected ? null : h)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">#{h.number} — {h.title}</p>
                      <p className={cn('text-[10px] truncate', isSelected ? 'text-purple-100' : 'text-slate-500')}>
                        {h.theme}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={h.link || getHymnChurchUrl(h)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open & assess sacrament hymn on churchofjesuschrist.org"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'h-6 w-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? 'text-purple-100 hover:text-white' : 'text-slate-400 hover:text-purple-600'
                        )}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayToggle(h.number);
                        }}
                        className={cn(
                          'h-6 w-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? 'bg-purple-700 text-white' : 'text-slate-400 hover:text-purple-600'
                        )}
                      >
                        {isPlaying ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Closing Column */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Recommended Closing
              </span>
              {chosenClosing && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                  #{chosenClosing.number}
                </span>
              )}
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-64 flex-1 pr-1">
              {closings.slice(0, 6).map((h) => {
                const isSelected = chosenClosing?.number === h.number;
                const isPlaying = playingNumber === h.number;
                return (
                  <div
                    key={h.number}
                    className={cn(
                      'p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-1.5',
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300'
                    )}
                    onClick={() => setChosenClosing(isSelected ? null : h)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">#{h.number} — {h.title}</p>
                      <p className={cn('text-[10px] truncate', isSelected ? 'text-emerald-100' : 'text-slate-500')}>
                        {h.theme}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={h.link || getHymnChurchUrl(h)}
                        target="_blank"
                        rel="noreferrer"
                        title="Open & assess closing hymn on churchofjesuschrist.org"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'h-6 w-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? 'text-emerald-100 hover:text-white' : 'text-slate-400 hover:text-emerald-600'
                        )}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayToggle(h.number);
                        }}
                        className={cn(
                          'h-6 w-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? 'bg-emerald-700 text-white' : 'text-slate-400 hover:text-emerald-600'
                        )}
                      >
                        {isPlaying ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
