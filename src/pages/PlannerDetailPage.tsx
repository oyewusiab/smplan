import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Send, Printer, Save, Plus, Trash2, ChevronDown,
  ChevronUp, AlertCircle, Sparkles, Share2, Calendar, BookOpen, AlertTriangle,
  Edit3, Eye
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { plannersApi, agendasApi, assignmentsApi, membersApi, hymnsApi } from '../services/api';
import type { Planner, Agenda, Member, Hymn, SpeakerItem, MeetingType } from '../types';
import { PlannerPrintModal } from '../components/planner/PlannerPrintModal';
import { getDynamicAge } from '../utils/memberAnalyticsEngine';
import { format, eachWeekOfInterval, startOfMonth, endOfMonth, isSunday } from 'date-fns';
import toast from 'react-hot-toast';

const GENERAL_CONFERENCE_TOPICS_2026 = [
  { topic: 'Faith in Jesus Christ and His Atonement', ref: 'Alma 32:21', link: 'https://www.churchofjesuschrist.org/study/general-conference' },
  { topic: 'Covenant Path and Temple Blessings', ref: '2 Nephi 31:19-20', link: 'https://www.churchofjesuschrist.org/study/general-conference' },
  { topic: 'Personal Revelation & the Holy Ghost', ref: 'Helaman 5:12', link: 'https://www.churchofjesuschrist.org/study/general-conference' },
  { topic: 'Strengthening Youth & Families in Zion', ref: 'Mosiah 4:14-15', link: 'https://www.churchofjesuschrist.org/study/general-conference' },
  { topic: 'Patience, Hope and Steadfastness', ref: 'Ether 12:4', link: 'https://www.churchofjesuschrist.org/study/general-conference' },
  { topic: 'Ministering with Christlike Love', ref: 'Moroni 7:47-48', link: 'https://www.churchofjesuschrist.org/study/general-conference' },
];

const LDS_HYMN_THEMES: Record<string, { number: number; title: string; type: 'OPENING' | 'SACRAMENT' | 'CLOSING' | 'ANY' }[]> = {
  'Atonement & Sacrament': [
    { number: 169, title: 'As Now We Take the Sacrament', type: 'SACRAMENT' },
    { number: 172, title: 'In Humility, Our Savior', type: 'SACRAMENT' },
    { number: 175, title: 'O God, the Eternal Father', type: 'SACRAMENT' },
    { number: 181, title: 'Jesus of Nazareth, Savior and King', type: 'SACRAMENT' },
    { number: 184, title: 'Upon the Cross of Calvary', type: 'SACRAMENT' },
    { number: 193, title: 'I Stand All Amazed', type: 'SACRAMENT' },
    { number: 195, title: 'How Great the Wisdom and the Love', type: 'SACRAMENT' },
  ],
  'Faith & Testimony': [
    { number: 2, title: 'The Spirit of God', type: 'OPENING' },
    { number: 85, title: 'How Firm a Foundation', type: 'ANY' },
    { number: 134, title: 'I Believe in Christ', type: 'CLOSING' },
    { number: 135, title: 'My Redeemer Lives', type: 'CLOSING' },
    { number: 136, title: 'I Know That My Redeemer Lives', type: 'ANY' },
    { number: 270, title: 'I’ll Go Where You Want Me to Go', type: 'CLOSING' },
  ],
  'Prayer & Guidance': [
    { number: 97, title: 'Lead, Kindly Light', type: 'OPENING' },
    { number: 98, title: 'I Need Thee Every Hour', type: 'ANY' },
    { number: 142, title: 'Sweet Hour of Prayer', type: 'ANY' },
    { number: 144, title: 'Secret Prayer', type: 'CLOSING' },
    { number: 100, title: 'Nearer, My God, to Thee', type: 'CLOSING' },
  ],
  'Sabbath & Worship': [
    { number: 280, title: 'Welcome, Welcome, Sabbath Morning', type: 'OPENING' },
    { number: 284, title: 'Sweet Is the Work', type: 'OPENING' },
    { number: 1035, title: 'As I keep the Sabbath Day', type: 'OPENING' },
    { number: 157, title: 'Thy Spirit, Lord, Has Stirred Our Souls', type: 'CLOSING' },
    { number: 165, title: 'Abide with Me; ’Tis Eventide', type: 'CLOSING' },
  ],
  'Restoration & Prophets': [
    { number: 19, title: 'We Thank Thee, O God, for a Prophet', type: 'OPENING' },
    { number: 26, title: 'Joseph Smith’s First Prayer', type: 'ANY' },
    { number: 27, title: 'Praise to the Man', type: 'ANY' },
    { number: 4, title: 'Truth Eternal', type: 'CLOSING' },
  ],
  'Praise & Gratitude': [
    { number: 60, title: 'Battle Hymn of the Republic', type: 'OPENING' },
    { number: 70, title: 'Sing Praise to Him', type: 'OPENING' },
    { number: 89, title: 'The Lord Is My Light', type: 'ANY' },
    { number: 108, title: 'The Lord Is My Shepherd', type: 'ANY' },
    { number: 243, title: 'Let Us All Press On', type: 'CLOSING' },
    { number: 1003, title: 'It Is Well with My Soul', type: 'CLOSING' },
  ],
  'Temple & Covenants': [
    { number: 288, title: 'How Beautiful Thy Temples, Lord', type: 'ANY' },
    { number: 294, title: 'Love at Home', type: 'ANY' },
    { number: 300, title: 'Families Can Be Together Forever', type: 'CLOSING' },
    { number: 152, title: 'God Be with You Till We Meet Again', type: 'CLOSING' },
  ],
};

function parseSacramentDuties(val: unknown): { preparing: string[]; blessing: string[]; passing: string[] } | null {
  if (!val) return null;
  let obj = val;
  if (typeof obj === 'string' && obj.trim() && obj.trim() !== '{}') {
    try { obj = JSON.parse(obj); } catch { return null; }
  }
  if (typeof obj === 'object' && obj !== null) {
    const rec = obj as Record<string, unknown>;
    const prep = Array.isArray(rec.preparing) ? rec.preparing.map(String).filter(Boolean) : [];
    const bles = Array.isArray(rec.blessing) ? rec.blessing.map(String).filter(Boolean) : [];
    const pass = Array.isArray(rec.passing) ? rec.passing.map(String).filter(Boolean) : [];
    if (prep.length > 0 || bles.length > 0 || pass.length > 0) {
      return {
        preparing: prep.length > 0 ? prep : [''],
        blessing: bles.length > 0 ? bles : [''],
        passing: pass.length > 0 ? pass : [''],
      };
    }
  }
  return null;
}

export function PlannerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, can } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isViewOnly = searchParams.get('mode') === 'view';

  const [planner, setPlanner] = useState<Planner | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [historicalAssignments, setHistoricalAssignments] = useState<{ person: string; role: string; date: string; planner_id: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [hymns, setHymns] = useState<Hymn[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [localBackupAvailable, setLocalBackupAvailable] = useState<{ agendas: Agenda[]; timestamp: number } | null>(null);

  // Accordion expanded weeks tracking
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 0: true });

  // Hymn Topic Matcher Modal/Drawer state
  const [activeThemeWeek, setActiveThemeWeek] = useState<number | null>(null);
  const [selectedThemeCategory, setSelectedThemeCategory] = useState<string>('Atonement & Sacrament');

  // Printable modal state
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Load Planner and related data with Multi-Layer Safeguards
  const loadData = async (force = false) => {
    if (!session || !id) return;
    setLoading(true);
    try {
      const [pRes, aRes, asRes, mRes, hRes] = await Promise.allSettled([
        plannersApi.get(session.token, id, { forceRefresh: force }) as Promise<{ ok: boolean; data: Planner }>,
        agendasApi.list(session.token, id, { forceRefresh: force }) as Promise<{ ok: boolean; data: Agenda[] }>,
        assignmentsApi.list(session.token, undefined, { forceRefresh: force }) as Promise<{ ok: boolean; data: any[] }>,
        membersApi.list(session.token, { forceRefresh: force }) as Promise<{ ok: boolean; data: Member[] }>,
        hymnsApi.list(session.token, undefined, { forceRefresh: force }) as Promise<{ ok: boolean; data: Hymn[] }>,
      ]);

      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        const pl = pRes.value.data;
        setPlanner(pl);

        let fetchedAgendas: Agenda[] = [];

        // 1. Primary Source: AGENDAS Table
        if (aRes.status === 'fulfilled' && aRes.value.ok && Array.isArray(aRes.value.data) && aRes.value.data.length > 0) {
          fetchedAgendas = aRes.value.data;
        } 
        
        // 2. Secondary Safeguard: Embedded JSON weeks on the PLANNERS row
        if (fetchedAgendas.length === 0 && pl.weeks) {
          try {
            const parsedWeeks = typeof pl.weeks === 'string' ? JSON.parse(pl.weeks) : pl.weeks;
            if (Array.isArray(parsedWeeks) && parsedWeeks.length > 0) {
              fetchedAgendas = parsedWeeks;
            }
          } catch { /* ignore parse error */ }
        }

        // 3. Local Offline Backup Check
        try {
          const localDraftRaw = localStorage.getItem(`SM_DRAFT_PLANNER_${id}`);
          if (localDraftRaw) {
            const localDraft = JSON.parse(localDraftRaw);
            if (localDraft && Array.isArray(localDraft.agendas) && localDraft.agendas.length > 0) {
              const hasDutyData = (a: Agenda) => {
                const duties = getSacramentDuties(a);
                return duties.preparing.some(Boolean) || duties.blessing.some(Boolean) || duties.passing.some(Boolean);
              };

              // If cloud is completely empty or has no content, auto-restore local draft
              const hasCloudContent = fetchedAgendas.some(a => 
                (a.opening_prayer && a.opening_prayer.trim()) || 
                (a.closing_prayer && a.closing_prayer.trim()) || 
                (a.speakers && a.speakers.length > 20) ||
                hasDutyData(a)
              );
              const hasLocalContent = localDraft.agendas.some((a: Agenda) => 
                (a.opening_prayer && a.opening_prayer.trim()) || 
                (a.closing_prayer && a.closing_prayer.trim()) || 
                (a.speakers && a.speakers.length > 20) ||
                hasDutyData(a)
              );

              if (!hasCloudContent && hasLocalContent) {
                fetchedAgendas = localDraft.agendas;
                setHasUnsavedChanges(true);
                toast.success('Recovered unsaved planner draft from local storage!');
              } else if (hasLocalContent && localDraft.timestamp > (new Date(pl.updated_date || 0).getTime() + 10000)) {
                setLocalBackupAvailable(localDraft);
              }
            }
          }
        } catch { /* storage fallback */ }

        // 4. Default Fallback: Generate empty month structure only if no existing data exists anywhere
        if (fetchedAgendas.length === 0 && pl.year && pl.month) {
          fetchedAgendas = generateSundaysForMonth(pl.year, pl.month, pl.unit_name, pl.conducting_officer);
        }

        // Check sacrament_administration column from PLANNERS row
        let sacramentAdminFromPlanner: unknown = null;
        if (pl.sacrament_administration) {
          try {
            sacramentAdminFromPlanner = typeof pl.sacrament_administration === 'string'
              ? JSON.parse(pl.sacrament_administration)
              : pl.sacrament_administration;
          } catch { /* ignore parse error */ }
        }

        // Normalize loaded agendas (self-heal Saturday timezone shifts, clean 1899 times, and serialize JSON fields)
        const normalizedAgendas = fetchedAgendas.map((a, idx) => {
          let cleanDate = a.date || '';
          if (cleanDate && /^\d{4}-\d{2}-\d{2}/.test(cleanDate)) {
            const [y, m, d] = cleanDate.substring(0, 10).split('-').map(Number);
            const dt = new Date(y, m - 1, d);
            if (dt.getDay() === 6) { // Saturday shifted from Sunday
              dt.setDate(dt.getDate() + 1);
              cleanDate = format(dt, 'yyyy-MM-dd');
            } else {
              cleanDate = format(dt, 'yyyy-MM-dd');
            }
          }

          let cleanTime = a.start_time || '10:00';
          if (cleanTime.includes('1899') || cleanTime.includes('T')) {
            cleanTime = '10:00';
          }

          // 1. Resolve sacrament duties across all possible keys
          let resolvedDuties = parseSacramentDuties(a.sacrament_duties) ||
                               parseSacramentDuties((a as { sacrament?: unknown }).sacrament);

          if (!resolvedDuties && sacramentAdminFromPlanner && typeof sacramentAdminFromPlanner === 'object') {
            const adminMap = sacramentAdminFromPlanner as Record<string, unknown>;
            const fromMap = adminMap[a.week_id] ||
                            adminMap[`week_${idx + 1}`] ||
                            adminMap[cleanDate] ||
                            (Array.isArray(sacramentAdminFromPlanner) ? sacramentAdminFromPlanner[idx] : null);
            resolvedDuties = parseSacramentDuties(
              (fromMap as { duties?: unknown; sacrament_duties?: unknown; sacrament?: unknown })?.duties ||
              (fromMap as { duties?: unknown; sacrament_duties?: unknown; sacrament?: unknown })?.sacrament_duties ||
              (fromMap as { duties?: unknown; sacrament_duties?: unknown; sacrament?: unknown })?.sacrament ||
              fromMap
            );
          }

          const finalDuties = resolvedDuties || { preparing: [''], blessing: [''], passing: [''] };
          const serializedDuties = JSON.stringify(finalDuties);

          return {
            ...a,
            week_id: a.week_id || `week_${idx + 1}`,
            date: cleanDate,
            start_time: cleanTime,
            speakers: typeof a.speakers === 'object' ? JSON.stringify(a.speakers) : (a.speakers || '[]'),
            sacrament_duties: serializedDuties,
            sacrament: finalDuties as unknown as string,
          };
        });

        setAgendas(normalizedAgendas);
        setLastSavedTime(new Date(pl.updated_date || Date.now()));
      }

      if (asRes.status === 'fulfilled' && asRes.value.ok) {
        setHistoricalAssignments(asRes.value.data || []);
      }
      if (mRes.status === 'fulfilled' && mRes.value.ok) {
        setMembers(mRes.value.data || []);
      }
      if (hRes.status === 'fulfilled' && hRes.value.ok) {
        setHymns(hRes.value.data || []);
      }

    } catch {
      toast.error('Failed to load planner data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [session, id]);

  // Debounced local backup persistence
  useEffect(() => {
    if (!id || loading || agendas.length === 0) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`SM_DRAFT_PLANNER_${id}`, JSON.stringify({
          planner_id: id,
          agendas,
          conducting_officer: planner?.conducting_officer,
          unit_name: planner?.unit_name,
          timestamp: Date.now()
        }));
      } catch { /* storage full */ }
    }, 800);
    return () => clearTimeout(timer);
  }, [agendas, planner, id, loading]);

  // Window beforeunload prompt if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to Save Workspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveWorkspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [planner, agendas, session]);

  // Generate 4 to 5 Sundays for the selected Month/Year
  const generateSundaysForMonth = (year: number, month: number, unitName: string, conducting: string): Agenda[] => {
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);
    
    // Find all Sundays in the month
    const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 });
    const sundays = weeksInMonth
      .map(w => w)
      .filter(d => d.getMonth() === month - 1 && isSunday(d));

    return sundays.map((sDate, idx) => ({
      agenda_id: `temp_${idx}_${Date.now()}`,
      planner_id: id || '',
      week_id: `week_${idx + 1}`,
      created_by: session?.user_id || '',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      state: 'DRAFT',
      ward_branch: unitName || '',
      stake_district: '',
      date: format(sDate, 'yyyy-MM-dd'),
      type_of_meeting: (idx === 0 ? 'FAST_SUNDAY' : 'SACRAMENT') as MeetingType,
      other_meeting_specify: '',
      presiding: 'Bishop',
      conducting: conducting || '',
      music_director: '',
      choir_director: '',
      organist: '',
      start_time: '10:00',
      prelude_music: '',
      greetings_welcome: '',
      acknowledgements: '',
      ward_branch_business: '',
      stake_district_business: '',
      naming_blessing: '',
      confirmation_bestowal: '',
      opening_hymn: '',
      opening_hymn_number: '',
      opening_prayer: '',
      opening_prayer_gender: '',
      sacrament_hymn: '',
      sacrament_hymn_number: '',
      special_music: '',
      speakers: JSON.stringify([
        { name: '', gender: 'M', topic: '', scripture_ref: '', talk_link: '' },
        { name: '', gender: 'F', topic: '', scripture_ref: '', talk_link: '' },
        { name: '', gender: 'M', topic: '', scripture_ref: '', talk_link: '' },
      ]),
      sacrament_duties: JSON.stringify({ preparing: [], blessing: [], passing: [] }),
      closing_hymn: '',
      closing_hymn_number: '',
      closing_prayer: '',
      closing_prayer_gender: '',
      postlude_music: '',
      announcements: '',
      releases: '',
      calls: '',
      baptized_children: '',
      aaronic_ordinations: '',
      aaronic_advancements: '',
      achievements: '',
      babies: '',
      confirmations: '',
      fellowships: '',
      week_notes: '',
      archive_method: '',
      archive_date: '',
    }));
  };

  // Toggle week accordion
  const toggleWeekAccordion = (idx: number) => {
    setExpandedWeeks(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Update specific agenda in state
  const updateAgendaField = (index: number, patch: Partial<Agenda>) => {
    setHasUnsavedChanges(true);
    setAgendas(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  // Speaker helpers for agenda
  const getAgendaSpeakers = (agenda: Agenda): SpeakerItem[] => {
    try {
      if (Array.isArray(agenda.speakers)) {
        return agenda.speakers;
      }
      if (typeof agenda.speakers === 'string' && agenda.speakers.trim()) {
        const parsed = JSON.parse(agenda.speakers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch { /* fallback */ }
    return [
      { name: '', gender: 'M', topic: '' },
      { name: '', gender: 'F', topic: '' },
      { name: '', gender: 'M', topic: '' },
    ];
  };

  const updateAgendaSpeakers = (agendaIndex: number, speakers: SpeakerItem[]) => {
    updateAgendaField(agendaIndex, { speakers: JSON.stringify(speakers) });
  };

  const addSpeakerToWeek = (agendaIndex: number) => {
    const current = getAgendaSpeakers(agendas[agendaIndex]);
    const updated = [...current, { name: '', gender: 'M' as const, topic: '' }];
    updateAgendaSpeakers(agendaIndex, updated);
  };

  const removeSpeakerFromWeek = (agendaIndex: number, speakerIdx: number) => {
    const current = getAgendaSpeakers(agendas[agendaIndex]);
    const updated = current.filter((_, i) => i !== speakerIdx);
    updateAgendaSpeakers(agendaIndex, updated);
  };

  const moveSpeakerOrder = (agendaIndex: number, speakerIdx: number, direction: 'up' | 'down') => {
    const current = getAgendaSpeakers(agendas[agendaIndex]);
    const targetIdx = direction === 'up' ? speakerIdx - 1 : speakerIdx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[speakerIdx];
    current[speakerIdx] = current[targetIdx];
    current[targetIdx] = temp;
    updateAgendaSpeakers(agendaIndex, [...current]);
  };

  // Sacrament Duties helpers (Preparing, Blessing, Passing)
  const getSacramentDuties = (agenda: Agenda): { preparing: string[]; blessing: string[]; passing: string[] } => {
    if (!agenda) return { preparing: [''], blessing: [''], passing: [''] };
    const parsed = parseSacramentDuties(agenda.sacrament_duties) || parseSacramentDuties((agenda as { sacrament?: unknown }).sacrament);
    return parsed || { preparing: [''], blessing: [''], passing: [''] };
  };

  const updateSacramentDuties = (
    agendaIndex: number,
    updater: (prevDuties: { preparing: string[]; blessing: string[]; passing: string[] }) => { preparing: string[]; blessing: string[]; passing: string[] }
  ) => {
    setHasUnsavedChanges(true);
    setAgendas(prev => {
      const next = [...prev];
      const currentAg = next[agendaIndex];
      if (!currentAg) return prev;
      const currentDuties = getSacramentDuties(currentAg);
      const newDuties = updater(currentDuties);
      next[agendaIndex] = {
        ...currentAg,
        sacrament_duties: JSON.stringify(newDuties),
      };
      return next;
    });
  };

  const addSacramentDutyPerson = (agendaIndex: number, category: 'preparing' | 'blessing' | 'passing') => {
    updateSacramentDuties(agendaIndex, current => ({
      ...current,
      [category]: [...current[category], ''],
    }));
  };

  const removeSacramentDutyPerson = (agendaIndex: number, category: 'preparing' | 'blessing' | 'passing', pIdx: number) => {
    updateSacramentDuties(agendaIndex, current => {
      const list = current[category].filter((_, i) => i !== pIdx);
      return {
        ...current,
        [category]: list.length > 0 ? list : [''],
      };
    });
  };

  const updateSacramentDutyPerson = (agendaIndex: number, category: 'preparing' | 'blessing' | 'passing', pIdx: number, val: string) => {
    updateSacramentDuties(agendaIndex, current => {
      const list = [...current[category]];
      list[pIdx] = val;
      return {
        ...current,
        [category]: list,
      };
    });
  };

  // Conflict detector: check if member was assigned recently in this planner or historical
  const checkMemberConflict = (memberName: string, currentWeekIdx: number, currentRole: string) => {
    if (!memberName || !memberName.trim()) return null;
    const cleanName = memberName.trim().toLowerCase();

    // Check other weeks in current planner
    for (let wIdx = 0; wIdx < agendas.length; wIdx++) {
      const ag = agendas[wIdx];
      const weekLabel = `Week ${wIdx + 1} (${ag.date ? format(new Date(ag.date), 'MMM d') : ''})`;

      // Check prayers
      if (ag.opening_prayer && ag.opening_prayer.trim().toLowerCase() === cleanName && !(wIdx === currentWeekIdx && currentRole === 'Opening Prayer')) {
        return `Already assigned for Opening Prayer in ${weekLabel} of this planner`;
      }
      if (ag.closing_prayer && ag.closing_prayer.trim().toLowerCase() === cleanName && !(wIdx === currentWeekIdx && currentRole === 'Closing Prayer')) {
        return `Already assigned for Closing Prayer in ${weekLabel} of this planner`;
      }

      // Check speakers
      const sps = getAgendaSpeakers(ag);
      for (let sI = 0; sI < sps.length; sI++) {
        if (sps[sI].name && sps[sI].name.trim().toLowerCase() === cleanName && !(wIdx === currentWeekIdx && currentRole === `Speaker ${sI + 1}`)) {
          return `Already assigned as Speaker in ${weekLabel} of this planner`;
        }
      }
    }

    // Check past 6 months historical assignments
    const pastMatch = historicalAssignments.find(a =>
      a.person && a.person.trim().toLowerCase() === cleanName && a.planner_id !== planner?.planner_id
    );

    if (pastMatch) {
      return `Selected for ${pastMatch.role || 'Assignment'} on ${pastMatch.date ? format(new Date(pastMatch.date), 'MMM d, yyyy') : 'recent plan'}`;
    }

    return null;
  };

  // Swap entire week content between two weeks while preserving their Sunday calendar dates
  const handleSwapWeeks = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx || sourceIdx < 0 || targetIdx < 0 || sourceIdx >= agendas.length || targetIdx >= agendas.length) return;

    setAgendas(prev => {
      const next = [...prev];
      const source = next[sourceIdx];
      const target = next[targetIdx];

      // Keep target's agenda_id, week_id, and date, but swap all meeting content
      const newSource: Agenda = {
        ...target,
        agenda_id: source.agenda_id,
        week_id: source.week_id,
        date: source.date,
      };

      const newTarget: Agenda = {
        ...source,
        agenda_id: target.agenda_id,
        week_id: target.week_id,
        date: target.date,
      };

      next[sourceIdx] = newSource;
      next[targetIdx] = newTarget;
      return next;
    });

    toast.success(`Swapped Week ${sourceIdx + 1} with Week ${targetIdx + 1}`);
  };

  // Readiness / Completeness calculator for a single week
  const computeWeekReadiness = (ag: Agenda): { percent: number; isReady: boolean; missing: string[] } => {
    if (ag.is_canceled) {
      if (ag.cancel_reason && ag.cancel_reason.trim()) {
        return { percent: 100, isReady: true, missing: [] };
      }
      return { percent: 50, isReady: false, missing: ['Reason for no sacrament meeting'] };
    }

    const missing: string[] = [];
    let totalFields = 5; // Base: Opening Hymn, Sacrament Hymn, Closing Hymn, Invocation, Benediction
    let completedFields = 0;

    if (ag.opening_hymn) completedFields++; else missing.push('Opening Hymn');
    if (ag.sacrament_hymn) completedFields++; else missing.push('Sacrament Hymn');
    if (ag.closing_hymn) completedFields++; else missing.push('Closing Hymn');
    if (ag.opening_prayer) completedFields++; else missing.push('Invocation');
    if (ag.closing_prayer) completedFields++; else missing.push('Benediction');

    if (ag.type_of_meeting !== 'FAST_SUNDAY') {
      const sps = getAgendaSpeakers(ag);
      totalFields += 4; // Check for at least 2 speakers with topic
      if (sps[0] && sps[0].name) completedFields++; else missing.push('Speaker 1');
      if (sps[0] && sps[0].topic) completedFields++; else missing.push('Speaker 1 Topic');
      if (sps[1] && sps[1].name) completedFields++; else missing.push('Speaker 2');
      if (sps[1] && sps[1].topic) completedFields++; else missing.push('Speaker 2 Topic');
    }

    const percent = Math.round((completedFields / totalFields) * 100);
    return {
      percent,
      isReady: percent === 100,
      missing,
    };
  };

  // Aggregate readiness across entire planner
  const computePlannerReadiness = (agendaList: Agenda[]) => {
    if (agendaList.length === 0) return { totalPercent: 0, readyWeeks: 0, totalWeeks: 0, details: [] };
    const details = agendaList.map((ag, idx) => ({
      weekNum: idx + 1,
      date: ag.date,
      ...computeWeekReadiness(ag),
    }));

    const readyWeeks = details.filter(d => d.isReady).length;
    const totalPercent = Math.round(details.reduce((sum, d) => sum + d.percent, 0) / details.length);

    return {
      totalPercent,
      readyWeeks,
      totalWeeks: details.length,
      details,
    };
  };

  // Hymn Conflict / Recently Used Detector
  const checkHymnRecentlyUsed = (hymnText: string, currentWeekIdx: number): string | null => {
    if (!hymnText || !hymnText.trim()) return null;
    const clean = hymnText.trim().toLowerCase();

    for (let wIdx = 0; wIdx < agendas.length; wIdx++) {
      if (wIdx === currentWeekIdx) continue;
      const otherAg = agendas[wIdx];
      const weekLabel = `Week ${wIdx + 1} (${otherAg.date ? format(new Date(otherAg.date), 'MMM d') : ''})`;

      const otherOpening = `${otherAg.opening_hymn_number || ''} ${otherAg.opening_hymn || ''}`.trim().toLowerCase();
      const otherSacrament = `${otherAg.sacrament_hymn_number || ''} ${otherAg.sacrament_hymn || ''}`.trim().toLowerCase();
      const otherClosing = `${otherAg.closing_hymn_number || ''} ${otherAg.closing_hymn || ''}`.trim().toLowerCase();

      if (otherOpening.includes(clean) || (clean.length > 3 && clean.includes(otherOpening) && otherOpening.length > 3)) {
        return `Selected as Opening Hymn in ${weekLabel}`;
      }
      if (otherSacrament.includes(clean) || (clean.length > 3 && clean.includes(otherSacrament) && otherSacrament.length > 3)) {
        return `Selected as Sacrament Hymn in ${weekLabel}`;
      }
      if (otherClosing.includes(clean) || (clean.length > 3 && clean.includes(otherClosing) && otherClosing.length > 3)) {
        return `Selected as Closing Hymn in ${weekLabel}`;
      }
    }
    return null;
  };

  // Add new week button handler
  const handleAddWeek = () => {
    if (agendas.length >= 5) {
      toast.error('Maximum 5 weeks per monthly planner allowed');
      return;
    }
    const lastDate = agendas.length > 0 && agendas[agendas.length - 1].date
      ? new Date(agendas[agendas.length - 1].date)
      : new Date();
    const nextSunday = new Date(lastDate);
    nextSunday.setDate(nextSunday.getDate() + 7);

    const newAgenda: Agenda = {
      agenda_id: `temp_${Date.now()}`,
      planner_id: id || '',
      week_id: `week_${agendas.length + 1}`,
      created_by: session?.user_id || '',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      state: 'DRAFT',
      ward_branch: planner?.unit_name || '',
      stake_district: '',
      date: format(nextSunday, 'yyyy-MM-dd'),
      type_of_meeting: 'SACRAMENT',
      other_meeting_specify: '',
      presiding: 'Bishop',
      conducting: planner?.conducting_officer || '',
      music_director: '',
      choir_director: '',
      organist: '',
      start_time: '10:00',
      prelude_music: '',
      greetings_welcome: '',
      acknowledgements: '',
      ward_branch_business: '',
      stake_district_business: '',
      naming_blessing: '',
      confirmation_bestowal: '',
      opening_hymn: '',
      opening_hymn_number: '',
      opening_prayer: '',
      opening_prayer_gender: '',
      sacrament_hymn: '',
      sacrament_hymn_number: '',
      special_music: '',
      speakers: JSON.stringify([
        { name: '', gender: 'M', topic: '' },
        { name: '', gender: 'F', topic: '' },
        { name: '', gender: 'M', topic: '' },
      ]),
      sacrament_duties: JSON.stringify({ preparing: [], blessing: [], passing: [] }),
      closing_hymn: '',
      closing_hymn_number: '',
      closing_prayer: '',
      closing_prayer_gender: '',
      postlude_music: '',
      announcements: '',
      releases: '',
      calls: '',
      baptized_children: '',
      aaronic_ordinations: '',
      aaronic_advancements: '',
      achievements: '',
      babies: '',
      confirmations: '',
      fellowships: '',
      week_notes: '',
      archive_method: '',
      archive_date: '',
    };

    setAgendas(prev => [...prev, newAgenda]);
    setExpandedWeeks(prev => ({ ...prev, [agendas.length]: true }));
    toast.success(`Week ${agendas.length + 1} added`);
  };

  const handleRemoveWeek = (weekIdx: number) => {
    if (agendas.length <= 1) {
      toast.error('Planner must have at least 1 week');
      return;
    }
    setAgendas(prev => prev.filter((_, i) => i !== weekIdx));
    toast.success(`Week ${weekIdx + 1} removed`);
  };

  // Save workspace
  const handleSaveWorkspace = async () => {
    if (!session || !planner) return;
    setSaving(true);
    try {
      const res = await plannersApi.saveWorkspace(session.token, {
        planner_id: planner.planner_id,
        conducting_officer: planner.conducting_officer,
        unit_name: planner.unit_name,
        music_status: planner.music_status,
        agendas: agendas,
      }) as { ok: boolean; data?: { agendas: Agenda[] }; error?: string };

      if (!res.ok) throw new Error(res.error || 'Save failed');

      if (res.data?.agendas && Array.isArray(res.data.agendas) && res.data.agendas.length > 0) {
        setAgendas(res.data.agendas);
      }

      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());
      setLocalBackupAvailable(null);

      // Keep local snapshot up to date
      try {
        localStorage.setItem(`SM_DRAFT_PLANNER_${planner.planner_id}`, JSON.stringify({
          planner_id: planner.planner_id,
          agendas: res.data?.agendas || agendas,
          conducting_officer: planner.conducting_officer,
          unit_name: planner.unit_name,
          timestamp: Date.now()
        }));
      } catch { /* storage full */ }

      toast.success(isDraft ? 'Planner draft saved successfully!' : 'Planner changes saved successfully to Cloud!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Submit planner
  const handleSubmitPlanner = async () => {
    if (!session || !planner) return;
    try {
      await handleSaveWorkspace();
      await plannersApi.submit(session.token, planner.planner_id);
      toast.success('Planner finalized and submitted to Bishopric');
      loadData();
    } catch {
      toast.error('Submit failed');
    }
  };

  // One-Click Duty Slip Dispatch via WhatsApp/Email
  const handleDispatchDutySlips = (agenda: Agenda, weekNum: number) => {
    const sps = getAgendaSpeakers(agenda);
    const dateStr = agenda.date ? format(new Date(agenda.date), 'EEEE, MMMM d, yyyy') : `Week ${weekNum}`;
    
    let text = `📋 *Sacrament Meeting Duty Slip — ${planner?.unit_name}*\n`;
    text += `📅 *Date:* ${dateStr}\n`;
    text += `🎤 *Conducting:* ${agenda.conducting || planner?.conducting_officer}\n\n`;

    if (agenda.type_of_meeting === 'FAST_SUNDAY') {
      text += `*Fast & Testimony Meeting*\n`;
    } else {
      text += `*Speakers:*\n`;
      sps.forEach((s, i) => {
        if (s.name) {
          text += `${i + 1}. *${s.name}* ${s.topic ? `— Topic: "${s.topic}"` : ''}\n`;
        }
      });
    }

    text += `\n*Prayers:*\n`;
    text += `• Invocation: *${agenda.opening_prayer || 'TBD'}*\n`;
    text += `• Benediction: *${agenda.closing_prayer || 'TBD'}*\n`;

    if (agenda.opening_hymn) {
      text += `\n🎵 *Hymns:* Opening #${agenda.opening_hymn_number} ${agenda.opening_hymn} | Sacrament #${agenda.sacrament_hymn_number} ${agenda.sacrament_hymn} | Closing #${agenda.closing_hymn_number} ${agenda.closing_hymn}\n`;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    toast.success(`Duty slip dispatch opened for Week ${weekNum}`);
  };

  if (loading) {
    return (
      <div>
        <Header title="Sacrament Planner Editor" />
        <div className="p-6 space-y-4">
          <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!planner) {
    return (
      <div>
        <Header title="Planner Not Found" />
        <div className="p-6">
          <p className="text-slate-500">This planner could not be loaded.</p>
          <Button className="mt-4" onClick={() => navigate('/planners')} icon={<ArrowLeft className="h-4 w-4" />} variant="outline">
            Back to Planners
          </Button>
        </div>
      </div>
    );
  }

  const monthName = format(new Date(planner.year, planner.month - 1), 'MMMM yyyy');
  const isDraft = planner.state === 'DRAFT';
  const hasEditRights = can('PLANNER_EDIT') && (session?.role === 'ADMIN' || session?.role === 'BISHOPRIC' || (isDraft && planner.created_by === session?.user_id));
  const canEdit = !isViewOnly && hasEditRights;

  return (
    <div>
      <Header
        title={`${monthName} Sacrament Planner Workspace`}
        subtitle={`${planner.unit_name} · ${agendas.length} Sundays Configured`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <div className="mr-1">
                {hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved Changes (Ctrl+S)
                  </span>
                ) : lastSavedTime ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Saved to Cloud
                  </span>
                ) : null}
              </div>
            )}
            <Button size="sm" variant="outline" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/planners')}>
              Back
            </Button>
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => loadData(true)}>
              Refresh
            </Button>
            <Button size="sm" variant="outline" icon={<Printer className="h-4 w-4" />} onClick={() => setShowPrintModal(true)}>
              2-Page Print / PDF
            </Button>
            {isViewOnly && hasEditRights && (
              <Button size="sm" variant="primary" icon={<Edit3 className="h-4 w-4" />} onClick={() => navigate(`/planners/${id}`)}>
                Edit Planner
              </Button>
            )}
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant={isDraft ? "secondary" : "primary"}
                  icon={<Save className="h-4 w-4" />}
                  onClick={handleSaveWorkspace}
                  loading={saving}
                >
                  {isDraft ? 'Save Draft' : 'Save Changes'}
                </Button>
                {isDraft && (
                  <Button size="sm" icon={<Send className="h-4 w-4" />} onClick={handleSubmitPlanner}>
                    Submit Planner
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">

        {/* Local Backup Recovery Alert */}
        {localBackupAvailable && canEdit && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Offline draft backup detected:</strong> We found changes saved locally in your browser from {format(new Date(localBackupAvailable.timestamp), 'p, MMM d')}.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(`SM_DRAFT_PLANNER_${id}`);
                  setLocalBackupAvailable(null);
                }}
              >
                Dismiss
              </Button>
              <Button
                size="xs"
                onClick={() => {
                  setAgendas(localBackupAvailable.agendas);
                  setHasUnsavedChanges(true);
                  setLocalBackupAvailable(null);
                  toast.success('Restored offline planner draft!');
                }}
              >
                Restore Local Draft
              </Button>
            </div>
          </div>
        )}

        {/* Read-Only Notice Banner */}
        {isViewOnly && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-900 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-blue-600 shrink-0" />
              <span>Viewing Planner in <strong>Read-Only Mode (Uneditable Form)</strong>. All fields are disabled to prevent accidental modifications.</span>
            </div>
            {hasEditRights && (
              <button
                onClick={() => navigate(`/planners/${id}`)}
                className="font-bold text-blue-700 hover:text-blue-900 underline ml-3"
              >
                Switch to Edit Mode →
              </button>
            )}
          </div>
        )}

        {/* Global Planner Header Settings & Live Readiness Meter */}
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100">
            <div className="flex items-center justify-between w-full flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">Global Planner Settings</h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Readiness Progress Meter Pill */}
                {(() => {
                  const readiness = computePlannerReadiness(agendas);
                  const badgeColor = readiness.totalPercent === 100
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : readiness.totalPercent >= 70
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300';
                  return (
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-extrabold border ${badgeColor} flex items-center gap-1.5 shadow-2xs`}
                      title={`Missing items: ${readiness.details.map(d => d.missing.length > 0 ? `Week ${d.weekNum}: ${d.missing.join(', ')}` : '').filter(Boolean).join(' | ')}`}
                    >
                      <span>🎯 {readiness.totalPercent}% Complete</span>
                      <span className="font-medium text-slate-600">({readiness.readyWeeks}/{readiness.totalWeeks} Weeks Finalized)</span>
                    </div>
                  );
                })()}
                <StatusBadge status={planner.state} />
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Period</label>
                <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-800 border border-slate-200">
                  {monthName}
                </div>
              </div>
              <Input
                label="Unit / Ward Name"
                disabled={!canEdit}
                value={planner.unit_name}
                onChange={(e) => setPlanner({ ...planner, unit_name: e.target.value })}
              />
              <Input
                label="Monthly Conducting Officer"
                disabled={!canEdit}
                placeholder="e.g. Bro. Adeyemi / Bishop Johnson"
                value={planner.conducting_officer}
                onChange={(e) => setPlanner({ ...planner, conducting_officer: e.target.value })}
              />
            </div>
          </CardBody>
        </Card>

        {/* Multi-Week Accordion Grid (4 to 5 Weeks) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Multi-Week Sacrament Form Builder
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {agendas.length} of 5 max weeks scheduled
            </span>
          </div>

          {agendas.map((ag, wIdx) => {
            const isExpanded = expandedWeeks[wIdx] !== false;
            const speakers = getAgendaSpeakers(ag);
            const isFT = ag.type_of_meeting === 'FAST_SUNDAY';
            const isCanceled = ag.is_canceled;
            const weekReadiness = computeWeekReadiness(ag);

            return (
              <Card key={ag.agenda_id || wIdx} className="border border-slate-200 shadow-xs overflow-hidden">
                
                {/* Week Header Bar */}
                <div
                  onClick={() => toggleWeekAccordion(wIdx)}
                  className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                      {wIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-base">
                          {ag.date ? format(new Date(ag.date), 'EEEE, MMMM d, yyyy') : `Week ${wIdx + 1}`}
                        </h4>
                        {isCanceled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            CANCELED
                          </span>
                        )}
                        {isFT && !isCanceled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            Fast & Testimony
                          </span>
                        )}
                        {/* Week Readiness Pill */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${weekReadiness.isReady ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}
                          title={weekReadiness.missing.length > 0 ? `Missing: ${weekReadiness.missing.join(', ')}` : 'Week fully planned'}
                        >
                          {weekReadiness.percent}% {weekReadiness.isReady ? 'Ready' : `(${weekReadiness.missing.length} missing)`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(ag.type_of_meeting || 'SACRAMENT').replace(/_/g, ' ')} · Conducting: {ag.conducting || planner.conducting_officer || 'TBD'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Swap Entire Week Dropdown Menu */}
                    {canEdit && agendas.length > 1 && (
                      <select
                        title="Swap this entire week's content with another week"
                        value=""
                        onChange={(e) => {
                          const targetIdx = Number(e.target.value);
                          if (!isNaN(targetIdx)) {
                            handleSwapWeeks(wIdx, targetIdx);
                          }
                        }}
                        className="text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg px-2 py-1 hover:bg-slate-50 cursor-pointer focus:outline-none focus:border-blue-500"
                      >
                        <option value="" disabled>🔀 Swap Week...</option>
                        {agendas.map((_, otherIdx) => {
                          if (otherIdx === wIdx) return null;
                          return (
                            <option key={otherIdx} value={otherIdx}>
                              Swap with Week {otherIdx + 1}
                            </option>
                          );
                        })}
                      </select>
                    )}

                    <button
                      title="Dispatch WhatsApp Duty Slip"
                      onClick={() => handleDispatchDutySlips(ag, wIdx + 1)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-600 transition"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

                    {canEdit && (
                      <button
                        title="Remove Week"
                        onClick={() => handleRemoveWeek(wIdx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => toggleWeekAccordion(wIdx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition"
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Week Editor Body */}
                {isExpanded && (
                  <CardBody className="p-5 space-y-6">
                    
                    {/* Row 1: Date, Presiding, Meeting Type, Time & Sacrament Toggle */}
                    <div className="grid sm:grid-cols-12 gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-200">
                      
                      <div className="sm:col-span-3">
                        <Input
                          type="date"
                          label="Meeting Date"
                          disabled={!canEdit}
                          value={ag.date}
                          onChange={(e) => updateAgendaField(wIdx, { date: e.target.value })}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <Input
                          label="Presiding Officer (Optional)"
                          disabled={!canEdit}
                          placeholder="e.g. Bishop Johnson / Stake President"
                          value={ag.presiding || ''}
                          onChange={(e) => updateAgendaField(wIdx, { presiding: e.target.value })}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <Select
                          label="Meeting Type"
                          disabled={!canEdit}
                          options={[
                            { value: 'SACRAMENT', label: 'Normal Sacrament' },
                            { value: 'FAST_SUNDAY', label: 'Fast & Testimony' },
                            { value: 'COMBINED', label: 'Combined Meeting' },
                            { value: 'STAKE_CONFERENCE', label: 'Stake Conference' },
                            { value: 'SPECIAL', label: 'Special Meeting' },
                            { value: 'OTHER', label: 'Others (Specified)' },
                          ]}
                          value={ag.type_of_meeting}
                          onChange={(e) => updateAgendaField(wIdx, { type_of_meeting: e.target.value as MeetingType })}
                        />
                        {ag.type_of_meeting === 'OTHER' && (
                          <div className="mt-2">
                            <Input
                              placeholder="Specify meeting type..."
                              disabled={!canEdit}
                              value={ag.other_meeting_specify || ''}
                              onChange={(e) => updateAgendaField(wIdx, { other_meeting_specify: e.target.value })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-3">
                        <Input
                          label="Venue / Time Override"
                          disabled={!canEdit}
                          placeholder="e.g. Main Chapel @ 10:00 AM"
                          value={ag.meeting_time_override || ag.start_time || ''}
                          onChange={(e) => updateAgendaField(wIdx, { meeting_time_override: e.target.value })}
                        />
                      </div>

                      {/* On/Off Sacrament Meeting Toggle Switch */}
                      <div className="sm:col-span-12 pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                            Sacrament Meeting Will be Held?
                            <span className={`px-2 py-0.5 rounded-full text-2xs font-extrabold ${!isCanceled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {!isCanceled ? 'YES — SACRAMENT HELD' : 'NO — SACRAMENT CANCELED'}
                            </span>
                          </label>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Toggle OFF for Stake Conference, General Conference, Broadcasts, or Special notices.
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => updateAgendaField(wIdx, { is_canceled: !ag.is_canceled })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isCanceled ? 'bg-green-600' : 'bg-slate-300'}`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${!isCanceled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      {isCanceled && (
                        <div className="sm:col-span-12 mt-1">
                          <Input
                            label="Reason for No Sacrament Meeting (Required)"
                            required
                            placeholder="e.g. Stake Conference Broadcast / General Conference"
                            disabled={!canEdit}
                            value={ag.cancel_reason || ''}
                            onChange={(e) => updateAgendaField(wIdx, { cancel_reason: e.target.value })}
                          />
                        </div>
                      )}

                    </div>

                    {/* If CANCELED: Hide all blocks (Speakers, Hymns, Sacrament Duties, Prayers) and display cancellation notice */}
                    {isCanceled ? (
                      <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-900 flex items-start gap-3 shadow-2xs">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="font-bold text-red-900 text-sm uppercase tracking-wide">
                            No Sacrament Meeting Scheduled
                          </h5>
                          <p className="text-xs text-red-800">
                            Reason: <strong>{ag.cancel_reason || 'Special Ward/Stake Scheduling'}</strong>.
                          </p>
                          <p className="text-2xs text-red-600">
                            All speaker slots, hymn selections, sacrament duty rosters, and prayer assignments for this Sunday have been deactivated.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* If Fast & Testimony Sunday: Speakers are deactivated, while Hymns, Duties & Prayers remain active */}
                        {isFT ? (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
                            <span><strong>Fast & Testimony Meeting:</strong> Speaker fields are deactivated while Hymns, Sacrament duties and Prayers remain active.</span>
                          </div>
                        ) : (
                          /* Speakers Configuration Block */
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                🎤 Speakers Configuration
                              </h4>
                              {canEdit && (
                                <Button size="xs" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => addSpeakerToWeek(wIdx)}>
                                  Add Speaker
                                </Button>
                              )}
                            </div>

                        <div className="space-y-4">
                          {speakers.map((sp, sIdx) => {
                            const conflictAlert = checkMemberConflict(sp.name, wIdx, `Speaker ${sIdx + 1}`);
                            const currentPrefix = sp.prefix || (sp.gender === 'F' ? 'Sister' : 'Brother');

                            const getPrefixBadgeStyle = (prefixVal: string) => {
                              switch (prefixVal) {
                                case 'Sister': return 'bg-pink-100 text-pink-800 border-pink-300';
                                case 'Elder': return 'bg-purple-100 text-purple-800 border-purple-300';
                                case 'Bishop': return 'bg-amber-100 text-amber-800 border-amber-300';
                                case 'President': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
                                default: return 'bg-blue-100 text-blue-800 border-blue-300'; // Brother
                              }
                            };

                            return (
                              <div key={sIdx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                                      Speaker {sIdx + 1}
                                    </span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getPrefixBadgeStyle(currentPrefix)}`}>
                                      {currentPrefix}
                                    </span>
                                  </div>

                                  {/* Drag / Reorder Buttons */}
                                  {canEdit && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        disabled={sIdx === 0}
                                        onClick={() => moveSpeakerOrder(wIdx, sIdx, 'up')}
                                        className="px-2 py-0.5 text-xs font-bold bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-30"
                                      >
                                        ↑ Move Up
                                      </button>
                                      <button
                                        disabled={sIdx === speakers.length - 1}
                                        onClick={() => moveSpeakerOrder(wIdx, sIdx, 'down')}
                                        className="px-2 py-0.5 text-xs font-bold bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-30"
                                      >
                                        ↓ Move Down
                                      </button>
                                      {speakers.length > 1 && (
                                        <button
                                          onClick={() => removeSpeakerFromWeek(wIdx, sIdx)}
                                          className="p-1 text-slate-400 hover:text-red-600 transition"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="grid sm:grid-cols-12 gap-3">
                                  
                                  {/* Prefix / Title Dropdown */}
                                  <div className="sm:col-span-3">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix / Title</label>
                                    <select
                                      disabled={!canEdit}
                                      value={currentPrefix}
                                      onChange={(e) => {
                                        const newPrefix = e.target.value;
                                        const newSpeakers = [...speakers];
                                        newSpeakers[sIdx] = {
                                          ...newSpeakers[sIdx],
                                          prefix: newPrefix,
                                          gender: newPrefix === 'Sister' ? 'F' : 'M',
                                        };
                                        updateAgendaSpeakers(wIdx, newSpeakers);
                                      }}
                                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold focus:border-blue-500 focus:outline-none"
                                    >
                                      <option value="Brother">Brother</option>
                                      <option value="Sister">Sister</option>
                                      <option value="Elder">Elder</option>
                                      <option value="Bishop">Bishop</option>
                                      <option value="President">President</option>
                                    </select>
                                  </div>

                                  {/* Speaker's Name Autocomplete (Clean without duplicate prefix) */}
                                  <div className="sm:col-span-9">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Speaker's Name</label>
                                    <input
                                      type="text"
                                      disabled={!canEdit}
                                      placeholder="Search member list or enter full name..."
                                      list={`members_list_${wIdx}_${sIdx}`}
                                      value={sp.name}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const found = members.find(m => m.name.toLowerCase() === val.toLowerCase());
                                        const newSpeakers = [...speakers];
                                        const detectedGender = found ? (found.gender || 'M') : newSpeakers[sIdx].gender;
                                        newSpeakers[sIdx] = {
                                          ...newSpeakers[sIdx],
                                          name: val,
                                          gender: detectedGender,
                                          prefix: newSpeakers[sIdx].prefix || (detectedGender === 'F' ? 'Sister' : 'Brother'),
                                        };
                                        updateAgendaSpeakers(wIdx, newSpeakers);
                                      }}
                                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                                    />
                                    <datalist id={`members_list_${wIdx}_${sIdx}`}>
                                      {members.map(m => (
                                        <option key={m.name} value={m.name}>{m.organisation ? `${m.name} (${m.organisation})` : m.name}</option>
                                      ))}
                                    </datalist>
                                  </div>

                                  {/* Topic (Expandable with AI Topic Suggestion) */}
                                  <div className="sm:col-span-6">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-xs font-semibold text-slate-700">Topic</label>
                                      {canEdit && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const randTopic = GENERAL_CONFERENCE_TOPICS_2026[Math.floor(Math.random() * GENERAL_CONFERENCE_TOPICS_2026.length)];
                                            const newSpeakers = [...speakers];
                                            newSpeakers[sIdx].topic = randTopic.topic;
                                            newSpeakers[sIdx].scripture_ref = randTopic.ref;
                                            newSpeakers[sIdx].talk_link = randTopic.link;
                                            updateAgendaSpeakers(wIdx, newSpeakers);
                                            toast.success('Suggested Conference topic applied');
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                                        >
                                          <Sparkles className="h-3 w-3" /> AI Topic Suggestion
                                        </button>
                                      )}
                                    </div>
                                    <textarea
                                      rows={2}
                                      disabled={!canEdit}
                                      placeholder="e.g. The Atonement of Jesus Christ and covenant path..."
                                      value={sp.topic || ''}
                                      onChange={(e) => {
                                        const newSpeakers = [...speakers];
                                        newSpeakers[sIdx].topic = e.target.value;
                                        updateAgendaSpeakers(wIdx, newSpeakers);
                                      }}
                                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none resize-y"
                                    />
                                  </div>

                                  {/* Scripture Reference */}
                                  <div className="sm:col-span-6">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reference</label>
                                    <textarea
                                      rows={2}
                                      disabled={!canEdit}
                                      placeholder="e.g. Alma 32:21; Mosiah 4:14-15"
                                      value={sp.scripture_ref || ''}
                                      onChange={(e) => {
                                        const newSpeakers = [...speakers];
                                        newSpeakers[sIdx].scripture_ref = e.target.value;
                                        updateAgendaSpeakers(wIdx, newSpeakers);
                                      }}
                                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none resize-y"
                                    />
                                  </div>

                                  {/* Link to Reference (Digital link, omitted from printed/downloaded PDF) */}
                                  <div className="sm:col-span-12">
                                    <Input
                                      label="Link to Reference (Digital talk / Gospel Library URL)"
                                      disabled={!canEdit}
                                      placeholder="https://www.churchofjesuschrist.org/study/general-conference/..."
                                      value={sp.talk_link || ''}
                                      onChange={(e) => {
                                        const newSpeakers = [...speakers];
                                        newSpeakers[sIdx].talk_link = e.target.value;
                                        updateAgendaSpeakers(wIdx, newSpeakers);
                                      }}
                                    />
                                    <p className="text-2xs text-slate-400 mt-0.5">
                                      * Visible in online assignments & planner workspace; automatically excluded from printed PDF outputs.
                                    </p>
                                  </div>

                                </div>

                                {/* Inline Conflict Warning Alert Badge */}
                                {conflictAlert && (
                                  <div className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                                    <span>{conflictAlert}</span>
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      </div>

                    )}

                    {/* Hymns Block */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          🎵 Hymns Block
                        </h4>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              const firstTopic = (speakers[0]?.topic || '').toLowerCase();
                              if (firstTopic.includes('faith') || firstTopic.includes('testimony')) {
                                setSelectedThemeCategory('Faith & Testimony');
                              } else if (firstTopic.includes('prayer') || firstTopic.includes('revelation')) {
                                setSelectedThemeCategory('Prayer & Guidance');
                              } else if (firstTopic.includes('sabbath') || firstTopic.includes('worship')) {
                                setSelectedThemeCategory('Sabbath & Worship');
                              } else if (firstTopic.includes('restoration') || firstTopic.includes('prophet')) {
                                setSelectedThemeCategory('Restoration & Prophets');
                              } else if (firstTopic.includes('temple') || firstTopic.includes('covenant')) {
                                setSelectedThemeCategory('Temple & Covenants');
                              } else if (firstTopic.includes('gratitude') || firstTopic.includes('praise')) {
                                setSelectedThemeCategory('Praise & Gratitude');
                              } else {
                                setSelectedThemeCategory('Atonement & Sacrament');
                              }
                              setActiveThemeWeek(wIdx);
                            }}
                            className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                            Match Hymns to Theme
                          </button>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        
                        {/* Opening Hymn */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Hymn</label>
                          <input
                            type="text"
                            disabled={!canEdit}
                            placeholder="e.g. #2 The Spirit of God"
                            list="hymns_list"
                            value={ag.opening_hymn ? `#${ag.opening_hymn_number || ''} ${ag.opening_hymn}` : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const match = hymns.find(h => `#${h.number} ${h.title}`.toLowerCase() === val.toLowerCase() || h.title.toLowerCase() === val.toLowerCase());
                              updateAgendaField(wIdx, {
                                opening_hymn: match ? match.title : val,
                                opening_hymn_number: match ? String(match.number) : ag.opening_hymn_number,
                              });
                            }}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          {checkHymnRecentlyUsed(ag.opening_hymn, wIdx) && (
                            <p className="mt-1 text-2xs font-semibold text-amber-700 bg-amber-50 p-1 rounded border border-amber-200">
                              ⚠️ {checkHymnRecentlyUsed(ag.opening_hymn, wIdx)}
                            </p>
                          )}
                        </div>

                        {/* Sacrament Hymn */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Sacrament Hymn</label>
                          <input
                            type="text"
                            disabled={!canEdit}
                            placeholder="e.g. #169 As Now We Take the Sacrament"
                            list="hymns_list"
                            value={ag.sacrament_hymn ? `#${ag.sacrament_hymn_number || ''} ${ag.sacrament_hymn}` : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const match = hymns.find(h => `#${h.number} ${h.title}`.toLowerCase() === val.toLowerCase() || h.title.toLowerCase() === val.toLowerCase());
                              updateAgendaField(wIdx, {
                                sacrament_hymn: match ? match.title : val,
                                sacrament_hymn_number: match ? String(match.number) : ag.sacrament_hymn_number,
                              });
                            }}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          {checkHymnRecentlyUsed(ag.sacrament_hymn, wIdx) && (
                            <p className="mt-1 text-2xs font-semibold text-amber-700 bg-amber-50 p-1 rounded border border-amber-200">
                              ⚠️ {checkHymnRecentlyUsed(ag.sacrament_hymn, wIdx)}
                            </p>
                          )}
                        </div>

                        {/* Closing Hymn */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Closing Hymn</label>
                          <input
                            type="text"
                            disabled={!canEdit}
                            placeholder="e.g. #19 We Thank Thee, O God, for a Prophet"
                            list="hymns_list"
                            value={ag.closing_hymn ? `#${ag.closing_hymn_number || ''} ${ag.closing_hymn}` : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const match = hymns.find(h => `#${h.number} ${h.title}`.toLowerCase() === val.toLowerCase() || h.title.toLowerCase() === val.toLowerCase());
                              updateAgendaField(wIdx, {
                                closing_hymn: match ? match.title : val,
                                closing_hymn_number: match ? String(match.number) : ag.closing_hymn_number,
                              });
                            }}
                            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          {checkHymnRecentlyUsed(ag.closing_hymn, wIdx) && (
                            <p className="mt-1 text-2xs font-semibold text-amber-700 bg-amber-50 p-1 rounded border border-amber-200">
                              ⚠️ {checkHymnRecentlyUsed(ag.closing_hymn, wIdx)}
                            </p>
                          )}
                        </div>

                        <datalist id="hymns_list">
                          {hymns.map(h => (
                            <option key={h.number} value={`#${h.number} ${h.title}`} />
                          ))}
                        </datalist>

                        <datalist id="male_members_list">
                          {members.filter(m => {
                            const isMale = String(m.gender || '').toUpperCase() === 'M' || !m.gender;
                            const age = getDynamicAge(m.birthdate || m.birth_date, m.age);
                            return isMale && (age === 0 || age >= 11);
                          }).map(m => (
                            <option key={m.name} value={m.name}>{m.organisation ? `${m.name} (${m.organisation})` : m.name}</option>
                          ))}
                        </datalist>

                      </div>
                    </div>

                    {/* Sacrament Administration Block (Male-Only Priesthood Brethren) */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          🍷 Sacrament Administration Block
                        </h4>
                        <span className="text-2xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                          Male Brethren Only (Priesthood)
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        {(() => {
                          const duties = getSacramentDuties(ag);
                          return (['preparing', 'blessing', 'passing'] as const).map((cat) => {
                            const catLabel = cat === 'preparing' ? 'Preparing' : cat === 'blessing' ? 'Blessing' : 'Passing';
                            const list = duties[cat];

                            return (
                              <div key={cat} className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                                    {catLabel} ({list.filter(Boolean).length})
                                  </label>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={() => addSacramentDutyPerson(wIdx, cat)}
                                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                                    >
                                      <Plus className="h-3 w-3" /> Add
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-2 pt-1">
                                  {list.map((personName, pIdx) => (
                                    <div key={pIdx} className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        disabled={!canEdit}
                                        placeholder={`Male member for ${cat}...`}
                                        list="male_members_list"
                                        value={personName}
                                        onChange={(e) => {
                                          let val = e.target.value;
                                          const found = members.find(m => m.name.toLowerCase() === val.toLowerCase() && (m.gender === 'M' || !m.gender));
                                          if (found && !val.startsWith('Brother') && !val.startsWith('Elder') && !val.startsWith('Bishop') && !val.startsWith('President')) {
                                            val = `Brother ${found.name}`;
                                          }
                                          updateSacramentDutyPerson(wIdx, cat, pIdx, val);
                                        }}
                                        className="block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium focus:border-blue-500 focus:outline-none"
                                      />
                                      {canEdit && list.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeSacramentDutyPerson(wIdx, cat, pIdx)}
                                          className="text-slate-400 hover:text-red-600 shrink-0 p-1"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Prayers Block */}
                    <div className="space-y-3 pt-2">
                      <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        🙏 Prayers Block
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        
                        {/* Invocation */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-700">Invocation (Opening Prayer)</label>
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <select
                                disabled={!canEdit}
                                value={ag.opening_prayer_prefix || (ag.opening_prayer_gender === 'F' ? 'Sister' : 'Brother')}
                                onChange={(e) => {
                                  const pref = e.target.value;
                                  updateAgendaField(wIdx, {
                                    opening_prayer_prefix: pref,
                                    opening_prayer_gender: pref === 'Sister' ? 'F' : 'M',
                                  });
                                }}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                              >
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Elder">Elder</option>
                                <option value="Bishop">Bishop</option>
                                <option value="President">President</option>
                              </select>
                            </div>
                            <div className="col-span-8">
                              <input
                                type="text"
                                disabled={!canEdit}
                                placeholder="Search or type member name..."
                                list={`prayers_list_inv_${wIdx}`}
                                value={ag.opening_prayer || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const found = members.find(m => m.name.toLowerCase() === val.toLowerCase());
                                  const detectedGender = found ? (found.gender || 'M') : ag.opening_prayer_gender;
                                  updateAgendaField(wIdx, {
                                    opening_prayer: val,
                                    opening_prayer_gender: detectedGender,
                                    opening_prayer_prefix: ag.opening_prayer_prefix || (detectedGender === 'F' ? 'Sister' : 'Brother'),
                                  });
                                }}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                              />
                              <datalist id={`prayers_list_inv_${wIdx}`}>
                                {members.map(m => (
                                  <option key={m.name} value={m.name}>{m.organisation ? `${m.name} (${m.organisation})` : m.name}</option>
                                ))}
                              </datalist>
                            </div>
                          </div>
                          {checkMemberConflict(ag.opening_prayer, wIdx, 'Opening Prayer') && (
                            <div className="text-xs text-amber-700 font-medium pt-1">
                              ⚠️ {checkMemberConflict(ag.opening_prayer, wIdx, 'Opening Prayer')}
                            </div>
                          )}
                        </div>

                        {/* Benediction */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-700">Benediction (Closing Prayer)</label>
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <select
                                disabled={!canEdit}
                                value={ag.closing_prayer_prefix || (ag.closing_prayer_gender === 'F' ? 'Sister' : 'Brother')}
                                onChange={(e) => {
                                  const pref = e.target.value;
                                  updateAgendaField(wIdx, {
                                    closing_prayer_prefix: pref,
                                    closing_prayer_gender: pref === 'Sister' ? 'F' : 'M',
                                  });
                                }}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                              >
                                <option value="Brother">Brother</option>
                                <option value="Sister">Sister</option>
                                <option value="Elder">Elder</option>
                                <option value="Bishop">Bishop</option>
                                <option value="President">President</option>
                              </select>
                            </div>
                            <div className="col-span-8">
                              <input
                                type="text"
                                disabled={!canEdit}
                                placeholder="Search or type member name..."
                                list={`prayers_list_ben_${wIdx}`}
                                value={ag.closing_prayer || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const found = members.find(m => m.name.toLowerCase() === val.toLowerCase());
                                  const detectedGender = found ? (found.gender || 'M') : ag.closing_prayer_gender;
                                  updateAgendaField(wIdx, {
                                    closing_prayer: val,
                                    closing_prayer_gender: detectedGender,
                                    closing_prayer_prefix: ag.closing_prayer_prefix || (detectedGender === 'F' ? 'Sister' : 'Brother'),
                                  });
                                }}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                              />
                              <datalist id={`prayers_list_ben_${wIdx}`}>
                                {members.map(m => (
                                  <option key={m.name} value={m.name}>{m.organisation ? `${m.name} (${m.organisation})` : m.name}</option>
                                ))}
                              </datalist>
                            </div>
                          </div>
                          {checkMemberConflict(ag.closing_prayer, wIdx, 'Closing Prayer') && (
                            <div className="text-xs text-amber-700 font-medium pt-1">
                              ⚠️ {checkMemberConflict(ag.closing_prayer, wIdx, 'Closing Prayer')}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </>
                )}

                    {/* Week Notes */}
                    <div className="pt-2">
                      <Textarea
                        label="Week Special Notes (Printed on Back Page)"
                        disabled={!canEdit}
                        rows={2}
                        placeholder="e.g. Stake Conference Broadcast / Fast Offering collection after meeting."
                        value={ag.week_notes || ''}
                        onChange={(e) => updateAgendaField(wIdx, { week_notes: e.target.value })}
                      />
                    </div>

                  </CardBody>
                )}
              </Card>
            );
          })}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          {canEdit && (
            <Button variant="outline" icon={<Plus className="h-4 w-4" />} onClick={handleAddWeek} disabled={agendas.length >= 5}>
              + Add Week (Up to 5)
            </Button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <Button variant="outline" onClick={() => navigate('/planners')}>
              Cancel
            </Button>
            {canEdit && (
              <>
                <Button
                  variant={isDraft ? "secondary" : "primary"}
                  icon={<Save className="h-4 w-4" />}
                  onClick={handleSaveWorkspace}
                  loading={saving}
                >
                  {isDraft ? 'Save Draft' : 'Save Changes'}
                </Button>
                {isDraft && (
                  <Button icon={<Send className="h-4 w-4" />} onClick={handleSubmitPlanner}>
                    Submit Planner
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Printable 2-Page Landscape Modal */}
      {showPrintModal && (
        <PlannerPrintModal
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          planner={planner}
          agendas={agendas}
        />
      )}

      {/* Hymn Topic & Doctrinal Matcher Modal */}
      {activeThemeWeek !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-lg text-base">🎵</span>
                <div>
                  <h3 className="font-bold text-slate-900">Hymn Topic & Doctrinal Matcher</h3>
                  <p className="text-xs text-slate-500">Recommended LDS Hymns for Week {activeThemeWeek + 1}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveThemeWeek(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(LDS_HYMN_THEMES).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedThemeCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      selectedThemeCategory === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Hymns List */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Recommended Hymns ({LDS_HYMN_THEMES[selectedThemeCategory]?.length || 0})
                </h4>
                <div className="grid gap-2">
                  {(LDS_HYMN_THEMES[selectedThemeCategory] || []).map((h) => (
                    <div
                      key={h.number}
                      className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 flex items-center justify-between gap-3 transition"
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          #{h.number} — {h.title}
                        </div>
                        <span className="text-2xs font-semibold text-slate-500 uppercase">
                          Type: {h.type === 'ANY' ? 'Opening, Sacrament or Closing' : h.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(h.type === 'OPENING' || h.type === 'ANY') && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              updateAgendaField(activeThemeWeek, {
                                opening_hymn: h.title,
                                opening_hymn_number: String(h.number),
                              });
                              toast.success(`Set #${h.number} as Opening Hymn`);
                              setActiveThemeWeek(null);
                            }}
                          >
                            Set Opening
                          </Button>
                        )}
                        {(h.type === 'SACRAMENT' || h.type === 'ANY') && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              updateAgendaField(activeThemeWeek, {
                                sacrament_hymn: h.title,
                                sacrament_hymn_number: String(h.number),
                              });
                              toast.success(`Set #${h.number} as Sacrament Hymn`);
                              setActiveThemeWeek(null);
                            }}
                          >
                            Set Sacrament
                          </Button>
                        )}
                        {(h.type === 'CLOSING' || h.type === 'ANY') && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              updateAgendaField(activeThemeWeek, {
                                closing_hymn: h.title,
                                closing_hymn_number: String(h.number),
                              });
                              toast.success(`Set #${h.number} as Closing Hymn`);
                              setActiveThemeWeek(null);
                            }}
                          >
                            Set Closing
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setActiveThemeWeek(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
