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
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const formattedDate = b.date
    ? (() => {
        try {
          const d = parseISO(b.date);
          return isNaN(d.getTime()) ? b.date : format(d, 'EEEE, MMMM d, yyyy');
        } catch {
          return b.date;
        }
      })()
    : 'This Sunday';

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
      toast.error('Please enter a message or prayer request details.');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const res = (await bulletinsApi.submitFeedback({
        bulletin_id: b.bulletin_id || '',
        date: b.date || '',
        type: feedbackType,
        member_name: memberName || 'Anonymous',
        phone: memberPhone,
        email: memberEmail,
        message: feedbackMsg,
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

  const getHymnAudioLink = (hymnText?: string) => {
    if (!hymnText) return '#';
    const match = hymnText.match(/#?(\d+)/);
    const num = match ? match[1] : '';
    if (num) {
      return `https://www.churchofjesuschrist.org/study/music/hymns/${num}?lang=eng`;
    }
    return `https://www.churchofjesuschrist.org/music/library?lang=eng`;
  };

  return (
    <div className="max-w-xl mx-auto bg-slate-50 min-h-screen pb-16 font-sans text-slate-900">
      {/* Mobile App Bar Header */}
      <div
        className="text-white p-6 shadow-md rounded-b-3xl relative overflow-hidden"
        style={{ backgroundColor: theme.primaryColor }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between opacity-85 text-xs font-semibold uppercase tracking-widest mb-1.5">
            <span>{b.unit_name || 'Latter-day Saint Ward'}</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[10px] backdrop-blur-xs">
              Live Digital Bulletin
            </span>
          </div>

          <h1 className="text-xl font-extrabold tracking-tight mt-1">Sacrament Meeting</h1>
          <p className="text-xs text-white/90 font-medium mt-0.5">{formattedDate}</p>

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
        {b.show_focus && b.scripture_of_the_week && (
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
        {b.show_sacrament && (
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
              {/* Opening Hymn + Audio Stream */}
              {b.opening_hymn && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <div>
                    <span className="text-slate-500 font-medium block">Opening Hymn</span>
                    <span className="font-semibold text-slate-900">{b.opening_hymn}</span>
                  </div>
                  <a
                    href={getHymnAudioLink(b.opening_hymn)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio</span>
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

              {/* Sacrament Hymn + Audio Stream */}
              {b.sacrament_hymn && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <div>
                    <span className="text-slate-500 font-medium block">Sacrament Hymn</span>
                    <span className="font-semibold text-slate-900">{b.sacrament_hymn}</span>
                  </div>
                  <a
                    href={getHymnAudioLink(b.sacrament_hymn)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio</span>
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
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Special Music</span>
                  <span className="font-semibold text-slate-900 text-right">{b.special_music}</span>
                </div>
              )}

              {/* Closing Hymn */}
              {b.closing_hymn && (
                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                  <div>
                    <span className="text-slate-500 font-medium block">Closing Hymn</span>
                    <span className="font-semibold text-slate-900">{b.closing_hymn}</span>
                  </div>
                  <a
                    href={getHymnAudioLink(b.closing_hymn)}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Audio</span>
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

        {/* 2. Come, Follow Me Study */}
        {b.show_focus && (b.cfm_reading || b.cfm_theme) && (
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
        {b.show_birthdays && b.birthdays && (
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
        {b.show_activities && (
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
        {b.next_activities_list && b.next_activities_list.length > 0 && (
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
        {b.show_cleaning && b.cleaning_group && (
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

        {/* 6. Bishopric Pastoral Message */}
        {b.show_bishopric && b.bishopric_message && (
          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Message from the Bishopric
            </span>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {b.bishopric_message}
            </p>
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
      </div>
    </div>
  );
}
