import React, { useState } from 'react';
import {
  Heart, Calendar, Music, Sparkles, Send, Volume2, Share2,
  CheckCircle2, Clock, MapPin, Users, BookOpen, MessageSquare, ChevronDown, ExternalLink, QrCode
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/Button';
import { Input, Textarea, Select } from '../ui/Input';
import { getBulletinTheme } from '../../utils/bulletinThemes';
import { buildWhatsAppBirthdayGreetingUrl } from '../../utils/bulletinBirthdayEngine';
import { getWeekDateRange, isSectionVisible } from '../../utils/bulletinPrintEngine';
import { resolveHymnLink } from '../../data/bundledHymns';
import { bulletinsApi } from '../../services/api';
import type { Bulletin } from '../../types';
import toast from 'react-hot-toast';

interface BulletinWebViewProps {
  bulletin: Bulletin;
  onShareWhatsApp?: () => void;
}

export function BulletinWebView({ bulletin: b, onShareWhatsApp }: BulletinWebViewProps) {
  const theme = getBulletinTheme(b.color_theme);

  // Feedback form state
  const [feedbackType, setFeedbackType] = useState<'PRAYER_REQUEST' | 'SICKNESS_ALERT' | 'BISHOP_APPOINTMENT' | 'GENERAL'>('PRAYER_REQUEST');
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackPhone, setFeedbackPhone] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Parse speakers
  const speakers = (() => {
    if (!b.speakers) return [];
    if (Array.isArray(b.speakers)) return b.speakers;
    try {
      const parsed = JSON.parse(b.speakers);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return b.speakers
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        const parts = l.split(/[—–-]/);
        return { name: parts[0]?.trim() || '', topic: parts[1]?.trim() || '' };
      });
  })();

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMsg.trim()) {
      toast.error('Please enter a message or request');
      return;
    }
    setSubmittingFeedback(true);
    try {
      const res = (await bulletinsApi.submitFeedback({
        bulletin_id: b.bulletin_id || '',
        date: b.date || '',
        type: feedbackType,
        member_name: feedbackName.trim() || 'Anonymous Member',
        phone: feedbackPhone.trim(),
        message: feedbackMsg.trim(),
      })) as { ok: boolean; message?: string };
      if (!res.ok) throw new Error('Submission failed');
      setFeedbackSubmitted(true);
      toast.success(res.message || 'Feedback submitted to the Bishopric!');
      setFeedbackMsg('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const weekRange = getWeekDateRange(b.date, b.unit_name);
  const unitTitle = (b.unit_name || 'OBANTOKO WARD').toUpperCase();

  return (
    <div className="max-w-xl mx-auto bg-slate-50 min-h-screen pb-16 font-sans text-slate-900">
      {/* Mobile App Bar Header Matching User Specification */}
      <div
        className="text-white p-6 shadow-md rounded-b-3xl relative overflow-hidden"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="relative z-10 text-center">
          <h1 className="text-xl font-extrabold tracking-wide uppercase font-serif text-white">
            {unitTitle}
          </h1>
          <p className="text-xs font-extrabold tracking-widest uppercase text-amber-300 mt-1">
            WEEKLY WARD BULLETIN
          </p>
          <p className="text-xs italic text-slate-200 font-serif mt-0.5">
            {weekRange.rangeLabel}
          </p>

          {b.theme && (
            <div className="mt-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
              <p className="text-xs italic text-amber-200 text-center font-medium">"{b.theme}"</p>
            </div>
          )}
        </div>

        {/* Decorative corner shape */}
        <div className="absolute -bottom-10 -right-10 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      </div>

      <div className="p-4 space-y-4 -mt-2">
        {/* Scripture Focus of the Week */}
        {isSectionVisible(b.show_focus) && b.scripture_of_the_week && (
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Scripture of the Week
            </div>
            <p className="text-sm font-medium text-slate-700 italic leading-relaxed">
              {b.scripture_of_the_week}
            </p>
          </div>
        )}

        {/* 1. Sacrament Meeting Program Outline */}
        {isSectionVisible(b.show_sacrament) && (
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-blue-600" />
                Order of Worship
              </h2>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                {b.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony Meeting' : 'Sacrament Service'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Opening Hymn + Church Link */}
              {b.opening_hymn && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-slate-500 font-medium block">Opening Hymn</span>
                    <a
                      href={resolveHymnLink(b.opening_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 truncate"
                      title="Open hymn on churchofjesuschrist.org"
                    >
                      <span>{b.opening_hymn}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
                    </a>
                  </div>
                  <a
                    href={resolveHymnLink(b.opening_hymn)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[11px] font-semibold shrink-0"
                    title="Listen & view sheet music on Church site"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Church Music</span>
                  </a>
                </div>
              )}

              {b.opening_prayer && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Invocation (Opening Prayer)</span>
                  <span className="font-semibold text-slate-900">{b.opening_prayer}</span>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Ward & Stake Business</span>
                <span className="font-semibold text-slate-900">As Announced</span>
              </div>

              {/* Sacrament Hymn + Church Link */}
              {b.sacrament_hymn && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-slate-500 font-medium block">Sacrament Hymn</span>
                    <a
                      href={resolveHymnLink(b.sacrament_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 truncate"
                      title="Open sacrament hymn on churchofjesuschrist.org"
                    >
                      <span>{b.sacrament_hymn}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
                    </a>
                  </div>
                  <a
                    href={resolveHymnLink(b.sacrament_hymn)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[11px] font-semibold shrink-0"
                    title="Listen & view sacrament sheet music on Church site"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Church Music</span>
                  </a>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Administration of Sacrament</span>
                <span className="font-semibold text-slate-900">Aaronic Priesthood</span>
              </div>

              {/* Fast Sunday or Speakers */}
              {b.meeting_type === 'FAST_SUNDAY' ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-900 block mb-0.5">Congregation Testimonies:</span>
                  <p className="text-emerald-800">Bearing of Testimonies by the Congregation</p>
                </div>
              ) : speakers.length > 0 ? (
                <div className="pt-2 pb-1">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
                    Speakers Roster
                  </span>
                  <div className="space-y-1.5 pl-2 border-l-2 border-blue-300">
                    {speakers.map((sp, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs">
                        <span className="font-semibold text-slate-900">{sp.name}</span>
                        {sp.topic && (
                          <span className="text-slate-500 text-right italic ml-2">"{sp.topic}"</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {b.special_music && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Special Music</span>
                  <a
                    href={resolveHymnLink(b.special_music)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 text-right"
                  >
                    <span>{b.special_music}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
                  </a>
                </div>
              )}

              {/* Closing Hymn */}
              {b.closing_hymn && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-slate-500 font-medium block">Closing Hymn</span>
                    <a
                      href={resolveHymnLink(b.closing_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1 truncate"
                      title="Open closing hymn on churchofjesuschrist.org"
                    >
                      <span>{b.closing_hymn}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 text-blue-500" />
                    </a>
                  </div>
                  <a
                    href={resolveHymnLink(b.closing_hymn)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[11px] font-semibold shrink-0"
                    title="Listen & view sheet music on Church site"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Church Music</span>
                  </a>
                </div>
              )}

              {b.closing_prayer && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Benediction</span>
                  <span className="font-semibold text-slate-900">{b.closing_prayer}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sacred Music & Church Hymn Links Card */}
        {(b.opening_hymn || b.sacrament_hymn || b.closing_hymn) && (
          <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-blue-700" />
                Church Hymns & Practice Links
              </span>
              <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                Sacred Music
              </span>
            </div>
            <p className="text-[11px] text-blue-900/80">
              Listen to the songs, view sheet music, or practice melodies on ChurchofJesusChrist.org:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {b.opening_hymn && (
                <a
                  href={resolveHymnLink(b.opening_hymn)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between text-xs text-slate-800 font-medium"
                >
                  <div className="truncate pr-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Opening</span>
                    <span className="truncate">{b.opening_hymn}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                </a>
              )}
              {b.sacrament_hymn && (
                <a
                  href={resolveHymnLink(b.sacrament_hymn)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between text-xs text-slate-800 font-medium"
                >
                  <div className="truncate pr-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Sacrament</span>
                    <span className="truncate">{b.sacrament_hymn}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                </a>
              )}
              {b.closing_hymn && (
                <a
                  href={resolveHymnLink(b.closing_hymn)}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between text-xs text-slate-800 font-medium"
                >
                  <div className="truncate pr-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Closing</span>
                    <span className="truncate">{b.closing_hymn}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* 2. Come, Follow Me Study */}
        {isSectionVisible(b.show_focus) && (b.cfm_reading || b.cfm_theme) && (
          <div className="rounded-2xl p-4 bg-amber-50/80 border border-amber-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Come, Follow Me Study
              </div>
              {b.cfm_reading && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  {b.cfm_reading}
                </span>
              )}
            </div>

            {/* Study Theme */}
            {b.cfm_theme && (
              <h4 className="text-xs font-bold text-amber-950 leading-snug">{b.cfm_theme}</h4>
            )}

            {/* Introduction */}
            {b.cfm_introduction && (
              <p className="text-xs text-amber-900/90 leading-relaxed italic bg-white/60 p-2.5 rounded-xl border border-amber-200/50">
                {b.cfm_introduction}
              </p>
            )}

            {/* Ideas for Learning */}
            {b.cfm_ideas_for_learning && (
              <div className="space-y-1 bg-white/70 p-2.5 rounded-xl border border-amber-200/60 text-xs">
                <span className="font-bold text-amber-900 block mb-1">Ideas for Learning:</span>
                <div className="space-y-1 text-slate-700 leading-relaxed whitespace-pre-line text-[11px]">
                  {b.cfm_ideas_for_learning}
                </div>
              </div>
            )}

            {/* Reflection */}
            {(b.cfm_reflection || b.cfm_discussion_question) && (
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-300 text-xs shadow-2xs">
                <span className="font-bold text-amber-950 block mb-0.5">Reflection:</span>
                <p className="text-slate-800 font-medium">
                  {b.cfm_reflection || b.cfm_discussion_question}
                </p>
              </div>
            )}

            {/* Hyperlink to Study */}
            {b.cfm_url && (
              <div className="pt-1">
                <a
                  href={b.cfm_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-200/70 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-all shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Lesson on Church Website</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* 3. Birthday Celebrants Frame with 1-Click WhatsApp Greetings */}
        {isSectionVisible(b.show_birthdays) && b.birthdays && (
          <div className="rounded-2xl p-4 bg-yellow-50/70 border border-yellow-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-950 flex items-center gap-1.5">
                🎂 Celebrants This Week
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-md">
                Birthdays
              </span>
            </div>

            <p className="text-xs font-semibold text-yellow-900 leading-relaxed">{b.birthdays}</p>

            {b.birthday_message && (
              <p className="text-[11px] text-yellow-800 italic">{b.birthday_message}</p>
            )}

            {/* Direct WhatsApp Wish Buttons */}
            {b.birthday_celebrants_list && b.birthday_celebrants_list.length > 0 && (
              <div className="pt-2 border-t border-yellow-200/60 flex flex-wrap gap-1.5">
                {b.birthday_celebrants_list.map((c, i) => (
                  <a
                    key={i}
                    href={buildWhatsAppBirthdayGreetingUrl(c.phone || '', c.name, b.unit_name)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 shadow-xs"
                  >
                    <span>💬 Wish {c.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Weekly Activities Roster */}
        {isSectionVisible(b.show_activities) && (
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Weekly Schedule (Monday – Sunday)
              </span>
            </div>

            {b.activities_list && b.activities_list.length > 0 ? (
              <div className="space-y-1.5 text-xs">
                {b.activities_list.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 w-20">{item.day}</span>
                      <span className="text-slate-700 font-medium">{item.activity}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-slate-500 font-semibold text-[11px]">{item.time}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.scope === 'Stake' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
                        {item.scope || 'Ward'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : b.activities ? (
              <div className="space-y-1 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {b.activities}
              </div>
            ) : null}
          </div>
        )}

        {/* Next 5 Activities (Auto-Generated Outlook) */}
        {isSectionVisible(b.show_upcoming) && b.next_activities_list && b.next_activities_list.length > 0 && (
          <div className="rounded-2xl p-4 bg-indigo-50/60 border border-indigo-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Next 5 Upcoming Activities
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Calendar Outlook
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              {b.next_activities_list.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-indigo-100/40">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-950 w-16">{act.date}</span>
                    <span className="text-slate-800 font-medium">{act.activity}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-indigo-800 border border-indigo-200">
                    {act.scope || 'Ward'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Building Cleaning Schedule */}
        {isSectionVisible(b.show_cleaning) && b.cleaning_group && (
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Building Cleaning Assignment
            </span>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Assigned Group:</span>
              <span className="font-bold text-slate-900">{b.cleaning_group}</span>
            </div>
            {b.cleaning_date && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Date & Time:</span>
                <span className="font-semibold text-slate-800">
                  {format(new Date(b.cleaning_date), 'MMM d')} @ {b.cleaning_time || '8:00 AM'}
                </span>
              </div>
            )}
            {b.cleaning_instructions && (
              <p className="text-[11px] text-slate-500 italic pt-1">{b.cleaning_instructions}</p>
            )}
          </div>
        )}

        {/* 6. Bishopric Message */}
        {isSectionVisible(b.show_bishopric) && b.bishopric_message && (
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Message from the Bishopric
            </span>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {b.bishopric_message}
            </p>
          </div>
        )}

        {/* 7. Full-Time Missionaries */}
        {isSectionVisible(b.show_missionary) && b.missionaries && (
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Full-Time Missionaries
            </span>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {b.missionaries}
            </p>
          </div>
        )}

        {/* 8. Digital Gospel Links & FamilySearch */}
        {isSectionVisible(b.show_qr) && (
          <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200 shadow-2xs space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
              Digital Ward Resources
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={b.qr_familysearch || 'https://www.familysearch.org'}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-slate-800 text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs"
              >
                <span>🌳 FamilySearch</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
              <a
                href={b.qr_gospel_library || 'https://www.churchofjesuschrist.org/study/gospel-library'}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-slate-800 text-xs font-semibold flex items-center justify-between transition-colors shadow-2xs"
              >
                <span>📖 Gospel Library</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        )}

        {/* 7. LIVE CONGREGATION BULLETIN FEEDBACK WIDGET */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-md space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Congregation Support & Feedback</h3>
              <p className="text-[11px] text-white/70">
                Submit a prayer request, illness notification, or bishopric interview request
              </p>
            </div>
          </div>

          {feedbackSubmitted ? (
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-emerald-200">Message Delivered</p>
              <p className="text-[11px] text-white/80">
                The Bishopric and ward clerks have received your request.
              </p>
              <button
                type="button"
                onClick={() => setFeedbackSubmitted(false)}
                className="mt-2 text-[11px] text-emerald-300 underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-2.5 text-slate-900">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 block mb-1">
                    Request Type
                  </label>
                  <select
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="w-full text-xs rounded-xl bg-white border-0 p-2 font-medium"
                  >
                    <option value="PRAYER_REQUEST">🙏 Prayer Request</option>
                    <option value="SICKNESS_ALERT">🏥 Sickness / Hospital Alert</option>
                    <option value="BISHOP_APPOINTMENT">📅 Bishop Interview Request</option>
                    <option value="GENERAL">💬 General Note / Visitor</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    placeholder="Brother/Sister..."
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full text-xs rounded-xl bg-white border-0 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 block mb-1">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="e.g. +234 801 234 5678"
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  className="w-full text-xs rounded-xl bg-white border-0 p-2"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/80 block mb-1">
                  Details / Prayer Request
                </label>
                <textarea
                  rows={2}
                  placeholder="Please pray for the recovery of..."
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl bg-white border-0 p-2"
                />
              </div>

              <Button
                type="submit"
                loading={submittingFeedback}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs py-2 rounded-xl shadow-sm"
              >
                Submit to Bishopric
              </Button>
            </form>
          )}
        </div>

        {/* Share Button Action */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={onShareWhatsApp}
            className="w-full justify-center text-xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
            icon={<Share2 className="w-3.5 h-3.5 text-emerald-600" />}
          >
            Share Bulletin Summary on WhatsApp
          </Button>
        </div>

        {/* Footer Matching User Specification */}
        <div className="text-center pt-4 border-t border-slate-200 text-[10px] text-slate-500 italic leading-relaxed">
          This is prepared as a weekly informational sheet for local ward members. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.
        </div>
      </div>
    </div>
  );
}
