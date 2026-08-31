import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface SyncFieldDifference {
  key: string;
  label: string;
  currentVal: string;
  plannerVal: string;
}

interface BulletinSyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  differences: SyncFieldDifference[];
  weekLabel: string;
  onConfirm: (selectedKeys: string[]) => void;
}

export function BulletinSyncConfirmModal({
  isOpen,
  onClose,
  differences,
  weekLabel,
  onConfirm,
}: BulletinSyncConfirmModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    differences.map((d) => d.key)
  );

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    setSelectedKeys(differences.map((d) => d.key));
  };

  const deselectAll = () => {
    setSelectedKeys([]);
  };

  const handleApply = () => {
    onConfirm(selectedKeys);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shadow-2xs">
            <Sparkles className="w-4 h-4 text-blue-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Review Changes from Sacrament Planner</h3>
            <p className="text-xs text-slate-500 font-normal">
              Syncing {weekLabel} — Select fields to update without overriding your custom work
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Select All
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-slate-500 hover:underline"
            >
              Deselect All
            </button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Keep My Edits
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={selectedKeys.length === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Update Selected ({selectedKeys.length})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Preserve Your Progress:</span> We noticed existing entries in your bulletin. Uncheck any field you wish to preserve in its current state.
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
          {differences.map((diff) => {
            const isChecked = selectedKeys.includes(diff.key);
            return (
              <div
                key={diff.key}
                onClick={() => toggleKey(diff.key)}
                className={`p-3 transition-colors cursor-pointer flex items-start gap-3 ${
                  isChecked ? 'bg-blue-50/40' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleKey(diff.key)}
                  className="mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-grow space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{diff.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isChecked ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                      {isChecked ? 'Will Update' : 'Keep Current'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-lg bg-slate-100/70 border border-slate-200/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Current Bulletin:
                      </span>
                      <p className="text-slate-700 whitespace-pre-line font-medium">{diff.currentVal || '(Empty)'}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                        Incoming Planner:
                      </span>
                      <p className="text-emerald-950 whitespace-pre-line font-semibold">{diff.plannerVal || '(Empty)'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
