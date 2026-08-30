import React, { useRef, useState, useLayoutEffect } from 'react';
import { Printer, FileText, BookOpen, Layers, Clock, Calendar, QrCode, Heart, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { getBulletinTheme } from '../../utils/bulletinThemes';
import {
  generateStandard1PageA4Html,
  generateStandard2PageHtml,
  generateBiFoldBookletHtml,
} from '../../utils/bulletinPrintEngine';
import type { Bulletin, BulletinLayoutMode, NextActivityItem } from '../../types';
import toast from 'react-hot-toast';

interface BulletinPrintPreviewProps {
  bulletin: Bulletin;
}

export function BulletinPrintPreview({ bulletin: b }: BulletinPrintPreviewProps) {
  const [layoutMode, setLayoutMode] = useState<BulletinLayoutMode>('standard_1p');
  const [autoScale, setAutoScale] = useState(true);
  const [pdfScale, setPdfScale] = useState(1);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const theme = getBulletinTheme(b.color_theme);

  // ─── Auto-Scaling Single-Page Guarantee Engine (useLayoutEffect) ─────────────
  useLayoutEffect(() => {
    if (layoutMode !== 'standard_1p' || !autoScale) {
      setPdfScale(1);
      return;
    }

    const container = pdfContentRef.current;
    if (!container) return;

    const scrollH = container.scrollHeight;
    const parentH = container.parentElement?.clientHeight || 842;

    if (scrollH > parentH) {
      const newScale = (parentH - 8) / scrollH;
      setPdfScale(Math.max(0.45, Math.min(1, newScale)));
    } else {
      setPdfScale(1);
    }
  }, [b, layoutMode, autoScale]);

  // Handle Browser Print
  const handlePrint = () => {
    let html = '';
    if (layoutMode === 'standard_1p') {
      html = generateStandard1PageA4Html(b);
    } else if (layoutMode === 'standard_2p') {
      html = generateStandard2PageHtml(b);
    } else {
      html = generateBiFoldBookletHtml(b);
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      toast.error('Please allow popups to print the bulletin.');
      return;
    }

    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  const next5List: NextActivityItem[] = (b.next_activities_list && b.next_activities_list.length > 0)
    ? b.next_activities_list
    : [];

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Layout Modes */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setLayoutMode('standard_1p')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              layoutMode === 'standard_1p'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Standard 1-Page A4
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('standard_2p')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              layoutMode === 'standard_2p'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Standard 2-Page
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('bifold_booklet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              layoutMode === 'bifold_booklet'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Bi-Fold 4-Page Booklet
          </button>
        </div>

        {/* Auto-Scale & Print Controls */}
        <div className="flex items-center gap-2">
          {layoutMode === 'standard_1p' && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScale}
                  onChange={(e) => setAutoScale(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-slate-700">Auto-Fit 1 Page</span>
              </label>
              {autoScale && pdfScale < 1 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                  {Math.round(pdfScale * 100)}% scale
                </span>
              )}
            </div>
          )}

          <Button
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs"
          >
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Interactive Sheet Preview Frame */}
      <div className="bg-slate-200/80 p-4 sm:p-8 rounded-3xl border border-slate-300 overflow-auto flex justify-center min-h-[600px]">
        {/* A4 Sheet Container */}
        <div
          className={`bg-white shadow-2xl transition-transform origin-top duration-200 ${
            layoutMode === 'bifold_booklet'
              ? 'w-[842px] min-h-[595px] p-6'
              : 'w-[595px] min-h-[842px] p-6'
          }`}
          style={{
            transform: `scale(${layoutMode === 'standard_1p' ? pdfScale : 1})`,
            transformOrigin: 'top center',
          }}
        >
          <div ref={pdfContentRef} className="space-y-3.5">
            {/* Sheet Header */}
            <div
              className="text-white p-3.5 text-center rounded-xl relative overflow-hidden"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-85 mb-0.5">
                {b.unit_name || 'Latter-day Saint Ward'}{b.stake_name ? ` • ${b.stake_name}` : ''}
              </p>
              <h2 className="text-base font-black tracking-wide">SACRAMENT MEETING BULLETIN</h2>
              <p className="text-xs opacity-95 mt-0.5">{b.date || 'Sunday Service'}</p>
              {b.theme && (
                <p className="text-xs italic text-amber-200 mt-0.5 font-medium">"{b.theme}"</p>
              )}
            </div>

            {/* Scripture Banner */}
            {b.show_focus && b.scripture_of_the_week && (
              <div
                className="p-2 rounded-lg text-xs italic text-slate-700 border-l-4"
                style={{
                  backgroundColor: theme.bgLight,
                  borderColor: theme.secondaryColor,
                }}
              >
                <strong>Scripture Focus:</strong> {b.scripture_of_the_week}
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-2 gap-3.5 text-xs">
              {/* Left Column: Sacrament Outline, CFM Study Guide & Bishopric Message */}
              <div className="space-y-3">
                {b.show_sacrament && (
                  <div className="p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: theme.primaryColor }}>
                      <h3 className="font-bold uppercase tracking-wider text-[10.5px]" style={{ color: theme.primaryColor }}>
                        Sacrament Meeting Outline
                      </h3>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800">
                        {b.meeting_type === 'FAST_SUNDAY' ? 'Fast & Testimony' : 'Sacrament Service'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[10.5px]">
                      {b.opening_hymn && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Opening Hymn:</span>
                          <span className="font-semibold text-slate-900">{b.opening_hymn}</span>
                        </div>
                      )}
                      {b.opening_prayer && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Invocation:</span>
                          <span className="font-semibold text-slate-900">{b.opening_prayer}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Business:</span>
                        <span className="font-semibold text-slate-900">As Announced</span>
                      </div>
                      {b.sacrament_hymn && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Sacrament Hymn:</span>
                          <span className="font-semibold text-slate-900">{b.sacrament_hymn}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">The Sacrament:</span>
                        <span className="font-semibold text-slate-900">Aaronic Priesthood</span>
                      </div>

                      {b.meeting_type === 'FAST_SUNDAY' ? (
                        <div className="p-1.5 rounded bg-emerald-50 border-l-2 border-emerald-500 my-1">
                          <span className="text-[10px] font-bold text-emerald-800">Testimonies: </span>
                          <span className="text-[10px] text-emerald-950">Bearing of Testimonies by Congregation</span>
                        </div>
                      ) : b.speakers ? (
                        <div className="pt-1 border-t border-slate-100">
                          <span className="text-[9.5px] font-bold text-slate-500 block mb-0.5">Speakers:</span>
                          <p className="text-slate-800 font-medium whitespace-pre-line leading-tight text-[10px]">
                            {typeof b.speakers === 'string'
                              ? b.speakers
                              : Array.isArray(b.speakers)
                              ? (b.speakers as any[]).map((s) => `${s.name}${s.topic ? ' — "' + s.topic + '"' : ''}`).join('\n')
                              : ''}
                          </p>
                        </div>
                      ) : null}

                      {b.special_music && (
                        <div className="flex justify-between pt-0.5">
                          <span className="text-slate-500 font-medium">Special Music:</span>
                          <span className="font-semibold text-slate-900">{b.special_music}</span>
                        </div>
                      )}
                      {b.closing_hymn && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Closing Hymn:</span>
                          <span className="font-semibold text-slate-900">{b.closing_hymn}</span>
                        </div>
                      )}
                      {b.closing_prayer && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Benediction:</span>
                          <span className="font-semibold text-slate-900">{b.closing_prayer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 3: Come Follow Me (All 6 Fields) */}
                {b.show_focus && (b.cfm_reading || b.cfm_theme) && (
                  <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1 text-[10px]">
                    <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                      <h3 className="font-bold text-amber-900 text-[10.5px]">
                        Come, Follow Me Study Guide
                      </h3>
                      {b.cfm_reading && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900">
                          {b.cfm_reading}
                        </span>
                      )}
                    </div>
                    {b.cfm_theme && (
                      <p className="font-bold text-amber-950 text-[10.5px]">{b.cfm_theme}</p>
                    )}
                    {b.cfm_introduction && (
                      <p className="italic text-amber-900 text-[9.5px] leading-tight">{b.cfm_introduction}</p>
                    )}
                    {b.cfm_ideas_for_learning && (
                      <div className="text-amber-900 whitespace-pre-line leading-tight text-[9.5px]">
                        <strong>Ideas for Learning:</strong><br />
                        {b.cfm_ideas_for_learning}
                      </div>
                    )}
                    {(b.cfm_reflection || b.cfm_discussion_question) && (
                      <div className="p-1.5 rounded bg-amber-100/70 border-l-2 border-amber-500 text-amber-950 text-[9.5px]">
                        <strong>Reflection:</strong> {b.cfm_reflection || b.cfm_discussion_question}
                      </div>
                    )}
                    {b.cfm_url && (
                      <p className="text-[8.5px] text-amber-800 truncate">
                        <strong>Lesson Link:</strong> {b.cfm_url}
                      </p>
                    )}
                  </div>
                )}

                {/* Section 4: Bishopric Message */}
                {b.show_bishopric && b.bishopric_message && (
                  <div className="p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <h3 className="font-bold uppercase tracking-wider text-[10px] text-slate-800 pb-0.5 border-b border-slate-100">
                      Message from the Bishopric
                    </h3>
                    <p className="text-[10px] text-slate-700 leading-relaxed whitespace-pre-line">
                      {b.bishopric_message}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Birthdays, Activities, Next 5, Cleaning, Missionaries, QR */}
              <div className="space-y-3">
                {/* Birthday Celebrants Frame */}
                {b.show_birthdays && b.birthdays && (
                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/60 border border-amber-300 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between pb-0.5 border-b border-amber-200">
                      <h3 className="font-bold text-amber-950 text-[10.5px] flex items-center gap-1">
                        🎂 Birthday Celebrants (This Week)
                      </h3>
                      <span className="text-[8px] font-extrabold bg-amber-300 text-amber-900 px-1 py-0.2 rounded">
                        CELEBRATION
                      </span>
                    </div>
                    <p className="text-amber-900 font-bold text-[10.5px] leading-tight">{b.birthdays}</p>
                    {b.birthday_message && (
                      <p className="text-[9.5px] text-amber-800 italic bg-white/70 p-1 rounded">
                        {b.birthday_message}
                      </p>
                    )}
                  </div>
                )}

                {/* Weekly Activities Schedule */}
                {b.show_activities && (b.activities || (b.activities_list && b.activities_list.length > 0)) && (
                  <div className="p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <h3
                      className="font-bold uppercase tracking-wider text-[10.5px] pb-1 border-b"
                      style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
                    >
                      Weekly Schedule (Mon–Sun)
                    </h3>
                    {b.activities_list && b.activities_list.length > 0 ? (
                      <div className="space-y-1">
                        {b.activities_list.map((act, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] border-b border-slate-50 pb-0.5">
                            <span className="font-bold text-slate-900 w-16">{act.day}</span>
                            <span className="text-slate-700 flex-grow font-medium">{act.activity}</span>
                            <span className="text-slate-500 text-[9px] font-semibold flex-shrink-0">{act.time} [{act.scope || 'Ward'}]</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-700 whitespace-pre-line leading-relaxed">
                        {b.activities}
                      </div>
                    )}
                  </div>
                )}

                {/* Next 5 Activities (Outlook) */}
                {next5List.length > 0 && (
                  <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-200 space-y-1">
                    <div className="flex items-center justify-between pb-0.5 border-b border-indigo-100">
                      <h3 className="font-bold uppercase tracking-wider text-[9.5px] text-indigo-900 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-600" />
                        Next 5 Activities (Calendar Outlook)
                      </h3>
                    </div>
                    <div className="space-y-0.5 text-[9.5px]">
                      {next5List.map((act, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-indigo-100/40 pb-0.5">
                          <span className="font-bold text-indigo-950 w-14">{act.date}</span>
                          <span className="text-slate-800 flex-grow">{act.activity}</span>
                          <span className="text-[8.5px] font-bold px-1 rounded bg-white text-indigo-800 border border-indigo-200">
                            {act.scope || 'Ward'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Building Cleaning */}
                {b.show_cleaning && b.cleaning_group && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5 text-[10px]">
                    <span className="font-bold text-slate-800 block text-[9.5px] uppercase tracking-wider">
                      Building Cleaning Assignment
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Group:</span>
                      <span className="font-semibold text-slate-900">{b.cleaning_group}</span>
                    </div>
                    {b.cleaning_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date:</span>
                        <span className="font-semibold text-slate-800">
                          {b.cleaning_date} @ {b.cleaning_time || '8:00 AM'}
                        </span>
                      </div>
                    )}
                    {b.cleaning_instructions && (
                      <p className="text-[9px] text-slate-500 italic pt-0.5">{b.cleaning_instructions}</p>
                    )}
                  </div>
                )}

                {/* Full-Time Missionaries */}
                {b.show_missionary && b.missionaries && (
                  <div className="p-2 rounded-lg border border-slate-200 text-[10px] space-y-0.5">
                    <span className="font-bold text-slate-800 block text-[9.5px] uppercase tracking-wider">
                      Full-Time Missionaries
                    </span>
                    <p className="text-slate-700 whitespace-pre-line text-[9.5px] leading-tight">{b.missionaries}</p>
                  </div>
                )}

                {/* Dual QR Codes */}
                {b.show_qr && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[9px] text-slate-600 gap-2">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <span>Scan for FamilySearch & Gospel Library study links</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-slate-200 text-[9px] text-slate-400">
              {b.unit_name || 'Latter-day Saint Ward'} • Sacrament Meeting Bulletin • Visitors Welcome
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
