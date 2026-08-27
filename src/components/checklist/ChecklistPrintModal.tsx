import { useRef } from 'react';
import { Printer, X, CheckSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ChecklistItem } from '../../types';

interface ChecklistPrintModalProps {
  open: boolean;
  onClose: () => void;
  items: ChecklistItem[];
  weekLabel: string;
  dateStr?: string;
  unitName?: string;
  venue?: string;
  time?: string;
  conducting?: string;
}

export function ChecklistPrintModal({
  open,
  onClose,
  items,
  weekLabel,
  dateStr,
  unitName = 'Obantoko Ward',
  venue = 'Main Chapel',
  time = '9:00 AM',
  conducting,
}: ChecklistPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  const doneCount = items.filter((i) => i.status === 'DONE' || i.status === true).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* Print-specific style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-checklist-area, #printable-checklist-area * {
            visibility: visible !important;
          }
          #printable-checklist-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Printable Clipboard Sheet</h3>
              <p className="text-xs text-slate-500">Border-aligned layout for preparation room clipboards</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print Sheet
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Preview */}
        <div className="p-6 overflow-y-auto bg-slate-100/60 flex-1">
          <div
            id="printable-checklist-area"
            ref={printRef}
            className="bg-white rounded-xl border border-slate-300 p-8 shadow-sm text-slate-900 font-sans"
          >
            {/* Church Top Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-5 text-center">
              <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                The Church of Jesus Christ of Latter-day Saints
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight mt-0.5">
                {unitName} — Sunday Readiness Checklist
              </h1>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-xs font-semibold text-slate-700">
                <span>📅 {weekLabel}{dateStr ? ` (${dateStr})` : ''}</span>
                <span>•</span>
                <span>🏛 Venue: {venue}</span>
                <span>•</span>
                <span>⏰ Time: {time}</span>
                {conducting && (
                  <>
                    <span>•</span>
                    <span>Conducting: {conducting}</span>
                  </>
                )}
              </div>
            </div>

            {/* Checklist Table */}
            <div className="border border-slate-800 rounded-none overflow-hidden mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 border-r border-slate-700 w-10 text-center font-bold">#</th>
                    <th className="py-2.5 px-4 border-r border-slate-700 font-bold">Preparation Task</th>
                    <th className="py-2.5 px-4 border-r border-slate-700 w-44 font-bold">Responsible Person</th>
                    <th className="py-2.5 px-3 w-28 text-center font-bold">Sign-off / Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                        No checklist items for this Sunday yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const isDone = item.status === 'DONE' || item.status === true;
                      return (
                        <tr key={item.checklist_id || idx} className="hover:bg-slate-50">
                          <td className="py-3 px-3 border-r border-slate-300 text-center font-bold text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-300 font-medium text-slate-900">
                            <span className={isDone ? 'line-through text-slate-400' : ''}>
                              {item.task}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-r border-slate-300 font-medium text-slate-800">
                            {item.responsible ? (
                              item.responsible
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center justify-center h-6 w-6 border-2 border-slate-400 rounded">
                              {isDone ? <span className="text-slate-900 font-extrabold text-xs">✓</span> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Preparation Notes & Sign-off Footer */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-300 pt-4 text-[11px] text-slate-600">
              <div>
                <p className="font-bold text-slate-800 uppercase mb-1">Morning Setup Instructions:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  <li>Please arrive at least 30 minutes before Sacrament meeting begins.</li>
                  <li>Ensure sacrament trays and water cups are sealed with clean white linen.</li>
                  <li>Check audio microphone levels and hymn numbers on physical board.</li>
                </ul>
              </div>

              <div className="border border-slate-300 rounded p-3 bg-slate-50 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800">Readiness Score:</span>
                  <span className="font-black text-xs text-slate-900">{doneCount}/{totalCount} ({pct}%)</span>
                </div>
                <div className="pt-4 border-t border-dashed border-slate-300 flex justify-between items-center text-slate-500">
                  <span>Bishopric Signature: __________________</span>
                  <span>Time: ________</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-white">
          <span className="text-xs text-slate-500">
            Preview formatted for standard A4 / Letter clipboard printing.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
