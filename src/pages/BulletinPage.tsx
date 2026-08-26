import React, { useState, useEffect } from 'react';
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
import { bulletinsApi, plannersApi, membersApi, activitiesApi, hymnsApi } from '../services/api';
import { BulletinFormEditor } from '../components/bulletin/BulletinFormEditor';
import { BulletinWebView } from '../components/bulletin/BulletinWebView';
import { BulletinWhatsAppCard } from '../components/bulletin/BulletinWhatsAppCard';
import { BulletinPrintPreview } from '../components/bulletin/BulletinPrintPreview';
import { getBirthdaysForWeek } from '../utils/bulletinBirthdayEngine';
import { harvestWeeklyActivities, getNext5Activities } from '../utils/bulletinActivityHarvester';
import { fetchAndParseCfmUrl, generateCfmFromUrlOffline } from '../utils/bulletinCfmParser';
import type { Bulletin, Planner, Member, Activity, Hymn, BulletinFeedback } from '../types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export function BulletinPage() {
  const { session } = useAuthStore();

  // Primary Data
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hymns, setHymns] = useState<Hymn[]>([]);
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

  const initialDate = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState<Partial<Bulletin>>({
    date: initialDate,
    unit_name: '',
    stake_name: '',
    theme: 'Focus on Jesus Christ and His Atonement',
    presiding: '',
    conducting: '',
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
    cfm_discussion_question: 'How has faith grown like a seed in your family’s life this week?',
    cfm_family_challenge: 'Read Alma 32:28 together as a family and write down one tender mercy of the Lord.',
    cfm_study_tip: 'Ponder on what nourishment your testimony needs right now.',
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
    qr_familysearch: '',
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
    show_upcoming: false,
    show_qr: true,
    color_theme: 'navy',
    pdf_layout: 'standard_1p',
  });

  // Load all initial data from Apps Script backend
  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [bRes, pRes, mRes, aRes, hRes] = await Promise.allSettled([
        bulletinsApi.list(session.token) as Promise<{ ok: boolean; data: Bulletin[] }>,
        plannersApi.list(session.token) as Promise<{ ok: boolean; data: Planner[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
        activitiesApi.list(session.token) as Promise<{ ok: boolean; data: Activity[] }>,
        hymnsApi.list(session.token) as Promise<{ ok: boolean; data: Hymn[] }>,
      ]);

      if (bRes.status === 'fulfilled' && bRes.value.ok) setBulletins(bRes.value.data || []);
      if (pRes.status === 'fulfilled' && pRes.value.ok) setPlanners(pRes.value.data || []);
      if (mRes.status === 'fulfilled' && mRes.value.ok) setMembers(mRes.value.data || []);
      if (aRes.status === 'fulfilled' && aRes.value.ok) setActivities(aRes.value.data || []);
      if (hRes.status === 'fulfilled' && hRes.value.ok) setHymns(hRes.value.data || []);
    } catch {
      toast.error('Failed to load bulletins data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

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
      unit_name: form.unit_name || '',
      stake_name: form.stake_name || '',
      theme: 'Focus on Jesus Christ and His Atonement',
      presiding: '',
      conducting: '',
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
      cfm_discussion_question: 'How has faith grown like a seed in your family’s life this week?',
      cfm_family_challenge: 'Read Alma 32:28 together as a family and write down one tender mercy of the Lord.',
      cfm_study_tip: 'Ponder on what nourishment your testimony needs right now.',
      cleaning_group: 'Elders Quorum & Relief Society Group 1',
      cleaning_date: newDate,
      cleaning_time: '08:00',
      cleaning_instructions: 'Please arrive promptly. Supplies provided at the meetinghouse custodial closet.',
      show_cleaning: true,
      activities: '',
      birthdays: '',
      birthday_message: 'The Bishopric wishes all celebrants this week a very Happy Birthday!',
      missionaries: 'Elder Johnson & Elder Smith (Ghana Accra Mission)\nSister Davis & Sister Okafor (Nigeria Lagos Mission)',
      scripture_of_the_week: '"Learn of me, and listen to my words; walk in the meekness of my Spirit, and you shall have peace in me." — D&C 19:23',
      show_sacrament: true,
      show_activities: true,
      show_birthdays: true,
      show_missionary: true,
      show_temple: false,
      show_self_reliance: false,
      show_focus: true,
      show_welfare: false,
      show_bishopric: true,
      show_upcoming: false,
      show_qr: true,
      color_theme: 'navy',
      pdf_layout: 'standard_1p',
    });
    setActiveTab('edit');
  };

  // Handle selection of a submitted planner
  const handleSelectPlanner = (plannerId: string) => {
    if (!plannerId) return;
    const pl = planners.find((p) => p.planner_id === plannerId);
    if (!pl) return;

    // Auto-fill Ward & Stake names
    const unitName = pl.unit_name || form.unit_name || '';
    
    // Determine default Sunday for this planner if not yet set
    let targetSunday = form.date;
    try {
      // Calculate first Sunday of that planner's month/year
      const firstDay = new Date(pl.year, pl.month - 1, 1);
      const dayOfWeek = firstDay.getDay();
      const firstSundayOffset = (7 - dayOfWeek) % 7;
      const firstSunday = new Date(pl.year, pl.month - 1, 1 + firstSundayOffset);
      targetSunday = format(firstSunday, 'yyyy-MM-dd');
    } catch {}

    setForm((prev) => ({
      ...prev,
      planner_id: plannerId,
      unit_name: unitName,
      date: targetSunday,
    }));

    // Trigger auto-draft with newly selected planner and Sunday
    setTimeout(() => {
      handleAutoDraft(targetSunday, plannerId, unitName);
    }, 100);
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
          // Ensure next_activities_list is valid and not corrupted
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
    const cfmUrl = form.cfm_url || 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/38?lang=eng';

    toast.loading('Extracting Come, Follow Me study guide...', { id: 'cfmai' });

    try {
      // 1. Try server-side URL parser first if backend available and returns real parsed data
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
          res.data.study_theme &&
          res.data.study_theme !== 'Come, Follow Me Lesson'
        ) {
          setForm((prev) => ({
            ...prev,
            cfm_url: res.data!.url || cfmUrl,
            cfm_reading: res.data!.reading_block,
            cfm_theme: res.data!.study_theme,
            cfm_introduction: res.data!.introduction,
            cfm_ideas_for_learning: res.data!.ideas_for_learning,
            cfm_reflection_options: res.data!.reflection_options,
            cfm_reflection: res.data!.selected_reflection || res.data!.reflection_options[0],
            cfm_discussion_question: res.data!.selected_reflection || res.data!.reflection_options[0],
          }));
          toast.success('Study guide extracted from link!', { id: 'cfmai' });
          return;
        }
      } catch {
        // Backend not deployed or failed, continue to client engine
      }

      // 2. Client-side live fetch & complete 52-week curriculum engine
      const parsed = await fetchAndParseCfmUrl(cfmUrl);
      setForm((prev) => ({
        ...prev,
        cfm_url: cfmUrl,
        cfm_reading: parsed.reading_block,
        cfm_theme: parsed.study_theme,
        cfm_introduction: parsed.introduction,
        cfm_ideas_for_learning: parsed.ideas_for_learning,
        cfm_reflection_options: parsed.reflection_options,
        cfm_reflection: parsed.selected_reflection || parsed.reflection_options[0],
        cfm_discussion_question: parsed.selected_reflection || parsed.reflection_options[0],
      }));
      toast.success('Study guide extracted from link!', { id: 'cfmai' });
    } catch {
      const fallback = generateCfmFromUrlOffline(cfmUrl);
      setForm((prev) => ({
        ...prev,
        cfm_url: cfmUrl,
        cfm_reading: fallback.reading_block,
        cfm_theme: fallback.study_theme,
        cfm_introduction: fallback.introduction,
        cfm_ideas_for_learning: fallback.ideas_for_learning,
        cfm_reflection_options: fallback.reflection_options,
        cfm_reflection: fallback.selected_reflection || fallback.reflection_options[0],
        cfm_discussion_question: fallback.selected_reflection || fallback.reflection_options[0],
      }));
      toast.success('Study guide extracted from link!', { id: 'cfmai' });
    } finally {
      setGeneratingAi(false);
    }
  };

  // Import calendar activities
  const handleImportActivities = () => {
    const targetDate = form.date || initialDate;
    const { items: actItems, formattedText } = harvestWeeklyActivities(activities, targetDate);
    setForm((prev) => ({ ...prev, activities: formattedText, activities_list: actItems }));
    toast.success('Weekly activities schedule updated from calendar!');
  };

  // Save Bulletin to Backend Google Apps Script & Google Sheets
  const handleSave = async () => {
    if (!session || !form.date) {
      toast.error('Date is required to save bulletin');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        bulletin_id: selectedBulletinId || form.bulletin_id || undefined,
      };

      const res = (await bulletinsApi.save(session.token, payload)) as {
        ok: boolean;
        data: Bulletin;
        error?: string;
      };

      if (!res.ok) throw new Error(res.error || 'Failed to save');

      toast.success('Bulletin saved successfully!');
      if (res.data) {
        setSelectedBulletinId(res.data.bulletin_id);
        setForm(res.data);
      }
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Delete Bulletin
  const handleDeleteBulletin = async (bulletinId: string) => {
    if (!session) return;
    if (!window.confirm('Are you sure you want to delete this bulletin?')) return;

    try {
      const res = (await bulletinsApi.delete(session.token, bulletinId)) as { ok: boolean };
      if (res.ok) {
        toast.success('Bulletin deleted');
        if (selectedBulletinId === bulletinId) {
          handleCreateNew();
        }
        loadData();
      }
    } catch {
      toast.error('Failed to delete bulletin');
    }
  };

  // Open Congregation Feedback Drawer
  const handleOpenFeedbacks = async () => {
    if (!session) return;
    setFeedbackModalOpen(true);
    setLoadingFeedbacks(true);
    try {
      const res = (await bulletinsApi.listFeedbacks(
        session.token,
        selectedBulletinId || undefined,
        form.date || undefined
      )) as { ok: boolean; data: BulletinFeedback[] };

      if (res.ok) {
        setFeedbacks(res.data || []);
      }
    } catch {
      toast.error('Failed to load congregation feedback');
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  return (
    <div>
      <Header
        title="Bulletin"
        subtitle="Automated weekly ward bulletin publishing engine"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={loadData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Heart className="h-3.5 w-3.5 text-rose-500" />}
              onClick={handleOpenFeedbacks}
            >
              Feedback Requests
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              loading={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
            >
              Save Bulletin
            </Button>
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={handleCreateNew}
            >
              New
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
                  const dateDisplay = b.date
                    ? (() => {
                        try {
                          const d = parseISO(b.date);
                          return isNaN(d.getTime()) ? b.date : format(d, 'MMM d, yyyy');
                        } catch {
                          return b.date;
                        }
                      })()
                    : 'No date';

                  return (
                    <div
                      key={b.bulletin_id}
                      onClick={() => handleSelectBulletin(b)}
                      className={`group relative w-full text-left rounded-2xl border p-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">{dateDisplay}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBulletin(b.bulletin_id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                          title="Delete Bulletin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{b.theme || 'Sacrament Meeting'}</p>
                      {b.unit_name && (
                        <p className="text-[10px] text-slate-400 font-medium mt-1 truncate">{b.unit_name}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── RIGHT MAIN PANEL: The 4 Publishing Channels ───────────────────────── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Top Multi-Channel Publishing Hub Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
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
                  1. Form Builder UI
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
                Auto-Draft Sunday
              </Button>
            </div>

            {/* CHANNEL 1: Form Builder UI */}
            {activeTab === 'edit' && (
              <BulletinFormEditor
                form={form}
                setForm={setForm}
                planners={planners}
                hymns={hymns}
                onAutoDraft={() => handleAutoDraft()}
                onGenerateCfmAi={handleGenerateCfmAi}
                generatingAi={generatingAi}
                onImportActivities={handleImportActivities}
                onSelectPlanner={handleSelectPlanner}
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

      {/* ─── LIVE CONGREGATION FEEDBACK MODAL ────────────────────────────────────── */}
      <Modal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Live Congregation Bulletin Feedback"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Prayer requests, sickness notifications, and bishopric interview requests submitted by members through the mobile web bulletin.
          </p>

          {loadingFeedbacks ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading requests…</div>
          ) : feedbacks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No feedback requests received yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {feedbacks.map((f) => (
                <div
                  key={f.feedback_id}
                  className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{f.member_name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {f.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">{f.message}</p>
                  {(f.phone || f.email) && (
                    <p className="text-[11px] text-slate-500">
                      Contact: {f.phone} {f.email && `• ${f.email}`}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 pt-0.5">
                    {f.created_date ? format(new Date(f.created_date), 'MMM d, yyyy @ h:mm a') : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button size="sm" variant="outline" onClick={() => setFeedbackModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
