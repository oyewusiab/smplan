import React, { useRef, useState, useLayoutEffect } from 'react';
import { Printer, ZoomIn, ZoomOut, RotateCcw, FileText, BookOpen, Layers, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { getBulletinTheme } from '../../utils/bulletinThemes';
import {
  generateStandard1PageA4Html,
  generateStandard2PageHtml,
  generateBiFoldBookletHtml,
} from '../../utils/bulletinPrintEngine';
import type { Bulletin, BulletinLayoutMode } from '../../types';
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
  // Real-time DOM Measurement Hook from Specification
  useLayoutEffect(() => {
    if (layoutMode !== 'standard_1p' || !autoScale) {
      setPdfScale(1);
      return;
    }

    const container = pdfContentRef.current;
    if (!container) return;

    const scrollH = container.scrollHeight;
    const parentH = container.parentElement?.clientHeight || 842; // standard A4 @ ~96dpi = 842px

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
          <div ref={pdfContentRef} className="space-y-4">
            {/* Sheet Header */}
            <div
              className="text-white p-4 text-center rounded-xl relative overflow-hidden"
              style={{ backgroundColor: theme.primaryColor }}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-85 mb-0.5">
                {b.unit_name || 'Latter-day Saint Ward'}{b.stake_name ? ` • ${b.stake_name}` : ''}
              </p>
              <h2 className="text-base font-black tracking-wide">SACRAMENT MEETING BULLETIN</h2>
              <p className="text-xs opacity-95 mt-0.5">{b.date || 'Sunday Service'}</p>
              {b.theme && (
                <p className="text-xs italic text-amber-200 mt-1 font-medium">"{b.theme}"</p>
              )}
            </div>

            {/* Scripture Banner */}
            {b.show_focus && b.scripture_of_the_week && (
              <div
                className="p-2.5 rounded-lg text-xs italic text-slate-700 border-l-4"
                style={{
                  backgroundColor: theme.bgLight,
                  borderColor: theme.secondaryColor,
                }}
              >
                <strong>Scripture Focus:</strong> {b.scripture_of_the_week}
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Left Column: Sacrament Outline & CFM */}
              <div className="space-y-3">
                {b.show_sacrament && (
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1.5">
                    <h3
                      className="font-bold uppercase tracking-wider text-[11px] pb-1 border-b"
                      style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
                    >
                      Sacrament Meeting Outline
                    </h3>
                    <div className="space-y-1 text-[11px]">
                      {b.presiding && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Presiding:</span>
                          <span className="font-semibold text-slate-900">{b.presiding}</span>
                        </div>
                      )}
                      {b.conducting && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Conducting:</span>
                          <span className="font-semibold text-slate-900">{b.conducting}</span>
                        </div>
                      )}
                      {b.opening_hymn && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Opening Hymn:</span>
                          <span className="font-semibold text-slate-900">{b.opening_hymn}</span>
                        </div>
                      )}
                      {b.opening_prayer && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Invocation:</span>
                          <span className="font-semibold text-slate-900">{b.opening_prayer}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Business:</span>
                        <span className="font-semibold text-slate-900">As Announced</span>
                      </div>
                      {b.sacrament_hymn && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Sacrament Hymn:</span>
                          <span className="font-semibold text-slate-900">{b.sacrament_hymn}</span>
                        </div>
                      )}
                      {b.speakers && (
                        <div className="pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Speakers:</span>
                          <p className="text-slate-800 font-medium whitespace-pre-line leading-tight">
                            {typeof b.speakers === 'string'
                              ? b.speakers
                              : Array.isArray(b.speakers)
                              ? (b.speakers as any[]).map((s) => s.name).join('\n')
                              : ''}
                          </p>
                        </div>
                      )}
                      {b.special_music && (
                        <div className="flex justify-between pt-1">
                          <span className="text-slate-500">Special Music:</span>
                          <span className="font-semibold text-slate-900">{b.special_music}</span>
                        </div>
                      )}
                      {b.closing_hymn && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Closing Hymn:</span>
                          <span className="font-semibold text-slate-900">{b.closing_hymn}</span>
                        </div>
                      )}
                      {b.closing_prayer && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Benediction:</span>
                          <span className="font-semibold text-slate-900">{b.closing_prayer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {b.show_focus && b.cfm_reading && (
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                    <h3 className="font-bold text-amber-900 text-[11px]">
                      Come, Follow Me — {b.cfm_reading}
                    </h3>
                    {b.cfm_theme && <p className="font-semibold text-amber-950 text-[11px]">"{b.cfm_theme}"</p>}
                    {b.cfm_discussion_question && (
                      <p className="text-[10px] text-amber-900 leading-tight">
                        <strong>Question:</strong> {b.cfm_discussion_question}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Activities, Birthdays, Cleaning */}
              <div className="space-y-3">
                {b.show_birthdays && b.birthdays && (
                  <div className="p-3 rounded-lg bg-yellow-50/70 border border-yellow-200 space-y-1">
                    <h3 className="font-bold text-yellow-950 text-[11px]">🎂 Birthdays This Week</h3>
                    <p className="text-yellow-900 font-medium text-[11px] leading-tight">{b.birthdays}</p>
                    {b.birthday_message && (
                      <p className="text-[10px] text-yellow-800 italic">{b.birthday_message}</p>
                    )}
                  </div>
                )}

                {b.show_activities && b.activities && (
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <h3
                      className="font-bold uppercase tracking-wider text-[11px] pb-1 border-b"
                      style={{ color: theme.primaryColor, borderColor: theme.primaryColor }}
                    >
                      Weekly Schedule (Mon–Sun)
                    </h3>
                    <div className="text-[10.5px] text-slate-700 whitespace-pre-line leading-relaxed">
                      {b.activities}
                    </div>
                  </div>
                )}

                {b.show_cleaning && b.cleaning_group && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5 text-[11px]">
                    <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider">
                      Building Cleaning
                    </span>
                    <p className="text-slate-700"><strong>Group:</strong> {b.cleaning_group}</p>
                    <p className="text-slate-600">Sat @ {b.cleaning_time || '8:00 AM'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-slate-200 text-[9px] text-slate-400">
              {b.unit_name || 'Latter-day Saint Ward'} • sacrament meeting bulletin • visitors welcome
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
