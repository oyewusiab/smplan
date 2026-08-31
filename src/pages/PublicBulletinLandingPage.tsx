import React, { useState, useEffect } from 'react';
import {
  Calendar, Music, Sparkles, MessageSquare, Users, Globe, ExternalLink,
  Share2, Check, ArrowRight, Heart, MapPin, Clock, BookOpen, Send,
  Bookmark, ChevronRight, Phone, Mail, AlertCircle, RefreshCw
} from 'lucide-react';
import { bulletinsApi } from '../services/api';
import { getBulletinTheme } from '../utils/bulletinThemes';
import { getWeekDateRange, isSectionVisible } from '../utils/bulletinPrintEngine';
import { resolveHymnLink } from '../data/bundledHymns';
import { formatBirthdayLabel, getOrdinalSuffix } from '../utils/bulletinBirthdayEngine';
import type { Bulletin, SpeakerItem, WeeklyActivityItem, NextActivityItem } from '../types';
import toast from 'react-hot-toast';

function parseSpeakersArray(speakersRaw?: any): SpeakerItem[] {
  if (!speakersRaw) return [];
  if (Array.isArray(speakersRaw)) return speakersRaw;
  if (typeof speakersRaw === 'string') {
    try {
      const parsed = JSON.parse(speakersRaw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return speakersRaw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const parts = line.split(/[—–-]/);
        return {
          name: parts[0]?.trim() || '',
          topic: parts[1]?.trim() || '',
        };
      });
  }
  return [];
}

export function PublicBulletinLandingPage() {
  const [bulletin, setBulletin] = useState<Bulletin | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Member Feedback / Bishop Appointment form state
  const [feedbackType, setFeedbackType] = useState<'GENERAL' | 'BISHOP_APPOINTMENT'>('GENERAL');
  const [memberName, setMemberName] = useState('');
  const [memberContact, setMemberContact] = useState('');
  const [message, setMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const loadLiveBulletin = async () => {
    setLoading(true);
    try {
      const res = await bulletinsApi.getLive({ forceRefresh: true }) as { ok: boolean; data?: Bulletin; error?: string };
      if (res.ok && res.data) {
        setBulletin(res.data);
        return;
      }
    } catch (err) {
      console.warn('Live bulletin network load notice:', err);
    }

    // Fallback to local storage saved bulletins if network/offline
    try {
      const localSaved = JSON.parse(localStorage.getItem('SM_SAVED_BULLETINS') || '[]');
      if (Array.isArray(localSaved) && localSaved.length > 0) {
        // Find latest published or newest draft
        const published = localSaved.filter((b: any) => b.status === 'PUBLISHED');
        const chosen = published.length > 0 ? published[0] : localSaved[0];
        setBulletin(chosen);
        return;
      }
    } catch {}

    setLoading(false);
  };

  useEffect(() => {
    loadLiveBulletin();
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${bulletin?.unit_name || 'Ward'} Weekly Bulletin`,
          text: `Here is our Ward Bulletin for ${bulletin?.date || 'this week'}:`,
          url: url,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Bulletin link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !memberName.trim()) {
      toast.error('Please enter your name and message.');
      return;
    }

    setSubmittingFeedback(true);
    try {
      await bulletinsApi.submitFeedback({
        bulletin_id: bulletin?.bulletin_id || 'BUL_LIVE',
        date: bulletin?.date || new Date().toISOString().split('T')[0],
        type: feedbackType,
        member_name: memberName.trim(),
        phone: memberContact.trim(),
        message: message.trim(),
      });
      setFeedbackSent(true);
      toast.success('Your message has been securely submitted to the Bishopric.');
    } catch {
      toast.error('Failed to submit message. Please try again or speak with the bishopric directly.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading && !bulletin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Ward Bulletin…</p>
        </div>
      </div>
    );
  }

  if (!bulletin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Ward Bulletin</h2>
          <p className="text-sm text-slate-600">
            No weekly bulletin is published at this moment. Please check back shortly or reach out to your ward leadership.
          </p>
          <button
            onClick={loadLiveBulletin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xs transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Check for Updates
          </button>
        </div>
      </div>
    );
  }

  const theme = getBulletinTheme(bulletin.color_theme);
  const weekRange = getWeekDateRange(bulletin.date, bulletin.unit_name);
  const unitTitle = (bulletin.unit_name || 'OBANTOKO WARD').toUpperCase();
  const speakers = parseSpeakersArray(bulletin.speakers);

  const activitiesList: WeeklyActivityItem[] = bulletin.activities_list || [];
  const next5List: NextActivityItem[] = bulletin.next_activities_list || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex justify-center py-4 sm:py-8 px-2.5 sm:px-4">
      {/* Central Reading Canvas */}
      <main className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col justify-between">
        <div className="p-5 sm:p-8 space-y-6">
          {/* Header Section Matching Specified Typography & Palette */}
          <header className="text-center pb-5 border-b-2" style={{ borderColor: theme.primaryColor }}>
            <div className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ background: theme.badgeBg, color: theme.badgeText }}>
              Live Ward Bulletin
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide uppercase font-serif" style={{ color: theme.primaryColor }}>
              {unitTitle}
            </h1>
            <p className="text-xs sm:text-sm font-extrabold tracking-widest uppercase mt-1" style={{ color: theme.secondaryColor }}>
              WEEKLY WARD BULLETIN
            </p>
            <p className="text-xs sm:text-sm italic text-slate-600 font-serif mt-1">
              {weekRange.rangeLabel}
            </p>

            {bulletin.theme && (
              <p className="text-xs sm:text-sm font-medium italic mt-2.5 max-w-lg mx-auto" style={{ color: theme.primaryColor }}>
                "{bulletin.theme}"
              </p>
            )}

            {/* Quick Actions Bar */}
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied!' : 'Share Bulletin'}</span>
              </button>
            </div>
          </header>

          {/* 1. Sacrament Meeting Outline */}
          {isSectionVisible(bulletin.show_sacrament) && (
            <section className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.primaryColor }}>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
                  Sacrament Meeting Program
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: theme.badgeBg, color: theme.badgeText }}>
                  {bulletin.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
                </span>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                {bulletin.opening_hymn && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Opening Hymn:</span>
                    <a
                      href={resolveHymnLink(bulletin.opening_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold hover:underline text-right"
                      style={{ color: theme.primaryColor }}
                      title="Listen and view hymn in Sacred Music / Gospel Library"
                    >
                      <Music className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{bulletin.opening_hymn}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                )}
                {bulletin.opening_prayer && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Invocation:</span>
                    <span className="font-semibold text-slate-900 text-right">{bulletin.opening_prayer}</span>
                  </div>
                )}
                {bulletin.sacrament_hymn && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Sacrament Hymn:</span>
                    <a
                      href={resolveHymnLink(bulletin.sacrament_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold hover:underline text-right"
                      style={{ color: theme.primaryColor }}
                      title="Listen and view hymn in Sacred Music / Gospel Library"
                    >
                      <Music className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{bulletin.sacrament_hymn}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                )}

                {bulletin.meeting_type === 'FAST_SUNDAY' ? (
                  <div className="p-3 rounded-xl bg-emerald-50/80 border-l-4 border-emerald-500 my-2">
                    <span className="text-xs font-bold text-emerald-900">Bearing of Testimonies: </span>
                    <span className="text-xs text-emerald-950">Open to members of the congregation following the administration of the sacrament.</span>
                  </div>
                ) : speakers.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 block">Talks:</span>
                    {speakers.map((sp, idx) => (
                      <div key={idx} className="flex justify-between text-xs sm:text-sm pl-2">
                        <span className="text-slate-600 font-medium">{idx === 0 ? 'Youth Speaker:' : `Speaker ${idx + 1}:`}</span>
                        <span className="font-semibold text-slate-900 text-right">{sp.name}{sp.topic ? ` — "${sp.topic}"` : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : bulletin.speakers ? (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 block mb-1">Talks:</span>
                    <p className="text-slate-800 whitespace-pre-line text-xs pl-2 font-medium">
                      {bulletin.speakers}
                    </p>
                  </div>
                ) : null}

                {bulletin.closing_hymn && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Closing Hymn:</span>
                    <a
                      href={resolveHymnLink(bulletin.closing_hymn)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold hover:underline text-right"
                      style={{ color: theme.primaryColor }}
                      title="Listen and view hymn in Sacred Music / Gospel Library"
                    >
                      <Music className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{bulletin.closing_hymn}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                )}
                {bulletin.closing_prayer && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">Benediction:</span>
                    <span className="font-semibold text-slate-900 text-right">{bulletin.closing_prayer}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 2. Come Follow Me (AI) Study Guide */}
          {isSectionVisible(bulletin.show_focus) && (bulletin.cfm_reading || bulletin.cfm_theme || bulletin.cfm_introduction) && (
            <section
              className="rounded-2xl border p-4 sm:p-5 space-y-3 shadow-2xs"
              style={{ background: theme.bgLight, borderColor: theme.borderLight }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.borderLight }}>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-extrabold" style={{ color: theme.primaryColor }}>
                    Come, Follow Me Study Guide
                  </h2>
                </div>
                {bulletin.cfm_reading && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: theme.badgeBg, color: theme.badgeText }}>
                    {bulletin.cfm_reading}
                  </span>
                )}
              </div>

              {bulletin.cfm_theme && (
                <h3 className="font-bold text-sm sm:text-base" style={{ color: theme.primaryColor }}>
                  {bulletin.cfm_theme}
                </h3>
              )}

              {bulletin.cfm_introduction && (
                <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                  {bulletin.cfm_introduction}
                </p>
              )}

              {bulletin.cfm_ideas_for_learning && (
                <div className="text-xs sm:text-sm text-slate-800 space-y-1 bg-white/70 p-3 rounded-xl border border-slate-200/60 leading-relaxed whitespace-pre-line">
                  <strong className="block text-slate-900 mb-1">Ideas for Learning:</strong>
                  {bulletin.cfm_ideas_for_learning}
                </div>
              )}

              {(bulletin.cfm_reflection || bulletin.cfm_discussion_question) && (
                <div className="p-3 rounded-xl bg-amber-100/70 border-l-4 border-amber-500 text-amber-950 text-xs sm:text-sm leading-relaxed">
                  <strong>Reflection Callout:</strong> {bulletin.cfm_reflection || bulletin.cfm_discussion_question}
                </div>
              )}

              {bulletin.scripture_of_the_week && (
                <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200 text-xs italic text-slate-700">
                  <strong>Scripture of the Week:</strong> {bulletin.scripture_of_the_week}
                </div>
              )}

              {bulletin.cfm_url && (
                <div className="pt-1 text-xs">
                  <a
                    href={bulletin.cfm_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold hover:underline"
                    style={{ color: theme.primaryColor }}
                  >
                    <span>Read complete study guide in Gospel Library</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </section>
          )}

          {/* 3. Birthday Celebrants Frame */}
          {isSectionVisible(bulletin.show_birthdays) && bulletin.birthdays && (
            <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/50 p-4 sm:p-5 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                <h2 className="text-xs sm:text-sm font-extrabold text-amber-950 flex items-center gap-1.5">
                  🎂 Birthday Celebrants (This Week)
                </h2>
                <span className="text-[9px] font-extrabold bg-amber-300 text-amber-950 px-2 py-0.5 rounded-full">
                  CELEBRATION
                </span>
              </div>
              <p className="text-amber-950 font-bold text-xs sm:text-sm leading-relaxed">
                {bulletin.birthdays}
              </p>
              {bulletin.birthday_message && (
                <p className="text-xs text-amber-900 italic bg-white/80 p-2.5 rounded-xl border border-amber-200">
                  {bulletin.birthday_message}
                </p>
              )}
            </section>
          )}

          {/* 4. Weekly Activities Schedule */}
          {isSectionVisible(bulletin.show_activities) && (bulletin.activities || activitiesList.length > 0) && (
            <section className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.primaryColor }}>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
                  Weekly Activities Schedule (Mon–Sun)
                </h2>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>

              {activitiesList.length > 0 ? (
                <div className="space-y-2">
                  {activitiesList.map((act, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 gap-1 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 w-20 flex-shrink-0" style={{ color: theme.primaryColor }}>
                          {act.day}
                        </span>
                        <span className="font-medium text-slate-800">{act.activity}</span>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 font-semibold">
                        <span>{act.time}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px]">
                          {act.scope || 'Ward'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {bulletin.activities}
                </p>
              )}
            </section>
          )}

          {/* 5. Next 5 Activities (Calendar Outlook) */}
          {isSectionVisible(bulletin.show_upcoming) && next5List.length > 0 && (
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 sm:p-5 space-y-2.5">
              <h2 className="text-xs sm:text-sm font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Next 5 Activities (Calendar Outlook)
              </h2>
              <div className="space-y-1.5">
                {next5List.map((act, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs sm:text-sm bg-white/80 p-2 rounded-xl border border-indigo-100">
                    <span className="font-bold text-indigo-950 w-24 flex-shrink-0">{act.date}</span>
                    <span className="text-slate-800 flex-grow font-medium">{act.activity}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900">
                      {act.scope || 'Ward'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6. Building Cleaning & Full-Time Missionaries */}
          <div className="grid sm:grid-cols-2 gap-4">
            {isSectionVisible(bulletin.show_cleaning) && bulletin.cleaning_group && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-1.5 text-xs sm:text-sm">
                <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-600">
                  Building Cleaning Assignment
                </h3>
                <div className="flex justify-between">
                  <span className="text-slate-500">Group:</span>
                  <span className="font-semibold text-slate-900">{bulletin.cleaning_group}</span>
                </div>
                {bulletin.cleaning_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-semibold text-slate-800">
                      {bulletin.cleaning_date} @ {bulletin.cleaning_time || '8:00 AM'}
                    </span>
                  </div>
                )}
                {bulletin.cleaning_instructions && (
                  <p className="text-xs text-slate-500 italic pt-1">{bulletin.cleaning_instructions}</p>
                )}
              </section>
            )}

            {isSectionVisible(bulletin.show_missionary) && bulletin.missionaries && (
              <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-1.5 text-xs sm:text-sm">
                <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-600">
                  Full-Time Missionaries
                </h3>
                <p className="text-slate-800 whitespace-pre-line text-xs leading-relaxed font-medium">
                  {bulletin.missionaries}
                </p>
              </section>
            )}
          </div>

          {/* 7. Bishopric Message */}
          {isSectionVisible(bulletin.show_bishopric) && bulletin.bishopric_message && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2 shadow-2xs">
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
                Message from the Bishopric
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {bulletin.bishopric_message}
              </p>
            </section>
          )}

          {/* 8. Temple & Initiatives */}
          {isSectionVisible(bulletin.show_temple) && (bulletin.temple_trip_date || bulletin.familysearch_tip) && (
            <section className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-4 space-y-2 text-xs sm:text-sm">
              <h3 className="font-bold text-fuchsia-950 text-xs uppercase tracking-wider">Temple & FamilySearch</h3>
              {bulletin.temple_trip_date && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Next Temple Trip:</span>
                  <span className="font-bold text-slate-900">{bulletin.temple_trip_date}</span>
                </div>
              )}
              {bulletin.familysearch_tip && (
                <p className="text-fuchsia-900 text-xs"><strong>Tip:</strong> {bulletin.familysearch_tip}</p>
              )}
            </section>
          )}

          {/* 9. Self-Reliance & Welfare */}
          {(isSectionVisible(bulletin.show_self_reliance) || isSectionVisible(bulletin.show_welfare)) && (bulletin.self_reliance_classes || bulletin.welfare_reminders) && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 text-xs sm:text-sm">
              <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider">Ward Initiatives</h3>
              {bulletin.self_reliance_classes && (
                <p className="text-emerald-900 text-xs whitespace-pre-line">{bulletin.self_reliance_classes}</p>
              )}
              {bulletin.welfare_reminders && (
                <p className="text-emerald-900 text-xs whitespace-pre-line">{bulletin.welfare_reminders}</p>
              )}
            </section>
          )}

          {/* 10. Quick Digital Resource Links */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">Church Digital Resources</h3>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={bulletin.qr_gospel_library || 'https://www.churchofjesuschrist.org/study/gospel-library'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-xs font-bold text-slate-800 shadow-2xs transition-all"
              >
                <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Gospel Library</span>
              </a>
              <a
                href={bulletin.qr_familysearch || 'https://www.familysearch.org'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-xs font-bold text-slate-800 shadow-2xs transition-all"
              >
                <Globe className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>FamilySearch</span>
              </a>
            </div>
          </section>

          {/* 11. Interactive Message / Request to Bishopric Box */}
          <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-blue-950">
                  Message the Bishopric / Request
                </h3>
                <p className="text-[11px] text-blue-700">
                  Submit a general note to the bishopric or request an appointment with the Bishop
                </p>
              </div>
            </div>

            {feedbackSent ? (
              <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold text-center space-y-1">
                <Check className="w-5 h-5 mx-auto text-emerald-600" />
                <p>Thank you! Your message has been received by the Bishopric.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackSent(false);
                    setMessage('');
                  }}
                  className="text-emerald-700 underline text-[11px] pt-1 block"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Full Name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="p-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone or Email (Optional)"
                    value={memberContact}
                    onChange={(e) => setMemberContact(e.target.value)}
                    className="p-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'GENERAL', label: 'General Note (Bishop & Counselors)' },
                    { id: 'BISHOP_APPOINTMENT', label: "Bishop's Appointment (Bishop Only)" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFeedbackType(t.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        feedbackType === t.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  required
                  placeholder={
                    feedbackType === 'BISHOP_APPOINTMENT'
                      ? 'Describe your appointment request for the Bishop…'
                      : 'Your general message or note for the bishopric…'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs bg-white"
                />

                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingFeedback ? 'Submitting…' : 'Send to Bishopric'}</span>
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 text-center text-[10px] text-slate-500 italic leading-relaxed">
          This is prepared as a weekly informational sheet for local ward members. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.
        </footer>
      </main>
    </div>
  );
}
