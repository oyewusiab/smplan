import { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Planner, Agenda, SpeakerItem, SacramentDuties } from '../../types';
import { format, parseISO, isValid } from 'date-fns';

interface PlannerPrintModalProps {
  open: boolean;
  onClose: () => void;
  planner: Planner;
  agendas: Agenda[];
}

export function PlannerPrintModal({ open, onClose, planner, agendas }: PlannerPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const monthYearLabel = format(new Date(planner.year, planner.month - 1), 'MMMM yyyy');
  const unitTitle = `${(planner.unit_name || 'WARD').toUpperCase()} — SACRAMENT MEETING PLAN`;

  // Format date as 02-Aug-2026
  const formatDateDDMMM = (dateStr: string, fallbackWeekIdx: number) => {
    if (!dateStr) return `Week ${fallbackWeekIdx + 1}`;
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) return format(parsed, 'dd-MMM-yyyy');
      const d = new Date(dateStr);
      if (isValid(d)) return format(d, 'dd-MMM-yyyy');
    } catch { /* fallback */ }
    return dateStr;
  };

  // Format person with Brother / Sister / Elder / Bishop / President title
  const formatMemberName = (name: string, gender?: 'M' | 'F' | '', prefix?: string) => {
    if (!name || !name.trim()) return '—';
    const trimmed = name.trim();
    if (
      trimmed.startsWith('Bro.') || trimmed.startsWith('Brother') ||
      trimmed.startsWith('Sis.') || trimmed.startsWith('Sister') ||
      trimmed.startsWith('Elder') || trimmed.startsWith('Bishop') ||
      trimmed.startsWith('President')
    ) {
      return trimmed;
    }
    const chosenPrefix = prefix || (gender === 'F' ? 'Sister' : 'Brother');
    return `${chosenPrefix} ${trimmed}`;
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1150,height=850');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${unitTitle} — ${monthYearLabel}</title>
          <style>
            @page { size: landscape; margin: 8mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 0; padding: 12px; font-size: 11px; line-height: 1.4; background: #fff; }
            .page-container { width: 100%; page-break-after: always; }
            .page-container:last-child { page-break-after: avoid; }
            .meta-header { text-align: center; margin-bottom: 12px; }
            .meta-title { font-size: 17px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0; }
            .meta-subtitle { font-size: 11px; color: #475569; font-weight: 500; }
            .section-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: top; font-size: 11px; word-wrap: break-word; }
            th { background-color: #f1f5f9; font-weight: 700; color: #1e293b; text-transform: uppercase; text-align: center; }
            .th-sub { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: none; text-align: center; font-size: 10px; }
            .speaker-name { font-weight: 700; color: #0f172a; margin-bottom: 2px; }
            .speaker-topic { font-style: italic; color: #334155; margin-bottom: 2px; }
            .speaker-ref { font-style: italic; color: #475569; font-size: 10.5px; }
            .hymn-line { margin-bottom: 4px; }
            .hymn-line strong { font-weight: 600; color: #1e293b; }
            .ft-cell { text-align: center; font-style: italic; color: #64748b; padding: 14px 8px; background-color: #fafafa; }
            .week-num { font-weight: 700; text-align: center; }
            .week-date { font-size: 10.5px; text-align: center; font-weight: 500; color: #334155; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Printable 2-Page Landscape Plan</h2>
            <p className="text-xs text-slate-500">{planner.unit_name} · {monthYearLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<Download className="h-4 w-4" />} onClick={handlePrint}>
              Download PDF
            </Button>
            <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print Landscape
            </Button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable View Container */}
        <div className="p-6 overflow-y-auto space-y-8 bg-slate-100/50">
          <div ref={printRef} className="space-y-10">
            
            {/* PAGE 1: Speakers / Topics / References */}
            <div className="page-container bg-white p-6 rounded-xl shadow-xs border border-slate-200">
              
              <div className="meta-header text-center mb-3">
                <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide mb-1">
                  {unitTitle}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {monthYearLabel} &nbsp;|&nbsp; Venue: {agendas[0]?.venue_override || 'Chapel'} &nbsp;|&nbsp; Time: {agendas[0]?.start_time || 'Not set'} &nbsp;|&nbsp; Conducting: {planner.conducting_officer || 'Obaji, Solomon Emmanuel'}
                </p>
              </div>

              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                PAGE 1 — SPEAKERS/TOPICS/REFERENCES
              </div>

              <table>
                <thead>
                  <tr>
                    <th style={{ width: '6%' }}>WK</th>
                    <th style={{ width: '14%' }}>DATE</th>
                    <th style={{ width: '26.6%' }}>SPEAKER 1</th>
                    <th style={{ width: '26.6%' }}>SPEAKER 2</th>
                    <th style={{ width: '26.6%' }}>SPEAKER 3</th>
                  </tr>
                  <tr>
                    <th className="th-sub"></th>
                    <th className="th-sub"></th>
                    <th className="th-sub">Name / Topic & Reference</th>
                    <th className="th-sub">Name / Topic & Reference</th>
                    <th className="th-sub">Name / Topic & Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {agendas.map((ag, idx) => {
                    let speakers: SpeakerItem[] = [];
                    try {
                      speakers = typeof ag.speakers === 'string' ? JSON.parse(ag.speakers) : (ag.speakers || []);
                    } catch { speakers = []; }

                    const isFT = ag.type_of_meeting === 'FAST_SUNDAY';
                    const isCanceled = ag.is_canceled;
                    const dateFormatted = formatDateDDMMM(ag.date, idx);

                    return (
                      <tr key={ag.agenda_id || idx}>
                        <td className="week-num">{idx + 1}</td>
                        <td className="week-date">{dateFormatted}</td>
                        {isCanceled || isFT ? (
                          <td colSpan={3} className="ft-cell">
                            {isCanceled ? `Meeting Canceled — ${ag.cancel_reason || 'No planned speakers'}` : 'Fast & Testimony Sunday — No Planned Speakers'}
                          </td>
                        ) : (
                          <>
                            <td>
                              {speakers[0] && speakers[0].name ? (
                                <div>
                                  <div className="speaker-name font-bold text-slate-900">{formatMemberName(speakers[0].name, speakers[0].gender, speakers[0].prefix)}</div>
                                  {speakers[0].topic && <div className="speaker-topic text-xs text-slate-700 italic"><strong>Topic:</strong> {speakers[0].topic}</div>}
                                  {speakers[0].scripture_ref && <div className="speaker-ref text-xs text-slate-600 italic"><strong>Ref:</strong> {speakers[0].scripture_ref}</div>}
                                </div>
                              ) : <span className="text-slate-400 italic">—</span>}
                            </td>
                            <td>
                              {speakers[1] && speakers[1].name ? (
                                <div>
                                  <div className="speaker-name font-bold text-slate-900">{formatMemberName(speakers[1].name, speakers[1].gender, speakers[1].prefix)}</div>
                                  {speakers[1].topic && <div className="speaker-topic text-xs text-slate-700 italic"><strong>Topic:</strong> {speakers[1].topic}</div>}
                                  {speakers[1].scripture_ref && <div className="speaker-ref text-xs text-slate-600 italic"><strong>Ref:</strong> {speakers[1].scripture_ref}</div>}
                                </div>
                              ) : <span className="text-slate-400 italic">—</span>}
                            </td>
                            <td>
                              {speakers[2] && speakers[2].name ? (
                                <div>
                                  <div className="speaker-name font-bold text-slate-900">{formatMemberName(speakers[2].name, speakers[2].gender, speakers[2].prefix)}</div>
                                  {speakers[2].topic && <div className="speaker-topic text-xs text-slate-700 italic"><strong>Topic:</strong> {speakers[2].topic}</div>}
                                  {speakers[2].scripture_ref && <div className="speaker-ref text-xs text-slate-600 italic"><strong>Ref:</strong> {speakers[2].scripture_ref}</div>}
                                </div>
                              ) : <span className="text-slate-400 italic">—</span>}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                  {agendas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">No scheduled weeks configured</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGE 2: Hymns / Sacrament / Prayers */}
            <div className="page-container bg-white p-6 rounded-xl shadow-xs border border-slate-200">
              
              <div className="meta-header text-center mb-3">
                <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-wide mb-1">
                  {unitTitle}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {monthYearLabel} &nbsp;|&nbsp; Venue: {agendas[0]?.venue_override || 'Chapel'} &nbsp;|&nbsp; Time: {agendas[0]?.start_time || 'Not set'} &nbsp;|&nbsp; Conducting: {planner.conducting_officer || 'Obaji, Solomon Emmanuel'}
                </p>
              </div>

              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                PAGE 2 — HYMNS / SACRAMENT / PRAYERS
              </div>

              <table>
                <thead>
                  <tr>
                    <th style={{ width: '14%' }}>WEEK</th>
                    <th style={{ width: '25%' }}>HYMNS</th>
                    <th style={{ width: '23%' }}>SACRAMENT ADMINISTRATION</th>
                    <th style={{ width: '23%' }}>PRAYER</th>
                    <th style={{ width: '15%' }}>NOTE</th>
                  </tr>
                  <tr>
                    <th className="th-sub"></th>
                    <th className="th-sub">Opening / Sacrament / Closing</th>
                    <th className="th-sub">Preparing / Blessing / Passing</th>
                    <th className="th-sub">Invocation / Benediction</th>
                    <th className="th-sub"></th>
                  </tr>
                </thead>
                <tbody>
                  {agendas.map((ag, idx) => {
                    let duties: SacramentDuties = { preparing: [], blessing: [], passing: [] };
                    try {
                      duties = typeof ag.sacrament_duties === 'string' ? JSON.parse(ag.sacrament_duties) : (ag.sacrament_duties || duties);
                    } catch { duties = { preparing: [], blessing: [], passing: [] }; }

                    const dateFormatted = formatDateDDMMM(ag.date, idx);

                    const isCanceled = ag.is_canceled;

                    return (
                      <tr key={ag.agenda_id || idx}>
                        <td className="text-center">
                          <div className="week-num">{idx + 1}</div>
                          <div className="week-date">{dateFormatted}</div>
                        </td>
                        {isCanceled ? (
                          <td colSpan={3} className="ft-cell">
                            Meeting Canceled — {ag.cancel_reason || 'No planned sacrament meeting'}
                          </td>
                        ) : (
                          <>
                            <td>
                              <div className="hymn-line">
                                <strong>Opening:</strong> {ag.opening_hymn ? `${ag.opening_hymn_number ? ag.opening_hymn_number + ', ' : ''}${ag.opening_hymn}` : '—'}
                              </div>
                              <div className="hymn-line">
                                <strong>Sacrament:</strong> {ag.sacrament_hymn ? `${ag.sacrament_hymn_number ? ag.sacrament_hymn_number + ', ' : ''}${ag.sacrament_hymn}` : '—'}
                              </div>
                              <div className="hymn-line">
                                <strong>Closing:</strong> {ag.closing_hymn ? `${ag.closing_hymn_number ? ag.closing_hymn_number + ', ' : ''}${ag.closing_hymn}` : '—'}
                              </div>
                            </td>
                            <td>
                              <div className="mb-1">
                                <strong>Preparing:</strong> {duties.preparing && duties.preparing.length > 0 ? duties.preparing.join(', ') : '—'}
                              </div>
                              <div className="mb-1">
                                <strong>Blessing:</strong> {duties.blessing && duties.blessing.length > 0 ? duties.blessing.join(', ') : '—'}
                              </div>
                              <div>
                                <strong>Passing:</strong> {duties.passing && duties.passing.length > 0 ? duties.passing.join(', ') : '—'}
                              </div>
                            </td>
                            <td>
                              <div className="mb-1.5">
                                <strong>Invocation:</strong> {formatMemberName(ag.opening_prayer, ag.opening_prayer_gender, ag.opening_prayer_prefix)}
                              </div>
                              <div>
                                <strong>Benediction:</strong> {formatMemberName(ag.closing_prayer, ag.closing_prayer_gender, ag.closing_prayer_prefix)}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="text-slate-600">
                          {ag.week_notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {agendas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">No scheduled weeks configured</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3 bg-slate-50 gap-3">
          <Button variant="outline" onClick={onClose}>Close Preview</Button>
          <Button icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>Print / Download PDF</Button>
        </div>
      </div>
    </div>
  );
}
