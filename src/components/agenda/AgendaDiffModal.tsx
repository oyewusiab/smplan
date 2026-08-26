import React, { useState, useMemo } from 'react';
import { RefreshCw, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Agenda } from '../../types';

export interface DiffItem {
  key: keyof Agenda;
  label: string;
  oldValue: string;
  newValue: string;
  selected: boolean;
}

interface AgendaDiffModalProps {
  open: boolean;
  onClose: () => void;
  currentAgenda: Partial<Agenda>;
  plannerAgenda: Partial<Agenda>;
  onApplyDiff: (updatedFields: Partial<Agenda>) => void;
}

export function AgendaDiffModal({
  open,
  onClose,
  currentAgenda,
  plannerAgenda,
  onApplyDiff,
}: AgendaDiffModalProps) {
  // Compare fields between current draft and planner week data
  const initialDiffs = useMemo(() => {
    const diffs: DiffItem[] = [];

    const fieldMap: { key: keyof Agenda; label: string }[] = [
      { key: 'presiding', label: 'Presiding Officer' },
      { key: 'conducting', label: 'Conducting Officer' },
      { key: 'music_director', label: 'Music Director (Chorister)' },
      { key: 'organist', label: 'Organist / Accompanist' },
      { key: 'start_time', label: 'Start Time' },
      { key: 'opening_hymn', label: 'Opening Hymn Title' },
      { key: 'opening_hymn_number', label: 'Opening Hymn #' },
      { key: 'opening_prayer', label: 'Invocation (Opening Prayer)' },
      { key: 'sacrament_hymn', label: 'Sacrament Hymn Title' },
      { key: 'sacrament_hymn_number', label: 'Sacrament Hymn #' },
      { key: 'special_music', label: 'Special Music' },
      { key: 'speakers', label: 'Speakers & Program' },
      { key: 'closing_hymn', label: 'Closing Hymn Title' },
      { key: 'closing_hymn_number', label: 'Closing Hymn #' },
      { key: 'closing_prayer', label: 'Benediction (Closing Prayer)' },
      { key: 'ward_branch', label: 'Ward/Branch' },
      { key: 'stake_district', label: 'Stake/District' },
    ];

    fieldMap.forEach(({ key, label }) => {
      const oldVal = String(currentAgenda[key] || '').trim();
      const newVal = String(plannerAgenda[key] || '').trim();
      if (oldVal !== newVal && newVal !== '') {
        diffs.push({
          key,
          label,
          oldValue: oldVal || '(None)',
          newValue: newVal,
          selected: true,
        });
      }
    });

    return diffs;
  }, [currentAgenda, plannerAgenda]);

  const [diffItems, setDiffItems] = useState<DiffItem[]>(initialDiffs);

  // Sync state if initialDiffs change
  React.useEffect(() => {
    setDiffItems(initialDiffs);
  }, [initialDiffs]);

  const toggleSelect = (key: keyof Agenda) => {
    setDiffItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setDiffItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const handleApply = () => {
    const patch: Partial<Agenda> = {};
    diffItems.forEach((item) => {
      if (item.selected) {
        (patch as Record<string, unknown>)[item.key] = plannerAgenda[item.key];
      }
    });
    onApplyDiff(patch);
    onClose();
  };

  const selectedCount = diffItems.filter((d) => d.selected).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Live Planner Sync Safety Net"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Ward Business & Announcements will remain untouched</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedCount === 0}
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              Apply Updates ({selectedCount})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2.5">
          <RefreshCw className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900 mb-0.5">Planner Changes Detected</p>
            <p>
              The Monthly Planner was updated after this agenda was created. Review the changes below and choose which fields to overwrite in this Agenda draft.
            </p>
          </div>
        </div>

        {diffItems.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-lg border border-slate-200">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">Agenda is already up-to-date</p>
            <p className="text-xs text-slate-500 mt-1">No differences found between this Agenda and the Monthly Planner.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b">
              <span>{diffItems.length} field differences detected</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-blue-600 hover:underline font-medium cursor-pointer"
                >
                  Select All
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-slate-500 hover:underline font-medium cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              {diffItems.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 text-sm cursor-pointer transition-colors ${
                    item.selected ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'bg-white hover:bg-slate-50 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelect(item.key)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-xs uppercase tracking-wide">
                      {item.label}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100 line-through truncate max-w-[200px]">
                        {item.oldValue}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-semibold truncate max-w-[220px]">
                        {item.newValue}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
