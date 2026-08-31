import React, { useRef, useState } from 'react';
import { Download, Copy, Share2, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/Button';
import { getBulletinTheme } from '../../utils/bulletinThemes';
import { resolveHymnLink } from '../../data/bundledHymns';
import type { Bulletin } from '../../types';
import toast from 'react-hot-toast';

interface BulletinWhatsAppCardProps {
  bulletin: Bulletin;
}

export function BulletinWhatsAppCard({ bulletin: b }: BulletinWhatsAppCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!b) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        No bulletin selected. Please select or create a bulletin.
      </div>
    );
  }

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

  // 1. High-Resolution Canvas Export (1080x1350 JPEG)
  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      // Create offscreen 1080x1350 canvas for ultra crisp vector/raster rendering
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
      ctx.fillRect(0, 0, width, 240);

      // Header Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((b.unit_name || 'LATTER-DAY SAINT WARD').toUpperCase(), width / 2, 60);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText('SACRAMENT MEETING BULLETIN', width / 2, 120);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = '26px system-ui, sans-serif';
      ctx.fillText(formattedDate, width / 2, 165);

      if (b.theme) {
        ctx.fillStyle = '#fef08a';
        ctx.font = 'italic 24px system-ui, sans-serif';
        ctx.fillText(`"${b.theme}"`, width / 2, 205);
      }

      // Draw Sections in 2 Columns or stacked layout
      let y = 280;

      // 3. Birthday Celebrants Banner
      if (b.show_birthdays && b.birthdays) {
        ctx.fillStyle = '#fef9c3';
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(50, y, 980, 110, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#854d0e';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🎂 CELEBRATING BIRTHDAYS THIS WEEK', 80, y + 40);

        ctx.fillStyle = '#713f12';
        ctx.font = '600 20px system-ui, sans-serif';
        ctx.fillText(b.birthdays.substring(0, 95), 80, y + 80);

        y += 135;
      }

      // 4. Come Follow Me Highlight
      if (b.show_focus && b.cfm_reading) {
        ctx.fillStyle = '#fffbeb';
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(50, y, 980, 130, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#92400e';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`📖 COME, FOLLOW ME: ${b.cfm_reading}`, 80, y + 40);

        if (b.cfm_theme) {
          ctx.fillStyle = '#78350f';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText(`"${b.cfm_theme}"`, 80, y + 75);
        }

        if (b.cfm_discussion_question) {
          ctx.fillStyle = '#92400e';
          ctx.font = '18px system-ui, sans-serif';
          ctx.fillText(b.cfm_discussion_question.substring(0, 95), 80, y + 108);
        }

        y += 155;
      }

      // 5. Left & Right Blocks: Sacrament Program (Left) + Weekly Schedule (Right)
      const colWidth = 475;
      const leftX = 50;
      const rightX = 555;
      const blockY = y;

      // Left Box: Sacrament Outline
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(leftX, blockY, colWidth, 420, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.primaryColor;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('SACRAMENT PROGRAM', leftX + 25, blockY + 45);

      ctx.fillStyle = '#475569';
      ctx.font = '19px system-ui, sans-serif';
      const progItems = [
        { l: 'Opening Hymn:', v: b.opening_hymn || 'Hymn' },
        { l: 'Invocation:', v: b.opening_prayer || 'Member' },
        { l: 'Sacrament Hymn:', v: b.sacrament_hymn || 'Hymn' },
        { l: 'Closing Hymn:', v: b.closing_hymn || 'Hymn' },
        { l: 'Benediction:', v: b.closing_prayer || 'Member' },
      ];

      progItems.forEach((item) => {
        ctx.fillStyle = '#64748b';
        ctx.fillText(item.l, leftX + 25, progY);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 19px system-ui, sans-serif';
        ctx.fillText(item.v.substring(0, 24), leftX + 175, progY);
        ctx.font = '19px system-ui, sans-serif';
        progY += 32;
      });

      if (b.meeting_type === 'FAST_SUNDAY') {
        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText('• Fast & Testimony Meeting', leftX + 25, progY);
        progY += 28;
      } else if (speakers.length > 0) {
        ctx.fillStyle = '#64748b';
        ctx.fillText('Speakers:', leftX + 25, progY);
        progY += 28;
        speakers.slice(0, 3).forEach((sp) => {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText(`• ${sp.name}`, leftX + 40, progY);
          progY += 28;
        });
      }

      // Right Box: Weekly Activities Schedule
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(rightX, blockY, colWidth, 420, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = theme.primaryColor;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('WEEKLY SCHEDULE', rightX + 25, blockY + 45);

      const actLines = (b.activities || '')
        .split('\n')
        .filter(Boolean)
        .slice(0, 6);

      let actY = blockY + 90;
      ctx.font = '18px system-ui, sans-serif';
      actLines.forEach((line) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillText(line.substring(0, 38), rightX + 25, actY);
        actY += 38;
      });

      // 6. Cleaning Roster Banner at Bottom
      const bottomY = blockY + 445;
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(50, bottomY, 980, 85, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(
        `🧹 CLEANING: ${b.cleaning_group || 'Ward Group'} • Saturday @ ${b.cleaning_time || '8:00 AM'}`,
        80,
        bottomY + 48
      );

      // 7. Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${b.unit_name || 'Latter-day Saint Ward'} • Share with ward members & friends on WhatsApp`,
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
      b.meeting_type === 'FAST_SUNDAY' ? `• Fast & Testimony Meeting (Congregation Testimonies)` : '',
      b.opening_hymn ? `• Opening Hymn: ${b.opening_hymn}\n  🔗 ${resolveHymnLink(b.opening_hymn)}` : '',
      b.opening_prayer ? `• Invocation: ${b.opening_prayer}` : '',
      b.sacrament_hymn ? `• Sacrament Hymn: ${b.sacrament_hymn}\n  🔗 ${resolveHymnLink(b.sacrament_hymn)}` : '',
      speakers.length > 0 && b.meeting_type !== 'FAST_SUNDAY' ? `• Speakers: ${speakers.map((s) => s.name).join(', ')}` : '',
      b.special_music ? `• Special Music: ${b.special_music}\n  🔗 ${resolveHymnLink(b.special_music)}` : '',
      b.closing_hymn ? `• Closing Hymn: ${b.closing_hymn}\n  🔗 ${resolveHymnLink(b.closing_hymn)}` : '',
      b.closing_prayer ? `• Benediction: ${b.closing_prayer}\n` : '\n',
      b.cfm_reading ? `📖 *COME, FOLLOW ME:* ${b.cfm_reading}` : '',
      b.cfm_theme ? `Theme: "${b.cfm_theme}"` : '',
      b.cfm_discussion_question ? `Family Discussion: ${b.cfm_discussion_question}\n` : '\n',
      b.birthdays ? `🎂 *BIRTHDAYS THIS WEEK:*\n${b.birthdays}\n` : '',
      b.activities ? `🗓️ *WEEKLY SCHEDULE:*\n${b.activities}\n` : '',
      b.cleaning_group ? `🧹 *BUILDING CLEANING:* ${b.cleaning_group} (Sat @ ${b.cleaning_time || '8:00 AM'})\n` : '',
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
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
          >
            Download JPEG
          </Button>
        </div>
      </div>

      {/* Visual Graphic Card Preview (#bulletin-whatsapp-card) */}
      <div
        id="bulletin-whatsapp-card"
        ref={cardRef}
        className="rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-xl aspect-[4/5] flex flex-col justify-between"
      >
        {/* Header */}
        <div
          className="text-white p-5 text-center relative overflow-hidden"
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

        {/* Content Body */}
        <div className="p-4 space-y-3 text-xs flex-grow overflow-hidden flex flex-col justify-between">
          {/* Celebrants Banner */}
          {b.show_birthdays && b.birthdays && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <span className="font-bold text-amber-900 text-[11px] block">🎂 BIRTHDAYS THIS WEEK:</span>
              <p className="text-amber-800 font-semibold text-[11px] truncate">{b.birthdays}</p>
            </div>
          )}

          {/* CFM Highlight */}
          {b.show_focus && b.cfm_reading && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
              <span className="font-bold text-blue-900 text-[11px] block">
                📖 COME, FOLLOW ME: {b.cfm_reading}
              </span>
              {b.cfm_theme && <p className="text-blue-800 text-[11px] font-medium italic">"{b.cfm_theme}"</p>}
            </div>
          )}

          {/* 2-Column Schedule & Sacrament */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {/* Sacrament Outline */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">
                Order of Service
              </span>
              <p className="text-slate-600 truncate"><strong>Pres:</strong> {b.presiding || 'Bishopric'}</p>
              <p className="text-slate-600 truncate"><strong>Cond:</strong> {b.conducting || 'Counselor'}</p>
              <p className="text-slate-600 truncate"><strong>Sac:</strong> {b.sacrament_hymn || 'Hymn'}</p>
              {speakers.length > 0 && (
                <p className="text-slate-600 truncate"><strong>Spk:</strong> {speakers.map(s => s.name).join(', ')}</p>
              )}
            </div>

            {/* Weekly Schedule */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">
                Weekly Schedule
              </span>
              <div className="text-slate-600 space-y-0.5 leading-tight">
                {(b.activities || '')
                  .split('\n')
                  .slice(0, 4)
                  .map((act, i) => (
                    <p key={i} className="truncate">{act}</p>
                  ))}
              </div>
            </div>
          </div>

          {/* Cleaning Notice */}
          {b.show_cleaning && b.cleaning_group && (
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
              <span><strong>🧹 Cleaning:</strong> {b.cleaning_group}</span>
              <span className="font-semibold">Sat @ {b.cleaning_time || '8:00 AM'}</span>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="bg-slate-100 p-2.5 text-center border-t border-slate-200 text-[10px] text-slate-500 font-medium">
          {b.unit_name || 'Ward Meetinghouse'} • Welcome to worship with us!
        </div>
      </div>

      {/* Share directly */}
      <Button
        variant="outline"
        onClick={handleDirectWhatsAppShare}
        className="w-full justify-center text-xs bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
        icon={<Share2 className="w-3.5 h-3.5 text-emerald-600" />}
      >
        Open in WhatsApp Web / App
      </Button>
    </div>
  );
}
