import React, { useState, useMemo } from 'react';
import type { OtherAgendaAttendee, Member } from '../../types';
import { UserPlus, Check, X, Users, Edit2, Plus } from 'lucide-react';
import { formatHonorificName } from '../../utils/memberTitle';

interface AttendeeSelectPickerProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  attendees: OtherAgendaAttendee[];
  onAddAttendeeToRoll: (newAttendee: OtherAgendaAttendee) => void;
  members: Member[];
  placeholder?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

export function AttendeeSelectPicker({
  label,
  value,
  onChange,
  attendees,
  onAddAttendeeToRoll,
  members,
  placeholder = 'Select from attendance...',
  className = '',
  size = 'sm',
}: AttendeeSelectPickerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newAttendeeCalling, setNewAttendeeCalling] = useState('');

  // Clean, non-empty list of unique attendee names
  const validAttendees = useMemo(() => {
    return attendees.filter((a) => a.name && a.name.trim().length > 0);
  }, [attendees]);

  // Check if current value exists in attendees
  const isValueInAttendance = useMemo(() => {
    if (!value) return true;
    return validAttendees.some(
      (a) => a.name.trim().toLowerCase() === value.trim().toLowerCase()
    );
  }, [validAttendees, value]);

  const handleSelectChange = (selectedVal: string) => {
    if (selectedVal === '__ADD_NEW__') {
      setShowAddModal(true);
      return;
    }
    onChange(selectedVal);
  };

  const handleConfirmAddAttendee = () => {
    if (!newAttendeeName.trim()) return;

    const trimmedName = newAttendeeName.trim();
    // Lookup member in ward directory to find matching calling / email
    const cleanLookup = trimmedName
      .replace(/^(brother|sister|elder|bishop|president|bro\.|sis\.|pres\.)\s+/i, '')
      .trim()
      .toLowerCase();

    const foundMember = members.find(
      (m) => m.name.toLowerCase() === trimmedName.toLowerCase() || m.name.toLowerCase() === cleanLookup
    );

    const formattedName = foundMember
      ? formatHonorificName(foundMember.name, foundMember, foundMember.gender)
      : trimmedName;

    const calling = newAttendeeCalling.trim() || foundMember?.calling || 'Guest / Leader';
    const email = foundMember?.email || '';
    const phone = foundMember?.phone || '';

    const newAttendee: OtherAgendaAttendee = {
      name: formattedName,
      calling,
      email,
      phone,
      present: true,
    };

    onAddAttendeeToRoll(newAttendee);
    onChange(formattedName);
    setNewAttendeeName('');
    setNewAttendeeCalling('');
    setShowAddModal(false);
  };

  const py = size === 'xs' ? 'py-1 text-xs' : 'py-1.5 text-xs';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">{label}</label>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-2xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
            title="Add a person to this meeting's attendance"
          >
            <UserPlus className="h-3 w-3" />
            <span>+ Add to Attendance</span>
          </button>
        </div>
      )}

      {!showAddModal ? (
        <div className="flex items-center gap-1">
          <select
            value={value}
            onChange={(e) => handleSelectChange(e.target.value)}
            className={`w-full rounded-lg border border-slate-300 bg-white px-2.5 ${py} font-medium text-slate-900 focus:border-blue-500 focus:outline-none shadow-2xs truncate`}
          >
            <option value="">{placeholder}</option>
            {/* If current value is not in attendance, show it as an existing selection */}
            {value && !isValueInAttendance && (
              <option value={value}>
                ⚠️ {value} (Not yet in attendance roll)
              </option>
            )}

            {validAttendees.map((att, idx) => (
              <option key={idx} value={att.name}>
                {att.name} {att.calling ? `— (${att.calling})` : ''}
              </option>
            ))}

            <option value="__ADD_NEW__">➕ + Add New Person to Attendance...</option>
          </select>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition shrink-0 cursor-pointer shadow-2xs"
            title="Add new person to attendance roll"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        /* Inline Quick Add to Attendance */
        <div className="p-2 bg-blue-50/90 border border-blue-200 rounded-lg space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-2xs font-bold text-blue-950">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-600" />
              Add Person to This Meeting's Attendance:
            </span>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-12 gap-1.5">
            <div className="col-span-7">
              <input
                type="text"
                placeholder="Search or enter name..."
                list="members_quick_add_list"
                value={newAttendeeName}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewAttendeeName(val);
                  const found = members.find((m) => m.name.toLowerCase() === val.toLowerCase());
                  if (found && found.calling && !newAttendeeCalling) {
                    setNewAttendeeCalling(found.calling);
                  }
                }}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
              />
              <datalist id="members_quick_add_list">
                {members.map((m) => {
                  const titleName = formatHonorificName(m.name, m, m.gender);
                  return (
                    <option key={m.name} value={titleName}>
                      {m.calling ? `${titleName} (${m.calling})` : titleName}
                    </option>
                  );
                })}
              </datalist>
            </div>

            <div className="col-span-5 flex items-center gap-1">
              <input
                type="text"
                placeholder="Calling / Role..."
                value={newAttendeeCalling}
                onChange={(e) => setNewAttendeeCalling(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleConfirmAddAttendee}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                title="Add to attendance"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
