import React, { useState, useEffect } from 'react';
import {
  Calendar, Music, Sparkles, MessageSquare, Users, Globe, ExternalLink,
  Share2, Check, ArrowRight, Heart, MapPin, Clock, BookOpen, Send,
  Bookmark, ChevronRight, Phone, Mail, AlertCircle, RefreshCw, Download, Smartphone, X, AlertTriangle
} from 'lucide-react';
import { bulletinsApi } from '../services/api';
import { getBulletinTheme } from '../utils/bulletinThemes';
import { getWeekDateRange, isSectionVisible } from '../utils/bulletinPrintEngine';
import { resolveHymnLink, formatHymnDisplay } from '../data/bundledHymns';
import { formatBirthdayLabel, getOrdinalSuffix, normalizeBirthdaysString, parseCelebrantsFromText } from '../utils/bulletinBirthdayEngine';
import { formatHonorificName } from '../utils/memberTitle';
import { BirthdayWishModal, type BirthdayChannel } from '../components/bulletin/BirthdayWishModal';
import {
  initializeBulletinPwa,
  subscribePwaState,
  promptBulletinInstall,
  isBulletinInstalled,
  isIosDevice
} from '../utils/bulletinPwa';
import type { Bulletin, SpeakerItem, WeeklyActivityItem, NextActivityItem, BulletinCelebrant } from '../types';
import toast from 'react-hot-toast';

function parseSpeakersArray(speakersRaw?: any): SpeakerItem[] {
  if (!speakersRaw) return [];
  if (Array.isArray(speakersRaw)) {
    return speakersRaw.map(s => ({
      ...s,
      name: formatHonorificName(s.name || s.speaker_name || ''),
      topic: s.topic || s.talk_topic || '',
    }));
  }
  if (typeof speakersRaw === 'string') {
    try {
      const parsed = JSON.parse(speakersRaw);
      if (Array.isArray(parsed)) {
        return parsed.map(s => ({
          ...s,
          name: formatHonorificName(s.name || s.speaker_name || ''),
          topic: s.topic || s.talk_topic || '',
        }));
      }
    } catch {}
    return speakersRaw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const parts = line.split(/[—–-]/);
        return {
          name: formatHonorificName(parts[0]?.trim() || ''),
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

  // PWA State
  const [pwaState, setPwaState] = useState<{
    isInstallable: boolean;
    isInstalled: boolean;
    isIos: boolean;
  }>({
    isInstallable: false,
    isInstalled: false,
    isIos: false,
  });
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Member Feedback / Bishop Appointment form state
  const [feedbackType, setFeedbackType] = useState<'GENERAL' | 'BISHOP_APPOINTMENT'>('GENERAL');
  const [memberName, setMemberName] = useState('');
  const [memberContact, setMemberContact] = useState('');
  const [message, setMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Birthday Wishes Modal state
  const [selectedCelebrant, setSelectedCelebrant] = useState<BulletinCelebrant | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<BirthdayChannel>('WHATSAPP');
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);

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

    const cleanupPwa = initializeBulletinPwa();
    const unsubscribe = subscribePwaState((state) => {
      setPwaState(state);
    });

    return () => {
      unsubscribe();
      cleanupPwa();
    };
  }, []);

  const handleInstallClick = async () => {
    if (pwaState.isInstallable) {
      const res = await promptBulletinInstall();
      if (res.outcome === 'accepted') {
        toast.success('MyWard Bulletin installed to your device!');
      }
    } else if (pwaState.isIos) {
      setShowIosGuide(true);
    } else {
      toast('To install, open your browser menu (⋮) and tap "Install and create shortcut" or "Add to Home screen".', {
        icon: '📱',
        duration: 6000,
      });
    }
  };

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
          <p className="text-sm font-semibold text-slate-700">Loading MyWard Bulletin…</p>
        </div>
      </div>
    );
  }

  const isExpired = bulletin && bulletin.date ? (new Date() > new Date(bulletin.date + 'T23:59:59')) : false;

  if (!bulletin || isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto overflow-hidden bg-white shadow-sm border border-slate-200 p-2">
            <img src="/bulletin_icon.png" alt="MyWard Bulletin Icon" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">MyWard Bulletin</h2>
          <p className="text-sm text-slate-600">
            {isExpired
              ? 'The previous weekly bulletin expired on Sunday at 11:59 PM. Please check back when next week’s bulletin is published.'
              : 'No weekly bulletin is published at this moment. Please check back shortly or reach out to your ward leadership.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              onClick={loadLiveBulletin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xs transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Check for Updates
            </button>

            {!pwaState.isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm border border-slate-200 shadow-xs transition-all"
                title="Install MyWard Bulletin app to your device"
              >
                <Download className="w-4 h-4 text-blue-600" />
                Install MyWard Bulletin
              </button>
            )}
          </div>
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
    <div
      className="min-h-screen text-slate-900 flex justify-center py-4 sm:py-8 px-2.5 sm:px-4 transition-colors duration-300"
      style={{ background: `linear-gradient(135deg, ${theme.bgLight} 0%, #f8fafc 50%, ${theme.bgLight} 100%)` }}
    >
      {/* Central Reading Canvas */}
      <main className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border overflow-hidden flex flex-col justify-between" style={{ borderColor: theme.borderLight }}>
        <div className="p-5 sm:p-8 space-y-6">
          {/* Header Section Matching Specified Typography & Palette */}
          <header className="text-center pb-5 border-b-2" style={{ borderColor: theme.primaryColor }}>
            <div
              className="inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-2 border shadow-2xs"
              style={{ background: theme.badgeBg, color: theme.badgeText, borderColor: theme.borderLight }}
            >
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
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-slate-700 text-xs font-bold transition-all shadow-2xs hover:opacity-90 border"
                style={{ background: theme.bgLight, borderColor: theme.borderLight, color: theme.primaryColor }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied!' : 'Share Bulletin'}</span>
              </button>

              {!pwaState.isInstalled && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-2xs hover:opacity-95 border"
                  style={{ background: theme.primaryColor, borderColor: theme.primaryColor }}
                  title="Install MyWard Bulletin app to your device"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install MyWard Bulletin</span>
                </button>
              )}
            </div>
          </header>

          {/* 1. Sacrament and Classes Programes */}
          {isSectionVisible(bulletin.show_sacrament) && (
            <section className="rounded-2xl border p-4 sm:p-5 bg-white shadow-2xs space-y-3" style={{ borderColor: theme.borderLight }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.borderLight }}>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
                  Sacrament and Classes Programes
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ background: theme.badgeBg, color: theme.badgeText, borderColor: theme.borderLight }}>
                  {bulletin.is_canceled ? 'Meeting Canceled' : bulletin.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
                </span>
              </div>

              {bulletin.is_canceled ? (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>There will be no Sacrament Meeting because {bulletin.cancel_reason || 'stated reasons in the planner.'}</span>
                  </div>
                </div>
              ) : (
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
                        <span>{formatHymnDisplay(bulletin.opening_hymn)}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  )}
                  {bulletin.opening_prayer && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Invocation:</span>
                      <span className="font-semibold text-slate-900 text-right">{formatHonorificName(bulletin.opening_prayer)}</span>
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
                        <span>{formatHymnDisplay(bulletin.sacrament_hymn)}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  )}

                  {bulletin.meeting_type === 'FAST_SUNDAY' ? (
                    <div className="p-3 rounded-xl border-l-4 my-2" style={{ background: theme.bgLight, borderColor: theme.primaryColor }}>
                      <span className="text-xs font-bold" style={{ color: theme.primaryColor }}>Bearing of Testimonies: </span>
                      <span className="text-xs text-slate-800">Open to members of the congregation following the administration of the sacrament.</span>
                    </div>
                  ) : speakers.length > 0 ? (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-xs font-bold text-slate-500 block">Talks:</span>
                      {speakers.map((sp, idx) => (
                        <div key={idx} className="flex justify-between text-xs sm:text-sm pl-2">
                          <span className="text-slate-600 font-medium">Speaker {idx + 1}:</span>
                          <span className="font-semibold text-slate-900 text-right">{formatHonorificName(sp.name)}</span>
                        </div>
                      ))}
                    </div>
                  ) : bulletin.speakers ? (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-500 block mb-1">Talks:</span>
                      <p className="text-slate-800 whitespace-pre-line text-xs pl-2 font-medium">
                        {bulletin.speakers.split('\n').map(l => formatHonorificName(l)).join('\n')}
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
                        <span>{formatHymnDisplay(bulletin.closing_hymn)}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  )}
                  {bulletin.closing_prayer && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-medium">Benediction:</span>
                      <span className="font-semibold text-slate-900 text-right">{formatHonorificName(bulletin.closing_prayer)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Sunday Class Lessons Preparation */}
              {bulletin.include_class_lessons && bulletin.class_lessons && bulletin.class_lessons.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: theme.primaryColor }}>
                    Sunday Class Lessons Preparation
                  </span>
                  <div className="grid gap-2">
                    {bulletin.class_lessons.map((cl, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        style={{ background: theme.bgLight, borderColor: theme.borderLight }}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-extrabold px-2 py-0.5 rounded text-[10px] border shadow-2xs"
                              style={{ background: theme.badgeBg, color: theme.badgeText, borderColor: theme.borderLight }}
                            >
                              {cl.className}
                            </span>
                            <strong className="text-slate-900 font-bold">{cl.topic || 'Class Lesson'}</strong>
                          </div>
                          {cl.reference && (
                            <p className="text-[11px] text-slate-600 italic pl-1">
                              Ref: {cl.reference}
                            </p>
                          )}
                        </div>

                        {cl.link && (
                          <a
                            href={cl.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs hover:opacity-90 self-start sm:self-auto text-white"
                            style={{ background: theme.primaryColor }}
                          >
                            <span>Read lesson</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <div className="p-1.5 rounded-lg text-white" style={{ background: theme.primaryColor }}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-extrabold" style={{ color: theme.primaryColor }}>
                    Come, Follow Me Study Guide
                  </h2>
                </div>
                {bulletin.cfm_reading && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ background: theme.badgeBg, color: theme.badgeText, borderColor: theme.borderLight }}>
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
                <div className="text-xs sm:text-sm text-slate-800 space-y-1 bg-white/80 p-3 rounded-xl border leading-relaxed whitespace-pre-line" style={{ borderColor: theme.borderLight }}>
                  <strong className="block mb-1" style={{ color: theme.primaryColor }}>Ideas for Learning:</strong>
                  {bulletin.cfm_ideas_for_learning}
                </div>
              )}

              {(bulletin.cfm_reflection || bulletin.cfm_discussion_question) && (
                <div className="p-3 rounded-xl border-l-4 text-xs sm:text-sm leading-relaxed" style={{ background: theme.badgeBg, borderColor: theme.secondaryColor, color: theme.badgeText }}>
                  <strong>Reflection Callout:</strong> {bulletin.cfm_reflection || bulletin.cfm_discussion_question}
                </div>
              )}

              {bulletin.scripture_of_the_week && (
                <div className="p-2.5 rounded-xl bg-white/90 border text-xs italic text-slate-700" style={{ borderColor: theme.borderLight }}>
                  <strong style={{ color: theme.primaryColor }}>Scripture of the Week:</strong> {bulletin.scripture_of_the_week}
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

          {/* 3. Birthday Celebrants Frame with direct celebrant hyperlinks */}
          {isSectionVisible(bulletin.show_birthdays) && (bulletin.birthdays || (bulletin.birthday_celebrants_list && bulletin.birthday_celebrants_list.length > 0)) && (() => {
            const celebrantsList: BulletinCelebrant[] = (bulletin.birthday_celebrants_list && bulletin.birthday_celebrants_list.length > 0)
              ? bulletin.birthday_celebrants_list
              : parseCelebrantsFromText(bulletin.birthdays, undefined, bulletin.date);

            return (
              <section
                className="rounded-2xl border-2 p-4 sm:p-5 space-y-3 shadow-xs"
                style={{
                  borderColor: theme.secondaryColor,
                  background: `linear-gradient(135deg, ${theme.bgLight} 0%, #ffffff 100%)`
                }}
              >
                <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: theme.borderLight }}>
                  <h2 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5" style={{ color: theme.primaryColor }}>
                    🎂 Birthday Celebrants (This Week)
                  </h2>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: theme.secondaryColor }}>
                    CELEBRATION
                  </span>
                </div>

                {celebrantsList.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {celebrantsList.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedCelebrant(c);
                          setSelectedChannel('WHATSAPP');
                          setBirthdayModalOpen(true);
                        }}
                        title={`Click to send WhatsApp, Email or SMS birthday wish to ${c.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white/95 hover:bg-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs hover:border-amber-400 hover:scale-[1.02] active:scale-95 cursor-pointer text-left group"
                        style={{ borderColor: theme.borderLight, color: theme.primaryColor }}
                      >
                        <span>🎂</span>
                        <span className="group-hover:underline underline-offset-2 font-bold">
                          {c.name}
                        </span>
                        {c.birth_date && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({c.birth_date})
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-600 font-semibold ml-0.5 opacity-85 group-hover:opacity-100 flex items-center gap-0.5">
                          💬 Wish
                        </span>
                      </button>
                    ))}
                  </div>
                ) : bulletin.birthdays ? (
                  <p className="font-bold text-xs sm:text-sm leading-relaxed" style={{ color: theme.primaryColor }}>
                    {normalizeBirthdaysString(bulletin.birthdays, bulletin.date)}
                  </p>
                ) : null}

                {bulletin.birthday_message && (
                  <p className="text-xs italic bg-white/90 p-2.5 rounded-xl border" style={{ borderColor: theme.borderLight, color: theme.primaryColor }}>
                    {bulletin.birthday_message}
                  </p>
                )}
              </section>
            );
          })()}

          {/* 4. Weekly Activities Schedule */}
          {isSectionVisible(bulletin.show_activities) && (bulletin.activities || activitiesList.length > 0) && (
            <section className="rounded-2xl border p-4 sm:p-5 bg-white shadow-2xs space-y-3" style={{ borderColor: theme.borderLight }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.borderLight }}>
                <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider" style={{ color: theme.primaryColor }}>
                  Weekly Activities Schedule (Mon–Sun)
                </h2>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>

              {activitiesList.length > 0 ? (
                <div className="space-y-2">
                  {activitiesList.map((act, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border gap-1 text-xs sm:text-sm" style={{ background: theme.bgLight, borderColor: theme.borderLight }}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold w-20 flex-shrink-0" style={{ color: theme.primaryColor }}>
                          {act.day}
                        </span>
                        <span className="font-medium text-slate-800">{act.activity}</span>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 font-semibold">
                        <span>{act.time}</span>
                        <span className="px-1.5 py-0.5 rounded bg-white border text-[10px] font-bold" style={{ borderColor: theme.borderLight, color: theme.primaryColor }}>
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
            <section className="rounded-2xl border p-4 sm:p-5 space-y-2.5 shadow-2xs" style={{ background: theme.bgLight, borderColor: theme.borderLight }}>
              <h2 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5" style={{ color: theme.primaryColor }}>
                <Clock className="w-4 h-4" style={{ color: theme.secondaryColor }} />
                Next 5 Activities (Calendar Outlook)
              </h2>
              <div className="space-y-1.5">
                {next5List.map((act, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs sm:text-sm bg-white/90 p-2 rounded-xl border" style={{ borderColor: theme.borderLight }}>
                    <span className="font-bold w-24 flex-shrink-0" style={{ color: theme.primaryColor }}>{act.date}</span>
                    <span className="text-slate-800 flex-grow font-medium">{act.activity}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border" style={{ background: theme.badgeBg, color: theme.badgeText, borderColor: theme.borderLight }}>
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
              <section className="rounded-2xl border bg-white p-4 space-y-1.5 text-xs sm:text-sm shadow-2xs" style={{ borderColor: theme.borderLight }}>
                <h3 className="font-bold uppercase tracking-wider text-[11px]" style={{ color: theme.primaryColor }}>
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
              <section className="rounded-2xl border bg-white p-4 space-y-1.5 text-xs sm:text-sm shadow-2xs" style={{ borderColor: theme.borderLight }}>
                <h3 className="font-bold uppercase tracking-wider text-[11px]" style={{ color: theme.primaryColor }}>
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
            <section className="rounded-2xl border bg-white p-4 sm:p-5 space-y-2 shadow-2xs" style={{ borderColor: theme.borderLight }}>
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
            <section className="rounded-2xl border p-4 space-y-2 text-xs sm:text-sm shadow-2xs" style={{ background: theme.bgLight, borderColor: theme.borderLight }}>
              <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: theme.primaryColor }}>Temple & FamilySearch</h3>
              {bulletin.temple_trip_date && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Next Temple Trip:</span>
                  <span className="font-bold text-slate-900">{bulletin.temple_trip_date}</span>
                </div>
              )}
              {bulletin.familysearch_tip && (
                <p className="text-xs" style={{ color: theme.primaryColor }}><strong>Tip:</strong> {bulletin.familysearch_tip}</p>
              )}
            </section>
          )}

          {/* 9. Self-Reliance & Welfare */}
          {(isSectionVisible(bulletin.show_self_reliance) || isSectionVisible(bulletin.show_welfare)) && (bulletin.self_reliance_classes || bulletin.welfare_reminders) && (
            <section className="rounded-2xl border p-4 space-y-2 text-xs sm:text-sm shadow-2xs" style={{ background: theme.bgLight, borderColor: theme.borderLight }}>
              <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: theme.primaryColor }}>Ward Initiatives</h3>
              {bulletin.self_reliance_classes && (
                <p className="text-xs whitespace-pre-line" style={{ color: theme.primaryColor }}>{bulletin.self_reliance_classes}</p>
              )}
              {bulletin.welfare_reminders && (
                <p className="text-xs whitespace-pre-line text-slate-700">{bulletin.welfare_reminders}</p>
              )}
            </section>
          )}

          {/* 10. Quick Digital Resource Links */}
          <section className="rounded-2xl border p-4 space-y-3 shadow-2xs" style={{ background: theme.bgLight, borderColor: theme.borderLight }}>
            <h3 className="font-bold text-xs uppercase tracking-wider" style={{ color: theme.primaryColor }}>Church Digital Resources & Links</h3>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={bulletin.qr_gospel_library || 'https://www.churchofjesuschrist.org/study/gospel-library'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border hover:shadow-xs text-xs font-bold transition-all"
                style={{ borderColor: theme.borderLight, color: theme.primaryColor }}
              >
                <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: theme.secondaryColor }} />
                <span>Gospel Library</span>
              </a>
              <a
                href={bulletin.qr_familysearch || 'https://www.familysearch.org'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white border hover:shadow-xs text-xs font-bold transition-all"
                style={{ borderColor: theme.borderLight, color: theme.primaryColor }}
              >
                <Globe className="w-4 h-4 flex-shrink-0" style={{ color: theme.secondaryColor }} />
                <span>FamilySearch</span>
              </a>
              {bulletin.custom_links && Array.isArray(bulletin.custom_links) && bulletin.custom_links.map((link, idx) => (
                link.url ? (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border hover:shadow-xs text-xs font-bold transition-all col-span-2 sm:col-span-1"
                    style={{ borderColor: theme.borderLight, color: theme.primaryColor }}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: theme.secondaryColor }} />
                      <span className="truncate">{link.label || 'Resource Link'}</span>
                    </div>
                  </a>
                ) : null
              ))}
            </div>
          </section>

          {/* 11. Interactive Message / Request to Bishopric Box */}
          <section className="rounded-2xl border p-4 sm:p-5 space-y-3 shadow-2xs" style={{ background: theme.bgLight, borderColor: theme.borderLight }}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg text-white" style={{ background: theme.primaryColor }}>
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold" style={{ color: theme.primaryColor }}>
                  Message the Bishopric / Request
                </h3>
                <p className="text-[11px] text-slate-600">
                  Submit a general note to the bishopric or request an appointment with the Bishop
                </p>
              </div>
            </div>

            {feedbackSent ? (
              <div className="p-4 rounded-xl bg-white border text-xs font-semibold text-center space-y-1" style={{ borderColor: theme.borderLight, color: theme.primaryColor }}>
                <Check className="w-5 h-5 mx-auto text-emerald-600" />
                <p>Thank you! Your message has been received by the Bishopric.</p>
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackSent(false);
                    setMessage('');
                  }}
                  className="underline text-[11px] pt-1 block mx-auto"
                  style={{ color: theme.secondaryColor }}
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
                    className="p-2 rounded-xl border text-xs bg-white"
                    style={{ borderColor: theme.borderLight }}
                  />
                  <input
                    type="text"
                    placeholder="Phone or Email (Optional)"
                    value={memberContact}
                    onChange={(e) => setMemberContact(e.target.value)}
                    className="p-2 rounded-xl border text-xs bg-white"
                    style={{ borderColor: theme.borderLight }}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'GENERAL', label: 'General Note' },
                    { id: 'BISHOP_APPOINTMENT', label: "Bishop's Appointment" },
                  ].map((t) => {
                    const isSelected = feedbackType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFeedbackType(t.id as any)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border"
                        style={{
                          background: isSelected ? theme.primaryColor : '#ffffff',
                          color: isSelected ? '#ffffff' : theme.primaryColor,
                          borderColor: isSelected ? theme.primaryColor : theme.borderLight
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
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
                  className="w-full p-2 rounded-xl border text-xs bg-white"
                  style={{ borderColor: theme.borderLight }}
                />

                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 hover:opacity-90 text-white"
                  style={{ background: theme.primaryColor }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingFeedback ? 'Submitting…' : 'Send to Bishopric'}</span>
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="p-4 sm:p-6 border-t bg-slate-50 text-center text-[10px] text-slate-500 italic leading-relaxed" style={{ borderColor: theme.borderLight }}>
          This is prepared as a weekly informational sheet for local ward members. It is not an official publication of The Church of Jesus Christ of Latter-day Saints.
        </footer>
      </main>

      {/* iOS Safari Add to Home Screen Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto overflow-hidden bg-white shadow-md border border-slate-200 p-2">
              <img src="/bulletin_icon.png" alt="MyWard Bulletin App Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Install on iPhone / iPad</h3>
              <p className="text-xs text-slate-500 mt-1">
                Follow these simple steps in Safari to add the MyWard Bulletin app to your home screen:
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl text-left space-y-3 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <span>Tap the <strong>Share</strong> button (box with an arrow pointing up <Share2 className="inline w-3 h-3 text-blue-600" />) at the bottom or top of Safari.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Birthday Wish Modal */}
      {bulletin && (
        <BirthdayWishModal
          open={birthdayModalOpen}
          onClose={() => setBirthdayModalOpen(false)}
          celebrant={selectedCelebrant}
          unitName={bulletin.unit_name || 'Ward'}
          initialChannel={selectedChannel}
        />
      )}
    </div>
  );
}
