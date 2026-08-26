import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Calendar, Plus, Trash2, UserX, Check } from 'lucide-react';
import type { Member } from '../../types';

export interface UnavailabilityRecord {
  id: string;
  memberName: string;
  date: string;
  reason?: string;
}

interface MusicAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  records: UnavailabilityRecord[];
  onSaveRecords: (records: UnavailabilityRecord[]) => void;
  saving?: boolean;
}

export function MusicAvailabilityModal({
  open,
  onClose,
  members,
  records,
  onSaveRecords,
  saving = false,
}: MusicAvailabilityModalProps) {
  const [list, setList] = useState<UnavailabilityRecord[]>(records);
  const [newMember, setNewMember] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');

  const memberOptions = members.map((m) => ({
    value: m.name.replace(/^(Sister|Brother|Sis\.|Bro\.|Elder)\s+/i, '').trim(),
    label: `${m.name} (${m.organisation || 'Ward'})`,
  }));

  const handleAdd = () => {
    if (!newMember || !newDate) return;
    const item: UnavailabilityRecord = {
      id: 'UNAV_' + Date.now().toString(36),
      memberName: newMember,
      date: newDate,
      reason: newReason || 'Out of town / Vacation',
    };
    setList([...list, item]);
    setNewMember('');
    setNewDate('');
    setNewReason('');
  };

  const handleRemove = (id: string) => {
    setList(list.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    onSaveRecords(list);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Organist & Chorister Availability Matrix"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500">
            Warns automatically if an accompanist/conductor is scheduled while away.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={handleSave} loading={saving}>
              Save Matrix
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Add Record Form */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <UserX className="h-4 w-4 text-amber-600" />
            <span>Add Unavailability / Away Date</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Select
              label="Member"
              options={memberOptions}
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              placeholder="Select Leader"
            />
            <Input
              label="Unavailable Date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <Input
              label="Reason (Optional)"
              placeholder="e.g. Vacation, Stake Trip"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={handleAdd}
              disabled={!newMember || !newDate}
            >
              Add to Matrix
            </Button>
          </div>
        </div>

        {/* Existing Records List */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            Tracked Unavailability Dates ({list.length})
          </div>

          {list.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              No unavailability records entered. All choristers & organists are currently marked available.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 max-h-60 overflow-y-auto">
              {list.map((r) => (
                <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{r.memberName}</span>
                    <span className="text-slate-500 mx-2">•</span>
                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{r.date}</span>
                    {r.reason && (
                      <span className="text-slate-500 italic ml-2">({r.reason})</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(r.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
