import React, { useState } from 'react';
import {
  Sparkles, Calendar, Music, MessageSquare,
  Users, CheckSquare, Bookmark, Layers, Send, Link, Globe,
  ArrowUp, ArrowDown, Trash2, Plus, Clock, MapPin, Repeat, ShieldAlert, Heart, ExternalLink, Mail, Smartphone,
  AlertTriangle
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { BULLETIN_THEMES } from '../../utils/bulletinThemes';
import { buildWhatsAppBirthdayGreetingUrl, parseCelebrantsFromText, formatCelebrantDisplayName } from '../../utils/bulletinBirthdayEngine';
import { BirthdayWishModal, type BirthdayChannel } from './BirthdayWishModal';
import { formatActivitiesToText } from '../../utils/bulletinActivityHarvester';
import { isSectionVisible } from '../../utils/bulletinPrintEngine';
import { resolveHymnLink, formatHymnDisplay } from '../../data/bundledHymns';
import { formatHonorificName } from '../../utils/memberTitle';
import { BULLETIN_FORMATTING_HINT } from '../../utils/bulletinFormatter';
import type { Bulletin, Planner, Hymn, WeeklyActivityItem, NextActivityItem, BulletinClassLesson, BulletinCustomLink, BulletinCelebrant } from '../../types';
import toast from 'react-hot-toast';

export interface BulletinWeekOption {
  value: string;
  label: string;
  mondayDate: string;
  sundayDate: string;
  plannerId?: string;
  unitName?: string;
}

interface BulletinFormEditorProps {
  form: Partial<Bulletin>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Bulletin>>>;
  planners: Planner[];
  hymns: Hymn[];
  weekOptions?: BulletinWeekOption[];
  onAutoDraft: () => void;
  onGenerateCfmAi: () => void;
  generatingAi: boolean;
  onImportActivities: () => void;
  onSelectPlanner: (plannerId: string) => void;
  onSelectWeek: (sundayDate: string) => void;
  onSyncSacramentFromPlanner?: () => void;
  onSaveDraft?: () => void;
  onSaveUpdate?: () => void;
  onPublish?: () => void;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
  lastSavedTime?: Date | null;
}

function ToggleItem({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
        checked
          ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
          : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
      }`}
    >
      <div className="pr-2">
        <p className="text-xs font-bold text-slate-800">{label}</p>
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </div>
      <div
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}

export function BulletinFormEditor({
  form: f,
  setForm,
  planners,
  weekOptions = [],
  onAutoDraft,
  onGenerateCfmAi,
  generatingAi,
  onImportActivities,
  onSelectPlanner,
  onSelectWeek,
  onSyncSacramentFromPlanner,
  onSaveDraft,
  onSaveUpdate,
  onPublish,
  saving = false,
  hasUnsavedChanges = false,
  lastSavedTime = null,
}: BulletinFormEditorProps) {
  const [activeSubSection, setActiveSubSection] = useState<'core' | 'sacrament' | 'cfm' | 'community' | 'initiatives' | 'toggles'>('core');

  // Birthday Wishes Modal state
  const [selectedCelebrant, setSelectedCelebrant] = useState<BulletinCelebrant | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<BirthdayChannel>('WHATSAPP');
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);

  const themeKeys = Object.keys(BULLETIN_THEMES).filter((k) =>
    ['navy', 'forest', 'plum', 'slate', 'teal'].includes(k)
  );

  // Activities list handlers
  const activitiesList: WeeklyActivityItem[] = f.activities_list || [];
  const next5List: NextActivityItem[] = f.next_activities_list || [];

  const handleUpdateActivity = (
    index: number,
    updates: Partial<WeeklyActivityItem> | keyof WeeklyActivityItem,
    value?: any
  ) => {
    setForm((prev) => {
      const currentList = [...(prev.activities_list || [])];
      if (!currentList[index]) return prev;
      if (typeof updates === 'string') {
        currentList[index] = { ...currentList[index], [updates]: value };
      } else {
        currentList[index] = { ...currentList[index], ...updates };
      }
      const text = formatActivitiesToText(currentList);
      return { ...prev, activities_list: currentList, activities: text };
    });
  };

  const handleMoveActivity = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === activitiesList.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...activitiesList];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    const text = formatActivitiesToText(updated);
    setForm((prev) => ({ ...prev, activities_list: updated, activities: text }));
  };

  const handleDeleteActivity = (index: number) => {
    const updated = activitiesList.filter((_, i) => i !== index);
    const text = formatActivitiesToText(updated);
    setForm((prev) => ({ ...prev, activities_list: updated, activities: text }));
  };

  const handleAddCustomActivity = () => {
    const newItem: WeeklyActivityItem = {
      id: `custom_${Date.now()}`,
      day: 'Wednesday',
      activity: '',
      time: '6:00 PM',
      scope: 'Ward',
      reoccurring: false,
    };
    const updated = [...activitiesList, newItem];
    const text = formatActivitiesToText(updated);
    setForm((prev) => ({ ...prev, activities_list: updated, activities: text }));
  };

  // Next 5 Activities handlers
  const handleAddNextActivity = () => {
    const newItem: NextActivityItem = {
      id: `next_${Date.now()}`,
      date: '',
      dayName: '',
      activity: '',
      time: '',
      scope: 'Ward',
    };
    const updated = [...next5List, newItem];
    setForm((prev) => ({ ...prev, next_activities_list: updated }));
  };

  const handleUpdateNextActivity = (index: number, field: keyof NextActivityItem, value: any) => {
    const updated = [...next5List];
    updated[index] = { ...updated[index], [field]: value };
    setForm((prev) => ({ ...prev, next_activities_list: updated }));
  };

  const handleDeleteNextActivity = (index: number) => {
    const updated = next5List.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, next_activities_list: updated }));
  };

  // Class Lessons Handlers
  const classLessonsList = f.class_lessons || [];
  const handleAddClassLesson = () => {
    const newItem: BulletinClassLesson = {
      id: `cl_${Date.now()}`,
      className: 'Elders Quorum',
      topic: '',
      reference: '',
      link: 'https://www.churchofjesuschrist.org/study/general-conference',
    };
    setForm((prev) => ({
      ...prev,
      include_class_lessons: true,
      class_lessons: [...(prev.class_lessons || []), newItem],
    }));
  };

  const handleUpdateClassLesson = (index: number, field: keyof BulletinClassLesson, value: string) => {
    const updated = [...classLessonsList];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
    }
    setForm((prev) => ({ ...prev, class_lessons: updated }));
  };

  const handleDeleteClassLesson = (index: number) => {
    const updated = classLessonsList.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, class_lessons: updated }));
  };

  // Custom Links / QR Codes Handlers
  const customLinksList = f.custom_links || [];
  const handleAddCustomLink = () => {
    const newItem: BulletinCustomLink = {
      id: `lnk_${Date.now()}`,
      label: '',
      url: 'https://',
    };
    setForm((prev) => ({
      ...prev,
      custom_links: [...(prev.custom_links || []), newItem],
    }));
  };

  const handleUpdateCustomLink = (index: number, field: keyof BulletinCustomLink, value: string) => {
    const updated = [...customLinksList];
    if (updated[index]) {
      updated[index] = { ...updated[index], [field]: value };
    }
    setForm((prev) => ({ ...prev, custom_links: updated }));
  };

  const handleDeleteCustomLink = (index: number) => {
    const updated = customLinksList.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, custom_links: updated }));
  };

  return (
    <div className="space-y-5">
      {/* ─── PRIMARY BULLETIN WORKFLOW ACTION BAR ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border">
            {f.status === 'PUBLISHED' ? (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                PUBLISHED (Live for Members)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                DRAFT (Work in Progress)
              </span>
            )}
          </div>

          {hasUnsavedChanges ? (
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse">
              Unsaved edits
            </span>
          ) : lastSavedTime ? (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Saved {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1. "Save as Draft" Button */}
          <Button
            size="sm"
            variant="outline"
            icon={<Bookmark className="w-3.5 h-3.5 text-amber-700" />}
            onClick={onSaveDraft}
            loading={saving}
            className="bg-amber-50/70 hover:bg-amber-100 border-amber-300 text-amber-950 font-bold text-xs shadow-xs"
          >
            Save as Draft
          </Button>

          {/* 2. "Save Update" Button */}
          <Button
            size="sm"
            variant="outline"
            icon={<CheckSquare className="w-3.5 h-3.5 text-blue-700" />}
            onClick={onSaveUpdate}
            loading={saving}
            className="bg-blue-50/70 hover:bg-blue-100 border-blue-300 text-blue-950 font-bold text-xs shadow-xs"
          >
            Save Update
          </Button>

          {/* 3. "Publish" / "Republish" Button */}
          <Button
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={onPublish}
            loading={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
          >
            {f.status === 'PUBLISHED' ? 'Republish Live' : 'Publish'}
          </Button>

          {/* Public Landing Page Link */}
          <a
            href="/visitbulletin"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs"
            title="Open Member Landing Page"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>Visit Bulletin</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Sub-Section Quick Navigator Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
        {[
          { id: 'core', label: '1. Basic Info & Theme', icon: <Bookmark className="w-3.5 h-3.5" /> },
          { id: 'sacrament', label: '2. Sacrament and Classes Programes', icon: <Music className="w-3.5 h-3.5" /> },
          { id: 'cfm', label: '3. Come Follow Me (AI)', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
          { id: 'community', label: '4. Birthdays & Schedule', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'initiatives', label: '5. Ward Initiatives & Notices', icon: <Heart className="w-3.5 h-3.5 text-rose-500" /> },
          { id: 'toggles', label: '6. Section Visibility', icon: <Layers className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubSection(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSubSection === tab.id
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── SECTION 1: Basic Info & Theme ────────────────────────────────────────── */}
      {activeSubSection === 'core' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Select Bulletin Week (Monday – Sunday)</h3>
                  <p className="text-xs text-slate-500">
                    Choose the target week. Sacrament agenda, birthdays, and calendar activities automatically align.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Sparkles className="h-3.5 w-3.5 text-amber-600" />}
                  onClick={onAutoDraft}
                  className="bg-amber-50/50 border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold"
                >
                  Auto-Draft for Week
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Week Selector Dropdown */}
                <Select
                  label="Select Bulletin Week (Monday – Sunday)"
                  options={weekOptions.length > 0 ? weekOptions : [{ value: f.date || '', label: `${f.date || 'Current'} Bulletin Week` }]}
                  value={f.date || ''}
                  onChange={(e) => {
                    onSelectWeek(e.target.value);
                  }}
                  className="sm:col-span-2"
                />

                <Input
                  label="Sunday Date (Target Review Sunday)"
                  type="date"
                  required
                  value={f.date || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                />

                <Input
                  label="Ward / Branch Name (Auto-filled from Settings)"
                  placeholder="e.g. Obantoko Ward"
                  value={f.unit_name || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, unit_name: e.target.value }))}
                />

                <Input
                  label="Stake / District Name (Auto-filled from Settings)"
                  placeholder="e.g. Abeokuta Nigeria Stake"
                  value={f.stake_name || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, stake_name: e.target.value }))}
                />

                <Input
                  label="Meeting Theme / Title"
                  placeholder="e.g. Focus on Jesus Christ and His Atonement"
                  value={f.theme || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))}
                />
              </div>

              {/* 5 Curated Design System Themes */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  5 Curated Design System Themes (Applies to Screen & PDF)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {themeKeys.map((key) => {
                    const theme = BULLETIN_THEMES[key];
                    const isSelected = (f.color_theme || 'navy').toLowerCase() === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, color_theme: key }))}
                        className={`flex flex-col items-center p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-full h-7 rounded-lg mb-1.5 shadow-xs bg-gradient-to-r ${theme.previewGradient}`}
                        />
                        <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                          {theme.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── SECTION 2: Sacrament and Classes Programes (Streamlined) ─────────────── */}
      {activeSubSection === 'sacrament' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. Sacrament and Classes Programes</h3>
                  <p className="text-xs text-slate-500">
                    Sacrament order of service & Sunday classes preparation.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSyncSacramentFromPlanner || onAutoDraft}
                  icon={<Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                  className="text-xs"
                >
                  Sync from Planner
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              {f.is_canceled ? (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>There will be no Sacrament Meeting because {f.cancel_reason || 'stated reasons in the planner.'}</span>
                  </div>
                  <p className="text-xs text-rose-700">
                    Sacrament order of service is omitted for this week. Sunday class lessons and weekly activities are retained below.
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {f.meeting_type === 'FAST_SUNDAY' && (
                    <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <span className="font-semibold">Fast & Testimony Meeting:</span> Talks replaced with open congregation testimonies following the Sacrament hymn and administration.
                    </div>
                  )}

                  <Input
                    label="Opening Hymn"
                    placeholder="e.g. 2 — The Spirit of God"
                    value={f.opening_hymn || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, opening_hymn: e.target.value }))}
                    onBlur={(e) => setForm((prev) => ({ ...prev, opening_hymn: formatHymnDisplay(e.target.value) }))}
                  />
                  <Input
                    label="Invocation (Opening Prayer)"
                    placeholder="e.g. Sister Jane Smith"
                    value={f.opening_prayer || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, opening_prayer: e.target.value }))}
                    onBlur={(e) => setForm((prev) => ({ ...prev, opening_prayer: formatHonorificName(e.target.value) }))}
                  />
                  <Input
                    label="Sacrament Hymn"
                    placeholder="e.g. 169 — As Now We Take the Sacrament"
                    value={f.sacrament_hymn || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, sacrament_hymn: e.target.value }))}
                    onBlur={(e) => setForm((prev) => ({ ...prev, sacrament_hymn: formatHymnDisplay(e.target.value) }))}
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label={f.meeting_type === 'FAST_SUNDAY' ? 'Testimonies Note' : 'Talks / Speakers Roster (Names with Titles, e.g. Brother / Sister)'}
                      rows={3}
                      placeholder={`Brother Emmanuel Olajide\nSister Grace Adams`}
                      value={
                        typeof f.speakers === 'string'
                          ? f.speakers
                          : Array.isArray(f.speakers)
                          ? (f.speakers as any[]).map((s) => s.name || s.speaker_name || '').filter(Boolean).join('\n')
                          : ''
                      }
                      onChange={(e) => setForm((prev) => ({ ...prev, speakers: e.target.value }))}
                      onBlur={(e) => {
                        if (f.meeting_type === 'FAST_SUNDAY') return;
                        const formatted = e.target.value
                          .split('\n')
                          .map((line) => {
                            const namePart = line.split(/[—–-]/)[0]?.trim();
                            return namePart ? formatHonorificName(namePart) : '';
                          })
                          .filter(Boolean)
                          .join('\n');
                        if (formatted) {
                          setForm((prev) => ({ ...prev, speakers: formatted }));
                        }
                      }}
                    />
                  </div>
                  <Input
                    label="Closing Hymn"
                    placeholder="e.g. 152 — God Be with You Till We Meet Again"
                    value={f.closing_hymn || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, closing_hymn: e.target.value }))}
                    onBlur={(e) => setForm((prev) => ({ ...prev, closing_hymn: formatHymnDisplay(e.target.value) }))}
                  />
                  <Input
                    label="Benediction (Closing Prayer)"
                    placeholder="e.g. Brother Michael Adebayo"
                    value={f.closing_prayer || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, closing_prayer: e.target.value }))}
                    onBlur={(e) => setForm((prev) => ({ ...prev, closing_prayer: formatHonorificName(e.target.value) }))}
                  />
                </div>
              )}

              {/* ─── Sunday Class Lessons Section ───────────────────────────── */}
              <div className="pt-4 border-t border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!f.include_class_lessons}
                        onChange={(e) => setForm((prev) => ({ ...prev, include_class_lessons: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <div>
                      <span className="text-xs font-bold text-slate-800">Include Class Lessons</span>
                      <p className="text-[11px] text-slate-500">Provide topics, references, and hyperlinks for Sunday classes preparation</p>
                    </div>
                  </div>

                  {f.include_class_lessons && (
                    <Button
                      size="sm"
                      onClick={handleAddClassLesson}
                      icon={<Plus className="w-3.5 h-3.5" />}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                    >
                      Add Class
                    </Button>
                  )}
                </div>

                {f.include_class_lessons && (
                  <div className="space-y-2.5 pt-2">
                    {classLessonsList.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50">
                        No Sunday class lessons added. Click "Add Class" to specify lessons for Elders Quorum, Relief Society, Youth, Primary, etc.
                      </div>
                    ) : (
                      classLessonsList.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs shadow-2xs"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Select Class</label>
                              <select
                                value={item.className}
                                onChange={(e) => handleUpdateClassLesson(idx, 'className', e.target.value)}
                                className="w-full text-xs font-bold rounded-lg border border-slate-300 p-2 bg-white"
                              >
                                {['Elders Quorum', 'Relief Society', 'Youth', 'Aaronic Priesthood', 'Young Women', 'Primary', 'Gospel Foundation'].map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Lesson Topic</label>
                              <input
                                type="text"
                                placeholder="e.g. Following the Living Prophet"
                                value={item.topic}
                                onChange={(e) => handleUpdateClassLesson(idx, 'topic', e.target.value)}
                                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white font-medium"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Reference / Scripture / Manual</label>
                              <input
                                type="text"
                                placeholder="e.g. General Conference Oct 2025 / For the Strength of Youth"
                                value={item.reference}
                                onChange={(e) => handleUpdateClassLesson(idx, 'reference', e.target.value)}
                                className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Lesson Hyperlink (URL)</label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="url"
                                  placeholder="https://www.churchofjesuschrist.org/study/..."
                                  value={item.link}
                                  onChange={(e) => handleUpdateClassLesson(idx, 'link', e.target.value)}
                                  className="flex-grow text-xs rounded-lg border border-slate-300 p-2 bg-white"
                                />
                                {item.link && (
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 text-blue-600 hover:text-blue-800 bg-white border border-slate-200 rounded-lg shadow-2xs"
                                    title="Test Lesson Link"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClassLesson(idx)}
                                  className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 rounded-lg shadow-2xs"
                                  title="Delete Class"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── SECTION 3: Come Follow Me (URL-Driven AI Study Guide) ──────────────── */}
      {activeSubSection === 'cfm' && (
        <div className="space-y-5">
          {/* Top URL Input Card */}
          <Card className="border-amber-300/80 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 shadow-xs">
            <CardHeader className="border-amber-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Come, Follow Me Study Link Extractor</h3>
                  <p className="text-xs text-slate-500">
                    Paste the Gospel Library / Church lesson link to automatically generate the reading block, study theme, introduction, learning ideas, and reflection questions.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-grow">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026/35?lang=eng"
                    value={f.cfm_url || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, cfm_url: e.target.value }))}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-white"
                  />
                </div>
                <Button
                  onClick={onGenerateCfmAi}
                  loading={generatingAi}
                  icon={<Sparkles className="h-3.5 w-3.5 text-amber-600" />}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs whitespace-nowrap"
                >
                  Extract & Generate Study Guide
                </Button>
              </div>

              {f.cfm_url && (
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500 font-medium">Link to this week's study:</span>
                  <a
                    href={f.cfm_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-semibold underline truncate max-w-md"
                  >
                    <Link className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{f.cfm_url}</span>
                  </a>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Generated Fields Card */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Generated Lesson Overview & Study Guide</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Weekly Reading Block"
                  placeholder="e.g. Psalms 49–51; 61–66; 69–72; 77–78; 85–86"
                  value={f.cfm_reading || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, cfm_reading: e.target.value }))}
                />
                <Input
                  label="Weekly Study Theme"
                  placeholder="e.g. 'I Will Declare What He Hath Done for My Soul'"
                  value={f.cfm_theme || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, cfm_theme: e.target.value }))}
                />
                <Textarea
                  label="Introduction"
                  rows={3}
                  placeholder="Summary of the reading block…"
                  value={f.cfm_introduction || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, cfm_introduction: e.target.value }))}
                  className="sm:col-span-2"
                />
                <div className="sm:col-span-2 space-y-1">
                  <Textarea
                    label="Ideas for Learning"
                    rows={4}
                    placeholder="Numbered ideas for scripture study and discussion…"
                    value={f.cfm_ideas_for_learning || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, cfm_ideas_for_learning: e.target.value }))}
                  />
                  <p className="text-[10.5px] text-slate-400 italic">{BULLETIN_FORMATTING_HINT}</p>
                </div>

                {/* 3 Interactive Recommended Reflection Prompts */}
                <div className="sm:col-span-2 space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-900">
                        Reflection Prompts (Click to Select)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Select a recommended question or write a custom reflection prompt
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                      Select Suitable Prompt
                    </span>
                  </div>

                  <div className="grid gap-2">
                    {(f.cfm_reflection_options && f.cfm_reflection_options.length > 0
                      ? f.cfm_reflection_options
                      : [
                          'How has crying unto the Lord in humility helped you find peace and forgiveness through the Savior’s mercy? (Psalm 51)',
                          'In what ways has remembering the works of the Lord in your past strengthened your trust in Him during present trials? (Psalm 77:11)',
                          'What has the Savior done for your soul that you feel inspired to declare and share with others? (Psalm 66:16)',
                        ]
                    ).map((question, idx) => {
                      const isSelected = (f.cfm_reflection || f.cfm_discussion_question || '').includes(question);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              cfm_reflection: question,
                              cfm_discussion_question: question,
                            }));
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/20'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="flex-grow">
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">{question}</p>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 flex-shrink-0">
                              Selected
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Textarea
                    label="Active Reflection Callout for Bulletin"
                    rows={2}
                    placeholder="Selected reflection question will appear here for editing…"
                    value={f.cfm_reflection || f.cfm_discussion_question || ''}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      cfm_reflection: e.target.value,
                      cfm_discussion_question: e.target.value,
                    }))}
                  />
                </div>

                <Textarea
                  label="Scripture of the Week"
                  rows={2}
                  placeholder="Short spiritual focus scripture…"
                  value={f.scripture_of_the_week || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, scripture_of_the_week: e.target.value }))}
                  className="sm:col-span-2"
                />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── SECTION 4: Birthdays & Activities Schedule ─────────────────────────── */}
      {activeSubSection === 'community' && (
        <div className="space-y-5">
          {/* Birthday Celebrants Frame Card with WhatsApp Wishes */}
          <Card className="border-amber-300/80 bg-gradient-to-br from-amber-50/60 via-yellow-50/40 to-amber-50/20 shadow-xs">
            <CardHeader className="border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                    🎂 Birthday Celebrants Frame
                  </h3>
                  <p className="text-xs text-amber-800">
                    Auto-harvested for the Monday–Sunday week. Includes WhatsApp greeting links and special celebration styling.
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                  Celebration Pack
                </span>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <Textarea
                label="Weekly Celebrants"
                rows={2}
                placeholder="Sister Mary Johnson (Aug 25)   Brother Samuel Ade (Aug 28)"
                value={f.birthdays || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, birthdays: e.target.value }))}
              />
              <Input
                label="Birthday Message from the Bishopric"
                placeholder="The Bishopric wishes all celebrants this week peace, joy, and the blessings of the Lord!"
                value={f.birthday_message || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, birthday_message: e.target.value }))}
              />

              {/* Direct Multi-Channel Celebrant Hyperlinks */}
              {(() => {
                const celebrantsList: BulletinCelebrant[] = (f.birthday_celebrants_list && f.birthday_celebrants_list.length > 0)
                  ? f.birthday_celebrants_list
                  : parseCelebrantsFromText(f.birthdays, undefined, f.date);

                if (celebrantsList.length === 0) return null;

                return (
                  <div className="pt-2 border-t border-amber-200/70 space-y-1.5">
                    <p className="text-[11px] font-semibold text-amber-900">
                      Click a celebrant to send a birthday wish (WhatsApp, Email & SMS):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {celebrantsList.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedCelebrant(c);
                            setSelectedChannel('WHATSAPP');
                            setBirthdayModalOpen(true);
                          }}
                          title={`Click to send WhatsApp, Email or SMS wish to ${c.name}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-xs font-bold text-amber-950 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer group"
                        >
                          <span>🎂</span>
                          <span className="group-hover:underline underline-offset-2">
                            {formatCelebrantDisplayName(c, f.date)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-semibold ml-1">
                            💬 Wish
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardBody>
          </Card>

          {/* Weekly Activities Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Weekly Activities Schedule (Mon–Sun)</h3>
                  <p className="text-xs text-slate-500">
                    Structured schedule for this week. Add, remove, or reorder activities.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onImportActivities}
                    className="text-xs"
                  >
                    Refresh from Calendar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddCustomActivity}
                    icon={<Plus className="w-3.5 h-3.5" />}
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                  >
                    Add Activity
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {activitiesList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50">
                  No activities listed for this week. Click "Add Activity" or "Refresh from Calendar".
                </div>
              ) : (
                <div className="space-y-2">
                  {activitiesList.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs shadow-2xs"
                    >
                      <div className="w-28 flex-shrink-0">
                        <select
                          value={item.day}
                          onChange={(e) => handleUpdateActivity(idx, 'day', e.target.value)}
                          className="w-full text-xs font-bold rounded-lg border border-slate-300 p-1.5 bg-slate-50"
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Activity name (e.g. Institute / Seminary)"
                        value={item.activity}
                        onChange={(e) => handleUpdateActivity(idx, 'activity', e.target.value)}
                        className="flex-grow text-xs rounded-lg border border-slate-300 p-1.5"
                      />
                      <input
                        type="text"
                        placeholder="Time (e.g. 6:00 PM)"
                        value={item.time}
                        onChange={(e) => handleUpdateActivity(idx, 'time', e.target.value)}
                        className="w-24 flex-shrink-0 text-xs rounded-lg border border-slate-300 p-1.5"
                      />
                      <select
                        value={item.scope || 'Ward'}
                        onChange={(e) => handleUpdateActivity(idx, 'scope', e.target.value)}
                        className="w-20 flex-shrink-0 text-xs rounded-lg border border-slate-300 p-1.5 font-semibold"
                      >
                        <option value="Ward">Ward</option>
                        <option value="Stake">Stake</option>
                      </select>
                      <label className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer text-[11px] font-semibold text-slate-700 select-none bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={!!(item.reoccurring || item.is_recurring)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            handleUpdateActivity(idx, { reoccurring: isChecked, is_recurring: isChecked });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Recurring</span>
                      </label>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveActivity(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveActivity(idx, 'down')}
                          disabled={idx === activitiesList.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteActivity(idx)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Next 5 Activities Outlook Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Next 5 Activities (Calendar Outlook)</h3>
                  <p className="text-xs text-slate-500">Upcoming events following this week</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddNextActivity}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  Add Upcoming Event
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-2">
              {next5List.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50">
                  No upcoming activities defined.
                </div>
              ) : (
                next5List.map((act, idx) => (
                  <div key={act.id || idx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2 text-xs shadow-2xs">
                    <input
                      type="text"
                      placeholder="Date (e.g. 15 Sep)"
                      value={act.date}
                      onChange={(e) => handleUpdateNextActivity(idx, 'date', e.target.value)}
                      className="w-28 text-xs rounded-lg border border-slate-300 p-1.5 font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Activity description"
                      value={act.activity}
                      onChange={(e) => handleUpdateNextActivity(idx, 'activity', e.target.value)}
                      className="flex-grow text-xs rounded-lg border border-slate-300 p-1.5"
                    />
                    <select
                      value={act.scope || 'Ward'}
                      onChange={(e) => handleUpdateNextActivity(idx, 'scope', e.target.value)}
                      className="w-20 text-xs rounded-lg border border-slate-300 p-1.5 font-semibold"
                    >
                      <option value="Ward">Ward</option>
                      <option value="Stake">Stake</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteNextActivity(idx)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Cleaning Roster & Missionaries */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-900">Building Cleaning Assignment</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Input
                  label="Assigned Group / Organisation"
                  placeholder="e.g. Elders Quorum & Relief Society Group 1"
                  value={f.cleaning_group || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, cleaning_group: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Date (Saturday)"
                    type="date"
                    value={f.cleaning_date || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, cleaning_date: e.target.value }))}
                  />
                  <Input
                    label="Time (Default: 4:00 PM)"
                    type="time"
                    value={f.cleaning_time || '16:00'}
                    onChange={(e) => setForm((prev) => ({ ...prev, cleaning_time: e.target.value }))}
                  />
                </div>
                <Input
                  label="Instructions"
                  placeholder="e.g. Please bring cleaning cloths and arrive on time."
                  value={f.cleaning_instructions || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, cleaning_instructions: e.target.value }))}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-900">Full-Time Missionaries</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Textarea
                  label="Missionaries Serving in Ward"
                  rows={4}
                  placeholder="Elder Johnson & Elder Smith (Ghana Accra Mission) — +234 800 000 0000"
                  value={f.missionaries || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, missionaries: e.target.value }))}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ─── SECTION 5: Ward Initiatives & Notices ──────────────────────────────── */}
      {activeSubSection === 'initiatives' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Temple & FamilySearch</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Next Temple Trip Date"
                  type="date"
                  value={f.temple_trip_date || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, temple_trip_date: e.target.value }))}
                />
                <Input
                  label="FamilySearch Indexing / Ordinance Tip"
                  placeholder="e.g. Reserve 1 ancestor name this month for baptisms."
                  value={f.familysearch_tip || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, familysearch_tip: e.target.value }))}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Self-Reliance & Welfare Notices</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="space-y-1">
                <Textarea
                  label="Self-Reliance Courses / Skills Training"
                  rows={2}
                  placeholder="Personal Finances Class: Wednesdays @ 4:00 PM"
                  value={f.self_reliance_classes || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, self_reliance_classes: e.target.value }))}
                />
                <p className="text-[10.5px] text-slate-400 italic">{BULLETIN_FORMATTING_HINT}</p>
              </div>
              <div className="space-y-1">
                <Textarea
                  label="Welfare & Fast Offering Reminders"
                  rows={2}
                  placeholder="Fast Offering assistance can be given directly via the clerk or bishopric."
                  value={f.welfare_reminders || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, welfare_reminders: e.target.value }))}
                />
                <p className="text-[10.5px] text-slate-400 italic">{BULLETIN_FORMATTING_HINT}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900">Bishopric Message, Announcements & Digital Links</h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="space-y-1">
                <Textarea
                  label="Message from the Bishopric"
                  rows={3}
                  placeholder="Welcome to our Sacrament Service. May the Spirit of the Lord fill your heart as we partake of the Sacrament…"
                  value={f.bishopric_message || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, bishopric_message: e.target.value }))}
                />
                <p className="text-[10.5px] text-slate-400 italic">{BULLETIN_FORMATTING_HINT}</p>
              </div>
              <div className="space-y-1">
                <Textarea
                  label="Ward Announcements"
                  rows={3}
                  placeholder={`- Stake Conference next Sunday\n- Ward cleaning on Saturday\n*Fast Sunday* on the first Sunday of next month`}
                  value={f.announcements || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, announcements: e.target.value }))}
                />
                <p className="text-[10.5px] text-slate-400 italic">{BULLETIN_FORMATTING_HINT}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="FamilySearch Link (For QR Code)"
                  placeholder="https://www.familysearch.org"
                  value={f.qr_familysearch || 'https://www.familysearch.org'}
                  onChange={(e) => setForm((prev) => ({ ...prev, qr_familysearch: e.target.value }))}
                />
                <Input
                  label="Gospel Library Link (For QR Code)"
                  placeholder="https://www.churchofjesuschrist.org/study/gospel-library"
                  value={f.qr_gospel_library || 'https://www.churchofjesuschrist.org/study/gospel-library'}
                  onChange={(e) => setForm((prev) => ({ ...prev, qr_gospel_library: e.target.value }))}
                />
              </div>

              {/* Sacred Music Audio Streams */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1 mt-2">
                <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-blue-700" />
                  Sacred Music Church Hymn Links
                </p>
                <p className="text-[11px] text-blue-800">
                  Direct official ChurchofJesusChrist.org links with sheet music and audio:
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  {f.opening_hymn && (
                    <a
                      href={resolveHymnLink(f.opening_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 shadow-2xs"
                    >
                      <span>Opening: {f.opening_hymn}</span>
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                    </a>
                  )}
                  {f.sacrament_hymn && (
                    <a
                      href={resolveHymnLink(f.sacrament_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 shadow-2xs"
                    >
                      <span>Sacrament: {f.sacrament_hymn}</span>
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                    </a>
                  )}
                  {f.closing_hymn && (
                    <a
                      href={resolveHymnLink(f.closing_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold hover:bg-blue-100 shadow-2xs"
                    >
                      <span>Closing: {f.closing_hymn}</span>
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                    </a>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Dedicated Custom Digital Links & QR Codes Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Custom Digital Links & QR Codes</h3>
                  <p className="text-xs text-slate-500">
                    Add custom resource links (e.g. Ward Directory, Youth Camp, Choir, Activities). QR codes are generated automatically.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddCustomLink}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Add Link & QR
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {customLinksList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50">
                  No custom links added yet. Click "Add Link & QR" to add extra resources.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {customLinksList.map((lnk, idx) => {
                    const qrUrl = lnk.url && lnk.url.startsWith('http')
                      ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(lnk.url)}&size=120x120&margin=1`
                      : '';
                    return (
                      <div key={lnk.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 flex gap-3 text-xs shadow-2xs">
                        {qrUrl ? (
                          <img src={qrUrl} alt="QR" className="w-16 h-16 rounded border border-slate-200 bg-white flex-shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded border border-dashed border-slate-300 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
                            QR Code
                          </div>
                        )}
                        <div className="flex-grow space-y-2">
                          <input
                            type="text"
                            placeholder="Resource Label (e.g. Ward Directory)"
                            value={lnk.label}
                            onChange={(e) => handleUpdateCustomLink(idx, 'label', e.target.value)}
                            className="w-full text-xs font-bold rounded-lg border border-slate-300 p-1.5"
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="url"
                              placeholder="https://..."
                              value={lnk.url}
                              onChange={(e) => handleUpdateCustomLink(idx, 'url', e.target.value)}
                              className="w-full text-xs rounded-lg border border-slate-300 p-1.5"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomLink(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                              title="Delete Link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── SECTION 6: 12 Granular Section Visibility Switches ───────────────────── */}
      {activeSubSection === 'toggles' && (
        <Card>
          <CardHeader>
            <div>
              <h3 className="text-sm font-bold text-slate-900">12 Granular Section Visibility Switches</h3>
              <p className="text-xs text-slate-500">Toggle individual sections on or off to customize your bulletin layout</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <ToggleItem
                checked={isSectionVisible(f.show_sacrament)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_sacrament: v }))}
                label="1. Sacrament Outline"
                description="Opening hymn, invocation, sacrament, talks, closing"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_birthdays)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_birthdays: v }))}
                label="2. Birthday Frame"
                description="Weekly celebrants list"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_activities)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_activities: v }))}
                label="3. Activities Schedule"
                description="Mon–Sun weekly roster"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_cleaning)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_cleaning: v }))}
                label="4. Cleaning Roster"
                description="Group & Saturday time"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_focus)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_focus: v }))}
                label="5. CFM & Scripture"
                description="Lesson guide & theme"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_bishopric)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_bishopric: v }))}
                label="6. Bishopric Message"
                description="Bishopric weekly thought"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_missionary)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_missionary: v }))}
                label="7. Missionary Corner"
                description="Full-time missionaries"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_temple)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_temple: v }))}
                label="8. Temple & FamilySearch"
                description="Excursions & index tips"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_self_reliance)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_self_reliance: v }))}
                label="9. Self-Reliance"
                description="Classes & skills goals"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_welfare)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_welfare: v }))}
                label="10. Welfare Notices"
                description="Fast offering reminders"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_upcoming)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_upcoming: v }))}
                label="11. Upcoming 30-Day"
                description="Next 5 upcoming events"
              />
              <ToggleItem
                checked={isSectionVisible(f.show_qr)}
                onChange={(v) => setForm((prev) => ({ ...prev, show_qr: v }))}
                label="12. Dynamic QR Codes"
                description="WhatsApp & Gospel Library"
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* ─── BOTTOM STICKY WORKFLOW ACTION BAR ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800 sticky bottom-4 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">Bulletin Actions:</span>
          {f.status === 'PUBLISHED' ? (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
              🟢 PUBLISHED
            </span>
          ) : (
            <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
              🟡 DRAFT
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Bookmark className="w-3.5 h-3.5 text-amber-300" />}
            onClick={onSaveDraft}
            loading={saving}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/40 font-bold text-xs"
          >
            Save as Draft
          </Button>

          <Button
            size="sm"
            variant="outline"
            icon={<CheckSquare className="w-3.5 h-3.5 text-blue-300" />}
            onClick={onSaveUpdate}
            loading={saving}
            className="bg-blue-950 hover:bg-blue-900 text-blue-200 border-blue-400/40 font-bold text-xs"
          >
            Save Update
          </Button>

          <Button
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={onPublish}
            loading={saving}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
          >
            {f.status === 'PUBLISHED' ? 'Republish Live' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Birthday Wish Modal */}
      <BirthdayWishModal
        open={birthdayModalOpen}
        onClose={() => setBirthdayModalOpen(false)}
        celebrant={selectedCelebrant}
        unitName={f.unit_name || 'Ward'}
        initialChannel={selectedChannel}
      />
    </div>
  );
}
