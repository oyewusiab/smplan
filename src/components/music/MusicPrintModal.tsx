import { useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, Music, X } from 'lucide-react';
import type { Planner } from '../../types';

export interface MusicPlanWeek {
  week_id: string;
  date: string;
  meeting_type?: string;
  topics?: string[];
  hymns: {
    opening: string;
    sacrament: string;
    closing: string;
    special?: string;
  };
  music: {
    director: string;
    director_gender?: 'M' | 'F' | '';
    accompanist: string;
    accompanist_gender?: 'M' | 'F' | '';
  };
}

interface MusicPrintModalProps {
  open: boolean;
  onClose: () => void;
  planner: Planner | null;
  weeks: MusicPlanWeek[];
}

export function MusicPrintModal({
  open,
  onClose,
  planner,
  weeks,
}: MusicPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = planner?.month ? monthNames[planner.month - 1] : 'Monthly';
  const unitName = planner?.unit_name || 'Ward';
  const year = planner?.year || new Date().getFullYear();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sacrament Meeting Music Plan (Print View)"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500">
            A4 Portrait document optimized for Organists & Music Directors.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="primary" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Print Music Plan
            </Button>
          </div>
        </div>
      }
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #music-print-sheet, #music-print-sheet * {
            visibility: visible;
          }
          #music-print-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="music-print-sheet"
        ref={printAreaRef}
        className="bg-white p-6 rounded-xl border border-slate-200 text-slate-900 font-sans shadow-sm"
      >
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center">
          <h1 className="text-xl font-bold uppercase tracking-wide text-slate-950">
            Sacrament Meeting Music Plan
          </h1>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            {unitName} • {monthName} {year}
          </p>
        </div>

        {/* Weekly Sections */}
        <div className="space-y-6">
          {weeks.map((wk, idx) => {
            const isFastSunday = wk.meeting_type === 'FAST_SUNDAY';
            return (
              <div key={wk.week_id || idx} className="border border-slate-300 rounded-lg p-4 bg-slate-50/30">
                {/* Week Header */}
                <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3">
                  <h2 className="text-sm font-bold text-slate-900 uppercase">
                    Week {idx + 1} — {wk.date || `Sunday ${idx + 1}`} {isFastSunday ? '(Fast & Testimony Sunday)' : ''}
                  </h2>
                  <span className="text-xs font-medium text-slate-500">
                    SM Music Schedule
                  </span>
                </div>

                {/* Grid of Hymns and Music Leadership */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Hymns */}
                  <div className="space-y-1.5 text-xs">
                    <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                      Weekly Hymns
                    </p>
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-600 w-24">Opening:</span>
                      <span className="font-medium text-slate-900 flex-1 text-right">
                        {wk.hymns.opening || '—'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-600 w-24">Sacrament:</span>
                      <span className="font-bold text-slate-900 flex-1 text-right">
                        {wk.hymns.sacrament || '—'}
                      </span>
                    </div>
                    {wk.hymns.special && (
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-slate-600 w-24">Special / Inter:</span>
                        <span className="font-medium text-slate-900 flex-1 text-right">
                          {wk.hymns.special}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-600 w-24">Closing:</span>
                      <span className="font-medium text-slate-900 flex-1 text-right">
                        {wk.hymns.closing || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Music Service Leadership */}
                  <div className="space-y-1.5 text-xs border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-2 md:pt-0">
                    <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                      Music Service
                    </p>
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-600 w-28">Music Director:</span>
                      <span className="font-medium text-slate-900 flex-1 text-right">
                        {wk.music.director || '—'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-slate-600 w-28">Accompanist:</span>
                      <span className="font-medium text-slate-900 flex-1 text-right">
                        {wk.music.accompanist || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Generated via SM Planner Music System • Standalone Music Overview for Ward Choir & Organists
        </div>
      </div>
    </Modal>
  );
}
