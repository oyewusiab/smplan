import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, RefreshCw, BookOpen, Printer, Eye, Save, Calendar, Users,
  CheckCircle2, Sparkles, Trash2, Edit3, Layers, Tablet, Shield, ArrowRight,
  FileText, Award, AlertTriangle, ChevronRight, UserCheck, Music, Volume2,
  Clock, CheckSquare, Mail
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { agendasApi, plannersApi, membersApi, activitiesApi, hymnsApi } from '../services/api';
import type {
  Agenda, Planner, Member, Activity, Hymn, SpeakerItem, MeetingType,
  ReleaseItem, SustainingItem, OrdinationItem, AdvancementItem, BabyBlessingItem,
  BaptismItem, ConfirmationBestowalItem, FellowshipItem
} from '../types';
import { parseHymn, formatHymnDisplay, formatPersonWithTitle } from '../utils/hymnParser';
import { generateStandAgendaHtml, parseSpeakersList, parseStructuredOrLines } from '../utils/AgendaPrintEngine';
import { formatTime12h } from '../utils/formatters';
import { AgendaDiffModal } from '../components/agenda/AgendaDiffModal';
import { DigitalPodiumModal } from '../components/agenda/DigitalPodiumModal';
import { OtherAgendasSection } from '../components/agenda/OtherAgendasSection';
import { SendAgendaReminderModal } from '../components/agenda/SendAgendaReminderModal';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from 'date-fns';
import toast from 'react-hot-toast';

const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: 'SACRAMENT', label: 'Sacrament Meeting' },
  { value: 'FAST_SUNDAY', label: 'Fast & Testimony (F & T)' },
  { value: 'STAKE_CONFERENCE', label: 'Stake/District Meeting' },
  { value: 'COMBINED', label: 'Ward/Branch Conference' },
  { value: 'OTHER', label: 'Other (Specify)' },
];

const emptyAgenda: Partial<Agenda> = {
  ward_branch: '',
  stake_district: '',
  date: '',
  type_of_meeting: 'SACRAMENT',
  other_meeting_specify: '',
  presiding: '',
  presiding_position: 'Bishop',
  conducting: '',
  conducting_position: '1st Counsellor',
  music_director: '',
  choir_director: '',
  organist: '',
  start_time: '9:00 AM',
  prelude_music: '',
  greetings_welcome: 'We warmly welcome everyone, stake officers, friends of the church and those worshipping with us for the first time.',
  acknowledgements: '',
  ward_branch_business: '',
  stake_district_business: '',
  naming_blessing: '',
  confirmation_bestowal: '',
  opening_hymn: '',
  opening_hymn_number: '',
  opening_prayer: '',
  sacrament_hymn: '',
  sacrament_hymn_number: '',
  special_music: '',
  speakers: '[]',
  closing_hymn: '',
  closing_hymn_number: '',
  closing_prayer: '',
  postlude_music: '',
  announcements: '',
  releases: '[]',
  calls: '[]',
  baptized_children: '[]',
  aaronic_ordinations: '[]',
  aaronic_advancements: '[]',
  achievements: '[]',
  babies: '[]',
  confirmations: '[]',
  fellowships: '[]',
  week_notes: '',
  state: 'DRAFT',
};

function normalizeDateStr(d: unknown): string {
  if (!d) return '';
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (d.length >= 10 && d.includes('-')) return d.substring(0, 10);
    try {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
    } catch {}
    return d.trim();
  }
  if (d instanceof Date && !isNaN(d.getTime())) {
    return format(d, 'yyyy-MM-dd');
  }
  return String(d);
}

export function AgendasPage() {
  const { session, can } = useAuthStore();
  const canEditAgenda = can('AGENDA_EDIT');
  const canCreateAgenda = can('AGENDA_CREATE');

  // Primary Data
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // View state: Workspace or Directory
  const [meetingCategory, setMeetingCategory] = useState<'SACRAMENT' | 'LEADERSHIP'>('SACRAMENT');
  const [viewMode, setViewMode] = useState<'workspace' | 'directory'>('workspace');
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');

  // Step 1: Selected Planner & Sunday Week
  const [selectedPlannerId, setSelectedPlannerId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Active Agenda State
  const [activeAgenda, setActiveAgenda] = useState<Partial<Agenda>>(emptyAgenda);
  const [isDraftCreated, setIsDraftCreated] = useState<boolean>(false);

  // Structured Front Page items
  const [speakersList, setSpeakersList] = useState<SpeakerItem[]>([
    { name: '', topic: '', scripture_ref: '', minutes: 10, gender: '' },
    { name: '', topic: '', scripture_ref: '', minutes: 15, gender: '' },
    { name: '', topic: '', scripture_ref: '', minutes: 20, gender: '' },
  ]);

  // Structured Back Page (Ward Business) items
  const [announcementSlots, setAnnouncementSlots] = useState<string[]>(['', '', '', '', '', '']);
  const [releasesList, setReleasesList] = useState<ReleaseItem[]>(Array.from({ length: 6 }, () => ({ name: '', calling: '' })));
  const [sustainingsList, setSustainingsList] = useState<SustainingItem[]>(Array.from({ length: 6 }, () => ({ name: '', calling: '' })));
  const [baptismsList, setBaptismsList] = useState<BaptismItem[]>(Array.from({ length: 4 }, () => ({ name: '' })));
  const [ordinationsList, setOrdinationsList] = useState<OrdinationItem[]>(Array.from({ length: 4 }, () => ({ name: '', office: '', ordained_by: '', ordained_by_office: '' })));
  const [advancementsList, setAdvancementsList] = useState<AdvancementItem[]>(Array.from({ length: 4 }, () => ({ name: '', from_office: '', to_office: '', ordained_by: '', ordained_by_office: '' })));
  const [achievementsList, setAchievementsList] = useState<string[]>(['', '', '', '']);
  const [babiesList, setBabiesList] = useState<BabyBlessingItem[]>(Array.from({ length: 4 }, () => ({ baby_name: '', family: '', blessed_by: '', blessed_by_office: '' })));
  const [confirmationsList, setConfirmationsList] = useState<ConfirmationBestowalItem[]>(Array.from({ length: 6 }, () => ({ name: '', confirmed_by: '', office: '' })));
  const [fellowshipsList, setFellowshipsList] = useState<FellowshipItem[]>(Array.from({ length: 8 }, () => ({ name: '' })));

  // Modals & Preview Tools
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [plannerWeekAgenda, setPlannerWeekAgenda] = useState<Partial<Agenda> | null>(null);
  const [podiumModalOpen, setPodiumModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [sendReminderModalOpen, setSendReminderModalOpen] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  // Bishop and Counsellor permission check
  const isBishopric = Boolean(
    session?.role === 'ADMIN' ||
    session?.role === 'BISHOPRIC' ||
    session?.calling?.toLowerCase().includes('bishop') ||
    session?.calling?.toLowerCase().includes('counsel')
  );

  // Load all initial data
  const loadAll = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [aRes, pRes, mRes, actRes, hRes] = await Promise.allSettled([
        agendasApi.list(session.token) as Promise<{ ok: boolean; data: Agenda[] }>,
        plannersApi.list(session.token) as Promise<{ ok: boolean; data: Planner[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
        activitiesApi.list(session.token) as Promise<{ ok: boolean; data: Activity[] }>,
        hymnsApi.list(session.token) as Promise<{ ok: boolean; data: Hymn[] }>,
      ]);

      if (aRes.status === 'fulfilled' && aRes.value.ok) setAgendas(aRes.value.data || []);
      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        const allPlanners = pRes.value.data || [];
        setPlanners(allPlanners);
        // Requirement 2: Only Active (SUBMITTED / APPROVED) Planners should appear for selection
        const activePlanners = allPlanners.filter((p) => p.state === 'SUBMITTED' || p.state === 'APPROVED');
        if (activePlanners.length > 0 && !selectedPlannerId) {
          setSelectedPlannerId(activePlanners[0].planner_id);
        } else if (allPlanners.length > 0 && !selectedPlannerId) {
          setSelectedPlannerId(allPlanners[0].planner_id);
        }
      }
      if (mRes.status === 'fulfilled' && mRes.value.ok) setMembers(mRes.value.data || []);
      if (actRes.status === 'fulfilled' && actRes.value.ok) setActivities(actRes.value.data || []);
      if (hRes.status === 'fulfilled' && hRes.value.ok) setHymns(hRes.value.data || []);
    } catch {
      toast.error('Failed to load initial agenda data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [session]);

  // Requirement 2: Filter to ONLY submitted / approved planners
  const activeSubmittedPlanners = useMemo(() => {
    const filtered = planners.filter((p) => p.state === 'SUBMITTED' || p.state === 'APPROVED');
    return filtered.length > 0 ? filtered : planners;
  }, [planners]);

  // Selected Planner Object
  const selectedPlanner = useMemo(() => {
    return planners.find((p) => p.planner_id === selectedPlannerId) || null;
  }, [planners, selectedPlannerId]);

  // Sundays in selected planner
  const plannerSundays = useMemo(() => {
    if (!selectedPlanner) return [];
    try {
      const datesSet = new Set<string>();

      // 1. From selectedPlanner.weeks
      if (selectedPlanner.weeks) {
        const weeksArr: Partial<Agenda>[] = typeof selectedPlanner.weeks === 'string'
          ? JSON.parse(selectedPlanner.weeks)
          : selectedPlanner.weeks || [];
        weeksArr.forEach((w) => {
          const nd = normalizeDateStr(w.date);
          if (nd) datesSet.add(nd);
        });
      }

      // 2. From agendas matching planner_id
      agendas
        .filter((a) => a.planner_id === selectedPlannerId)
        .forEach((a) => {
          const nd = normalizeDateStr(a.date);
          if (nd) datesSet.add(nd);
        });

      if (datesSet.size > 0) {
        return Array.from(datesSet).sort();
      }

      // 3. Fallback to calculating sundays for month
      const start = startOfMonth(new Date(selectedPlanner.year, selectedPlanner.month - 1, 1));
      const end = endOfMonth(start);
      return eachDayOfInterval({ start, end })
        .filter((d) => isSunday(d))
        .map((d) => format(d, 'yyyy-MM-dd'));
    } catch {
      return [];
    }
  }, [selectedPlanner, selectedPlannerId, agendas]);

  // Update selected date if not in planner's sundays
  useEffect(() => {
    if (plannerSundays.length > 0) {
      if (!selectedDate || !plannerSundays.includes(selectedDate)) {
        setSelectedDate(plannerSundays[0]);
      }
    }
  }, [plannerSundays]);

  // Check if saved agenda exists for selected date
  const savedAgendaForDate = useMemo(() => {
    if (!selectedDate) return null;
    const targetNorm = normalizeDateStr(selectedDate);
    return (
      agendas.find((a) => a.planner_id === selectedPlannerId && normalizeDateStr(a.date) === targetNorm) ||
      agendas.find((a) => normalizeDateStr(a.date) === targetNorm) ||
      null
    );
  }, [agendas, selectedDate, selectedPlannerId]);

  // Requirement 1: Extract corresponding week plan from the selected Monthly Planner
  const weekPlanFromPlanner = useMemo(() => {
    if (!selectedDate) return null;
    const targetNorm = normalizeDateStr(selectedDate);

    // 1. Look in selectedPlanner.weeks
    if (selectedPlanner && selectedPlanner.weeks) {
      try {
        const weeksArr: Partial<Agenda>[] = typeof selectedPlanner.weeks === 'string'
          ? JSON.parse(selectedPlanner.weeks)
          : selectedPlanner.weeks || [];
        const found = weeksArr.find((w) => normalizeDateStr(w.date) === targetNorm);
        if (found) return found;
      } catch {}
    }

    // 2. Look in agendas table for matching planner & date
    const fromAgendas = agendas.find(
      (a) => a.planner_id === selectedPlannerId && normalizeDateStr(a.date) === targetNorm
    ) || agendas.find((a) => normalizeDateStr(a.date) === targetNorm);
    if (fromAgendas) return fromAgendas;

    return null;
  }, [selectedPlanner, selectedDate, selectedPlannerId, agendas]);

  // Populate workspace when date changes or saved agenda found
  useEffect(() => {
    if (savedAgendaForDate) {
      loadAgendaIntoWorkspace(savedAgendaForDate);
      setIsDraftCreated(true);
    } else if (weekPlanFromPlanner) {
      loadAgendaIntoWorkspace(weekPlanFromPlanner);
      setIsDraftCreated(true);
    } else {
      setIsDraftCreated(false);
      setActiveAgenda({
        ...emptyAgenda,
        date: selectedDate,
        planner_id: selectedPlanner?.planner_id || '',
        ward_branch: selectedPlanner?.unit_name || '',
      });
    }
  }, [selectedDate, selectedPlannerId, savedAgendaForDate, weekPlanFromPlanner]);

  const loadAgendaIntoWorkspace = (agenda: Agenda | Partial<Agenda>) => {
    setActiveAgenda(agenda);

    // Speakers
    const sp = parseSpeakersList(agenda.speakers);
    setSpeakersList(sp.length > 0 ? sp : [
      { name: '', topic: '', scripture_ref: '', minutes: 10, gender: '' },
      { name: '', topic: '', scripture_ref: '', minutes: 15, gender: '' },
      { name: '', topic: '', scripture_ref: '', minutes: 20, gender: '' },
    ]);

    // Announcements (6 slots)
    const rawAnn = agenda.announcements || '';
    const parsedAnn = parseStructuredOrLines<string>(rawAnn, (item) => String(item || ''));
    const slots = ['', '', '', '', '', ''];
    parsedAnn.forEach((item, i) => {
      if (i < 6) slots[i] = item;
    });
    setAnnouncementSlots(slots);

    // Releases (6 rows)
    const rawRel = parseStructuredOrLines<ReleaseItem>(agenda.releases, (item) => {
      if (typeof item === 'object' && item !== null) {
        return { name: String(item.name || ''), calling: String(item.calling || '') };
      }
      const str = String(item || '');
      const parts = str.split(/released as/i);
      return { name: parts[0]?.trim() || str, calling: parts[1]?.trim() || '' };
    });
    setReleasesList(Array.from({ length: 6 }, (_, i) => rawRel[i] || { name: '', calling: '' }));

    // Calls (6 rows)
    const rawCalls = parseStructuredOrLines<SustainingItem>(agenda.calls, (item) => {
      if (typeof item === 'object' && item !== null) {
        return { name: String(item.name || ''), calling: String(item.calling || '') };
      }
      const str = String(item || '');
      const parts = str.split(/called as/i);
      return { name: parts[0]?.trim() || str, calling: parts[1]?.trim() || '' };
    });
    setSustainingsList(Array.from({ length: 6 }, (_, i) => rawCalls[i] || { name: '', calling: '' }));

    // Baptisms of record (4 slots)
    const rawBap = parseStructuredOrLines<BaptismItem>(agenda.baptized_children, (item) => {
      if (typeof item === 'object' && item !== null) return { name: String(item.name || '') };
      return { name: String(item || '') };
    });
    setBaptismsList(Array.from({ length: 4 }, (_, i) => rawBap[i] || { name: '' }));

    // Ordinations (4 rows)
    const rawOrd = parseStructuredOrLines<OrdinationItem>(agenda.aaronic_ordinations, (item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: String(item.name || ''),
          office: String(item.office || ''),
          ordained_by: String(item.ordained_by || ''),
          ordained_by_office: String(item.ordained_by_office || '')
        };
      }
      return { name: String(item || ''), office: '', ordained_by: '', ordained_by_office: '' };
    });
    setOrdinationsList(Array.from({ length: 4 }, (_, i) => rawOrd[i] || { name: '', office: '', ordained_by: '', ordained_by_office: '' }));

    // Advancements (4 rows)
    const rawAdv = parseStructuredOrLines<AdvancementItem>(agenda.aaronic_advancements, (item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: String(item.name || ''),
          from_office: String(item.from_office || ''),
          to_office: String(item.to_office || ''),
          ordained_by: String(item.ordained_by || ''),
          ordained_by_office: String(item.ordained_by_office || '')
        };
      }
      return { name: String(item || ''), from_office: '', to_office: '', ordained_by: '', ordained_by_office: '' };
    });
    setAdvancementsList(Array.from({ length: 4 }, (_, i) => rawAdv[i] || { name: '', from_office: '', to_office: '', ordained_by: '', ordained_by_office: '' }));

    // Achievements (4 slots)
    const rawAch = parseStructuredOrLines<string>(agenda.achievements, (item) => String(item || ''));
    setAchievementsList(Array.from({ length: 4 }, (_, i) => rawAch[i] || ''));

    // Baby Blessings (4 rows)
    const rawBabies = parseStructuredOrLines<BabyBlessingItem>(agenda.babies || agenda.naming_blessing, (item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          baby_name: String(item.baby_name || ''),
          family: String(item.family || ''),
          blessed_by: String(item.blessed_by || ''),
          blessed_by_office: String(item.blessed_by_office || '')
        };
      }
      return { baby_name: String(item || ''), family: '', blessed_by: '', blessed_by_office: '' };
    });
    setBabiesList(Array.from({ length: 4 }, (_, i) => rawBabies[i] || { baby_name: '', family: '', blessed_by: '', blessed_by_office: '' }));

    // Confirmation & Bestowal (6 rows)
    const rawConf = parseStructuredOrLines<ConfirmationBestowalItem>(agenda.confirmations || agenda.confirmation_bestowal, (item) => {
      if (typeof item === 'object' && item !== null) {
        return {
          name: String(item.name || ''),
          confirmed_by: String(item.confirmed_by || ''),
          office: String(item.office || '')
        };
      }
      return { name: String(item || ''), confirmed_by: '', office: '' };
    });
    setConfirmationsList(Array.from({ length: 6 }, (_, i) => rawConf[i] || { name: '', confirmed_by: '', office: '' }));

    // Receive into fellowship (8 slots)
    const rawFel = parseStructuredOrLines<FellowshipItem>(agenda.fellowships, (item) => {
      if (typeof item === 'object' && item !== null) return { name: String(item.name || '') };
      return { name: String(item || '') };
    });
    setFellowshipsList(Array.from({ length: 8 }, (_, i) => rawFel[i] || { name: '' }));
  };

  // Requirement 1 & Step 2: Auto-Magic Extraction & Population from WeekPlan
  const handleCreateAgendaDraft = () => {
    if (!selectedDate) {
      toast.error('Please select a Sunday week first');
      return;
    }

    const plannerWeek = weekPlanFromPlanner;
    const parsedOpen = parseHymn(plannerWeek?.opening_hymn || '');
    const parsedSac = parseHymn(plannerWeek?.sacrament_hymn || '');
    const parsedClose = parseHymn(plannerWeek?.closing_hymn || '');

    const openPrayerName = plannerWeek?.opening_prayer
      ? formatPersonWithTitle(
          plannerWeek.opening_prayer,
          plannerWeek.opening_prayer_gender as 'M' | 'F' | ''
        )
      : '';
    const closePrayerName = plannerWeek?.closing_prayer
      ? formatPersonWithTitle(
          plannerWeek.closing_prayer,
          plannerWeek.closing_prayer_gender as 'M' | 'F' | ''
        )
      : '';

    // Auto-query top 6 upcoming calendar events
    const upcomingEvents = activities
      .filter((a) => a.date && a.date >= selectedDate)
      .slice(0, 6)
      .map((a) => `${a.activity} (${a.organisation || 'Ward'}) — ${format(new Date(a.date), 'dd-MMM-yyyy')}`);

    const slots = ['', '', '', '', '', ''];
    upcomingEvents.forEach((ev, i) => {
      if (i < 6) slots[i] = ev;
    });
    setAnnouncementSlots(slots);

    // Speakers from weekplan
    const importedSpeakers = parseSpeakersList(plannerWeek?.speakers);
    if (importedSpeakers.length > 0) {
      setSpeakersList(importedSpeakers);
    } else {
      setSpeakersList([
        { name: '', topic: '', scripture_ref: '', minutes: 10, gender: '' },
        { name: '', topic: '', scripture_ref: '', minutes: 15, gender: '' },
        { name: '', topic: '', scripture_ref: '', minutes: 20, gender: '' },
      ]);
    }

    const draft: Partial<Agenda> = {
      ...emptyAgenda,
      planner_id: selectedPlanner?.planner_id || '',
      date: selectedDate,
      ward_branch: plannerWeek?.ward_branch || selectedPlanner?.unit_name || '',
      stake_district: plannerWeek?.stake_district || '',
      type_of_meeting: plannerWeek?.type_of_meeting || 'SACRAMENT',
      other_meeting_specify: plannerWeek?.other_meeting_specify || '',
      presiding: plannerWeek?.presiding || 'Bishop',
      presiding_position: plannerWeek?.presiding_position || 'Bishop',
      conducting: plannerWeek?.conducting || selectedPlanner?.conducting_officer || '',
      conducting_position: plannerWeek?.conducting_position || '1st Counsellor',
      music_director: plannerWeek?.music_director || '',
      choir_director: plannerWeek?.choir_director || '',
      organist: plannerWeek?.organist || '',
      start_time: plannerWeek?.start_time || '9:00 AM',
      prelude_music: plannerWeek?.prelude_music || '',
      postlude_music: plannerWeek?.postlude_music || '',
      greetings_welcome: plannerWeek?.greetings_welcome || 'We warmly welcome everyone, stake officers, friends of the church and those worshipping with us for the first time.',
      ward_branch_business: plannerWeek?.ward_branch_business || '',
      stake_district_business: plannerWeek?.stake_district_business || '',
      naming_blessing: plannerWeek?.naming_blessing || '',
      confirmation_bestowal: plannerWeek?.confirmation_bestowal || '',
      opening_hymn: parsedOpen.title || plannerWeek?.opening_hymn || '',
      opening_hymn_number: parsedOpen.number || plannerWeek?.opening_hymn_number || '',
      opening_prayer: openPrayerName || plannerWeek?.opening_prayer || '',
      sacrament_hymn: parsedSac.title || plannerWeek?.sacrament_hymn || '',
      sacrament_hymn_number: parsedSac.number || plannerWeek?.sacrament_hymn_number || '',
      special_music: plannerWeek?.special_music || '',
      closing_hymn: parsedClose.title || plannerWeek?.closing_hymn || '',
      closing_hymn_number: parsedClose.number || plannerWeek?.closing_hymn_number || '',
      closing_prayer: closePrayerName || plannerWeek?.closing_prayer || '',
      announcements: plannerWeek?.announcements || '',
      releases: plannerWeek?.releases || '[]',
      calls: plannerWeek?.calls || '[]',
      baptized_children: plannerWeek?.baptized_children || '[]',
      aaronic_ordinations: plannerWeek?.aaronic_ordinations || '[]',
      aaronic_advancements: plannerWeek?.aaronic_advancements || '[]',
      achievements: plannerWeek?.achievements || '[]',
      babies: plannerWeek?.babies || '[]',
      confirmations: plannerWeek?.confirmations || '[]',
      fellowships: plannerWeek?.fellowships || '[]',
      state: 'DRAFT',
    };

    setActiveAgenda(draft);
    setIsDraftCreated(true);
    toast.success(`Extracted real week plan & generated agenda for ${format(new Date(selectedDate), 'MMM d, yyyy')}`);
  };

  // Hymn parsing on input change
  const handleHymnChange = (field: 'opening' | 'sacrament' | 'closing', rawValue: string) => {
    const parsed = parseHymn(rawValue);
    if (field === 'opening') {
      setActiveAgenda((prev) => ({
        ...prev,
        opening_hymn: parsed.title || rawValue,
        opening_hymn_number: parsed.number || prev.opening_hymn_number || '',
      }));
    } else if (field === 'sacrament') {
      setActiveAgenda((prev) => ({
        ...prev,
        sacrament_hymn: parsed.title || rawValue,
        sacrament_hymn_number: parsed.number || prev.sacrament_hymn_number || '',
      }));
    } else {
      setActiveAgenda((prev) => ({
        ...prev,
        closing_hymn: parsed.title || rawValue,
        closing_hymn_number: parsed.number || prev.closing_hymn_number || '',
      }));
    }
  };

  // Auto-populate announcements from calendar
  const handleAutoPopulateAnnouncements = () => {
    const upcoming = activities
      .filter((a) => a.date && a.date >= (activeAgenda.date || ''))
      .slice(0, 6)
      .map((a) => `${a.activity} (${a.organisation || 'Ward'}) — ${format(new Date(a.date), 'dd-MMM-yyyy')}`);

    if (upcoming.length === 0) {
      toast('No upcoming calendar activities found', { icon: 'ℹ️' });
      return;
    }

    const newSlots = ['', '', '', '', '', ''];
    upcoming.forEach((item, i) => {
      newSlots[i] = item;
    });
    setAnnouncementSlots(newSlots);
    toast.success('Populated upcoming announcements from Ward Calendar');
  };

  // Save Agenda
  const handleSaveAgenda = async (targetState: 'DRAFT' | 'FINAL' = 'DRAFT') => {
    if (!session || !activeAgenda.date) {
      toast.error('Meeting date is required');
      return;
    }
    setSaving(true);
    try {
      const compiledAnnouncements = announcementSlots.filter((s) => s.trim().length > 0).join('\n');

      const payload: Partial<Agenda> = {
        ...activeAgenda,
        speakers: JSON.stringify(speakersList),
        announcements: compiledAnnouncements,
        releases: JSON.stringify(releasesList.filter((r) => r.name.trim())),
        calls: JSON.stringify(sustainingsList.filter((c) => c.name.trim())),
        baptized_children: JSON.stringify(baptismsList.filter((b) => b.name.trim())),
        aaronic_ordinations: JSON.stringify(ordinationsList.filter((o) => o.name.trim())),
        aaronic_advancements: JSON.stringify(advancementsList.filter((a) => a.name.trim())),
        achievements: JSON.stringify(achievementsList.filter((a) => a.trim())),
        babies: JSON.stringify(babiesList.filter((b) => b.baby_name.trim())),
        confirmations: JSON.stringify(confirmationsList.filter((c) => c.name.trim())),
        fellowships: JSON.stringify(fellowshipsList.filter((f) => f.name.trim())),
        state: targetState,
        planner_id: selectedPlannerId || activeAgenda.planner_id || '',
      };

      let res: { ok: boolean; data?: Agenda; error?: string; duplicate?: boolean };
      if (activeAgenda.agenda_id) {
        res = (await agendasApi.update(session.token, payload)) as typeof res;
      } else {
        res = (await agendasApi.create(session.token, { ...payload, upsert: true })) as typeof res;
      }

      if (!res.ok) throw new Error(res.error || 'Save failed');

      toast.success(targetState === 'FINAL' ? 'Agenda finalized & stand-ready!' : 'Agenda saved successfully');
      if (res.data) {
        setActiveAgenda(res.data);
      }
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save agenda');
    } finally {
      setSaving(false);
    }
  };

  // Print 2-Page Stand Agenda
  const handlePrintStandAgenda = (agenda: Partial<Agenda>) => {
    const compiledAnnouncements = announcementSlots.filter((s) => s.trim().length > 0).join('\n');
    const fullAgenda: Agenda = {
      ...(emptyAgenda as Agenda),
      ...agenda,
      speakers: JSON.stringify(speakersList),
      announcements: compiledAnnouncements,
      releases: JSON.stringify(releasesList),
      calls: JSON.stringify(sustainingsList),
      baptized_children: JSON.stringify(baptismsList),
      aaronic_ordinations: JSON.stringify(ordinationsList),
      aaronic_advancements: JSON.stringify(advancementsList),
      achievements: JSON.stringify(achievementsList),
      babies: JSON.stringify(babiesList),
      confirmations: JSON.stringify(confirmationsList),
      fellowships: JSON.stringify(fellowshipsList),
    };

    const html = generateStandAgendaHtml(fullAgenda);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  // Step 4: The Live Planner Sync Safety Net
  const handleOpenDiffSafetyNet = () => {
    // 1. First search in selectedPlanner.weeks
    let targetWeek: Partial<Agenda> | null = null;
    if (selectedPlanner && selectedPlanner.weeks) {
      try {
        const weeksArr: Partial<Agenda>[] = typeof selectedPlanner.weeks === 'string'
          ? JSON.parse(selectedPlanner.weeks)
          : selectedPlanner.weeks || [];
        targetWeek = weeksArr.find((w) => w.date === selectedDate) || null;
      } catch {}
    }

    // 2. If not found in planner.weeks, search in agendas list
    if (!targetWeek && selectedDate) {
      targetWeek = agendas.find(
        (a) => (selectedPlannerId ? a.planner_id === selectedPlannerId : true) && a.date === selectedDate
      ) || agendas.find((a) => a.date === selectedDate) || null;
    }

    // 3. Fallback to weekPlanFromPlanner
    if (!targetWeek) {
      targetWeek = weekPlanFromPlanner;
    }

    if (!targetWeek) {
      toast('No corresponding planner week found to compare with. Please ensure a Monthly Planner has been created and saved for this month.', { icon: 'ℹ️' });
      return;
    }

    const parsedOpen = parseHymn(targetWeek.opening_hymn || '');
    const parsedSac = parseHymn(targetWeek.sacrament_hymn || '');
    const parsedClose = parseHymn(targetWeek.closing_hymn || '');

    const pWeekFormatted: Partial<Agenda> = {
      ...targetWeek,
      opening_hymn: parsedOpen.title || targetWeek.opening_hymn,
      opening_hymn_number: parsedOpen.number || targetWeek.opening_hymn_number,
      sacrament_hymn: parsedSac.title || targetWeek.sacrament_hymn,
      sacrament_hymn_number: parsedSac.number || targetWeek.sacrament_hymn_number,
      closing_hymn: parsedClose.title || targetWeek.closing_hymn,
      closing_hymn_number: parsedClose.number || targetWeek.closing_hymn_number,
      opening_prayer: formatPersonWithTitle(
        targetWeek.opening_prayer || '',
        targetWeek.opening_prayer_gender as 'M' | 'F' | ''
      ),
      closing_prayer: formatPersonWithTitle(
        targetWeek.closing_prayer || '',
        targetWeek.closing_prayer_gender as 'M' | 'F' | ''
      ),
    };

    setPlannerWeekAgenda(pWeekFormatted);
    setDiffModalOpen(true);
  };

  const handleApplyDiffPatch = (patch: Partial<Agenda>) => {
    setActiveAgenda((prev) => ({ ...prev, ...patch }));
    if (patch.speakers) {
      setSpeakersList(parseSpeakersList(patch.speakers));
    }
    toast.success('Updated agenda from Planner while preserving custom ward business');
  };

  // Directory filter
  const filteredAgendas = agendas.filter((a) => {
    const q = directorySearch.toLowerCase();
    return (
      !q ||
      a.ward_branch?.toLowerCase().includes(q) ||
      a.date?.includes(q) ||
      a.presiding?.toLowerCase().includes(q) ||
      a.conducting?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <Header
        title="Agenda"
        subtitle="Sunday Order-of-Service Builder, Leadership Meetings & Stand Agenda Generator"
        actions={
          <div className="flex items-center gap-2">
            {meetingCategory === 'SACRAMENT' && (
              <Button
                size="sm"
                variant={viewMode === 'directory' ? 'primary' : 'outline'}
                icon={<Layers className="h-4 w-4" />}
                onClick={() => setViewMode(viewMode === 'workspace' ? 'directory' : 'workspace')}
              >
                {viewMode === 'workspace' ? 'Saved Agendas Directory' : 'Back to Workspace'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={loadAll}
              loading={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Top-Level Meeting Category Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 w-full sm:w-fit shadow-2xs">
          <button
            type="button"
            onClick={() => setMeetingCategory('SACRAMENT')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              meetingCategory === 'SACRAMENT'
                ? 'bg-white text-blue-900 shadow-xs border border-slate-300/90'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="text-base">🍷</span>
            <span>Sacrament Meeting Agendas</span>
            <span className="px-2 py-0.5 rounded-full text-2xs bg-blue-100 text-blue-800 font-extrabold border border-blue-200">
              {agendas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMeetingCategory('LEADERSHIP')}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              meetingCategory === 'LEADERSHIP'
                ? 'bg-white text-purple-900 shadow-xs border border-slate-300/90'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span className="text-base">📋</span>
            <span>Ward Leadership & Committee Agendas</span>
            <span className="px-2 py-0.5 rounded-full text-2xs bg-purple-100 text-purple-800 font-extrabold border border-purple-200">
              Bishopric · Council · Other
            </span>
          </button>
        </div>

        {meetingCategory === 'LEADERSHIP' ? (
          <OtherAgendasSection
            members={members}
            unitName={planners[0]?.unit_name}
          />
        ) : (
          <>
            {viewMode === 'directory' ? (
              /* ==================== SAVED AGENDAS DIRECTORY ==================== */
              <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search saved agendas by date, ward, leader…"
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <Button
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  handleCreateAgendaDraft();
                  setViewMode('workspace');
                }}
              >
                New Agenda
              </Button>
            </div>

            {filteredAgendas.length === 0 ? (
              <Card>
                <CardBody className="py-16 text-center">
                  <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-700 font-semibold">No Saved Agendas Found</p>
                  <p className="text-sm text-slate-400 mt-1">Select a Sunday from a Monthly Planner to generate an agenda.</p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgendas.map((a) => (
                  <Card key={a.agenda_id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div>
                        <p className="font-bold text-slate-900">
                          {a.date ? format(new Date(a.date), 'EEEE, MMM d, yyyy') : 'No Date'}
                        </p>
                        <p className="text-xs text-slate-500">{a.ward_branch || 'Ward'}</p>
                      </div>
                      <StatusBadge status={a.state || 'DRAFT'} />
                    </CardHeader>
                    <CardBody>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <dt className="text-slate-400">Meeting</dt>
                          <dd className="font-semibold text-slate-700">{(a.type_of_meeting || 'SACRAMENT').replace(/_/g, ' ')}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-400">Presiding</dt>
                          <dd className="font-medium text-slate-800 truncate max-w-[140px]">{a.presiding || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-400">Conducting</dt>
                          <dd className="font-medium text-slate-800 truncate max-w-[140px]">{a.conducting || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-slate-400">Start Time</dt>
                          <dd className="font-medium text-slate-800">{formatTime12h(a.start_time || '9:00 AM')}</dd>
                        </div>
                      </dl>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Button
                          size="xs"
                          variant="outline"
                          icon={<Edit3 className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setSelectedDate(a.date);
                            loadAgendaIntoWorkspace(a);
                            setIsDraftCreated(true);
                            setViewMode('workspace');
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          icon={<Tablet className="h-3.5 w-3.5" />}
                          onClick={() => {
                            loadAgendaIntoWorkspace(a);
                            setPodiumModalOpen(true);
                          }}
                        >
                          Podium
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          icon={<Printer className="h-3.5 w-3.5" />}
                          onClick={() => handlePrintStandAgenda(a)}
                        >
                          Print
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ==================== STEP 1: SELECTOR & WORKSPACE ==================== */
          <div className="space-y-6">
            {/* TOP HEADER CONTROLS */}
            <Card className="bg-slate-900 text-white border-none shadow-md">
              <CardBody className="p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Two Dropdowns (Step 1) - Only Active Submitted Planners */}
                  <div className="grid sm:grid-cols-2 gap-3 flex-1">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                        Select Monthly Planner (Submitted)
                      </label>
                      <select
                        value={selectedPlannerId}
                        onChange={(e) => setSelectedPlannerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {activeSubmittedPlanners.map((p) => (
                          <option key={p.planner_id} value={p.planner_id}>
                            {format(new Date(p.year, p.month - 1), 'MMMM yyyy')} — {p.unit_name} ({p.state})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                        Select Week (Sunday)
                      </label>
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                      >
                        {plannerSundays.map((sun) => (
                          <option key={sun} value={sun}>
                            Sunday, {format(new Date(sun), 'MMMM d, yyyy')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {isDraftCreated && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                        icon={<Sparkles className="h-4 w-4 text-amber-400" />}
                        onClick={handleOpenDiffSafetyNet}
                        title="Update Agenda from Planner (Safety Net)"
                      >
                        Sync from Planner
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Tablet className="h-4 w-4 text-emerald-600" />}
                        onClick={() => setPodiumModalOpen(true)}
                      >
                        Podium Mode
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                        icon={<Eye className="h-4 w-4 text-blue-400" />}
                        onClick={() => setPreviewModalOpen(true)}
                      >
                        Preview 2-Page
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                        icon={<Printer className="h-4 w-4" />}
                        onClick={() => handlePrintStandAgenda(activeAgenda)}
                      >
                        Print
                      </Button>
                      {/* Send Reminder (Bishop & Counsellors Only) */}
                      {isBishopric && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-indigo-950/80 border-indigo-600 text-indigo-100 hover:bg-indigo-900"
                          icon={<Mail className="h-4 w-4 text-indigo-300" />}
                          onClick={() => setSendReminderModalOpen(true)}
                          title="Send Email Reminder to Page 1 Assignees"
                        >
                          Send Reminder
                        </Button>
                      )}
                      <Button
                        size="sm"
                        icon={<Save className="h-4 w-4" />}
                        onClick={() => handleSaveAgenda(activeAgenda.state as 'DRAFT' | 'FINAL')}
                        loading={saving}
                      >
                        Save Agenda
                      </Button>
                    </div>
                  )}
                </div>

                {/* Status Bar */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${savedAgendaForDate ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <span>
                      {savedAgendaForDate
                        ? `Saved Agenda (${savedAgendaForDate.state}) · Last updated ${format(new Date(savedAgendaForDate.updated_date || new Date()), 'MMM d, h:mm a')}`
                        : isDraftCreated
                        ? 'Pre-populated Draft from Monthly Planner (Unsaved)'
                        : 'No agenda created yet for this week.'}
                    </span>
                  </div>
                  <span>Target: {selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM d, yyyy') : 'Select a date'}</span>
                </div>
              </CardBody>
            </Card>

            {/* IF NOT CREATED YET: SHOW CREATE AGENDA BANNER */}
            {!isDraftCreated ? (
              <Card className="border-2 border-dashed border-slate-300">
                <CardBody className="py-16 text-center space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-blue-50 text-blue-600 mb-2">
                    <BookOpen className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Create Sunday Agenda for {selectedDate ? format(new Date(selectedDate), 'MMMM d, yyyy') : 'Selected Week'}
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                      Extracts speakers, hymns, prayers, and leadership from the selected Monthly Planner, and queries upcoming activities into announcements.
                    </p>
                  </div>
                  <Button
                    size="md"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={handleCreateAgendaDraft}
                  >
                    + Create Agenda
                  </Button>
                </CardBody>
              </Card>
            ) : (
              /* IF CREATED: SHOW COMPLETE FORM ARCHITECTURE */
              <div className="space-y-6">
                {/* TABS: FRONT PAGE vs BACK PAGE */}
                <div className="flex items-center justify-between border-b border-slate-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('front')}
                      className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === 'front'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <BookOpen className="h-4 w-4" />
                      PAGE 1: ORDER OF SERVICE
                    </button>
                    <button
                      onClick={() => setActiveTab('back')}
                      className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                        activeTab === 'back'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      PAGE 2: WARD BUSINESS SHEET
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => setPreviewModalOpen(true)}
                    >
                      Preview Exact 2-Page Stand Layout
                    </Button>
                  </div>
                </div>

                {activeTab === 'front' ? (
                  /* ==================== PAGE 1 (ORDER OF SERVICE) ==================== */
                  <div className="space-y-6">
                    {/* MEETING HEADER */}
                    <Card>
                      <CardBody>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Input
                            label="Date"
                            type="date"
                            value={activeAgenda.date || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, date: e.target.value })}
                            required
                          />
                          <Select
                            label="Type of Meeting"
                            options={MEETING_TYPES}
                            value={activeAgenda.type_of_meeting || 'SACRAMENT'}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, type_of_meeting: e.target.value as MeetingType })}
                          />
                          <Input
                            label="Ward / Branch"
                            value={activeAgenda.ward_branch || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, ward_branch: e.target.value })}
                          />
                          <Input
                            label="Stake / District"
                            value={activeAgenda.stake_district || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, stake_district: e.target.value })}
                          />
                          {activeAgenda.type_of_meeting === 'OTHER' && (
                            <div className="sm:col-span-4">
                              <Input
                                label="Other Meeting (Specify)"
                                placeholder="Specify meeting type..."
                                value={activeAgenda.other_meeting_specify || ''}
                                onChange={(e) => setActiveAgenda({ ...activeAgenda, other_meeting_specify: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>

                    {/* LEADERSHIP & MUSIC */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          Leadership & Music
                        </h3>
                      </CardHeader>
                      <CardBody className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Input
                            label="Presiding Officer (Name)"
                            placeholder="e.g. Adebayo Oyewusi"
                            value={activeAgenda.presiding || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, presiding: e.target.value })}
                          />
                          <Input
                            label="Position"
                            placeholder="e.g. Bishop"
                            value={activeAgenda.presiding_position || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, presiding_position: e.target.value })}
                          />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <Input
                            label="Conducting Officer (Name)"
                            placeholder="e.g. Adebayo Oyewusi"
                            value={activeAgenda.conducting || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, conducting: e.target.value })}
                          />
                          <Input
                            label="Position"
                            placeholder="e.g. Bishop"
                            value={activeAgenda.conducting_position || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, conducting_position: e.target.value })}
                          />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <Input
                            label="Music Director"
                            placeholder="e.g. Sister Oke, Fridaos Darasimi"
                            value={activeAgenda.music_director || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, music_director: e.target.value })}
                          />
                          <Input
                            label="Choir Director"
                            placeholder="Optional"
                            value={activeAgenda.choir_director || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, choir_director: e.target.value })}
                          />
                          <Input
                            label="Organist"
                            placeholder="e.g. Okorie, Emmanuel Chigoziri"
                            value={activeAgenda.organist || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, organist: e.target.value })}
                          />
                        </div>
                      </CardBody>
                    </Card>

                    {/* SERVICE TIMING & WELCOME */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          Service Timing & Welcome
                        </h3>
                      </CardHeader>
                      <CardBody className="space-y-4">
                        <div className="grid sm:grid-cols-3 gap-4">
                          <Input
                            label="Start Time"
                            placeholder="9:00 AM"
                            value={activeAgenda.start_time || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, start_time: e.target.value })}
                          />
                          <Input
                            label="Prelude Music (by choir or organ)"
                            placeholder="e.g. Hymn 143 or Organist Selection"
                            value={activeAgenda.prelude_music || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, prelude_music: e.target.value })}
                          />
                          <Input
                            label="Postlude Music (by organ only; not by choir)"
                            placeholder="e.g. Hymn 19 or Organist Selection"
                            value={activeAgenda.postlude_music || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, postlude_music: e.target.value })}
                          />
                        </div>

                        <Textarea
                          label="Greetings, Welcome & Acknowledgements"
                          rows={2}
                          value={activeAgenda.greetings_welcome || ''}
                          onChange={(e) => setActiveAgenda({ ...activeAgenda, greetings_welcome: e.target.value })}
                          placeholder="We warmly welcome everyone, stake officers, friends of the church and those worshipping with us for the first time."
                        />
                      </CardBody>
                    </Card>

                    {/* HYMNS & PRAYERS & BUSINESS NOTES */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          Hymns, Prayers & Program Items
                        </h3>
                      </CardHeader>
                      <CardBody className="space-y-4">
                        {/* Opening Hymn & Prayer */}
                        <div className="grid sm:grid-cols-12 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="sm:col-span-2">
                            <Input
                              label="Opening Hymn #"
                              placeholder="1023"
                              value={activeAgenda.opening_hymn_number || ''}
                              onChange={(e) => setActiveAgenda({ ...activeAgenda, opening_hymn_number: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <Input
                              label="Opening Hymn Title"
                              placeholder="Standing on the Promises"
                              value={activeAgenda.opening_hymn || ''}
                              onChange={(e) => handleHymnChange('opening', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <Input
                              label="Opening Prayer (by)"
                              placeholder="Sister Ajayi, Omowumi Anike"
                              value={activeAgenda.opening_prayer || ''}
                              onChange={(e) => setActiveAgenda({ ...activeAgenda, opening_prayer: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* Business By & Stake Business */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <Input
                            label="Ward/Branch Business (by)"
                            placeholder="e.g. Bishop Adebayo Oyewusi"
                            value={activeAgenda.ward_branch_business || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, ward_branch_business: e.target.value })}
                          />
                          <Input
                            label="Stake/District Business (by)"
                            placeholder="e.g. Stake Representative"
                            value={activeAgenda.stake_district_business || ''}
                            onChange={(e) => setActiveAgenda({ ...activeAgenda, stake_district_business: e.target.value })}
                          />
                        </div>

                        {/* Sacrament Hymn */}
                        <div className="grid sm:grid-cols-12 gap-3 p-3 bg-blue-50/40 rounded-lg border border-blue-100">
                          <div className="sm:col-span-2">
                            <Input
                              label="Sacrament Hymn #"
                              placeholder="1008"
                              value={activeAgenda.sacrament_hymn_number || ''}
                              onChange={(e) => setActiveAgenda({ ...activeAgenda, sacrament_hymn_number: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-6">
                            <Input
                              label="Sacrament Hymn Title"
                              placeholder="Bread of Life, Living Water"
                              value={activeAgenda.sacrament_hymn || ''}
                              onChange={(e) => handleHymnChange('sacrament', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-4 flex flex-col justify-center text-xs text-slate-500 pt-5">
                            <span className="font-bold text-slate-800 uppercase">Administration of Sacrament</span>
                            <span>Passed by Priesthood</span>
                          </div>
                        </div>

                        {/* Special Music */}
                        <Input
                          label="Special Music (if any, by choir - F & T only or standing)"
                          placeholder="e.g. Ward Choir / Musical Item"
                          value={activeAgenda.special_music || ''}
                          onChange={(e) => setActiveAgenda({ ...activeAgenda, special_music: e.target.value })}
                        />

                        {/* Closing Hymn & Prayer */}
                        <div className="grid sm:grid-cols-12 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="sm:col-span-2">
                            <Input
                              label="Closing Hymn #"
                              placeholder="1004"
                              value={activeAgenda.closing_hymn_number || ''}
                              onChange={(e) => setActiveAgenda({ ...activeAgenda, closing_hymn_number: e.target.value })}
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <Input
                              label="Closing Hymn Title"
                              placeholder="I will walk with Jesus"
                              value={activeAgenda.closing_hymn || ''}
                              onChange={(e) => handleHymnChange('closing', e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <Input
                              label="Closing Prayer (by)"
                              placeholder="Brother Usenawaji, Bodyofchrist"
                              value={activeAgenda.closing_prayer || ''}
                              onChange={(e) => setActiveAgenda({ ...activeAgenda, closing_prayer: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* SPEAKERS / TESTIMONIES PROGRAM */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Speakers, Testimonies & Messages
                          </h3>
                          {activeAgenda.type_of_meeting !== 'FAST_SUNDAY' && (
                            <Button
                              size="xs"
                              variant="outline"
                              icon={<Plus className="h-3.5 w-3.5" />}
                              onClick={() => setSpeakersList([...speakersList, { name: '', topic: '', scripture_ref: '', minutes: 10 }])}
                            >
                              Add Speaker
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardBody className="space-y-3">
                        {activeAgenda.type_of_meeting === 'FAST_SUNDAY' ? (
                          <div className="py-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                            <p className="text-base font-extrabold text-slate-400 uppercase tracking-widest">
                              FAST AND TESTIMONY MEETING
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Bearing of testimonies by members of the congregation following the sacrament.
                            </p>
                          </div>
                        ) : (
                          speakersList.map((sp, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                                <span>Testimony / Talk {idx + 1}</span>
                                {speakersList.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setSpeakersList(speakersList.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:underline cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-4">
                                  <Input
                                    label="Testimony / Talk (by)"
                                    placeholder="e.g. Brother Oloyede, Michael Oluwagbemiga"
                                    value={sp.name}
                                    onChange={(e) => {
                                      const next = [...speakersList];
                                      next[idx].name = e.target.value;
                                      setSpeakersList(next);
                                    }}
                                  />
                                </div>
                                <div className="sm:col-span-4">
                                  <Input
                                    label="Subject"
                                    placeholder="e.g. The First Great Commandment"
                                    value={sp.topic}
                                    onChange={(e) => {
                                      const next = [...speakersList];
                                      next[idx].topic = e.target.value;
                                      setSpeakersList(next);
                                    }}
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <Input
                                    label="References"
                                    placeholder="e.g. Alma 32 / General Conference"
                                    value={sp.scripture_ref || ''}
                                    onChange={(e) => {
                                      const next = [...speakersList];
                                      next[idx].scripture_ref = e.target.value;
                                      setSpeakersList(next);
                                    }}
                                  />
                                </div>
                                <div className="sm:col-span-1">
                                  <Input
                                    label="Min"
                                    type="number"
                                    value={sp.minutes || 10}
                                    onChange={(e) => {
                                      const next = [...speakersList];
                                      next[idx].minutes = Number(e.target.value);
                                      setSpeakersList(next);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardBody>
                    </Card>
                  </div>
                ) : (
                  /* ==================== PAGE 2 (WARD BUSINESS SHEET) ==================== */
                  <div className="space-y-6">
                    {/* 1. ANNOUNCEMENTS (6 SLOTS) */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            1. Announcements (Slots 1 to 6)
                          </h3>
                          <Button
                            size="xs"
                            variant="outline"
                            icon={<Sparkles className="h-3.5 w-3.5 text-blue-600" />}
                            onClick={handleAutoPopulateAnnouncements}
                          >
                            Auto-populate from Calendar
                          </Button>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {announcementSlots.map((val, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                              <input
                                type="text"
                                placeholder={`Announcement ${idx + 1}`}
                                value={val}
                                onChange={(e) => {
                                  const next = [...announcementSlots];
                                  next[idx] = e.target.value;
                                  setAnnouncementSlots(next);
                                }}
                                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                    {/* 2. BUSINESS: RELEASES & CALLS (6 ROWS EACH) */}
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* RELEASES */}
                      <Card>
                        <CardHeader>
                          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Releases (6 Slots)
                          </h3>
                        </CardHeader>
                        <CardBody className="space-y-2.5">
                          {releasesList.map((r, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                              <input
                                type="text"
                                placeholder="First Middle SURNAME"
                                value={r.name}
                                onChange={(e) => {
                                  const next = [...releasesList];
                                  next[idx].name = e.target.value;
                                  setReleasesList(next);
                                }}
                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                placeholder="AS (Calling)"
                                value={r.calling}
                                onChange={(e) => {
                                  const next = [...releasesList];
                                  next[idx].calling = e.target.value;
                                  setReleasesList(next);
                                }}
                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                            </div>
                          ))}
                        </CardBody>
                      </Card>

                      {/* CALLS */}
                      <Card>
                        <CardHeader>
                          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                            Calls (6 Slots)
                          </h3>
                        </CardHeader>
                        <CardBody className="space-y-2.5">
                          {sustainingsList.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                              <input
                                type="text"
                                placeholder="First Middle SURNAME"
                                value={c.name}
                                onChange={(e) => {
                                  const next = [...sustainingsList];
                                  next[idx].name = e.target.value;
                                  setSustainingsList(next);
                                }}
                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                placeholder="AS (Calling)"
                                value={c.calling}
                                onChange={(e) => {
                                  const next = [...sustainingsList];
                                  next[idx].calling = e.target.value;
                                  setSustainingsList(next);
                                }}
                                className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                            </div>
                          ))}
                        </CardBody>
                      </Card>
                    </div>

                    {/* 3. RECOGNITION OF NEWLY BAPTIZED CHILDREN OF RECORD (4 SLOTS) */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          3. Recognition of Newly Baptized Children of Record (4 Slots)
                        </h3>
                      </CardHeader>
                      <CardBody>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {baptismsList.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                              <input
                                type="text"
                                placeholder="Child Name"
                                value={b.name}
                                onChange={(e) => {
                                  const next = [...baptismsList];
                                  next[idx].name = e.target.value;
                                  setBaptismsList(next);
                                }}
                                className="block w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                    {/* 4. AARONIC PRIESTHOOD ORDINATIONS (4 ROWS) */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          4. Aaronic Priesthood Ordinations (4 Slots)
                        </h3>
                      </CardHeader>
                      <CardBody className="space-y-2.5">
                        {ordinationsList.map((o, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                            <span className="col-span-1 font-bold text-slate-400 text-center">{idx + 1}</span>
                            <input
                              type="text"
                              placeholder="Name to be ordained"
                              value={o.name}
                              onChange={(e) => {
                                const next = [...ordinationsList];
                                next[idx].name = e.target.value;
                                setOrdinationsList(next);
                              }}
                              className="col-span-4 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Office (e.g. Priest)"
                              value={o.office}
                              onChange={(e) => {
                                const next = [...ordinationsList];
                                next[idx].office = e.target.value;
                                setOrdinationsList(next);
                              }}
                              className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Ordained by"
                              value={o.ordained_by}
                              onChange={(e) => {
                                const next = [...ordinationsList];
                                next[idx].ordained_by = e.target.value;
                                setOrdinationsList(next);
                              }}
                              className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Office"
                              value={o.ordained_by_office}
                              onChange={(e) => {
                                const next = [...ordinationsList];
                                next[idx].ordained_by_office = e.target.value;
                                setOrdinationsList(next);
                              }}
                              className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        ))}
                      </CardBody>
                    </Card>

                    {/* 5. AARONIC PRIESTHOOD ADVANCEMENTS (4 ROWS) */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          5. Aaronic Priesthood Advancements (4 Slots)
                        </h3>
                      </CardHeader>
                      <CardBody className="space-y-2.5">
                        {advancementsList.map((a, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                            <span className="col-span-1 font-bold text-slate-400 text-center">{idx + 1}</span>
                            <input
                              type="text"
                              placeholder="Name"
                              value={a.name}
                              onChange={(e) => {
                                const next = [...advancementsList];
                                next[idx].name = e.target.value;
                                setAdvancementsList(next);
                              }}
                              className="col-span-4 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="From"
                              value={a.from_office}
                              onChange={(e) => {
                                const next = [...advancementsList];
                                next[idx].from_office = e.target.value;
                                setAdvancementsList(next);
                              }}
                              className="col-span-1 rounded border border-slate-300 px-1 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="To"
                              value={a.to_office}
                              onChange={(e) => {
                                const next = [...advancementsList];
                                next[idx].to_office = e.target.value;
                                setAdvancementsList(next);
                              }}
                              className="col-span-1 rounded border border-slate-300 px-1 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Ordained by"
                              value={a.ordained_by}
                              onChange={(e) => {
                                const next = [...advancementsList];
                                next[idx].ordained_by = e.target.value;
                                setAdvancementsList(next);
                              }}
                              className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Office"
                              value={a.ordained_by_office}
                              onChange={(e) => {
                                const next = [...advancementsList];
                                next[idx].ordained_by_office = e.target.value;
                                setAdvancementsList(next);
                              }}
                              className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        ))}
                      </CardBody>
                    </Card>

                    {/* 6. RECOGNITION OF ADVANCEMENTS & ACHIEVEMENTS (4 SLOTS) */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          6. Recognition of Advancements & Achievements (4 Slots)
                        </h3>
                      </CardHeader>
                      <CardBody>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {achievementsList.map((val, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                              <input
                                type="text"
                                placeholder={`Achievement / Recognition ${idx + 1}`}
                                value={val}
                                onChange={(e) => {
                                  const next = [...achievementsList];
                                  next[idx] = e.target.value;
                                  setAchievementsList(next);
                                }}
                                className="block w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>

                    {/* 7. NAMING & BLESSING OF NEWLY-BORN BABIES (4 ROWS) */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          7. Naming & Blessing of Newly-Born Babies (4 Slots)
                        </h3>
                      </CardHeader>
                      <CardBody className="space-y-2.5">
                        {babiesList.map((b, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                            <span className="col-span-1 font-bold text-slate-400 text-center">{idx + 1}</span>
                            <input
                              type="text"
                              placeholder="Family"
                              value={b.family}
                              onChange={(e) => {
                                const next = [...babiesList];
                                next[idx].family = e.target.value;
                                setBabiesList(next);
                              }}
                              className="col-span-3 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Baby Name"
                              value={b.baby_name}
                              onChange={(e) => {
                                const next = [...babiesList];
                                next[idx].baby_name = e.target.value;
                                setBabiesList(next);
                              }}
                              className="col-span-4 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Blessed by"
                              value={b.blessed_by}
                              onChange={(e) => {
                                const next = [...babiesList];
                                next[idx].blessed_by = e.target.value;
                                setBabiesList(next);
                              }}
                              className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Office"
                              value={b.blessed_by_office}
                              onChange={(e) => {
                                const next = [...babiesList];
                                next[idx].blessed_by_office = e.target.value;
                                setBabiesList(next);
                              }}
                              className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        ))}
                      </CardBody>
                    </Card>

                    {/* 8. CONFIRMATION & BESTOWAL OF GIFT OF HOLY GHOST (6 ROWS) */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          8. Confirmation & Bestowal of Gift of Holy Ghost (6 Slots)
                        </h3>
                      </CardHeader>
                      <CardBody className="space-y-2.5">
                        {confirmationsList.map((c, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                            <span className="col-span-1 font-bold text-slate-400 text-center">{idx + 1}</span>
                            <input
                              type="text"
                              placeholder="Name to be Confirmed"
                              value={c.name}
                              onChange={(e) => {
                                const next = [...confirmationsList];
                                next[idx].name = e.target.value;
                                setConfirmationsList(next);
                              }}
                              className="col-span-5 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Confirmed by"
                              value={c.confirmed_by}
                              onChange={(e) => {
                                const next = [...confirmationsList];
                                next[idx].confirmed_by = e.target.value;
                                setConfirmationsList(next);
                              }}
                              className="col-span-4 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Office"
                              value={c.office}
                              onChange={(e) => {
                                const next = [...confirmationsList];
                                next[idx].office = e.target.value;
                                setConfirmationsList(next);
                              }}
                              className="col-span-2 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </div>
                        ))}
                      </CardBody>
                    </Card>

                    {/* 9. RECEIVE INTO FELLOWSHIP (8 SLOTS) */}
                    <Card>
                      <CardHeader>
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                          9. Receive into Fellowship (8 Slots)
                        </h3>
                      </CardHeader>
                      <CardBody>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {fellowshipsList.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                              <input
                                type="text"
                                placeholder={`Member / Family ${idx + 1}`}
                                value={f.name}
                                onChange={(e) => {
                                  const next = [...fellowshipsList];
                                  next[idx].name = e.target.value;
                                  setFellowshipsList(next);
                                }}
                                className="block w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </>
    )}
  </div>

      {/* LIVE PLANNER SYNC SAFETY NET MODAL */}
      {plannerWeekAgenda && (
        <AgendaDiffModal
          open={diffModalOpen}
          onClose={() => setDiffModalOpen(false)}
          currentAgenda={activeAgenda}
          plannerAgenda={plannerWeekAgenda}
          onApplyDiff={handleApplyDiffPatch}
        />
      )}

      {/* EXACT 2-PAGE STAND PREVIEW MODAL */}
      {previewModalOpen && (
        <Modal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={`Stand Agenda Preview (Exact 2-Page Letter/A4) — ${activeAgenda.date || ''}`}
          size="2xl"
          footer={
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setPreviewModalOpen(false)}>Close</Button>
              <Button icon={<Printer className="h-4 w-4" />} onClick={() => handlePrintStandAgenda(activeAgenda)}>
                Print Document
              </Button>
            </div>
          }
        >
          <div className="border rounded-lg overflow-hidden bg-slate-100 p-2 max-h-[75vh] overflow-y-auto">
            <iframe
              srcDoc={generateStandAgendaHtml({
                ...(emptyAgenda as Agenda),
                ...activeAgenda,
                speakers: JSON.stringify(speakersList),
                announcements: announcementSlots.filter((s) => s.trim().length > 0).join('\n'),
                releases: JSON.stringify(releasesList),
                calls: JSON.stringify(sustainingsList),
                baptized_children: JSON.stringify(baptismsList),
                aaronic_ordinations: JSON.stringify(ordinationsList),
                aaronic_advancements: JSON.stringify(advancementsList),
                achievements: JSON.stringify(achievementsList),
                babies: JSON.stringify(babiesList),
                confirmations: JSON.stringify(confirmationsList),
                fellowships: JSON.stringify(fellowshipsList),
              })}
              title="Stand Agenda Preview"
              className="w-full min-h-[900px] bg-white shadow-sm border"
            />
          </div>
        </Modal>
      )}

      {/* DIGITAL PODIUM STAND MODAL */}
      <DigitalPodiumModal
        open={podiumModalOpen}
        onClose={() => setPodiumModalOpen(false)}
        agenda={{
          ...(emptyAgenda as Agenda),
          ...activeAgenda,
          speakers: JSON.stringify(speakersList),
          announcements: announcementSlots.filter((s) => s.trim().length > 0).join('\n'),
          releases: JSON.stringify(releasesList),
          calls: JSON.stringify(sustainingsList),
          baptized_children: JSON.stringify(baptismsList),
          aaronic_ordinations: JSON.stringify(ordinationsList),
          aaronic_advancements: JSON.stringify(advancementsList),
          achievements: JSON.stringify(achievementsList),
          babies: JSON.stringify(babiesList),
          confirmations: JSON.stringify(confirmationsList),
          fellowships: JSON.stringify(fellowshipsList),
        }}
      />

      {/* SEND AGENDA REMINDER MODAL (PAGE 1 ASSIGNEES) */}
      <SendAgendaReminderModal
        open={sendReminderModalOpen}
        onClose={() => setSendReminderModalOpen(false)}
        agenda={activeAgenda}
        speakers={speakersList}
        members={members}
      />
    </div>
  );
}
