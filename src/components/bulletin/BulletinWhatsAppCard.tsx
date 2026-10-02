import React, { useState, useRef } from 'react';
import { Download, Copy, Share2, Check, MessageSquare, ExternalLink, Sparkles, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/Button';
import { getBulletinTheme } from '../../utils/bulletinThemes';
import { resolveHymnLink, formatHymnDisplay } from '../../data/bundledHymns';
import { formatHonorificName } from '../../utils/memberTitle';
import { isCelebrantBirthdayToday, parseCelebrantsFromText, formatCelebrantDisplayName, sortCelebrantsChronologically } from '../../utils/bulletinBirthdayEngine';
import type { Bulletin, BulletinCelebrant } from '../../types';
import toast from 'react-hot-toast';

interface BulletinWhatsAppCardProps {
  bulletin: Bulletin;
}

export function BulletinWhatsAppCard({ bulletin: b }: BulletinWhatsAppCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!b) return null;

  const theme = getBulletinTheme(b.color_theme);

  const formattedDate = b.date
    ? (() => {
        try {
          const d = parseISO(b.date);
          return isNaN(d.getTime()) ? b.date : format(d, 'EEEE, MMMM d, yyyy');
        } catch {
          return b.date;
        }
      })()
    : 'Sunday Worship';

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

  // Parse celebrants
  const rawCelebrants: BulletinCelebrant[] = (b.birthday_celebrants_list && b.birthday_celebrants_list.length > 0)
    ? b.birthday_celebrants_list
    : parseCelebrantsFromText(b.birthdays, undefined, b.date);

  const celebrantsList = sortCelebrantsChronologically(rawCelebrants, b.date);
  const todayCelebrants = celebrantsList.filter((c) => isCelebrantBirthdayToday(c, b.date));

  // Helper for drawing rounded rect safely across browsers
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  };

  // 1. High-Resolution Canvas Export (1080x1350 JPEG)
  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const width = 1080;
      const height = 1350;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas not supported');

      // 1. Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // 2. Header Banner
      ctx.fillStyle = theme.primaryColor;
      ctx.fillRect(0, 0, width, 230);

      // Header Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((b.unit_name || 'LATTER-DAY SAINT WARD').toUpperCase(), width / 2, 55);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillText('SACRAMENT BULLETIN', width / 2, 110);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(formattedDate, width / 2, 155);

      if (b.theme) {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'italic 22px system-ui, sans-serif';
        ctx.fillText(`"${b.theme}"`, width / 2, 195);
      }

      let y = 260;

      // 3. Birthday Celebrants Banner
      if (b.show_birthdays && (b.birthdays || celebrantsList.length > 0)) {
        ctx.fillStyle = '#fef9c3';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        drawRoundRect(ctx, 50, y, 980, 115, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#854d0e';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          todayCelebrants.length > 0
            ? `🎂 BIRTHDAYS THIS WEEK • 🎉 TODAY: ${todayCelebrants.map(c => c.name).join(' & ')}!`
            : '🎂 CELEBRATING BIRTHDAYS THIS WEEK',
          80,
          y + 42
        );

        ctx.fillStyle = '#713f12';
        ctx.font = '600 20px system-ui, sans-serif';
        const bText = celebrantsList.length > 0
          ? celebrantsList.map(c => formatCelebrantDisplayName(c, b.date)).join('   ')
          : (b.birthdays || '');
        ctx.fillText(bText.substring(0, 95), 80, y + 84);

        y += 140;
      }

      // 4. Come Follow Me Highlight
      if (b.show_focus && (b.cfm_reading || b.cfm_theme)) {
        ctx.fillStyle = '#eff6ff';
        ctx.strokeStyle = '#bfdbfe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        drawRoundRect(ctx, 50, y, 980, 145, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`📖 COME, FOLLOW ME: ${b.cfm_reading || 'Study Guide'}`, 80, y + 40);

        if (b.cfm_theme) {
          ctx.fillStyle = '#1e3a8a';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText(`"${b.cfm_theme}"`, 80, y + 74);
        }

        const cfmSub = b.scripture_of_the_week || b.cfm_reflection || b.cfm_discussion_question || '';
        if (cfmSub) {
          ctx.fillStyle = '#3b82f6';
          ctx.font = 'italic 18px system-ui, sans-serif';
          ctx.fillText(cfmSub.substring(0, 95), 80, y + 112);
        }

        y += 170;
      }

      // 5. Left & Right Blocks: Sacrament Program (Left) + Weekly Schedule (Right)
      const colWidth = 475;
      const leftX = 50;
      const rightX = 555;
      const blockY = y;
      const blockHeight = 580;

      // Left Box: Sacrament Outline
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      drawRoundRect(ctx, leftX, blockY, colWidth, blockHeight, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.primaryColor;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('ORDER OF SERVICE', leftX + 25, blockY + 45);

      if (b.is_canceled) {
        ctx.fillStyle = '#be123c';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText('⚠️ NO SACRAMENT MEETING', leftX + 25, blockY + 110);
        ctx.fillStyle = '#881337';
        ctx.font = '18px system-ui, sans-serif';
        const r1 = `Because ${b.cancel_reason || 'stated reason in planner.'}`;
        ctx.fillText(r1.substring(0, 36), leftX + 25, blockY + 150);
        if (r1.length > 36) {
          ctx.fillText(r1.substring(36, 72), leftX + 25, blockY + 180);
        }
      } else {
        let progY = blockY + 90;
        ctx.font = '18px system-ui, sans-serif';

        const progItems = [
          { l: 'Opening Hymn:', v: b.opening_hymn || 'Congregation Hymn' },
          { l: 'Invocation:', v: formatHonorificName(b.opening_prayer || '') || 'Member' },
          { l: 'Sacrament Hymn:', v: b.sacrament_hymn || 'Sacrament Hymn' },
        ];

        progItems.forEach((item) => {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText(item.l, leftX + 25, progY);
          ctx.fillStyle = '#0f172a';
          ctx.font = '600 18px system-ui, sans-serif';
          ctx.fillText(item.v.substring(0, 24), leftX + 175, progY);
          progY += 38;
        });

        if (b.meeting_type === 'FAST_SUNDAY') {
          ctx.fillStyle = '#16a34a';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText('• Fast & Testimony Meeting', leftX + 25, progY);
          progY += 38;
        } else if (speakers.length > 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText('Talks:', leftX + 25, progY);
          progY += 30;
          speakers.slice(0, 3).forEach((sp) => {
            ctx.fillStyle = '#0f172a';
            ctx.font = '600 17px system-ui, sans-serif';
            ctx.fillText(`• ${formatHonorificName(sp.name)}`, leftX + 40, progY);
            progY += 32;
          });
        }

        const closingItems = [
          { l: 'Closing Hymn:', v: b.closing_hymn || 'Closing Hymn' },
          { l: 'Benediction:', v: formatHonorificName(b.closing_prayer || '') || 'Member' },
        ];

        closingItems.forEach((item) => {
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText(item.l, leftX + 25, progY);
          ctx.fillStyle = '#0f172a';
          ctx.font = '600 18px system-ui, sans-serif';
          ctx.fillText(item.v.substring(0, 24), leftX + 175, progY);
          progY += 38;
        });

        if (b.include_class_lessons && b.class_lessons && b.class_lessons.length > 0) {
          progY += 10;
          ctx.fillStyle = theme.primaryColor;
          ctx.font = 'bold 17px system-ui, sans-serif';
          ctx.fillText('SUNDAY CLASSES:', leftX + 25, progY);
          progY += 26;
          b.class_lessons.slice(0, 2).forEach((cl) => {
            ctx.fillStyle = '#475569';
            ctx.font = '16px system-ui, sans-serif';
            ctx.fillText(`• ${cl.class_name}: ${cl.lesson_topic || 'Lesson'}`.substring(0, 36), leftX + 25, progY);
            progY += 26;
          });
        }
      }

      // Right Box: Weekly Activities Schedule
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      drawRoundRect(ctx, rightX, blockY, colWidth, blockHeight, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.primaryColor;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('WEEKLY SCHEDULE', rightX + 25, blockY + 45);

      const actLines = (b.activities || '')
        .split('\n')
        .filter(Boolean)
        .slice(0, 7);

      let actY = blockY + 90;
      ctx.font = '17px system-ui, sans-serif';
      actLines.forEach((line) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillText(line.substring(0, 38), rightX + 25, actY);
        actY += 36;
      });

      if (b.show_cleaning && b.cleaning_group) {
        actY += 15;
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`🧹 CLEANING: ${b.cleaning_group}`, rightX + 25, actY);
        actY += 28;
        ctx.fillStyle = '#475569';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(`Saturday @ ${b.cleaning_time || '8:00 AM'}`, rightX + 25, actY);
      }

      // 6. Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${b.unit_name || 'Latter-day Saint Ward'} • smplans.online/visitbulletin`,
        width / 2,
        height - 30
      );

      // Convert to downloadable Blob
      canvas.toBlob((blob) => {
        if (!blob) throw new Error('Blob generation failed');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ward_Bulletin_${b.date || 'Sunday'}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('High-Res WhatsApp Graphic downloaded!');
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Failed to export WhatsApp graphic:', err);
      toast.error('Failed to export graphic.');
    } finally {
      setDownloading(false);
    }
  };

  // 2. Copy Formatted WhatsApp Text Summary
  const handleCopyWhatsAppText = () => {
    const text = [
      `🏛️ *${(b.unit_name || 'WARD SACRAMENT BULLETIN').toUpperCase()}*`,
      `📅 *${formattedDate}*`,
      b.theme ? `✨ _"${b.theme}"_\n` : '',
      `📋 *SACRAMENT MEETING OUTLINE*`,
      b.is_canceled ? `⚠️ There will be no Sacrament Meeting because ${b.cancel_reason || 'stated reasons in the planner.'}` : '',
      !b.is_canceled && b.meeting_type === 'FAST_SUNDAY' ? `• Fast & Testimony Meeting (Congregation Testimonies)` : '',
      !b.is_canceled && b.opening_hymn ? `• Opening Hymn: ${b.opening_hymn}\n  🔗 ${resolveHymnLink(b.opening_hymn)}` : '',
      !b.is_canceled && b.opening_prayer ? `• Invocation: ${b.opening_prayer}` : '',
      !b.is_canceled && b.sacrament_hymn ? `• Sacrament Hymn: ${b.sacrament_hymn}\n  🔗 ${resolveHymnLink(b.sacrament_hymn)}` : '',
      !b.is_canceled && speakers.length > 0 && b.meeting_type !== 'FAST_SUNDAY' ? `• Speakers: ${speakers.map((s) => s.name).join(', ')}` : '',
      !b.is_canceled && b.closing_hymn ? `• Closing Hymn: ${b.closing_hymn}\n  🔗 ${resolveHymnLink(b.closing_hymn)}` : '',
      !b.is_canceled && b.closing_prayer ? `• Benediction: ${b.closing_prayer}\n` : '\n',
      b.cfm_reading ? `📖 *COME, FOLLOW ME:* ${b.cfm_reading}` : '',
      b.cfm_theme ? `Theme: "${b.cfm_theme}"` : '',
      b.scripture_of_the_week ? `Scripture Focus: ${b.scripture_of_the_week}` : '',
      b.cfm_discussion_question ? `Discussion Question: ${b.cfm_discussion_question}\n` : '\n',
      b.birthdays ? `🎂 *BIRTHDAYS THIS WEEK:*\n${b.birthdays}\n` : '',
      b.activities ? `🗓️ *WEEKLY SCHEDULE:*\n${b.activities}\n` : '',
      b.cleaning_group ? `🧹 *BUILDING CLEANING:* ${b.cleaning_group} (Sat @ ${b.cleaning_time || '8:00 AM'})\n` : '',
      `🔗 *Full Mobile Bulletin:* https://smplans.online/visitbulletin\n`,
      `_Visitors and friends are warmly invited to worship with us!_`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    toast.success('WhatsApp bulletin summary copied to clipboard!');
    setTimeout(() => setCopiedText(false), 2500);
  };

  // 3. Direct Share to WhatsApp
  const handleDirectWhatsAppShare = () => {
    const summary = `🏛️ *${b.unit_name || 'Ward'} Sacrament Meeting Bulletin* (${formattedDate})\n\n` +
      (b.theme ? `"${b.theme}"\n\n` : '') +
      `📖 CFM: ${b.cfm_reading || 'Come, Follow Me'}\n` +
      `🎂 Birthdays: ${b.birthdays || 'Wishing all our celebrants joy!'}\n\n` +
      `View full bulletin: https://smplans.online/visitbulletin\n\n` +
      `Join us for Sunday worship!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-xs font-bold text-slate-900">WhatsApp Social Graphic (1080×1350)</h3>
          <p className="text-[11px] text-slate-500">Export high-res social image or copy chat summary</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyWhatsAppText}
            icon={copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            {copiedText ? 'Copied' : 'Copy Text'}
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadImage}
            loading={downloading}
            icon={<Download className="w-3.5 h-3.5" />}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
          >
            Download JPEG
          </Button>
        </div>
      </div>

      {/* Visual Graphic Card Preview (#bulletin-whatsapp-card) */}
      <div
        id="bulletin-whatsapp-card"
        ref={cardRef}
        className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xl flex flex-col"
      >
        {/* Header Banner */}
        <div
          className="text-white p-5 text-center relative overflow-hidden flex-shrink-0"
          style={{ backgroundColor: theme.primaryColor }}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">
            {b.unit_name || 'Latter-day Saint Ward'}
          </p>
          <h2 className="text-lg font-extrabold tracking-tight">SACRAMENT BULLETIN</h2>
          <p className="text-xs opacity-90 mt-0.5">{formattedDate}</p>
          {b.theme && (
            <p className="text-xs italic text-amber-200 mt-1 font-medium">"{b.theme}"</p>
          )}
        </div>

        {/* Content Body - Natural Flow Without Artificial Gaps */}
        <div className="p-4 space-y-3 text-xs flex-grow bg-slate-50/50">
          {/* Celebrants Banner */}
          {b.show_birthdays && (b.birthdays || celebrantsList.length > 0) && (
            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                  <span>🎂</span> BIRTHDAYS THIS WEEK:
                </span>
                {todayCelebrants.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                    🎉 Today: {todayCelebrants.map(c => c.name).join(' & ')}!
                  </span>
                )}
              </div>
              <p className="text-amber-800 font-semibold text-[11px] leading-relaxed">
                {celebrantsList.length > 0
                  ? celebrantsList.map(c => formatCelebrantDisplayName(c, b.date)).join('   ')
                  : (b.birthdays || '')}
              </p>
            </div>
          )}

          {/* CFM Highlight */}
          {b.show_focus && (b.cfm_reading || b.cfm_theme) && (
            <div className="p-2.5 rounded-xl bg-blue-50/90 border border-blue-200 shadow-2xs space-y-1">
              <span className="font-bold text-blue-900 text-[11px] block">
                📖 COME, FOLLOW ME: {b.cfm_reading || 'Study Guide'}
              </span>
              {b.cfm_theme && (
                <p className="text-blue-800 text-[11px] font-semibold italic">"{b.cfm_theme}"</p>
              )}
              {b.scripture_of_the_week && (
                <p className="text-[10.5px] text-blue-700/90 italic line-clamp-2">
                  {b.scripture_of_the_week}
                </p>
              )}
            </div>
          )}

          {/* 2-Column Schedule & Sacrament */}
          <div className="grid grid-cols-2 gap-2.5 text-[11px]">
            {/* Sacrament Outline */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
              <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider border-b border-slate-100 pb-1">
                Order of Service
              </span>
              {b.is_canceled ? (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[10px] leading-snug">
                  <span className="font-bold block">⚠️ No Sacrament Meeting</span>
                  <span>Because {b.cancel_reason || 'stated reason in planner.'}</span>
                </div>
              ) : (
                <div className="space-y-1 text-slate-700 leading-tight">
                  <p className="truncate"><strong>Opening:</strong> {b.opening_hymn ? formatHymnDisplay(b.opening_hymn) : 'Hymn'}</p>
                  <p className="truncate"><strong>Prayer:</strong> {formatHonorificName(b.opening_prayer || '') || 'Member'}</p>
                  <p className="truncate"><strong>Sacrament:</strong> {b.sacrament_hymn ? formatHymnDisplay(b.sacrament_hymn) : 'Hymn'}</p>
                  {b.meeting_type === 'FAST_SUNDAY' ? (
                    <p className="text-emerald-700 font-semibold truncate">• Testimony Bearing</p>
                  ) : speakers.length > 0 ? (
                    <p className="truncate"><strong>Speakers:</strong> {speakers.map(s => formatHonorificName(s.name)).join(', ')}</p>
                  ) : null}
                  <p className="truncate"><strong>Closing:</strong> {b.closing_hymn ? formatHymnDisplay(b.closing_hymn) : 'Hymn'}</p>
                  <p className="truncate"><strong>Benediction:</strong> {formatHonorificName(b.closing_prayer || '') || 'Member'}</p>
                </div>
              )}
            </div>

            {/* Weekly Schedule */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5 flex flex-col justify-between">
              <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider border-b border-slate-100 pb-1">
                Weekly Schedule
              </span>
              <div className="text-slate-700 space-y-1 leading-tight flex-grow">
                {(b.activities || '')
                  .split('\n')
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((act, i) => (
                    <p key={i} className="truncate">{act}</p>
                  ))}
              </div>
              {b.show_cleaning && b.cleaning_group && (
                <div className="pt-1.5 border-t border-slate-100 text-[10px] text-emerald-800 font-medium">
                  <strong>🧹 Cleaning:</strong> {b.cleaning_group} (Sat @ {b.cleaning_time || '8:00 AM'})
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-slate-100 p-2.5 text-center border-t border-slate-200 text-[10px] text-slate-500 font-semibold flex-shrink-0">
          {b.unit_name || 'Ward Meetinghouse'} • smplans.online/visitbulletin
        </div>
      </div>

      {/* Share directly */}
      <Button
        variant="outline"
        onClick={handleDirectWhatsAppShare}
        className="w-full justify-center text-xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-bold"
        icon={<Share2 className="w-3.5 h-3.5 text-emerald-600" />}
      >
        Open in WhatsApp Web / App
      </Button>
    </div>
  );
}
