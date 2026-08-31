import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, RefreshCw, FileText, Printer, Eye, Sparkles, MessageSquare,
  Share2, Calendar, Trash2, CheckCircle2, ChevronRight, Bookmark,
  Layers, Smartphone, ExternalLink, Heart, Clock, AlertCircle
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
    cfm_ideas_for_learning: '1. Plant the word in your heart by diligent study and faith.\n2. Nourish your testimony with prayer, fasting, and service.',
    cfm_reflection: 'How has faith grown like a seed in your family’s life this week?',
    cfm_discussion_question: 'How has faith grown like a seed in your family’s life this week?',
    cfm_family_challenge: 'Read Alma 32:28 together as a family and write down one tender mercy of the Lord.',
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

      if (bRes.status === 'fulfilled' && bRes.value.ok) setBulletins(bRes.value.data || []);
      if (pRes.status === 'fulfilled' && pRes.value.ok) setPlanners(pRes.value.data || []);
      if (mRes.status === 'fulfilled' && mRes.value.ok) setMembers(mRes.value.data || []);
      if (aRes.status === 'fulfilled' && aRes.value.ok) setActivities(aRes.value.data || []);
      if (hRes.status === 'fulfilled' && hRes.value.ok) setHymns(hRes.value.data || []);

      if (sRes.status === 'fulfilled' && sRes.value.ok && Array.isArray(sRes.value.data)) {
        const loadedSettings = sRes.value.data;
        setSettings(loadedSettings);
        const findVal = (k: string) => {
          const item = loadedSettings.find((s) => s.key === k || s.setting_key === k);
          return item ? (item.value || item.setting_value || '') : '';
        };

        const wardName = findVal('UNIT_NAME') || 'Obantoko Ward';
        const stakeName = findVal('STAKE_NAME') || 'Abeokuta Nigeria Stake';

        setForm((prev) => ({
          ...prev,
          unit_name: prev.unit_name || wardName,
          stake_name: prev.stake_name || stakeName,
        }));
      }
    } catch {
      toast.error('Failed to load bulletins data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // ─── Generate Available Week Options (Monday – Sunday) ──────────────────────
  const weekOptions: BulletinWeekOption[] = useMemo(() => {
    const optionsMap = new Map<string, BulletinWeekOption>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // 1. Harvest weeks from submitted/approved Planners
    const activePlanners = planners.filter((p) => p.state === 'SUBMITTED' || p.state === 'APPROVED' || p.state === 'DRAFT');

    activePlanners.forEach((pl) => {
      try {
        const y = Number(pl.year);
        const m = Number(pl.month);
        if (!y || !m) return;

        // Check embedded weeks if present
        let parsedWeeks: any[] = [];
        if (pl.weeks) {
          try {
            parsedWeeks = typeof pl.weeks === 'string' ? JSON.parse(pl.weeks) : pl.weeks;
          } catch {}
        }

        if (Array.isArray(parsedWeeks) && parsedWeeks.length > 0) {
          parsedWeeks.forEach((w, idx) => {
            if (!w || !w.date) return;
            const sunDateStr = String(w.date).substring(0, 10);
            const range = getWeekDateRange(sunDateStr, pl.unit_name || form.unit_name);
            const optKey = sunDateStr;
            if (!optionsMap.has(optKey)) {
              optionsMap.set(optKey, {
                value: sunDateStr,
                label: `${range.monFormatted || ''} – ${range.sunFormatted || sunDateStr} Bulletin (Week ${idx + 1}, ${monthNames[m - 1]})`,
                mondayDate: range.mondayStr,
                sundayDate: sunDateStr,
                plannerId: pl.planner_id,
                unitName: pl.unit_name,
              });
            }
          });
        } else {
          // Calculate all Sundays in that month
          const start = new Date(y, m - 1, 1);
          const end = new Date(y, m, 0);
          let weekIdx = 1;
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (d.getDay() === 0) { // Sunday
              const sunDateStr = format(d, 'yyyy-MM-dd');
              const range = getWeekDateRange(sunDateStr, pl.unit_name || form.unit_name);
              const optKey = sunDateStr;
              if (!optionsMap.has(optKey)) {
                optionsMap.set(optKey, {
                  value: sunDateStr,
                  label: `${range.monFormatted || ''} – ${range.sunFormatted || sunDateStr} Bulletin (Week ${weekIdx}, ${monthNames[m - 1]})`,
                  mondayDate: range.mondayStr,
                  sundayDate: sunDateStr,
                  plannerId: pl.planner_id,
                  unitName: pl.unit_name,
                });
              }
              weekIdx++;
            }
          }
        }
      } catch (err) {
        console.warn('Error computing planner weeks:', err);
      }
    });

    // 2. Also inject current week & surrounding 4 weeks as reliable choices
    try {
      const today = new Date();
      for (let i = -2; i <= 4; i++) {
        const d = addWeeks(today, i);
        const dayOfWeek = d.getDay();
        const diffToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const sunday = new Date(d);
        sunday.setDate(d.getDate() + diffToSunday);

        const sunDateStr = format(sunday, 'yyyy-MM-dd');
        if (!optionsMap.has(sunDateStr)) {
          const range = getWeekDateRange(sunDateStr, form.unit_name);
          optionsMap.set(sunDateStr, {
            value: sunDateStr,
            label: `${range.monFormatted || ''} – ${range.sunFormatted || sunDateStr} Bulletin`,
            mondayDate: range.mondayStr,
            sundayDate: sunDateStr,
          });
        }
      }
    } catch {}

    // Sort chronologically descending (newest weeks first)
    return Array.from(optionsMap.values()).sort((a, b) => b.sundayDate.localeCompare(a.sundayDate));
  }, [planners, form.unit_name]);

  // Helper to format hymn with number prefix
  const formatHymnWithNumber = (hymnText?: string, hymnNum?: string | number) => {
    if (!hymnText && !hymnNum) return '';
    const num = hymnNum ? String(hymnNum).trim().replace(/^#/, '') : '';
    const title = (hymnText || '').trim();
    if (num && title) {
      if (title.startsWith('#')) return title;
      return `#${num} — ${title}`;
    }
    return title || (num ? `#${num}` : '');
  };

  // Helper to format speakers to readable text string
  const formatSpeakersForEditor = (speakersRaw: any, isFastSunday?: boolean): string => {
    if (isFastSunday) return 'Bearing of Testimonies by the Congregation';
    if (!speakersRaw) return '';
    if (typeof speakersRaw === 'string') {
      const trimmed = speakersRaw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed
              .map((s: any) => {
                const name = s.name || s.speaker_name || '';
                const topic = s.topic || s.subject || '';
                return name ? (topic ? `${name} — ${topic}` : name) : '';
              })
              .filter(Boolean)
              .join('\n');
          }
        } catch {}
      }
      return speakersRaw;
    }
    if (Array.isArray(speakersRaw)) {
      return speakersRaw
        .map((s: any) => {
          if (typeof s === 'string') return s;
          const name = s.name || s.speaker_name || '';
          const topic = s.topic || s.subject || '';
          return name ? (topic ? `${name} — ${topic}` : name) : '';
        })
        .filter(Boolean)
        .join('\n');
    }
    return String(speakersRaw);
  };

  // ─── Direct High-Accuracy Sacrament Sync from Planner / Agendas ──────────────
  const handleSyncSacramentFromPlanner = async (targetDate?: string, plannerIdOverride?: string, forceDirect = false) => {
    if (!session) return;
    const dateToSync = (targetDate || form.date || initialDate).substring(0, 10);
    const pId = plannerIdOverride || form.planner_id;

    toast.loading('Syncing Sacrament Program for ' + dateToSync + '…', { id: 'sync-sacrament' });

    try {
      const targetPl = planners.find((p) => p.planner_id === pId);
      let matchedAgenda: any = null;

      // 1. Fetch live agendas for this planner
      if (pId) {
        try {
          const aRes = (await agendasApi.list(session.token, pId, { forceRefresh: true })) as { ok: boolean; data: any[] };
          if (aRes.ok && Array.isArray(aRes.data) && aRes.data.length > 0) {
            matchedAgenda = aRes.data.find((a) => (a.date || '').substring(0, 10) === dateToSync) ||
                            aRes.data.find((a) => a.date === dateToSync);
            
            if (!matchedAgenda && aRes.data.length > 0) {
              matchedAgenda = aRes.data[0];
            }
          }
        } catch (err) {
          console.warn('Live agendas fetch error:', err);
        }
      }

      // 2. Check planner.weeks embedded JSON if not found
      if (!matchedAgenda && targetPl && targetPl.weeks) {
        try {
          const parsedWeeks = typeof targetPl.weeks === 'string' ? JSON.parse(targetPl.weeks) : targetPl.weeks;
          if (Array.isArray(parsedWeeks) && parsedWeeks.length > 0) {
            matchedAgenda = parsedWeeks.find((w: any) => (w.date || '').substring(0, 10) === dateToSync) || parsedWeeks[0];
          }
        } catch {}
      }

      // 3. Also call backend draft endpoint as support
      if (!matchedAgenda) {
        try {
          const draftRes = (await bulletinsApi.getDraftData(session.token, dateToSync, pId)) as any;
          if (draftRes.ok && draftRes.data?.suggested_data) {
            matchedAgenda = draftRes.data.suggested_data;
          }
        } catch {}
      }

      if (matchedAgenda) {
        const mType = matchedAgenda.type_of_meeting || matchedAgenda.meeting_type || 'SACRAMENT';
        const isFastSunday = mType === 'FAST_SUNDAY';

        const openH = formatHymnWithNumber(matchedAgenda.opening_hymn, matchedAgenda.opening_hymn_number);
        const sacH = formatHymnWithNumber(matchedAgenda.sacrament_hymn, matchedAgenda.sacrament_hymn_number);
        const closH = formatHymnWithNumber(matchedAgenda.closing_hymn, matchedAgenda.closing_hymn_number);
        const speakersText = formatSpeakersForEditor(matchedAgenda.speakers, isFastSunday);
        const specMusic = matchedAgenda.special_music || matchedAgenda.special_musical_number || '';
        const themeText = matchedAgenda.other_meeting_specify || matchedAgenda.theme || (isFastSunday ? 'Fast & Testimony Meeting' : form.theme);

        const incomingData: Partial<Bulletin> = {
          meeting_type: mType,
          theme: themeText,
          opening_hymn: openH,
          opening_prayer: matchedAgenda.opening_prayer || '',
          sacrament_hymn: sacH,
          speakers: speakersText,
          special_music: specMusic,
          closing_hymn: closH,
          closing_prayer: matchedAgenda.closing_prayer || '',
        };

        // ─── Non-Destructive Progress Safeguard Engine ────────────────────────
        // Check for conflicts where user already typed custom values that differ
        const diffs: SyncFieldDifference[] = [];
        const checkFields: { key: keyof Bulletin; label: string }[] = [
          { key: 'opening_hymn', label: 'Opening Hymn' },
          { key: 'opening_prayer', label: 'Invocation (Opening Prayer)' },
          { key: 'sacrament_hymn', label: 'Sacrament Hymn' },
          { key: 'speakers', label: 'Speakers Roster' },
          { key: 'special_music', label: 'Special Musical Item' },
          { key: 'closing_hymn', label: 'Closing Hymn' },
          { key: 'closing_prayer', label: 'Benediction (Closing Prayer)' },
          { key: 'meeting_type', label: 'Meeting Type' },
          { key: 'theme', label: 'Theme / Title' },
        ];

        checkFields.forEach(({ key, label }) => {
          const currentVal = (form[key] || '').toString().trim();
          const incomingVal = (incomingData[key] || '').toString().trim();
          if (currentVal && incomingVal && currentVal !== incomingVal) {
            diffs.push({
              key,
              label,
              currentVal,
              plannerVal: incomingVal,
            });
          }
        });

        if (diffs.length > 0 && !forceDirect) {
          // Open interactive review modal
          setSyncDiffs(diffs);
          setPendingSyncData(incomingData);
          const range = getWeekDateRange(dateToSync, form.unit_name);
          setSyncWeekLabel(range.rangeLabel);
          setSyncConfirmOpen(true);
          toast.dismiss('sync-sacrament');
        } else {
          // Direct apply non-conflicting or empty fields
          setForm((prev) => {
            const next = { ...prev };
            Object.entries(incomingData).forEach(([k, v]) => {
              if (v) (next as any)[k] = v;
            });
            return next;
          });
          toast.success(`Sacrament program populated from ${targetPl ? `Planner (${targetPl.month}/${targetPl.year})` : 'Planner'}!`, { id: 'sync-sacrament' });
        }
      } else {
        toast.error('No sacrament agenda found for the selected week. Please verify the planner contains week agendas.', { id: 'sync-sacrament' });
      }
    } catch (err: any) {
      toast.error('Failed to sync from planner: ' + (err.message || 'Unknown error'), { id: 'sync-sacrament' });
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

    setForm((prev) => ({
      ...prev,
      date: sundayDate,
      planner_id: targetPlannerId || prev.planner_id,
      unit_name: targetUnitName || prev.unit_name,
    }));

    // Trigger auto-harvest of birthdays & calendar activities for that week window
    handleAutoDraft(sundayDate, targetPlannerId, targetUnitName);
    // Trigger sacrament program sync for that week
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
      // Local fallback calculation if offline / mock
      const { formattedString, celebrants } = getBirthdaysForWeek(members, targetDate);
      const { items: actItems, formattedText } = harvestWeeklyActivities(activities, targetDate);
      const next5 = getNext5Activities(activities, targetDate);

      setForm((prev) => ({
        ...prev,
        birthdays: formattedString || prev.birthdays,
        birthday_celebrants_list: celebrants,
        activities: formattedText || prev.activities,
        activities_list: actItems,
        next_activities_list: next5,
      }));
      toast.success('Calendar activities and birthdays harvested!', { id: 'drafting' });
    }
  };

  // AI Come Follow Me Prompts & Web Link Extractor
  const handleGenerateCfmAi = async () => {
    if (!session) return;
    setGeneratingAi(true);
    const cfmUrl = form.cfm_url || 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/35?lang=eng';

    toast.loading('Extracting Come, Follow Me study guide...', { id: 'cfmai' });

    try {
      try {
        const res = (await bulletinsApi.generateCfmFromUrl(
          session.token,
          cfmUrl
        )) as {
          ok: boolean;
          data?: {
            reading_block: string;
            study_theme: string;
            introduction: string;
            ideas_for_learning: string;
            reflection_options: string[];
            selected_reflection: string;
            url: string;
          };
        };

        if (
          res.ok &&
          res.data &&
          res.data.reading_block &&
          res.data.reading_block !== 'Scripture Reading Block' &&
          !res.data.reading_block.includes('undefined')
        ) {
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
      } catch (backendErr) {
        console.warn('Backend URL extractor error:', backendErr);
      }

      // 2. Client-side URL Parser Engine
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
      // 3. Fallback offline generator
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
    setSelectedBulletinId(b.bulletin_id);
    setForm(b);
  };

  // Create a brand new bulletin
  const handleCreateNew = () => {
    setSelectedBulletinId(null);
    const newDate = format(new Date(), 'yyyy-MM-dd');
    setForm({
      date: newDate,
      unit_name: form.unit_name || 'Obantoko Ward',
      stake_name: form.stake_name || 'Abeokuta Nigeria Stake',
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
  };

  // Save Bulletin to Cloud Backend
  const handleSave = async () => {
    if (!session) return;
    if (!form.date) {
      toast.error('Please specify a valid Sunday date.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        ...form,
        bulletin_id: selectedBulletinId || undefined,
      };

      const res = (await bulletinsApi.save(session.token, payload)) as {
        ok: boolean;
        data: Bulletin;
        message?: string;
      };

      if (res.ok && res.data) {
        setSelectedBulletinId(res.data.bulletin_id);
        toast.success(res.message || 'Weekly Bulletin saved successfully!');
        loadData();
      } else {
        throw new Error('Save failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bulletin.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Bulletin
  const handleDelete = async (bulletinId: string) => {
    if (!session || !window.confirm('Are you sure you want to delete this weekly bulletin?')) return;
    try {
      await bulletinsApi.delete(session.token, bulletinId);
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
          <div className="flex items-center gap-2">
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
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              New Bulletin
            </Button>
            <Button
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
              onClick={handleSave}
              loading={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs"
            >
              Save Bulletin
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
                Weekly Bulletins
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
                  const isSelected = selectedBulletinId === b.bulletin_id;
                  const range = getWeekDateRange(b.date, b.unit_name);

                  return (
                    <div
                      key={b.bulletin_id}
                      onClick={() => handleSelectBulletin(b)}
                      className={`group relative w-full text-left rounded-2xl border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                            {range.rangeLabel}
                          </p>
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'edit'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  1. Form Builder
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('web')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'web'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  2. Mobile Web View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'whatsapp'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  3. WhatsApp Card (1080×1350)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('print')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'print'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  4. Print / PDF Booklet
                </button>
              </div>

              {/* Quick Auto-Draft Action */}
              <Button
                size="sm"
                variant="outline"
                icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                onClick={() => handleAutoDraft()}
                className="bg-amber-50/70 border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold"
              >
                Auto-Draft Week
              </Button>
            </div>

            {/* CHANNEL 1: Form Builder UI */}
            {activeTab === 'edit' && (
              <BulletinFormEditor
                form={form}
                setForm={setForm}
                planners={planners}
                weekOptions={weekOptions}
                hymns={hymns}
                onAutoDraft={() => handleAutoDraft()}
                onGenerateCfmAi={handleGenerateCfmAi}
                generatingAi={generatingAi}
                onImportActivities={handleImportActivities}
                onSelectPlanner={(plannerId) => handleSyncSacramentFromPlanner(form.date, plannerId)}
                onSelectWeek={handleSelectWeek}
                onSyncSacramentFromPlanner={() => handleSyncSacramentFromPlanner(form.date, form.planner_id, false)}
              />
            )}

            {/* CHANNEL 2: Interactive Mobile Web View */}
            {activeTab === 'web' && (
              <BulletinWebView
                bulletin={form as Bulletin}
                onShareWhatsApp={() => setActiveTab('whatsapp')}
              />
            )}

            {/* CHANNEL 3: WhatsApp Social Media Graphic Card (1080×1350) */}
            {activeTab === 'whatsapp' && (
              <BulletinWhatsAppCard bulletin={form as Bulletin} />
            )}

            {/* CHANNEL 4: Vector Print / Bi-Fold Booklet Layout Preview */}
            {activeTab === 'print' && (
              <BulletinPrintPreview bulletin={form as Bulletin} />
            )}
          </div>
        </div>
      </div>

      {/* Smart Non-Destructive Progress Safeguard Modal */}
      {syncConfirmOpen && (
        <BulletinSyncConfirmModal
          isOpen={syncConfirmOpen}
          onClose={() => {
            setSyncConfirmOpen(false);
            setPendingSyncData(null);
          }}
          differences={syncDiffs}
          weekLabel={syncWeekLabel}
          onConfirm={handleApplySyncDifferences}
        />
      )}
    </div>
  );
}
