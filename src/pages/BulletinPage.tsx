import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, RefreshCw, FileText, Printer, Eye, Sparkles, MessageSquare,
  Share2, Calendar, Trash2, CheckCircle2, ChevronRight, Bookmark,
  Layers, Smartphone, ExternalLink, Heart, Clock, AlertCircle, Save, Check, RotateCcw
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { bulletinsApi, plannersApi, membersApi, activitiesApi, hymnsApi, settingsApi, agendasApi } from '../services/api';
import { BulletinFormEditor, BulletinWeekOption } from '../components/bulletin/BulletinFormEditor';
import { BulletinWebView } from '../components/bulletin/BulletinWebView';
import { BulletinWhatsAppCard } from '../components/bulletin/BulletinWhatsAppCard';
import { BulletinPrintPreview } from '../components/bulletin/BulletinPrintPreview';
import { BulletinSyncConfirmModal, SyncFieldDifference } from '../components/bulletin/BulletinSyncConfirmModal';
import { getBirthdaysForWeek } from '../utils/bulletinBirthdayEngine';
import { harvestWeeklyActivities, getNext5Activities } from '../utils/bulletinActivityHarvester';
import { fetchAndParseCfmUrl, generateCfmFromUrlOffline } from '../utils/bulletinCfmParser';
import { getWeekDateRange } from '../utils/bulletinPrintEngine';
import type { Bulletin, Planner, Member, Activity, Hymn, BulletinFeedback, UnitSetting } from '../types';
import { format, parseISO, addWeeks, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval, isSunday } from 'date-fns';
import toast from 'react-hot-toast';

export function BulletinPage() {
  const { session } = useAuthStore();

  // Primary Data
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [settings, setSettings] = useState<UnitSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Active Selected Bulletin & Form
  const [selectedBulletinId, setSelectedBulletinId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'web' | 'whatsapp' | 'print'>('edit');

  // Draft tracking state (similar to Planner workspace)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const isInitialMount = useRef(true);

  // Feedbacks received from congregation members via Web View
  const [feedbacks, setFeedbacks] = useState<BulletinFeedback[]>([]);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  // Non-destructive Sync Confirmation Modal State
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const [syncDiffs, setSyncDiffs] = useState<SyncFieldDifference[]>([]);
  const [pendingSyncData, setPendingSyncData] = useState<Partial<Bulletin> | null>(null);
  const [syncWeekLabel, setSyncWeekLabel] = useState<string>('');

  const initialDate = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState<Partial<Bulletin>>({
    date: initialDate,
    unit_name: '',
    stake_name: '',
    status: 'DRAFT',
    theme: 'Focus on Jesus Christ and His Atonement',
    presiding: '',
    conducting: '',
    meeting_type: 'SACRAMENT',
    opening_hymn: '',
    opening_prayer: '',
    sacrament_hymn: '',
    speakers: '',
    special_music: '',
    closing_hymn: '',
    closing_prayer: '',
    come_follow_me: '',
    cfm_reading: 'Alma 32–35',
    cfm_theme: 'Plant This Seed in Your Hearts',
    cfm_introduction: 'Alma compares the word of God unto a seed. If you give place that a seed may be planted in your heart, it will begin to swell within your breasts.',
    cfm_ideas_for_learning: '1. Plant the word in your heart by reading scriptures daily.\n2. Nourish your growing testimony with fervent prayer and Christlike service.',
    cfm_reflection_options: [
      'How has crying unto the Lord in humility helped you find peace and forgiveness through the Savior’s mercy?',
      'In what ways has remembering the works of the Lord in your past strengthened your trust in Him during present trials?',
      'What has the Savior done for your soul that you feel inspired to declare and share with others?',
    ],
    cfm_reflection: 'How has crying unto the Lord in humility helped you find peace and forgiveness through the Savior’s mercy?',
    cfm_discussion_question: 'How has crying unto the Lord in humility helped you find peace and forgiveness through the Savior’s mercy?',
    cfm_family_challenge: 'Hold a 10-minute family council on Sunday afternoon to discuss the reading.',
    cfm_study_tip: 'Ponder on what nourishment your testimony needs right now.',
    cfm_url: 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/35?lang=eng',
    cleaning_group: 'Elders Quorum & Relief Society Group 1',
    cleaning_date: initialDate,
    cleaning_time: '08:00',
    cleaning_instructions: 'Please arrive promptly. Supplies provided at the meetinghouse custodial closet.',
    show_cleaning: true,
    activities: '',
    birthdays: '',
    birthday_message: 'The Bishopric wishes all celebrants this week a very Happy Birthday!',
    missionaries: 'Elder Johnson & Elder Smith (Ghana Accra Mission)\nSister Davis & Sister Okafor (Nigeria Lagos Mission)',
    scripture_of_the_week: '"Learn of me, and listen to my words; walk in the meekness of my Spirit, and you shall have peace in me." — D&C 19:23',
    missionary_challenge: '',
    temple_trip_date: '',
    familysearch_tip: '',
    ancestor_challenge: '',
    self_reliance_classes: '',
    ward_focus: '',
    welfare_reminders: '',
    bishopric_message: 'Welcome to our Sacrament Service. May the Spirit of the Lord fill your heart as we partake of the Sacrament and worship our Savior Jesus Christ.',
    upcoming_events: '',
    qr_whatsapp: 'https://chat.whatsapp.com/',
    qr_gospel_library: 'https://www.churchofjesuschrist.org/study/gospel-library',
    qr_website: 'https://www.churchofjesuschrist.org',
    qr_familysearch: 'https://www.familysearch.org',
    qr_planner_link: '',
    show_sacrament: true,
    show_activities: true,
    show_birthdays: true,
    show_missionary: true,
    show_temple: false,
    show_self_reliance: false,
    show_focus: true,
    show_welfare: false,
    show_bishopric: true,
    show_upcoming: true,
    show_qr: true,
    color_theme: 'navy',
    pdf_layout: 'standard_1p',
  });

  // Load all initial data from Apps Script backend + Unit Settings
  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [bRes, pRes, mRes, aRes, hRes, sRes] = await Promise.allSettled([
        bulletinsApi.list(session.token) as Promise<{ ok: boolean; data: Bulletin[] }>,
        plannersApi.list(session.token) as Promise<{ ok: boolean; data: Planner[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
        activitiesApi.list(session.token) as Promise<{ ok: boolean; data: Activity[] }>,
        hymnsApi.list(session.token) as Promise<{ ok: boolean; data: Hymn[] }>,
        settingsApi.get(session.token) as Promise<{ ok: boolean; data: UnitSetting[] }>,
      ]);

      let loadedBulletins: Bulletin[] = [];
      if (bRes.status === 'fulfilled' && bRes.value.ok && Array.isArray(bRes.value.data)) {
        loadedBulletins = bRes.value.data;
      }
      try {
        const localSaved = JSON.parse(localStorage.getItem('SM_SAVED_BULLETINS') || '[]');
        if (Array.isArray(localSaved) && localSaved.length > 0) {
          const map = new Map<string, Bulletin>();
          loadedBulletins.forEach((b) => map.set(b.bulletin_id || b.date, b));
          localSaved.forEach((b: Bulletin) => {
            const key = b.bulletin_id || b.date;
            if (!map.has(key)) map.set(key, b);
          });
          loadedBulletins = Array.from(map.values());
        }
      } catch {}
      setBulletins(loadedBulletins);

      if (pRes.status === 'fulfilled' && pRes.value.ok) setPlanners(pRes.value.data || []);
      if (mRes.status === 'fulfilled' && mRes.value.ok) setMembers(mRes.value.data || []);
      if (aRes.status === 'fulfilled' && aRes.value.ok) setActivities(aRes.value.data || []);
      if (hRes.status === 'fulfilled' && hRes.value.ok) setHymns(hRes.value.data || []);

      if (sRes.status === 'fulfilled' && sRes.value.ok && Array.isArray(sRes.value.data)) {
        const loadedSettings = sRes.value.data;
        setSettings(loadedSettings);
        const findVal = (k: string) => {
          const item = loadedSettings.find((s) => s.key === k || s.setting_key === k);
          return item ? item.value || item.setting_value : '';
        };
        const wardName = findVal('UNIT_NAME') || findVal('ward_name') || 'Obantoko Ward';
        const stakeName = findVal('STAKE_NAME') || findVal('stake_name') || 'Abeokuta Nigeria Stake';

        setForm((prev) => ({
          ...prev,
          unit_name: prev.unit_name || wardName,
          stake_name: prev.stake_name || stakeName,
        }));
      }
    } catch {
      toast.error('Could not load some bulletin records. Working in offline mode.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Track Unsaved Changes & Debounced Local Auto-Save Backup
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setHasUnsavedChanges(true);
    if (!form.date) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`SM_BULLETIN_DRAFT_${form.date}`, JSON.stringify(form));
        localStorage.setItem('SM_ACTIVE_BULLETIN_DRAFT', JSON.stringify(form));
      } catch {}
    }, 600);

    return () => clearTimeout(timer);
  }, [form]);

  // ─── Generate Bulletin Week Options (Monday – Sunday Range Architecture) ─────
  const weekOptions: BulletinWeekOption[] = useMemo(() => {
    const options: BulletinWeekOption[] = [];
    const dateMap = new Map<string, BulletinWeekOption>();

    planners.forEach((p) => {
      let weeks: any[] = [];
      if (p.weeks) {
        if (typeof p.weeks === 'string') {
          try {
            weeks = JSON.parse(p.weeks);
          } catch {
            weeks = [];
          }
        } else if (Array.isArray(p.weeks)) {
          weeks = p.weeks;
        }
      }

      weeks.forEach((w, idx) => {
        if (w.date && !dateMap.has(w.date)) {
          const range = getWeekDateRange(w.date, p.unit_name);
          const monthName = format(parseISO(w.date), 'MMMM');
          const weekLabel = `${range.monFormatted} – ${range.sunFormatted} Bulletin (Week ${idx + 1}, ${monthName})`;
          const opt: BulletinWeekOption = {
            value: w.date,
            label: weekLabel,
            mondayDate: range.mondayStr,
            sundayDate: w.date,
            plannerId: p.planner_id,
            unitName: p.unit_name,
          };
          dateMap.set(w.date, opt);
        }
      });
    });

    const now = new Date();
    for (let offset = -4; offset <= 8; offset++) {
      const target = addWeeks(now, offset);
      const dayOfWeek = target.getDay();
      const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const targetSunday = new Date(target);
      targetSunday.setDate(target.getDate() + diffToSunday);
      const sunStr = format(targetSunday, 'yyyy-MM-dd');

      if (!dateMap.has(sunStr)) {
        const range = getWeekDateRange(sunStr, form.unit_name);
        const monthName = format(targetSunday, 'MMMM');
        const opt: BulletinWeekOption = {
          value: sunStr,
          label: `${range.monFormatted} – ${range.sunFormatted} Bulletin (${monthName})`,
          mondayDate: range.mondayStr,
          sundayDate: sunStr,
          unitName: form.unit_name,
        };
        dateMap.set(sunStr, opt);
      }
    }

    const sorted = Array.from(dateMap.values()).sort((a, b) => b.value.localeCompare(a.value));
    return sorted;
  }, [planners, form.unit_name]);

  // Non-destructive Sacrament Program Sync from Planner
  const handleSyncSacramentFromPlanner = async (targetDateOverride?: string, targetPlannerIdOverride?: string) => {
    if (!session) return;
    const targetDate = targetDateOverride || form.date;
    if (!targetDate) {
      toast.error('Please select a target week Sunday date first.');
      return;
    }

    let targetPlanner: Planner | undefined;
    let targetAgenda: any = null;

    if (targetPlannerIdOverride || form.planner_id) {
      const pId = targetPlannerIdOverride || form.planner_id;
      targetPlanner = planners.find((p) => p.planner_id === pId);
    }

    if (!targetPlanner) {
      for (const p of planners) {
        let weeks: any[] = [];
        try {
          weeks = typeof p.weeks === 'string' ? JSON.parse(p.weeks) : (p.weeks || []);
        } catch {}
        const match = weeks.find((w: any) => w.date === targetDate);
        if (match) {
          targetPlanner = p;
          targetAgenda = match;
          break;
        }
      }
    }

    if (targetPlanner && !targetAgenda) {
      let weeks: any[] = [];
      try {
        weeks = typeof targetPlanner.weeks === 'string' ? JSON.parse(targetPlanner.weeks) : (targetPlanner.weeks || []);
      } catch {}
      targetAgenda = weeks.find((w: any) => w.date === targetDate) || weeks[0];
    }

    if (!targetAgenda) {
      try {
        const res = await agendasApi.getByDate(session.token, targetDate) as { ok: boolean; data?: any };
        if (res.ok && res.data) {
          targetAgenda = res.data;
        }
      } catch {}
    }

    if (!targetAgenda) {
      toast.error(`No Sacrament Planner agenda found for ${targetDate}. You can enter details manually.`, { duration: 4000 });
      return;
    }

    // Extract speakers roster
    let incomingSpeakersText = '';
    if (targetAgenda.speakers) {
      if (typeof targetAgenda.speakers === 'string') {
        incomingSpeakersText = targetAgenda.speakers;
      } else if (Array.isArray(targetAgenda.speakers)) {
        incomingSpeakersText = targetAgenda.speakers
          .map((s: any) => `${s.name || ''}${s.topic ? ' — ' + s.topic : ''}`)
          .join('\n');
      }
    }

    if (!incomingSpeakersText && targetAgenda.type_of_meeting === 'FAST_SUNDAY') {
      incomingSpeakersText = 'Bearing of Testimonies by the Congregation';
    }

    const incoming: Partial<Bulletin> = {
      opening_hymn: targetAgenda.opening_hymn || targetAgenda.opening_hymn_number || '',
      opening_prayer: targetAgenda.opening_prayer || '',
      sacrament_hymn: targetAgenda.sacrament_hymn || targetAgenda.sacrament_hymn_number || '',
      speakers: incomingSpeakersText,
      special_music: targetAgenda.special_music || '',
      closing_hymn: targetAgenda.closing_hymn || targetAgenda.closing_hymn_number || '',
      closing_prayer: targetAgenda.closing_prayer || '',
      theme: targetAgenda.theme || targetAgenda.topic || form.theme || '',
      meeting_type: targetAgenda.type_of_meeting || form.meeting_type || 'SACRAMENT',
    };

    // Calculate diffs between current form and incoming agenda
    const fieldMapping: { key: keyof Bulletin; label: string }[] = [
      { key: 'meeting_type', label: 'Meeting Type / Designation' },
      { key: 'theme', label: 'Sacrament Theme / Topic' },
      { key: 'opening_hymn', label: 'Opening Hymn' },
      { key: 'opening_prayer', label: 'Invocation (Opening Prayer)' },
      { key: 'sacrament_hymn', label: 'Sacrament Hymn' },
      { key: 'speakers', label: 'Speakers / Testimonies' },
      { key: 'special_music', label: 'Special Musical Item' },
      { key: 'closing_hymn', label: 'Closing Hymn' },
      { key: 'closing_prayer', label: 'Benediction (Closing Prayer)' },
    ];

    const diffs: SyncFieldDifference[] = [];
    const autoApplyFields: Partial<Bulletin> = {};

    fieldMapping.forEach(({ key, label }) => {
      const currentVal = String((form as any)[key] || '').trim();
      const incomingVal = String((incoming as any)[key] || '').trim();

      if (!incomingVal) return;

      if (!currentVal) {
        (autoApplyFields as any)[key] = incomingVal;
      } else if (currentVal !== incomingVal) {
        diffs.push({
          key,
          label,
          currentValue: currentVal,
          incomingValue: incomingVal,
        });
      }
    });

    if (Object.keys(autoApplyFields).length > 0) {
      setForm((prev) => ({ ...prev, ...autoApplyFields }));
    }

    if (diffs.length > 0) {
      setSyncDiffs(diffs);
      setPendingSyncData(incoming);
      const range = getWeekDateRange(targetDate, targetPlanner?.unit_name || form.unit_name);
      setSyncWeekLabel(`${range.monFormatted} – ${range.sunFormatted} Planner`);
      setSyncConfirmOpen(true);
    } else {
      toast.success(`Sacrament program in sync with ${targetDate} planner!`);
    }
  };

  // Confirm and apply user-selected fields from sync modal
  const handleApplySyncDifferences = (selectedKeys: string[]) => {
    if (!pendingSyncData) return;
    setForm((prev) => {
      const next = { ...prev };
      selectedKeys.forEach((key) => {
        if ((pendingSyncData as any)[key] !== undefined) {
          (next as any)[key] = (pendingSyncData as any)[key];
        }
      });
      return next;
    });
    toast.success(`Updated ${selectedKeys.length} sacrament fields from Planner!`);
    setPendingSyncData(null);
  };

  // ─── Handle Week Selection ──────────────────────────────────────────────────
  const handleSelectWeek = (sundayDate: string) => {
    if (!sundayDate) return;
    const matchedOpt = weekOptions.find((w) => w.value === sundayDate);
    const targetPlannerId = matchedOpt?.plannerId || form.planner_id;
    const targetUnitName = matchedOpt?.unitName || form.unit_name;

    // Check if there is a saved local draft for this week
    try {
      const localDraft = localStorage.getItem(`SM_BULLETIN_DRAFT_${sundayDate}`);
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        setForm(parsed);
        toast.success(`Loaded saved draft for ${sundayDate}`);
        return;
      }
    } catch {}

    setForm((prev) => ({
      ...prev,
      date: sundayDate,
      planner_id: targetPlannerId || prev.planner_id,
      unit_name: targetUnitName || prev.unit_name,
    }));

    handleAutoDraft(sundayDate, targetPlannerId, targetUnitName);
    handleSyncSacramentFromPlanner(sundayDate, targetPlannerId);
  };

  // Auto-Drafting Engine: Harvest Sacrament Agenda, Birthdays, and Activities
  const handleAutoDraft = async (overrideDate?: string, overridePlannerId?: string, overrideUnitName?: string) => {
    if (!session) return;
    const targetDate = overrideDate || form.date || initialDate;
    const targetPlannerId = overridePlannerId || form.planner_id;
    toast.loading('Auto-harvesting data for ' + targetDate + '…', { id: 'drafting' });

    try {
      const res = (await bulletinsApi.getDraftData(
        session.token,
        targetDate,
        targetPlannerId
      )) as { ok: boolean; data: { existing_bulletin?: Bulletin; suggested_data: Partial<Bulletin> } };

      const next5Fallback = getNext5Activities(activities, targetDate);

      if (res.ok && res.data) {
        if (res.data.existing_bulletin) {
          setSelectedBulletinId(res.data.existing_bulletin.bulletin_id);
          const loaded = res.data.existing_bulletin;
          const validNext5 = (loaded.next_activities_list && loaded.next_activities_list.length > 0 && !loaded.next_activities_list[0].date?.startsWith('act_'))
            ? loaded.next_activities_list
            : next5Fallback;

          setForm({
            ...loaded,
            next_activities_list: validNext5,
          });
          toast.success('Loaded saved bulletin for ' + targetDate, { id: 'drafting' });
        } else if (res.data.suggested_data) {
          const sug = res.data.suggested_data;
          const validNext5 = (sug.next_activities_list && sug.next_activities_list.length > 0 && !sug.next_activities_list[0].date?.startsWith('act_'))
            ? sug.next_activities_list
            : next5Fallback;

          setForm((prev) => ({
            ...prev,
            ...sug,
            next_activities_list: validNext5,
            unit_name: overrideUnitName || sug.unit_name || prev.unit_name,
          }));
          toast.success('Sacrament outline, birthdays & activities auto-drafted!', { id: 'drafting' });
        }
      }
    } catch {
      const harvestedBirthdays = getBirthdaysForWeek(members, targetDate);
      const bdaysText = harvestedBirthdays.map((b) => `🎂 ${b.formatted}`).join('   ');
      const { items: actItems, formattedText: actText } = harvestWeeklyActivities(activities, targetDate);
      const next5 = getNext5Activities(activities, targetDate);

      setForm((prev) => ({
        ...prev,
        date: targetDate,
        birthdays: bdaysText,
        birthday_celebrants_list: harvestedBirthdays,
        activities: actText,
        activities_list: actItems,
        next_activities_list: next5,
      }));
      toast.success('Auto-drafted from local state.', { id: 'drafting' });
    }
  };

  // URL-Driven Come Follow Me AI Extractor
  const handleGenerateCfmAi = async () => {
    const cfmUrl = (form.cfm_url || '').trim();
    if (!cfmUrl) {
      toast.error('Please paste a Come, Follow Me study URL link first.');
      return;
    }

    setGeneratingAi(true);
    toast.loading('Analyzing Gospel Library study manual…', { id: 'cfmai' });

    try {
      if (session?.token) {
        const res = (await bulletinsApi.generateCfm(session.token, cfmUrl)) as any;
        if (res.ok && res.data) {
          const d = res.data;
          setForm((prev) => ({
            ...prev,
            cfm_reading: d.reading_block,
            cfm_theme: d.study_theme,
            cfm_introduction: d.introduction,
            cfm_ideas_for_learning: d.ideas_for_learning,
            cfm_reflection: d.selected_reflection || (d.reflection_options && d.reflection_options[0]) || '',
            cfm_discussion_question: d.selected_reflection || (d.reflection_options && d.reflection_options[0]) || '',
            cfm_url: d.url || cfmUrl,
          }));
          toast.success('Come, Follow Me study guide extracted!', { id: 'cfmai' });
          setGeneratingAi(false);
          return;
        }
      }

      const parsedData = await fetchAndParseCfmUrl(cfmUrl);
      setForm((prev) => ({
        ...prev,
        cfm_reading: parsedData.reading_block,
        cfm_theme: parsedData.study_theme,
        cfm_introduction: parsedData.introduction,
        cfm_ideas_for_learning: parsedData.ideas_for_learning,
        cfm_reflection: parsedData.selected_reflection,
        cfm_discussion_question: parsedData.selected_reflection,
        cfm_url: parsedData.url,
      }));
      toast.success('Come, Follow Me study guide extracted!', { id: 'cfmai' });
    } catch {
      const offlineData = generateCfmFromUrlOffline(cfmUrl);
      setForm((prev) => ({
        ...prev,
        cfm_reading: offlineData.reading_block,
        cfm_theme: offlineData.study_theme,
        cfm_introduction: offlineData.introduction,
        cfm_ideas_for_learning: offlineData.ideas_for_learning,
        cfm_reflection: offlineData.selected_reflection,
        cfm_discussion_question: offlineData.selected_reflection,
        cfm_url: offlineData.url,
      }));
      toast.success('Come, Follow Me offline study guide generated!', { id: 'cfmai' });
    } finally {
      setGeneratingAi(false);
    }
  };

  // Import Calendar Activities for current week
  const handleImportActivities = () => {
    const targetDate = form.date || initialDate;
    const { items, formattedText } = harvestWeeklyActivities(activities, targetDate);
    const next5 = getNext5Activities(activities, targetDate);

    setForm((prev) => ({
      ...prev,
      activities: formattedText,
      activities_list: items,
      next_activities_list: next5,
    }));
    toast.success(`Imported ${items.length} activities for this week + ${next5.length} upcoming events!`);
  };

  // Select a bulletin from the left sidebar
  const handleSelectBulletin = (b: Bulletin) => {
    setSelectedBulletinId(b.bulletin_id || null);
    setForm(b);
    setActiveTab('edit');
    setHasUnsavedChanges(false);
    toast.success(`Loaded ${b.status === 'PUBLISHED' ? 'bulletin' : 'draft'} for ${b.date}`);
  };

  // Create a brand new bulletin
  const handleCreateNew = () => {
    setSelectedBulletinId(null);
    const newDate = format(new Date(), 'yyyy-MM-dd');
    setForm({
      date: newDate,
      unit_name: form.unit_name || 'Obantoko Ward',
      stake_name: form.stake_name || 'Abeokuta Nigeria Stake',
      status: 'DRAFT',
      theme: 'Focus on Jesus Christ and His Atonement',
      presiding: '',
      conducting: '',
      meeting_type: 'SACRAMENT',
      opening_hymn: '',
      opening_prayer: '',
      sacrament_hymn: '',
      speakers: '',
      special_music: '',
      closing_hymn: '',
      closing_prayer: '',
      come_follow_me: '',
      cfm_reading: 'Alma 32–35',
      cfm_theme: 'Plant This Seed in Your Hearts',
      cfm_introduction: 'Alma compares the word of God unto a seed.',
      cfm_ideas_for_learning: '1. Plant the word in your heart.\n2. Nourish your testimony with prayer and service.',
      cfm_reflection: 'How has faith grown like a seed in your family’s life this week?',
      cfm_discussion_question: 'How has faith grown like a seed in your family’s life this week?',
      cfm_url: 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/35?lang=eng',
      cleaning_group: 'Elders Quorum & Relief Society Group 1',
      cleaning_date: newDate,
      cleaning_time: '08:00',
      cleaning_instructions: 'Please arrive promptly. Supplies provided at the custodial closet.',
      show_cleaning: true,
      activities: '',
      birthdays: '',
      birthday_message: 'The Bishopric wishes all celebrants this week a very Happy Birthday!',
      missionaries: 'Elder Johnson & Elder Smith\nSister Davis & Sister Okafor',
      scripture_of_the_week: '"Learn of me, and listen to my words; walk in the meekness of my Spirit, and you shall have peace in me." — D&C 19:23',
      bishopric_message: 'Welcome to our Sacrament Service. May the Spirit of the Lord fill your heart as we partake of the Sacrament and worship our Savior Jesus Christ.',
      qr_whatsapp: 'https://chat.whatsapp.com/',
      qr_gospel_library: 'https://www.churchofjesuschrist.org/study/gospel-library',
      qr_website: 'https://www.churchofjesuschrist.org',
      qr_familysearch: 'https://www.familysearch.org',
      show_sacrament: true,
      show_activities: true,
      show_birthdays: true,
      show_missionary: true,
      show_temple: false,
      show_self_reliance: false,
      show_focus: true,
      show_welfare: false,
      show_bishopric: true,
      show_upcoming: true,
      show_qr: true,
      color_theme: 'navy',
      pdf_layout: 'standard_1p',
    });
    setActiveTab('edit');
    setHasUnsavedChanges(true);
  };

  // ─── Save / Draft Persistence Handler (Cloud + Local Cache) ────────────────
  const handleSave = async (targetStatus: 'DRAFT' | 'PUBLISHED' = 'DRAFT') => {
    if (!session) return;
    if (!form.date) {
      toast.error('Please specify a valid Sunday date.');
      return;
    }

    setSaving(true);
    const saveToastId = toast.loading(
      targetStatus === 'PUBLISHED'
        ? `Publishing bulletin for ${form.date}…`
        : `Saving draft for ${form.date}…`
    );

    try {
      const generatedId = selectedBulletinId || `BUL_${Date.now()}`;
      const payload: Bulletin = {
        ...(form as Bulletin),
        bulletin_id: generatedId,
        date: form.date,
        status: targetStatus,
        updated_date: new Date().toISOString(),
      };

      // 1. Immediate local cache persistence
      try {
        const localSaved = JSON.parse(localStorage.getItem('SM_SAVED_BULLETINS') || '[]');
        const updatedLocal = [
          payload,
          ...localSaved.filter((b: any) => b.bulletin_id !== payload.bulletin_id && b.date !== payload.date),
        ];
        localStorage.setItem('SM_SAVED_BULLETINS', JSON.stringify(updatedLocal));
        localStorage.setItem(`SM_BULLETIN_${payload.date}`, JSON.stringify(payload));
        localStorage.setItem(`SM_BULLETIN_DRAFT_${payload.date}`, JSON.stringify(payload));
      } catch {}

      // Update in-memory state immediately
      setSelectedBulletinId(generatedId);
      setForm(payload);
      setBulletins((prev) => [
        payload,
        ...prev.filter((b) => b.bulletin_id !== generatedId && b.date !== payload.date),
      ]);
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());

      // 2. Cloud Apps Script Database persistence
      try {
        const res = (await bulletinsApi.save(session.token, payload)) as {
          ok: boolean;
          data: Bulletin;
          message?: string;
        };

        if (res.ok && res.data) {
          setSelectedBulletinId(res.data.bulletin_id);
          toast.success(
            targetStatus === 'PUBLISHED'
              ? 'Weekly Bulletin published and saved to Cloud!'
              : 'Weekly Bulletin draft saved successfully!',
            { id: saveToastId }
          );
          loadData();
          return;
        }
      } catch (backendErr) {
        console.warn('Backend save notice (offline fallback applied):', backendErr);
      }

      toast.success(
        targetStatus === 'PUBLISHED'
          ? 'Weekly Bulletin published and saved locally!'
          : 'Weekly Bulletin draft saved successfully to local storage!',
        { id: saveToastId }
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bulletin.', { id: saveToastId });
    } finally {
      setSaving(false);
    }
  };

  // Delete Bulletin
  const handleDelete = async (bulletinId: string) => {
    if (!session || !window.confirm('Are you sure you want to delete this weekly bulletin?')) return;
    try {
      try {
        await bulletinsApi.delete(session.token, bulletinId);
      } catch {}
      try {
        const localSaved = JSON.parse(localStorage.getItem('SM_SAVED_BULLETINS') || '[]');
        const filtered = localSaved.filter((b: any) => b.bulletin_id !== bulletinId);
        localStorage.setItem('SM_SAVED_BULLETINS', JSON.stringify(filtered));
      } catch {}

      toast.success('Bulletin deleted.');
      if (selectedBulletinId === bulletinId) {
        setSelectedBulletinId(null);
        handleCreateNew();
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bulletin.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        title="Weekly Ward Bulletin Multi-Channel Publishing Suite"
        subtitle="1-Click Sacrament Program, AI Come Follow Me, WhatsApp Cards, Live Mobile Web & Vector PDF Print"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              {hasUnsavedChanges ? (
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved Changes
                </span>
              ) : lastSavedTime ? (
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Saved {format(lastSavedTime, 'h:mm a')}
                </span>
              ) : (
                <span className="text-slate-500 font-medium">Draft Ready</span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              onClick={loadData}
            >
              Refresh
            </Button>

            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleCreateNew}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              New Bulletin
            </Button>

            {/* Save as Draft Button */}
            <Button
              size="sm"
              variant="outline"
              icon={<Save className="w-3.5 h-3.5 text-slate-700" />}
              onClick={() => handleSave('DRAFT')}
              loading={saving}
              className="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-bold shadow-xs text-xs"
            >
              Save Draft
            </Button>

            {/* Publish Button */}
            <Button
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => handleSave('PUBLISHED')}
              loading={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs text-xs"
            >
              Publish Bulletin
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid lg:grid-cols-4 gap-6 items-start">
          {/* ─── LEFT SIDEBAR: Saved Bulletins Directory ────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Weekly Bulletins Directory
              </p>
              <span className="text-xs text-slate-400 font-semibold">{bulletins.length} total</span>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : bulletins.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                No saved bulletins yet.
                <Button
                  size="sm"
                  className="mt-3 w-full text-xs"
                  onClick={handleCreateNew}
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  Create First Bulletin
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {bulletins.map((b) => {
                  const isSelected = selectedBulletinId === b.bulletin_id || form.date === b.date;
                  const range = getWeekDateRange(b.date, b.unit_name);
                  const isPublished = b.status === 'PUBLISHED';

                  return (
                    <div
                      key={b.bulletin_id || b.date}
                      onClick={() => handleSelectBulletin(b)}
                      className={`group relative w-full text-left rounded-2xl border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                                isPublished
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {isPublished ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                              {range.rangeLabel}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {b.unit_name || 'Ward Bulletin'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(b.bulletin_id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                          title="Delete Bulletin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── MAIN CONTENT: 4 Multi-Channel Output Tabs ───────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* 4 Multi-Channel View Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'edit'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  1. Bulletin Workspace Editor
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('print')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'print'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  2. PDF & Print Preview
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('web')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'web'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  3. Live Mobile Web View
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'whatsapp'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  4. WhatsApp Cards & Bot
                </button>
              </div>
            </div>

            {/* TAB 1: FORM WORKSPACE EDITOR */}
            {activeTab === 'edit' && (
              <BulletinFormEditor
                form={form}
                setForm={setForm}
                planners={planners}
                hymns={hymns}
                weekOptions={weekOptions}
                onAutoDraft={() => handleAutoDraft()}
                onGenerateCfmAi={handleGenerateCfmAi}
                generatingAi={generatingAi}
                onImportActivities={handleImportActivities}
                onSelectPlanner={(pId) => {
                  setForm((prev) => ({ ...prev, planner_id: pId }));
                  handleSyncSacramentFromPlanner(undefined, pId);
                }}
                onSelectWeek={handleSelectWeek}
                onSyncSacramentFromPlanner={() => handleSyncSacramentFromPlanner()}
              />
            )}

            {/* TAB 2: PRINT & PDF PREVIEW */}
            {activeTab === 'print' && (
              <BulletinPrintPreview bulletin={form as Bulletin} />
            )}

            {/* TAB 3: LIVE MOBILE WEB VIEW */}
            {activeTab === 'web' && (
              <BulletinWebView
                bulletin={form as Bulletin}
                onOpenFeedbackModal={() => setFeedbackModalOpen(true)}
              />
            )}

            {/* TAB 4: WHATSAPP DIGESTS & CARDS */}
            {activeTab === 'whatsapp' && (
              <BulletinWhatsAppCard bulletin={form as Bulletin} />
            )}
          </div>
        </div>
      </div>

      {/* Non-Destructive Planner Sync Conflict Review Modal */}
      <BulletinSyncConfirmModal
        isOpen={syncConfirmOpen}
        onClose={() => setSyncConfirmOpen(false)}
        onConfirm={handleApplySyncDifferences}
        differences={syncDiffs}
        weekLabel={syncWeekLabel}
      />
    </div>
  );
}
