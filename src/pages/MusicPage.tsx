import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Music, Calendar, CheckCircle2, Clock, Printer, Save, Check, RefreshCw,
  Sparkles, Layers, ListMusic, UserCheck, AlertCircle, BookOpen, Search,
  Edit2, Plus, Volume2, ShieldCheck, Heart, ExternalLink, Globe
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { HymnAutocomplete } from '../components/music/HymnAutocomplete';
import { MusicLeaderAutocomplete } from '../components/music/MusicLeaderAutocomplete';
import { ThematicHymnMatcherModal } from '../components/music/ThematicHymnMatcherModal';
import { MusicPrintModal, MusicPlanWeek } from '../components/music/MusicPrintModal';
import { MusicAvailabilityModal, UnavailabilityRecord } from '../components/music/MusicAvailabilityModal';
import { useAuthStore } from '../store/authStore';
import { plannersApi, agendasApi, membersApi, hymnsApi, musicApi } from '../services/api';
import { BUNDLED_HYMNS, BundledHymn, ALL_GOSPEL_THEMES, getHymnChurchUrl, resolveHymnLink } from '../data/bundledHymns';
import { parseHymn } from '../utils/hymnParser';
import type { Planner, Agenda, Member, Hymn, SpeakerItem } from '../types';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const TYPE_OPTIONS = [
  { value: 'Opening', label: 'Opening' },
  { value: 'Sacrament', label: 'Sacrament' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Closing', label: 'Closing' },
  { value: 'Special', label: 'Special' },
  { value: 'General', label: 'General' },
];

export function MusicPage() {
  const { session } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: 'planner' | 'toolkit'
  const [activeTab, setActiveTab] = useState<'planner' | 'toolkit'>('planner');

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);

  // Planners list & selected planner
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string>('');
  const [planner, setPlanner] = useState<Planner | null>(null);

  // Agendas & Weeks data for the selected planner
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [hymns, setHymns] = useState<Hymn[]>([]);

  // Music planner week records
  const [musicWeeks, setMusicWeeks] = useState<MusicPlanWeek[]>([]);
  const [musicStatus, setMusicStatus] = useState<'PENDING' | 'COMPLETE'>('PENDING');

  // Availability matrix state
  const [unavailableRecords, setUnavailableRecords] = useState<UnavailabilityRecord[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // Rotation data
  const [lastSacramentHymn, setLastSacramentHymn] = useState<string>('193 - I Stand All Amazed');
  const [suggestedRotation, setSuggestedRotation] = useState<string>('#169 - As Now We Take the Sacrament');

  // Thematic Matcher Modal state
  const [thematicModalWeek, setThematicModalWeek] = useState<number | null>(null);

  // Print Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Hymn Library Edit / Add modal
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryTypeFilter, setLibraryTypeFilter] = useState('');
  const [editHymn, setEditHymn] = useState<Hymn | null>(null);
  const [hymnForm, setHymnForm] = useState<Partial<Hymn>>({});

  // ─── Initial Data Loading ───────────────────────────────────────────────────
  const loadInitialData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [pRes, mRes, hRes, rRes, avRes] = await Promise.allSettled([
        plannersApi.list(session.token) as Promise<{ ok: boolean; data: Planner[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
        hymnsApi.list(session.token) as Promise<{ ok: boolean; data: Hymn[] }>,
        musicApi.getRotation(session.token) as Promise<{ ok: boolean; data: { lastSacramentHymn?: string; suggestedNext?: string } }>,
        musicApi.getAvailability(session.token) as Promise<{ ok: boolean; data: UnavailabilityRecord[] }>,
      ]);

      let loadedPlanners: Planner[] = [];
      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        loadedPlanners = pRes.value.data || [];
        setPlanners(loadedPlanners);
      }

      if (mRes.status === 'fulfilled' && mRes.value.ok) {
        setMembers(mRes.value.data || []);
      }

      if (hRes.status === 'fulfilled' && hRes.value.ok) {
        setHymns(hRes.value.data || []);
      }

      if (rRes.status === 'fulfilled' && rRes.value.ok && rRes.value.data) {
        if (rRes.value.data.lastSacramentHymn) setLastSacramentHymn(rRes.value.data.lastSacramentHymn);
        if (rRes.value.data.suggestedNext) setSuggestedRotation(rRes.value.data.suggestedNext);
      }

      if (avRes.status === 'fulfilled' && avRes.value.ok && Array.isArray(avRes.value.data)) {
        setUnavailableRecords(avRes.value.data);
      }

      // Determine initial planner selection
      const urlPlannerId = searchParams.get('planner_id');
      const targetId = urlPlannerId || (loadedPlanners.length > 0 ? loadedPlanners[0].planner_id : '');
      if (targetId) {
        setSelectedPlannerId(targetId);
        await loadPlannerDetails(targetId);
      }
    } catch {
      toast.error('Failed to load music dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [session]);

  // Load specific planner and its agendas
  const loadPlannerDetails = async (pId: string) => {
    if (!session || !pId) return;
    try {
      const [pRes, aRes] = await Promise.all([
        plannersApi.get(session.token, pId) as Promise<{ ok: boolean; data: Planner }>,
        agendasApi.list(session.token, pId) as Promise<{ ok: boolean; data: Agenda[] }>,
      ]);

      if (pRes.ok && pRes.data) {
        const pl = pRes.data;
        setPlanner(pl);
        setMusicStatus((pl.music_status as 'PENDING' | 'COMPLETE') || 'PENDING');

        const ags = aRes.ok && aRes.data ? aRes.data : [];
        setAgendas(ags);

        // Parse planner weeks or build from agendas
        let existingWeeksJson: any[] = [];
        try {
          if (pl.weeks) {
            existingWeeksJson = typeof pl.weeks === 'string' ? JSON.parse(pl.weeks) : pl.weeks;
          }
        } catch {
          existingWeeksJson = [];
        }

        // Build unified MusicPlanWeek[]
        const builtWeeks: MusicPlanWeek[] = (ags.length > 0 ? ags : existingWeeksJson).map((ag: any, idx: number) => {
          const matchingJsonWeek = Array.isArray(existingWeeksJson) ? existingWeeksJson[idx] : null;

          // Parse speakers
          let speakerTopics: string[] = [];
          if (ag.speakers) {
            try {
              const spkList = typeof ag.speakers === 'string' ? JSON.parse(ag.speakers) : ag.speakers;
              if (Array.isArray(spkList)) {
                speakerTopics = spkList.map((s: SpeakerItem) => s.topic).filter(Boolean);
              }
            } catch {
              speakerTopics = [];
            }
          }

          // Format hymns
          const openHymn = ag.opening_hymn || matchingJsonWeek?.hymns?.opening || '';
          const sacHymn = ag.sacrament_hymn || matchingJsonWeek?.hymns?.sacrament || '';
          const closeHymn = ag.closing_hymn || matchingJsonWeek?.hymns?.closing || '';
          const specMusic = ag.special_music || matchingJsonWeek?.hymns?.special || '';

          // Format leadership
          const dir = ag.music_director || matchingJsonWeek?.music?.director || '';
          const acc = ag.organist || matchingJsonWeek?.music?.accompanist || '';

          return {
            week_id: ag.week_id || matchingJsonWeek?.week_id || `w_${idx + 1}`,
            date: ag.date || matchingJsonWeek?.date || '',
            meeting_type: ag.type_of_meeting || 'SACRAMENT',
            topics: speakerTopics,
            hymns: {
              opening: openHymn,
              sacrament: sacHymn,
              closing: closeHymn,
              special: specMusic,
            },
            music: {
              director: dir,
              director_gender: matchingJsonWeek?.music?.director_gender || (dir.startsWith('Sister') ? 'F' : dir.startsWith('Brother') ? 'M' : ''),
              accompanist: acc,
              accompanist_gender: matchingJsonWeek?.music?.accompanist_gender || (acc.startsWith('Sister') ? 'F' : acc.startsWith('Brother') ? 'M' : ''),
            },
          };
        });

        setMusicWeeks(builtWeeks);
      }
    } catch {
      toast.error('Failed to load planner music details');
    }
  };

  const handlePlannerChange = async (pId: string) => {
    setSelectedPlannerId(pId);
    setSearchParams({ planner_id: pId });
    await loadPlannerDetails(pId);
  };

  // ─── Save Progress & Mark Complete Handlers ─────────────────────────────────
  const handleSaveMusicPlan = async (targetStatus: 'PENDING' | 'COMPLETE') => {
    if (!session || !selectedPlannerId) return;
    setSaving(true);
    try {
      const payload = {
        planner_id: selectedPlannerId,
        music_status: targetStatus,
        weeks: musicWeeks,
      };

      const res = await musicApi.savePlan(session.token, payload) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error || 'Failed to save music plan');

      setMusicStatus(targetStatus);
      if (planner) {
        setPlanner({ ...planner, music_status: targetStatus });
      }

      if (targetStatus === 'COMPLETE') {
        toast.success('Music schedule marked COMPLETE! Executive Secretary & Clerks notified.');
      } else {
        toast.success('Music progress saved successfully.');
      }

      // Reload agendas to ensure total sync
      await loadPlannerDetails(selectedPlannerId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Update specific week hymn
  const handleWeekHymnChange = (
    weekIdx: number,
    field: 'opening' | 'sacrament' | 'closing' | 'special',
    value: string
  ) => {
    setMusicWeeks((prev) => {
      const copy = [...prev];
      if (copy[weekIdx]) {
        copy[weekIdx] = {
          ...copy[weekIdx],
          hymns: {
            ...copy[weekIdx].hymns,
            [field]: value,
          },
        };
      }
      return copy;
    });
  };

  // Update specific week leadership
  const handleWeekLeaderChange = (
    weekIdx: number,
    role: 'director' | 'accompanist',
    name: string,
    gender: 'M' | 'F' | ''
  ) => {
    setMusicWeeks((prev) => {
      const copy = [...prev];
      if (copy[weekIdx]) {
        copy[weekIdx] = {
          ...copy[weekIdx],
          music: {
            ...copy[weekIdx].music,
            [role]: name,
            [`${role}_gender`]: gender,
          },
        };
      }
      return copy;
    });
  };

  // Apply hymns from AI / Thematic Matcher
  const handleApplyThematicHymns = (weekIdx: number, applied: { opening?: string; sacrament?: string; closing?: string }) => {
    setMusicWeeks((prev) => {
      const copy = [...prev];
      if (copy[weekIdx]) {
        copy[weekIdx] = {
          ...copy[weekIdx],
          hymns: {
            ...copy[weekIdx].hymns,
            ...(applied.opening ? { opening: applied.opening } : {}),
            ...(applied.sacrament ? { sacrament: applied.sacrament } : {}),
            ...(applied.closing ? { closing: applied.closing } : {}),
          },
        };
      }
      return copy;
    });
    toast.success(`Thematic hymns applied to Week ${weekIdx + 1}`);
  };

  // ─── Sync LDS Catalog Action ────────────────────────────────────────────────
  const handleSyncLdsCatalog = async () => {
    if (!session) return;
    setSyncingCatalog(true);
    try {
      const res = await hymnsApi.syncCatalog(session.token) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success('LDS Hymns Catalog synced & updated!');
      const hRes = await hymnsApi.list(session.token) as { ok: boolean; data: Hymn[] };
      if (hRes.ok) setHymns(hRes.data || []);
    } catch {
      toast.error('Catalog sync failed. Showing bundled offline collection.');
    } finally {
      setSyncingCatalog(false);
    }
  };

  // Save Hymn Edit in Library
  const handleSaveHymn = async () => {
    if (!session || !hymnForm.number || !hymnForm.title) {
      toast.error('Number and title required');
      return;
    }
    try {
      const res = await hymnsApi.update(session.token, hymnForm) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success('Hymn updated in library');
      setEditHymn(null);
      const hRes = await hymnsApi.list(session.token) as { ok: boolean; data: Hymn[] };
      if (hRes.ok) setHymns(hRes.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  // Save Availability Records
  const handleSaveAvailability = async (records: UnavailabilityRecord[]) => {
    if (!session) return;
    setUnavailableRecords(records);
    try {
      await musicApi.saveAvailability(session.token, records);
      toast.success('Availability matrix updated');
    } catch {
      toast.error('Failed to persist availability');
    }
  };

  // Group unavailability by member name for instant lookup
  const unavailableMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    unavailableRecords.forEach((r) => {
      const k = r.memberName.toLowerCase().trim();
      if (!map[k]) map[k] = [];
      map[k].push(r.date);
    });
    return map;
  }, [unavailableRecords]);

  // Filtered Hymns for Toolkit Table (matches number, title, or any of its multiple themes)
  const combinedHymnList = hymns.length > 0 ? hymns : BUNDLED_HYMNS;
  const filteredLibrary = combinedHymnList.filter((h: any) => {
    const q = librarySearch.toLowerCase();
    const themeStr = (h.theme || '').toLowerCase();
    const themesList = Array.isArray(h.themes) ? h.themes.map((t: string) => t.toLowerCase()) : [];
    const matchTheme = themeStr.includes(q) || themesList.some((t: string) => t.includes(q));

    const matchQ =
      !q ||
      String(h.number).includes(q) ||
      h.title?.toLowerCase().includes(q) ||
      matchTheme;
    const matchType = !libraryTypeFilter || h.type === libraryTypeFilter;
    return matchQ && matchType;
  });

  // Bishoprics, Clerks, Admins, and Music Coordinators can perform all functions
  const canEdit =
    session?.role === 'ADMIN' ||
    session?.role === 'MUSIC' ||
    session?.role === 'BISHOPRIC' ||
    session?.role === 'CLERK' ||
    session?.role === 'SECRETARY';

  // Format month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const plannerTitle = planner
    ? `${monthNames[planner.month - 1]} ${planner.year} — ${planner.unit_name || 'Ward'}`
    : 'No Planner Selected';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Header */}
      <Header
        title="Music Coordination"
        subtitle="LDS Hymn selection, rotation tracking, leadership scheduling & printing"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Planner Dropdown Selector */}
            <div className="min-w-[220px]">
              <select
                value={selectedPlannerId}
                onChange={(e) => handlePlannerChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                {planners.length === 0 ? (
                  <option value="">No Planners Found</option>
                ) : (
                  planners.map((p) => (
                    <option key={p.planner_id} value={p.planner_id}>
                      {monthNames[p.month - 1]} {p.year} — {p.unit_name} ({p.state})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Print Full Music Plan Button */}
            <Button
              size="sm"
              variant="outline"
              icon={<Printer className="h-4 w-4 text-slate-600" />}
              onClick={() => setShowPrintModal(true)}
              disabled={musicWeeks.length === 0}
            >
              Print Music Plan
            </Button>

            {/* Save Progress Button */}
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                icon={<Save className="h-4 w-4" />}
                onClick={() => handleSaveMusicPlan('PENDING')}
                loading={saving}
                disabled={!selectedPlannerId}
              >
                Save Progress
              </Button>
            )}

            {/* Mark Complete & Ready Button */}
            {canEdit && (
              <Button
                size="sm"
                variant="primary"
                icon={<Check className="h-4 w-4" />}
                onClick={() => handleSaveMusicPlan('COMPLETE')}
                loading={saving}
                disabled={!selectedPlannerId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                Mark Complete & Ready
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Planner Status & Navigation Sub-header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
              <Music className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{plannerTitle}</h2>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                    musicStatus === 'COMPLETE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {musicStatus === 'COMPLETE' ? '● COMPLETE' : '● PENDING'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {musicStatus === 'COMPLETE'
                  ? 'All hymns and conductors confirmed. Ready for stand agendas & bulletins.'
                  : 'Music details are still being entered by the Music Coordinator.'}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'planner'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <ListMusic className="h-4 w-4" />
              Monthly Music Planner
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('toolkit')}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'toolkit'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              Music Toolkit & Library
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: MONTHLY MUSIC PLANNER (STEP-BY-STEP INTERACTIVE WORKSPACE)
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            {/* Quick Step Guide Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-950">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">1</span>
                <span className="font-semibold">Review Speaker Topics</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">2</span>
                <span className="font-semibold">Thematic Hymn Matching</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">3</span>
                <span className="font-semibold">Assign Music Leadership</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-[10px]">4</span>
                <span className="font-semibold">Sign Off & Complete</span>
              </div>
            </div>

            {/* Weeks Cards */}
            {musicWeeks.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <Music className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 font-semibold text-sm">No weeks configured for this planner</p>
                <p className="text-xs text-slate-400 mt-1">Select another submitted planner or create agendas in the Planner workspace.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {musicWeeks.map((wk, weekIdx) => {
                  const isFastSunday = wk.meeting_type === 'FAST_SUNDAY';
                  const agendaObj = agendas[weekIdx];

                  // Collect speaker items for topic context box
                  let speakerItems: SpeakerItem[] = [];
                  if (agendaObj?.speakers) {
                    try {
                      speakerItems = typeof agendaObj.speakers === 'string' ? JSON.parse(agendaObj.speakers) : agendaObj.speakers;
                    } catch {
                      speakerItems = [];
                    }
                  }

                  return (
                    <Card key={wk.week_id || weekIdx} className="overflow-hidden border border-slate-200 shadow-sm">
                      {/* Week Header Banner */}
                      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            Week {weekIdx + 1}
                          </span>
                          <span className="text-sm font-bold">
                            {wk.date || `Sunday ${weekIdx + 1}`}
                          </span>
                          {isFastSunday && (
                            <span className="bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold px-2 py-0.5 rounded">
                              Fast & Testimony Sunday
                            </span>
                          )}
                        </div>

                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-white hover:bg-white/10"
                          icon={<Sparkles className="h-3.5 w-3.5 text-purple-300" />}
                          onClick={() => setThematicModalWeek(weekIdx)}
                        >
                          Suggest Hymns for this Week
                        </Button>
                      </div>

                      <CardBody className="p-4 space-y-4">
                        {/* Step 2: Topics Context Box */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                            <span>Topics Context for this Sunday</span>
                          </div>

                          {isFastSunday ? (
                            <p className="text-xs text-blue-800 italic">
                              (Fast & Testimony Sunday — No scheduled speakers. Bearing testimonies of Jesus Christ.)
                            </p>
                          ) : speakerItems.length > 0 ? (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-950">
                              {speakerItems.map((sp, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <span className="font-semibold text-blue-900">{idx + 1}. {sp.name || 'Speaker'}:</span>
                                  <span className="italic text-slate-700">{sp.topic || 'General Topic'}</span>
                                  {sp.scripture_ref && (
                                    <span className="text-[10px] text-blue-700 bg-blue-100/70 px-1 rounded">
                                      ({sp.scripture_ref})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">
                              (No speaker topics entered yet for this week in the Planner.)
                            </p>
                          )}
                        </div>

                        {/* Step 3: Selecting Hymns & Music Leadership */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
                          {/* Weekly Hymns (Columns 1 to 7) */}
                          <div className="lg:col-span-7 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Weekly Hymns (Smart Autocomplete)
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Type number or title
                              </span>
                            </div>

                            <div className="space-y-3">
                              {/* Opening Hymn */}
                              <HymnAutocomplete
                                label="Opening Hymn"
                                value={wk.hymns.opening}
                                onChange={(val) => handleWeekHymnChange(weekIdx, 'opening', val)}
                                placeholder="e.g. 2 - The Spirit of God"
                                disabled={!canEdit}
                              />

                              {/* Sacrament Hymn */}
                              <div>
                                <HymnAutocomplete
                                  label="Sacrament Hymn"
                                  typeFilter="Sacrament"
                                  value={wk.hymns.sacrament}
                                  onChange={(val) => handleWeekHymnChange(weekIdx, 'sacrament', val)}
                                  placeholder="e.g. 169 - As Now We Take the Sacrament"
                                  disabled={!canEdit}
                                />
                                {weekIdx > 0 && musicWeeks[weekIdx - 1]?.hymns?.sacrament && (
                                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-400" />
                                    <span>Last Sunday's Sacrament Hymn: <strong>{musicWeeks[weekIdx - 1].hymns.sacrament}</strong></span>
                                  </p>
                                )}
                              </div>

                              {/* Closing Hymn */}
                              <HymnAutocomplete
                                label="Closing Hymn"
                                value={wk.hymns.closing}
                                onChange={(val) => handleWeekHymnChange(weekIdx, 'closing', val)}
                                placeholder="e.g. 19 - We Thank Thee, O God, for a Prophet"
                                disabled={!canEdit}
                              />

                              {/* Optional Special / Intermediate Music */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Special / Intermediate Music (Optional)
                                  </label>
                                  {wk.hymns.special && (
                                    <a
                                      href={resolveHymnLink(wk.hymns.special)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-2 py-0.5 rounded"
                                      title="Open on church site"
                                    >
                                      <Globe className="h-3 w-3" />
                                      <span>Church Site</span>
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={wk.hymns.special || ''}
                                  onChange={(e) => handleWeekHymnChange(weekIdx, 'special', e.target.value)}
                                  placeholder="e.g. Ward Choir — #1003 It Is Well with My Soul"
                                  disabled={!canEdit}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                              </div>

                              {/* Active Church Song Assessment Links Bar for this week */}
                              {(wk.hymns.opening || wk.hymns.sacrament || wk.hymns.closing || wk.hymns.special) && (
                                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1.5 mt-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                                    <span className="flex items-center gap-1">
                                      <Globe className="h-3.5 w-3.5 text-blue-700" />
                                      Official Church Links (Assess Songs)
                                    </span>
                                    <span className="text-[10px] text-blue-600 font-medium lowercase">
                                      Click to open sheet music & audio
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {wk.hymns.opening && (
                                      <a
                                        href={resolveHymnLink(wk.hymns.opening)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:shadow-2xs text-xs font-semibold text-blue-900 transition-all"
                                        title={`Open ${wk.hymns.opening} on churchofjesuschrist.org`}
                                      >
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Opening:</span>
                                        <span className="truncate max-w-[130px]">{wk.hymns.opening}</span>
                                        <ExternalLink className="h-3 w-3 text-blue-600 shrink-0" />
                                      </a>
                                    )}
                                    {wk.hymns.sacrament && (
                                      <a
                                        href={resolveHymnLink(wk.hymns.sacrament)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:shadow-2xs text-xs font-semibold text-blue-900 transition-all"
                                        title={`Open ${wk.hymns.sacrament} on churchofjesuschrist.org`}
                                      >
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Sacrament:</span>
                                        <span className="truncate max-w-[130px]">{wk.hymns.sacrament}</span>
                                        <ExternalLink className="h-3 w-3 text-blue-600 shrink-0" />
                                      </a>
                                    )}
                                    {wk.hymns.closing && (
                                      <a
                                        href={resolveHymnLink(wk.hymns.closing)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:shadow-2xs text-xs font-semibold text-blue-900 transition-all"
                                        title={`Open ${wk.hymns.closing} on churchofjesuschrist.org`}
                                      >
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Closing:</span>
                                        <span className="truncate max-w-[130px]">{wk.hymns.closing}</span>
                                        <ExternalLink className="h-3 w-3 text-blue-600 shrink-0" />
                                      </a>
                                    )}
                                    {wk.hymns.special && (
                                      <a
                                        href={resolveHymnLink(wk.hymns.special)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:shadow-2xs text-xs font-semibold text-blue-900 transition-all"
                                        title={`Open ${wk.hymns.special} on churchofjesuschrist.org`}
                                      >
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Special:</span>
                                        <span className="truncate max-w-[130px]">{wk.hymns.special}</span>
                                        <ExternalLink className="h-3 w-3 text-blue-600 shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Music Leadership (Columns 8 to 12) */}
                          <div className="lg:col-span-5 space-y-3 lg:border-l lg:border-slate-200 lg:pl-5">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Serving This Week
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowAvailabilityModal(true)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                Availability Matrix
                              </button>
                            </div>

                            <div className="space-y-4">
                              {/* Music Director */}
                              <MusicLeaderAutocomplete
                                label="Music Director (Chorister)"
                                value={wk.music.director}
                                genderValue={wk.music.director_gender}
                                onChange={(name, gender) => handleWeekLeaderChange(weekIdx, 'director', name, gender)}
                                members={members}
                                roleType="director"
                                dateStr={wk.date}
                                unavailableMembers={unavailableMap}
                                disabled={!canEdit}
                              />

                              {/* Accompanist / Organist */}
                              <MusicLeaderAutocomplete
                                label="Accompanist (Organist/Pianist)"
                                value={wk.music.accompanist}
                                genderValue={wk.music.accompanist_gender}
                                onChange={(name, gender) => handleWeekLeaderChange(weekIdx, 'accompanist', name, gender)}
                                members={members}
                                roleType="accompanist"
                                dateStr={wk.date}
                                unavailableMembers={unavailableMap}
                                disabled={!canEdit}
                              />
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: MUSIC TOOLKIT & HYMN LIBRARY
           ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'toolkit' && (
          <div className="space-y-6">
            {/* Top Cards Grid: Smart Rotation & Theme Matcher Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Smart Rotation Card */}
              <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-blue-50/40">
                <CardBody className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>Smart Sacrament Hymn Rotation</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Last Sacrament Hymn Sung:</span>
                      <span className="font-bold text-slate-900">{lastSacramentHymn}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                      <span className="text-slate-500">Suggested Next in Cycle:</span>
                      <span className="font-bold text-emerald-700">{suggestedRotation}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Sacrament hymns are automatically rotated across weekly sacrament meetings to prevent repetitive singing.
                  </p>
                </CardBody>
              </Card>

              {/* Organist & Chorister Availability Matrix Card */}
              <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-white to-purple-50/40">
                <CardBody className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-900 uppercase tracking-wider">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                      <span>Conductor & Organist Availability</span>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
                      {unavailableRecords.length} away
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Track director and organist vacation dates so autocomplete flags conflicts before scheduling.
                  </p>

                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Calendar className="h-4 w-4 text-purple-600" />}
                      onClick={() => setShowAvailabilityModal(true)}
                    >
                      Manage Availability Matrix
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Complete Hymn Library & Search Table */}
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">LDS Hymn Library</h3>
                  <p className="text-xs text-slate-500">Complete database of Classic & New Global Hymns</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<RefreshCw className={cn('h-3.5 w-3.5', syncingCatalog && 'animate-spin')} />}
                    onClick={handleSyncLdsCatalog}
                    loading={syncingCatalog}
                  >
                    Sync LDS Hymns Catalog
                  </Button>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => {
                        setEditHymn({ number: 0, title: '', type: 'Opening', theme: '', updated_date: '' });
                        setHymnForm({ number: undefined, title: '', type: 'Opening', theme: '' });
                      }}
                    >
                      Add Hymn
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardBody className="p-4 space-y-4">
                {/* Search & Type Filter */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by number, title, or theme…"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <select
                    value={libraryTypeFilter}
                    onChange={(e) => setLibraryTypeFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">All Types</option>
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  <span className="text-xs text-slate-500 self-center ml-auto font-medium">
                    {filteredLibrary.length} hymns found
                  </span>
                </div>

                {/* Table */}
                <Table
                  columns={[
                    {
                      key: 'number',
                      header: '#',
                      headerClassName: 'w-16',
                      render: (h: any) => (
                        <span className={cn(
                          'font-mono font-bold px-1.5 py-0.5 rounded text-xs',
                          h.number > 1000 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        )}>
                          #{h.number}
                        </span>
                      ),
                    },
                    {
                      key: 'title',
                      header: 'Title',
                      render: (h: any) => (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{h.title}</span>
                          {h.number > 1000 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500 text-white">
                              NEW
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'type',
                      header: 'Type',
                      render: (h: any) => (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 font-medium">
                          {h.type || 'General'}
                        </span>
                      ),
                    },
                    {
                      key: 'theme',
                      header: 'Theological Themes',
                      render: (h: any) => {
                        const themeList = Array.isArray(h.themes) && h.themes.length > 0
                          ? h.themes
                          : (h.theme ? String(h.theme).split(',').map((t: string) => t.trim()).filter(Boolean) : []);
                        
                        return (
                          <div className="flex flex-wrap gap-1">
                            {themeList.map((th: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                                onClick={() => setLibrarySearch(th)}
                                title={`Click to filter by ${th}`}
                              >
                                {th}
                              </span>
                            ))}
                            {themeList.length === 0 && <span className="text-slate-400 text-xs">—</span>}
                          </div>
                        );
                      },
                    },
                    {
                      key: 'link',
                      header: 'Church Link',
                      render: (h: any) => {
                        const url = h.link || getHymnChurchUrl(h);
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            title={url}
                          >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Church Site</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        );
                      },
                    },
                    ...(canEdit ? [{
                      key: 'actions',
                      header: '',
                      render: (h: any) => (
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={<Edit2 className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setEditHymn(h);
                            setHymnForm({
                              ...h,
                              link: h.link || getHymnChurchUrl(h),
                            });
                          }}
                        >
                          Edit
                        </Button>
                      ),
                    }] : []),
                  ]}
                  data={filteredLibrary}
                  keyExtractor={(h: any) => String(h.number)}
                  emptyMessage="No matching hymns found."
                />
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* Thematic Hymn Matcher Modal */}
      {thematicModalWeek !== null && musicWeeks[thematicModalWeek] && (
        <ThematicHymnMatcherModal
          open={thematicModalWeek !== null}
          onClose={() => setThematicModalWeek(null)}
          weekIndex={thematicModalWeek}
          weekDateStr={musicWeeks[thematicModalWeek].date}
          speakerTopics={
            agendas[thematicModalWeek]?.speakers
              ? (() => {
                  try {
                    const spks = typeof agendas[thematicModalWeek].speakers === 'string'
                      ? JSON.parse(agendas[thematicModalWeek].speakers)
                      : agendas[thematicModalWeek].speakers;
                    return Array.isArray(spks) ? spks : [];
                  } catch {
                    return [];
                  }
                })()
              : []
          }
          onApplyHymns={(applied) => handleApplyThematicHymns(thematicModalWeek, applied)}
        />
      )}

      {/* Standalone Full Music Plan Printout Modal */}
      {showPrintModal && (
        <MusicPrintModal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          planner={planner}
          weeks={musicWeeks}
        />
      )}

      {/* Organist & Chorister Availability Modal */}
      {showAvailabilityModal && (
        <MusicAvailabilityModal
          open={showAvailabilityModal}
          onClose={() => setShowAvailabilityModal(false)}
          members={members}
          records={unavailableRecords}
          onSaveRecords={handleSaveAvailability}
        />
      )}

      {/* Hymn Edit / Add Modal */}
      {editHymn && (
        <Modal
          open={!!editHymn}
          onClose={() => setEditHymn(null)}
          title={editHymn.number ? `Edit Hymn #${editHymn.number}` : 'Add New Hymn'}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setEditHymn(null)}>Cancel</Button>
              <Button onClick={handleSaveHymn}>Save Hymn</Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Hymn Number"
                type="number"
                value={hymnForm.number || ''}
                onChange={(e) => setHymnForm({ ...hymnForm, number: Number(e.target.value) })}
              />
              <Select
                label="Type"
                options={TYPE_OPTIONS}
                value={hymnForm.type || 'Opening'}
                onChange={(e) => setHymnForm({ ...hymnForm, type: e.target.value })}
              />
            </div>
            <Input
              label="Hymn Title"
              value={hymnForm.title || ''}
              onChange={(e) => setHymnForm({ ...hymnForm, title: e.target.value })}
            />
            
            {/* Official Church Link Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Official Church Site Link
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const generated = getHymnChurchUrl({
                      number: hymnForm.number,
                      title: hymnForm.title,
                      collection: hymnForm.number && hymnForm.number >= 1000 ? 'New' : 'Classic'
                    });
                    setHymnForm({ ...hymnForm, link: generated });
                    toast.success('Church link generated!');
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                >
                  ⚡ Auto-Generate Church Link
                </button>
              </div>
              <Input
                placeholder="https://www.churchofjesuschrist.org/media/music/songs/..."
                value={hymnForm.link || ''}
                onChange={(e) => setHymnForm({ ...hymnForm, link: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Theological Themes (Multiple comma-separated themes)
              </label>
              <Input
                placeholder="e.g. Atonement, Sacrament, Forgiveness, Savior's Love"
                value={hymnForm.theme || ''}
                onChange={(e) => setHymnForm({ ...hymnForm, theme: e.target.value })}
              />
              
              {/* Quick Themes Toggle Bar */}
              <div className="mt-2">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Click to add/toggle popular themes:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                  {ALL_GOSPEL_THEMES.map((gt) => {
                    const currentThemes = (hymnForm.theme || '').split(',').map((t) => t.trim()).filter(Boolean);
                    const isAdded = currentThemes.some((t) => t.toLowerCase() === gt.toLowerCase());
                    return (
                      <button
                        key={gt}
                        type="button"
                        onClick={() => {
                          let nextThemes: string[];
                          if (isAdded) {
                            nextThemes = currentThemes.filter((t) => t.toLowerCase() !== gt.toLowerCase());
                          } else {
                            nextThemes = [...currentThemes, gt];
                          }
                          setHymnForm({ ...hymnForm, theme: nextThemes.join(', ') });
                        }}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                          isAdded
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        )}
                      >
                        {isAdded ? `✓ ${gt}` : `+ ${gt}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
