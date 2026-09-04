import React, { useState, useEffect } from 'react';
import {
  Settings, Sparkles, Plus, Trash2, RotateCcw, Check, Save,
  Users, Clock, MapPin, Shield, Info, X
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import type { OtherAgendaMeetingType, Member } from '../../types';
import {
  LeadershipAgendaSettings,
  loadLeadershipSettings,
  saveLeadershipSettings,
  resetLeadershipSettings,
  autoPopulateAttendeesFromMembers,
  DefaultAttendeeSetting,
} from '../../utils/leadershipAgendaSettings';
import { MemberPicker } from './MemberPicker';
import toast from 'react-hot-toast';

interface LeadershipAgendaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSettingsSaved?: (newSettings: LeadershipAgendaSettings) => void;
}

const MEETING_TABS: { type: OtherAgendaMeetingType; label: string; icon: string }[] = [
  { type: 'BISHOPRIC_MEETING', label: 'Bishopric Meeting', icon: '🏛️' },
  { type: 'WARD_COUNCIL', label: 'Ward Council', icon: '👥' },
  { type: 'WARD_YOUTH_COUNCIL', label: 'Ward Youth Council', icon: '🌱' },
  { type: 'PRESIDENCY_MEETING', label: 'Presidency Meeting', icon: '📖' },
  { type: 'OTHER_MEETING', label: 'Committee / Other', icon: '📋' },
];

export function LeadershipAgendaSettingsModal({
  isOpen,
  onClose,
  members,
  onSettingsSaved,
}: LeadershipAgendaSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<OtherAgendaMeetingType>('BISHOPRIC_MEETING');
  const [settings, setSettings] = useState<LeadershipAgendaSettings>(() => loadLeadershipSettings(members));
  const [saving, setSaving] = useState(false);

  // Reload settings on open
  useEffect(() => {
    if (isOpen) {
      setSettings(loadLeadershipSettings(members));
    }
  }, [isOpen, members]);

  const currentMeetingSetting = settings[activeTab];

  const handleUpdateField = (field: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value,
      },
    }));
  };

  const handleUpdateAttendee = (idx: number, patch: Partial<DefaultAttendeeSetting>) => {
    setSettings((prev) => {
      const attendees = [...prev[activeTab].defaultAttendees];
      attendees[idx] = { ...attendees[idx], ...patch };
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          defaultAttendees: attendees,
        },
      };
    });
  };

  const handleAddAttendeeSlot = () => {
    setSettings((prev) => {
      const attendees = [
        ...prev[activeTab].defaultAttendees,
        {
          id: String(Date.now()),
          calling: 'Leader / Committee Member',
          name: '',
          email: '',
        },
      ];
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          defaultAttendees: attendees,
        },
      };
    });
  };

  const handleRemoveAttendeeSlot = (idx: number) => {
    setSettings((prev) => {
      const attendees = prev[activeTab].defaultAttendees.filter((_, i) => i !== idx);
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          defaultAttendees: attendees,
        },
      };
    });
  };

  const handleAutoMatchFromWard = () => {
    setSettings((prev) => {
      const matchedAttendees = autoPopulateAttendeesFromMembers(prev[activeTab].defaultAttendees, members);
      
      // Auto match presiding & conducting if empty
      let presiding = prev[activeTab].presidingName;
      let conducting = prev[activeTab].conductingName;

      const pAtt = matchedAttendees.find((a) =>
        a.calling.toLowerCase().includes(prev[activeTab].presidingRole.toLowerCase())
      );
      if (pAtt && pAtt.name) presiding = pAtt.name;

      const cAtt = matchedAttendees.find((a) =>
        a.calling.toLowerCase().includes(prev[activeTab].conductingRole.toLowerCase())
      );
      if (cAtt && cAtt.name) conducting = cAtt.name;

      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          presidingName: presiding,
          conductingName: conducting,
          defaultAttendees: matchedAttendees,
        },
      };
    });

    toast.success(`Auto-matched leaders from ward roster for ${currentMeetingSetting.title}!`);
  };

  const handleResetAllToDefaults = () => {
    if (confirm('Are you sure you want to reset all Leadership Agenda defaults back to original template settings?')) {
      const reset = resetLeadershipSettings(members);
      setSettings(reset);
      toast.success('All meeting settings reset to standard defaults!');
    }
  };

  const handleSave = () => {
    setSaving(true);
    try {
      saveLeadershipSettings(settings);
      toast.success('Ward Leadership & Committee Agenda settings saved successfully!');
      if (onSettingsSaved) {
        onSettingsSaved(settings);
      }
      onClose();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-600" />
          <span>Ward Leadership & Committee Agendas — Default Settings</span>
        </div>
      }
      size="4xl"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto px-1 py-1">
        {/* Info Banner */}
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start gap-2.5">
          <Info className="h-4 w-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-900 space-y-0.5">
            <p className="font-bold">Set Default Leadership Roll, Venues & Times</p>
            <p className="text-purple-800">
              Configure the default details for each meeting type below. When anyone creates a new meeting agenda, these default callings, names, time, and venue will be preloaded. Adding an attendee during agenda creation will only apply to that specific meeting and will not alter these saved defaults.
            </p>
          </div>
        </div>

        {/* Meeting Type Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          {MEETING_TABS.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => setActiveTab(tab.type)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === tab.type
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
          {/* Header of Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>{MEETING_TABS.find((t) => t.type === activeTab)?.icon}</span>
                <span>{currentMeetingSetting.title} — Defaults</span>
              </h3>
              <p className="text-2xs text-slate-500">Configure schedule, venue, leadership roles, and standard attendance roll.</p>
            </div>
            <button
              type="button"
              onClick={handleAutoMatchFromWard}
              className="px-3 py-1.5 text-xs font-bold bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300 rounded-lg transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Auto-Match from Ward Directory</span>
            </button>
          </div>

          {/* 1. Meeting Basics */}
          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <Input
                label="Default Meeting Title"
                value={currentMeetingSetting.title}
                onChange={(e) => handleUpdateField('title', e.target.value)}
                placeholder="e.g. Bishopric Meeting"
              />
            </div>
            <div className="sm:col-span-6">
              <Input
                label="Default Venue / Room"
                value={currentMeetingSetting.venue}
                onChange={(e) => handleUpdateField('venue', e.target.value)}
                placeholder="e.g. Bishop's Office / Council Room"
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                type="time"
                label="Default Start Time"
                value={currentMeetingSetting.startTime}
                onChange={(e) => handleUpdateField('startTime', e.target.value)}
              />
            </div>
            <div className="sm:col-span-3">
              <Input
                type="time"
                label="Default End Time"
                value={currentMeetingSetting.endTime}
                onChange={(e) => handleUpdateField('endTime', e.target.value)}
              />
            </div>

            {/* Presiding Officer Default */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Presiding Role</label>
              <input
                type="text"
                placeholder="e.g. Bishop"
                value={currentMeetingSetting.presidingRole}
                onChange={(e) => handleUpdateField('presidingRole', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <MemberPicker
                label="Default Presiding Leader"
                value={currentMeetingSetting.presidingName || ''}
                onChange={(val) => handleUpdateField('presidingName', val)}
                members={members}
                placeholder="Select or type default leader..."
                size="xs"
              />
            </div>

            {/* Conducting Officer Default */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Conducting Role</label>
              <input
                type="text"
                placeholder="e.g. 1st Counselor"
                value={currentMeetingSetting.conductingRole}
                onChange={(e) => handleUpdateField('conductingRole', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <MemberPicker
                label="Default Conducting Leader"
                value={currentMeetingSetting.conductingName || ''}
                onChange={(val) => handleUpdateField('conductingName', val)}
                members={members}
                placeholder="Select or type default leader..."
                size="xs"
              />
            </div>
          </div>

          {/* 2. Suggested Callings & Default Attendance List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Suggested Default Callings & Attendees ({currentMeetingSetting.defaultAttendees.length})</span>
                </h4>
                <p className="text-2xs text-slate-500">
                  Fixed names will be automatically preloaded into the attendance roll for this meeting.
                </p>
              </div>
              <Button
                size="xs"
                variant="outline"
                icon={<Plus className="h-3 w-3" />}
                onClick={handleAddAttendeeSlot}
              >
                Add Calling Slot
              </Button>
            </div>

            <div className="space-y-2">
              {currentMeetingSetting.defaultAttendees.map((att, idx) => (
                <div
                  key={att.id || idx}
                  className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs text-xs"
                >
                  <span className="col-span-1 font-bold text-slate-400 text-center">{idx + 1}.</span>
                  
                  {/* Calling / Role */}
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Calling / Role (e.g. Ward Clerk)..."
                      value={att.calling}
                      onChange={(e) => handleUpdateAttendee(idx, { calling: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Assigned Member Name with Dropdown & Custom Type */}
                  <div className="col-span-4">
                    <MemberPicker
                      value={att.name}
                      onChange={(pickedName) => {
                        const clean = pickedName.replace(/^(brother|sister|elder|bishop|president|bro\.|sis\.|pres\.)\s+/i, '').trim().toLowerCase();
                        const found = members.find(
                          (m) => m.name.toLowerCase() === pickedName.toLowerCase() || m.name.toLowerCase() === clean
                        );
                        handleUpdateAttendee(idx, {
                          name: pickedName,
                          email: found?.email || att.email || '',
                          phone: found?.phone || att.phone || '',
                        });
                      }}
                      members={members}
                      placeholder="Select member..."
                      size="xs"
                    />
                  </div>

                  {/* Email */}
                  <div className="col-span-2">
                    <input
                      type="email"
                      placeholder="Email..."
                      value={att.email || ''}
                      onChange={(e) => handleUpdateAttendee(idx, { email: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-2xs text-slate-600 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendeeSlot(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                      title="Remove calling slot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetAllToDefaults}
            className="text-xs text-slate-500 hover:text-red-600 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={saving}
              className="bg-purple-700 hover:bg-purple-800 text-white"
              icon={<Save className="h-4 w-4" />}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
