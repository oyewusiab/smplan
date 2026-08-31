import React, { useState } from 'react';
import {
  Sparkles, Calendar, Music, MessageSquare,
  Users, CheckSquare, Bookmark, Layers, Send, Link, Globe,
  ArrowUp, ArrowDown, Trash2, Plus, Clock, MapPin, Repeat
} from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { BULLETIN_THEMES } from '../../utils/bulletinThemes';
import { buildWhatsAppBirthdayGreetingUrl } from '../../utils/bulletinBirthdayEngine';
import { formatActivitiesToText } from '../../utils/bulletinActivityHarvester';
import type { Bulletin, Planner, Hymn, WeeklyActivityItem, NextActivityItem } from '../../types';
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
      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
        checked ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
      }`}
    >
      <div className="pr-2">
        <p className="text-xs font-semibold text-slate-800">{label}</p>
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
}: BulletinFormEditorProps) {
  const [activeSubSection, setActiveSubSection] = useState<'core' | 'sacrament' | 'cfm' | 'community' | 'toggles'>('core');

  const themeKeys = Object.keys(BULLETIN_THEMES).filter((k) =>
    ['navy', 'forest', 'plum', 'slate', 'teal'].includes(k)
  );

  // Activities list handlers
  const activitiesList: WeeklyActivityItem[] = f.activities_list || [];

  const handleUpdateActivity = (index: number, field: keyof WeeklyActivityItem, value: any) => {
    const updated = [...activitiesList];
    updated[index] = { ...updated[index], [field]: value };
    const text = formatActivitiesToText(updated);
    setForm({ ...f, activities_list: updated, activities: text });
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
    setForm({ ...f, activities_list: updated, activities: text });
  };

  const handleDeleteActivity = (index: number) => {
    const updated = activitiesList.filter((_, i) => i !== index);
    const text = formatActivitiesToText(updated);
    setForm({ ...f, activities_list: updated, activities: text });
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
    setForm({ ...f, activities_list: updated, activities: text });
  };

  return (
    <div className="space-y-6">
      {/* Sub-Section Quick Navigator Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
        {[
          { id: 'core', label: '1. Basic Info & Theme', icon: <Bookmark className="w-3.5 h-3.5" /> },
          { id: 'sacrament', label: '2. Sacrament Program', icon: <Music className="w-3.5 h-3.5" /> },
          { id: 'cfm', label: '3. Come Follow Me (AI)', icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" /> },
          { id: 'community', label: '4. Birthdays & Schedule', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'toggles', label: '5. Section Visibility', icon: <Layers className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubSection(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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
                  onChange={(e) => setForm({ ...f, date: e.target.value })}
                />

                <Input
                  label="Ward / Branch Name (Auto-filled from Settings)"
                  placeholder="e.g. Obantoko Ward"
                  value={f.unit_name || ''}
                  onChange={(e) => setForm({ ...f, unit_name: e.target.value })}
                />

                <Input
                  label="Stake / District Name (Auto-filled from Settings)"
                  placeholder="e.g. Abeokuta Nigeria Stake"
                  value={f.stake_name || ''}
                  onChange={(e) => setForm({ ...f, stake_name: e.target.value })}
                />

                <Input
                  label="Meeting Theme / Title"
                  placeholder="e.g. Focus on Jesus Christ and His Atonement"
                  value={f.theme || ''}
                  onChange={(e) => setForm({ ...f, theme: e.target.value })}
                />
              </div>

              {/* 5 Curated Design System Themes */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  5 Curated Design System Themes
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {themeKeys.map((key) => {
                    const theme = BULLETIN_THEMES[key];
                    const isSelected = (f.color_theme || 'navy').toLowerCase() === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...f, color_theme: key })}
                        className={`flex flex-col items-center p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span
                            className="w-4 h-4 rounded-full border shadow-2xs"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full border shadow-2xs"
                            style={{ backgroundColor: theme.secondaryColor }}
                          />
                        </div>
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

      {/* ─── SECTION 2: Sacrament Meeting Program ─────────────────────────────────── */}
      {activeSubSection === 'sacrament' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sacrament Meeting Outline</h3>
                  <p className="text-xs text-slate-500">
                    Auto-generated from the Sacrament Planner for the Sunday under review
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
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Select
                    label="Meeting Type / Sunday Designation"
                    value={f.meeting_type || 'SACRAMENT'}
                    onChange={(e) => {
                      const mType = e.target.value;
                      setForm({
                        ...f,
                        meeting_type: mType,
                        speakers: mType === 'FAST_SUNDAY' ? 'Bearing of Testimonies by the Congregation' : f.speakers,
                      });
                    }}
                    options={[
                      { value: 'SACRAMENT', label: 'Normal Sacrament Meeting' },
                      { value: 'FAST_SUNDAY', label: 'Fast & Testimony Sunday' },
                      { value: 'STAKE_CONFERENCE', label: 'Stake Conference' },
                      { value: 'COMBINED', label: 'Ward Conference / Combined Meeting' },
                      { value: 'SPECIAL', label: 'Primary Program / Special Presentation' },
                      { value: 'OTHER', label: 'Other Special Service' },
                    ]}
                  />
                </div>

                {f.meeting_type === 'FAST_SUNDAY' && (
                  <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <span className="font-semibold">Fast & Testimony Meeting:</span> Speakers roster replaced with open congregation testimonies following the administration of the sacrament.
                  </div>
                )}

                <Input
                  label="Opening Hymn"
                  placeholder="e.g. #2 The Spirit of God"
                  value={f.opening_hymn || ''}
                  onChange={(e) => setForm({ ...f, opening_hymn: e.target.value })}
                />
                <Input
                  label="Invocation (Opening Prayer)"
                  placeholder="e.g. Sister Jane Smith"
                  value={f.opening_prayer || ''}
                  onChange={(e) => setForm({ ...f, opening_prayer: e.target.value })}
                />
                <Input
                  label="Sacrament Hymn"
                  placeholder="e.g. #169 As Now We Take the Sacrament"
                  value={f.sacrament_hymn || ''}
                  onChange={(e) => setForm({ ...f, sacrament_hymn: e.target.value })}
                />
                <Input
                  label="Special Musical Item (Optional)"
                  placeholder="e.g. Solo by Sister Smith — 'I Know That My Redeemer Lives'"
                  value={f.special_music || ''}
                  onChange={(e) => setForm({ ...f, special_music: e.target.value })}
                />
                <Textarea
                  label={f.meeting_type === 'FAST_SUNDAY' ? 'Testimonies / Pulpit Note' : 'Speakers Roster (Auto-populated from Planner)'}
                  rows={3}
                  placeholder={`Brother Emmanuel Olajide — Faith in the Lord\nSister Grace Adams — The Book of Mormon`}
                  value={
                    typeof f.speakers === 'string'
                      ? f.speakers
                      : Array.isArray(f.speakers)
                      ? (f.speakers as any[]).map((s) => `${s.name || ''}${s.topic ? ' — ' + s.topic : ''}`).join('\n')
                      : ''
                  }
                  onChange={(e) => setForm({ ...f, speakers: e.target.value })}
                  className="sm:col-span-2"
                />
                <Input
                  label="Closing Hymn"
                  placeholder="e.g. #152 God Be with You Till We Meet Again"
                  value={f.closing_hymn || ''}
                  onChange={(e) => setForm({ ...f, closing_hymn: e.target.value })}
                />
                <Input
                  label="Benediction (Closing Prayer)"
                  placeholder="e.g. Brother Michael Adebayo"
                  value={f.closing_prayer || ''}
                  onChange={(e) => setForm({ ...f, closing_prayer: e.target.value })}
                />
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
                    onChange={(e) => setForm({ ...f, cfm_url: e.target.value })}
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
                {/* 1. Weekly Reading Block */}
                <Input
                  label="Weekly Reading Block"
                  placeholder="e.g. Psalms 49–51; 61–66; 69–72; 77–78; 85–86"
                  value={f.cfm_reading || ''}
                  onChange={(e) => setForm({ ...f, cfm_reading: e.target.value })}
                />

                {/* 2. Weekly Study Theme */}
                <Input
                  label="Weekly Study Theme"
                  placeholder='e.g. August 24–30: “I Will Declare What He Hath Done for My Soul”'
                  value={f.cfm_theme || ''}
                  onChange={(e) => setForm({ ...f, cfm_theme: e.target.value })}
                />

                {/* 3. Introduction */}
                <Textarea
                  label="Introduction"
                  rows={3}
                  placeholder="The writers of the Psalms openly expressed raw human emotions, ranging from deep despair and abandonment to powerful praise and gratitude..."
                  value={f.cfm_introduction || ''}
                  onChange={(e) => setForm({ ...f, cfm_introduction: e.target.value })}
                  className="sm:col-span-2"
                />

                {/* 4. Ideas for learning */}
                <Textarea
                  label="Ideas for learning"
                  rows={5}
                  placeholder={`Psalms 49; 62:5–12: Redemption comes only through Jesus Christ.\nPsalms 51; 85–86: Because of the Savior’s mercy, I can be forgiven.\nPsalms 51:13–15; 66:5–20; 71:15–24: My testimony of Jesus Christ can help others come unto Him.\nPsalms 63; 69; 77–78: The Lord will help me in my time of need.`}
                  value={f.cfm_ideas_for_learning || ''}
                  onChange={(e) => setForm({ ...f, cfm_ideas_for_learning: e.target.value })}
                  className="sm:col-span-2 text-xs leading-relaxed"
                />

                {/* 5. Reflection (Recommend 3 relevants ones and the users select the suitable one(s)) */}
                <div className="sm:col-span-2 space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-900">
                        Reflection (3 Recommended Prompts)
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Click on one or more recommended questions to select them for your bulletin
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                      Select Suitable One(s)
                    </span>
                  </div>

                  {/* 3 Interactive Recommended Reflection Cards */}
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
                            setForm({
                              ...f,
                              cfm_reflection: question,
                              cfm_discussion_question: question,
                            });
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
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

                  {/* Editable Reflection Input */}
                  <Textarea
                    label="Active Reflection Question for Bulletin"
                    rows={2}
                    placeholder="Selected reflection question will appear here for editing..."
                    value={f.cfm_reflection || f.cfm_discussion_question || ''}
                    onChange={(e) =>
                      setForm({
                        ...f,
                        cfm_reflection: e.target.value,
                        cfm_discussion_question: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── SECTION 4: Community, Birthdays & Activities ─────────────────────────── */}
      {activeSubSection === 'community' && (
        <div className="space-y-6">
          {/* Birthdays Frame with Auto-Generated Members List & WhatsApp Bot */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">🎂 Birthday Celebrants Frame</h3>
                  <p className="text-xs text-slate-500">
                    Auto-generated from member records for the Monday–Sunday week under review
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <Textarea
                label="Celebrants List"
                rows={2}
                placeholder="🎂 Brother Emmanuel Olajide (12)   🎂 Sister Grace Smith (15)"
                value={f.birthdays || ''}
                onChange={(e) => setForm({ ...f, birthdays: e.target.value })}
              />
              <Input
                label="Bishopric Greeting Message"
                placeholder="The Bishopric wishes all celebrants this week a very Happy Birthday!"
                value={f.birthday_message || ''}
                onChange={(e) => setForm({ ...f, birthday_message: e.target.value })}
              />

              {/* Direct WhatsApp Celebrant Greetings Bot */}
              {f.birthday_celebrants_list && f.birthday_celebrants_list.length > 0 && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      Automated WhatsApp Birthday Greetings Bot
                    </p>
                    <span className="text-[10px] text-emerald-700 font-medium">1-Click Wish Dispatch</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {f.birthday_celebrants_list.map((c, i) => {
                      const url = buildWhatsAppBirthdayGreetingUrl(c.phone || '', c.name, f.unit_name);
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition-colors shadow-2xs"
                        >
                          <span>🎂 Wish {c.name}</span>
                          <span className="text-[10px] text-emerald-600">({c.day}th)</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* ─── WEEKLY ACTIVITIES (MONDAY - SUNDAY) STRUCTURED TABLE ─────────────── */}
          {/* Matches exactly the user's uploaded screenshot */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Weekly Activities</h3>
                  <p className="text-xs text-slate-500">
                    Schedule for Monday through Sunday (manually added & customized)
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Manual Entry
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-0 sm:p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-700 border-y border-slate-200">
                      <th className="py-3 px-3 font-semibold w-28">Day/Date</th>
                      <th className="py-3 px-3 font-semibold min-w-[200px]">Activity Details</th>
                      <th className="py-3 px-3 font-semibold w-32">Time / Info</th>
                      <th className="py-3 px-3 font-semibold w-28">Scope</th>
                      <th className="py-3 px-3 font-semibold w-24 text-center">Reoccurring</th>
                      <th className="py-3 px-3 font-semibold w-24 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activitiesList.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        {/* Day/Date */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.day}
                            onChange={(e) => handleUpdateActivity(idx, 'day', e.target.value)}
                            className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </td>

                        {/* Activity Details */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.activity}
                            onChange={(e) => handleUpdateActivity(idx, 'activity', e.target.value)}
                            placeholder="Activity title..."
                            className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </td>

                        {/* Time / Info */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.time}
                            onChange={(e) => handleUpdateActivity(idx, 'time', e.target.value)}
                            placeholder="e.g. 6:00 PM"
                            className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                        </td>

                        {/* Scope */}
                        <td className="p-2">
                          <select
                            value={item.scope || 'Ward'}
                            onChange={(e) => handleUpdateActivity(idx, 'scope', e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded-xl border border-slate-200 bg-white font-medium focus:border-blue-500"
                          >
                            <option value="Ward">Ward</option>
                            <option value="Stake">Stake</option>
                            <option value="Branch">Branch</option>
                            <option value="Multi-Stake">Multi-Stake</option>
                          </select>
                        </td>

                        {/* Reoccurring Checkbox */}
                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={!!item.reoccurring}
                            onChange={(e) => handleUpdateActivity(idx, 'reoccurring', e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Actions (Up, Down, Delete) */}
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveActivity(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-30 disabled:hover:bg-blue-50 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveActivity(idx, 'down')}
                              disabled={idx === activitiesList.length - 1}
                              className="p-1 rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-30 disabled:hover:bg-blue-50 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(idx)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Activity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Custom Activity Button */}
              <div className="p-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Plus className="w-3.5 h-3.5 text-blue-600" />}
                  onClick={handleAddCustomActivity}
                  className="text-xs font-semibold"
                >
                  Add Custom Activity
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* ─── NEXT 5 ACTIVITIES (AUTO-GENERATED FROM CALENDAR) ─────────────────── */}
          <Card className="border-indigo-100 bg-indigo-50/20">
            <CardHeader className="border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Next 5 Activities (Auto-Generated from Calendar)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Auto-generated from the calendar irrespective of when those activities will happen
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Calendar Schedule
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-0 sm:p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-50/60 text-indigo-900 border-b border-indigo-100">
                      <th className="py-2.5 px-3 font-semibold w-24">Date</th>
                      <th className="py-2.5 px-3 font-semibold w-16">Day</th>
                      <th className="py-2.5 px-3 font-semibold">Activity</th>
                      <th className="py-2.5 px-3 font-semibold w-28">Time</th>
                      <th className="py-2.5 px-3 font-semibold w-24">Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50">
                    {(f.next_activities_list && f.next_activities_list.length > 0
                      ? f.next_activities_list
                      : [
                          { date: 'Next Sat', dayName: 'Sat', activity: 'Stake Youth Conference', time: '10:00 AM', scope: 'Stake' },
                          { date: 'Next Sun', dayName: 'Sun', activity: 'Ward Conference & Combined Priesthood', time: '9:00 AM', scope: 'Ward' },
                          { date: 'Upcoming', dayName: 'Sat', activity: 'Temple Excursion & Baptisms', time: '8:00 AM', scope: 'Ward' },
                          { date: 'Upcoming', dayName: 'Fri', activity: 'Relief Society Ministering Social', time: '6:30 PM', scope: 'Ward' },
                          { date: 'Upcoming', dayName: 'Sat', activity: 'Elders Quorum Sports Activity', time: '7:00 AM', scope: 'Ward' },
                        ]
                    ).map((act, idx) => (
                      <tr key={idx} className="hover:bg-white/60">
                        <td className="p-2.5 font-bold text-slate-800">{act.date}</td>
                        <td className="p-2.5 font-semibold text-slate-500">{act.dayName}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{act.activity}</td>
                        <td className="p-2.5 text-slate-600">{act.time}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              act.scope === 'Stake'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-blue-100 text-blue-900 border border-blue-200'
                            }`}
                          >
                            {act.scope || 'Ward'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Building Cleaning & Missionaries */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-900">Building Cleaning Notice</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Input
                  label="Cleaning Group"
                  placeholder="e.g. Elders Quorum & Relief Society Group 2"
                  value={f.cleaning_group || ''}
                  onChange={(e) => setForm({ ...f, cleaning_group: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Date (Saturday)"
                    type="date"
                    value={f.cleaning_date || ''}
                    onChange={(e) => setForm({ ...f, cleaning_date: e.target.value })}
                  />
                  <Input
                    label="Time"
                    type="time"
                    value={f.cleaning_time || ''}
                    onChange={(e) => setForm({ ...f, cleaning_time: e.target.value })}
                  />
                </div>
                <Input
                  label="Instructions"
                  placeholder="e.g. Please bring cleaning cloths and arrive on time."
                  value={f.cleaning_instructions || ''}
                  onChange={(e) => setForm({ ...f, cleaning_instructions: e.target.value })}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-sm font-bold text-slate-900">Missionary & Bishopric Message</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <Textarea
                  label="Full-Time Missionaries"
                  rows={2}
                  placeholder="Elder Johnson (Ghana Accra Mission)"
                  value={f.missionaries || ''}
                  onChange={(e) => setForm({ ...f, missionaries: e.target.value })}
                />
                <Textarea
                  label="Bishopric Message"
                  rows={3}
                  placeholder="A welcoming message from the bishopric…"
                  value={f.bishopric_message || ''}
                  onChange={(e) => setForm({ ...f, bishopric_message: e.target.value })}
                />
              </CardBody>
            </Card>
          </div>

          {/* Dynamic QR Codes & Sacred Music Links */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dynamic QR Codes & Sacred Music Audio</h3>
                  <p className="text-xs text-slate-500">Scan links for Church FamilySearch, Gospel Library, and hymn practice audio</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Church FamilySearch Link"
                  placeholder="https://www.familysearch.org"
                  value={f.qr_familysearch || 'https://www.familysearch.org'}
                  onChange={(e) => setForm({ ...f, qr_familysearch: e.target.value })}
                />
                <Input
                  label="Gospel Library / Ward Website Link"
                  placeholder="https://www.churchofjesuschrist.org/study/gospel-library"
                  value={f.qr_gospel_library || 'https://www.churchofjesuschrist.org/study/gospel-library'}
                  onChange={(e) => setForm({ ...f, qr_gospel_library: e.target.value })}
                />
              </div>

              {/* Sacred Music Audio Quick Links */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
                <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-blue-700" />
                  Sacred Music Hymn Audio Streams
                </p>
                <p className="text-[11px] text-blue-800">
                  Members can stream or practice hymns in the Mobile Web View or scan printed QR codes before meeting starts:
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  {f.opening_hymn && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-900 font-medium">
                      🎵 Opening: {f.opening_hymn}
                    </span>
                  )}
                  {f.sacrament_hymn && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-900 font-medium">
                      🍞 Sacrament: {f.sacrament_hymn}
                    </span>
                  )}
                  {f.closing_hymn && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-900 font-medium">
                      🙏 Closing: {f.closing_hymn}
                    </span>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ─── SECTION 5: 12 Granular Section Visibility Toggles ─────────────────────── */}
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
                checked={!!f.show_sacrament}
                onChange={(v) => setForm({ ...f, show_sacrament: v })}
                label="1. Sacrament Outline"
                description="Hymns, speakers, conducting"
              />
              <ToggleItem
                checked={!!f.show_birthdays}
                onChange={(v) => setForm({ ...f, show_birthdays: v })}
                label="2. Birthday Frame"
                description="Weekly celebrants list"
              />
              <ToggleItem
                checked={!!f.show_activities}
                onChange={(v) => setForm({ ...f, show_activities: v })}
                label="3. Activities Schedule"
                description="Mon–Sun weekly roster"
              />
              <ToggleItem
                checked={!!f.show_cleaning}
                onChange={(v) => setForm({ ...f, show_cleaning: v })}
                label="4. Cleaning Roster"
                description="Group & Saturday time"
              />
              <ToggleItem
                checked={!!f.show_focus}
                onChange={(v) => setForm({ ...f, show_focus: v })}
                label="5. CFM & Scripture"
                description="Lesson guide & theme"
              />
              <ToggleItem
                checked={!!f.show_bishopric}
                onChange={(v) => setForm({ ...f, show_bishopric: v })}
                label="6. Bishopric Message"
                description="Bishopric weekly thought"
              />
              <ToggleItem
                checked={!!f.show_missionary}
                onChange={(v) => setForm({ ...f, show_missionary: v })}
                label="7. Missionary Corner"
                description="Full-time missionaries"
              />
              <ToggleItem
                checked={!!f.show_temple}
                onChange={(v) => setForm({ ...f, show_temple: v })}
                label="8. Temple & FamilySearch"
                description="Excursions & index tips"
              />
              <ToggleItem
                checked={!!f.show_self_reliance}
                onChange={(v) => setForm({ ...f, show_self_reliance: v })}
                label="9. Self-Reliance"
                description="Classes & skills goals"
              />
              <ToggleItem
                checked={!!f.show_welfare}
                onChange={(v) => setForm({ ...f, show_welfare: v })}
                label="10. Welfare Notices"
                description="Fast offering reminders"
              />
              <ToggleItem
                checked={!!f.show_upcoming}
                onChange={(v) => setForm({ ...f, show_upcoming: v })}
                label="11. Upcoming 30-Day"
                description="Next 5 upcoming events"
              />
              <ToggleItem
                checked={!!f.show_qr}
                onChange={(v) => setForm({ ...f, show_qr: v })}
                label="12. Dynamic QR Codes"
                description="WhatsApp & Gospel Library"
              />
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
