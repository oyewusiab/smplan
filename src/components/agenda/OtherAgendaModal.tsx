import React, { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Sparkles, Send, CheckCircle2, UserCheck, Clock,
  Calendar, MapPin, Users, FileText, Award, AlertCircle
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import type {
  OtherAgenda, OtherAgendaMeetingType, OtherAgendaTopic,
  OtherAgendaAssignment, OtherAgendaAttendee, Member
} from '../../types';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface OtherAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda?: OtherAgenda | null;
  members: Member[];
  onSave: (payload: Partial<OtherAgenda>, actionType: 'DRAFT' | 'SUBMIT' | 'APPROVE') => Promise<void>;
  saving: boolean;
}

const DEFAULT_TEMPLATES: Record<OtherAgendaMeetingType, { title: string; venue: string; startTime: string; endTime: string; topics: OtherAgendaTopic[] }> = {
  BISHOPRIC_MEETING: {
    title: 'Bishopric Meeting',
    venue: "Bishop's Office",
    startTime: '07:00',
    endTime: '08:30',
    topics: [
      { id: '1', title: 'Opening Prayer & Spiritual Thought', presenter: 'Assigned', minutes: 10, notes: 'Spiritual foundation & scripture' },
      { id: '2', title: 'Sacrament Meeting Review & Upcoming Month Planning', presenter: 'Bishop', minutes: 20, notes: 'Speakers, hymns, ordinance assignments & presiding officers' },
      { id: '3', title: 'Callings, Releases & Sustaining Business', presenter: '1st Counselor', minutes: 15, notes: 'Review vacancies, recommend approvals & interviews' },
      { id: '4', title: 'Welfare, Ministering & Member Care', presenter: 'Bishop', minutes: 15, notes: 'Confidential spiritual and temporal welfare needs' },
      { id: '5', title: 'Youth Advancements & Temple Recommend Interviews', presenter: '2nd Counselor', minutes: 15, notes: 'Priesthood ordinations, graduating primary children, recommend renewals' },
      { id: '6', title: 'Stake Correlation & Action Items Review', presenter: 'Executive Secretary', minutes: 10, notes: 'Follow-up on previous assignments & calendar events' },
    ],
  },
  WARD_COUNCIL: {
    title: 'Ward Council Meeting',
    venue: 'High Council / Council Room',
    startTime: '07:30',
    endTime: '08:45',
    topics: [
      { id: '1', title: 'Spiritual Thought & Come, Follow Me Focus', presenter: 'Assigned Leader', minutes: 10, notes: 'Monthly gospel study & ministering vision' },
      { id: '2', title: 'Missionary Work & Convert Integration', presenter: 'Ward Mission Leader', minutes: 15, notes: 'Teaching pool, recent converts, returning members' },
      { id: '3', title: 'Temple & Family History Work', presenter: 'Temple & Family History Leader', minutes: 15, notes: 'Ward temple trips, family names, indexing goals' },
      { id: '4', title: 'Youth & Children Welfare / Activities', presenter: 'YW / Primary Presidents', minutes: 20, notes: 'Youth development, FSY, Aaronic/YW coordination' },
      { id: '5', title: 'Upcoming Ward Activities & Welfare Coordination', presenter: 'Relief Society / EQ', minutes: 15, notes: 'Community service, seasonal socials, ministering reports' },
    ],
  },
  WARD_YOUTH_COUNCIL: {
    title: 'Ward Youth Council Meeting',
    venue: 'Bishopric Office / Youth Room',
    startTime: '08:00',
    endTime: '09:00',
    topics: [
      { id: '1', title: 'Youth Spiritual Thought & Testimony', presenter: 'Youth Leader', minutes: 10, notes: 'Youth-led spiritual discussion' },
      { id: '2', title: 'Aaronic Priesthood Quorums Report', presenter: 'Priests / Teachers / Deacons Presidents', minutes: 15, notes: 'Quorum unity, member fellowship, sacrament reverent duties' },
      { id: '3', title: 'Young Women Classes Report', presenter: 'YW Class Presidents', minutes: 15, notes: 'Class goals, ministering to less active youth, personal development' },
      { id: '4', title: 'Upcoming Youth Activities, FSY & Temple Trips', presenter: 'Bishopric Youth Advisor', minutes: 15, notes: 'Planning upcoming youth service projects and conferences' },
    ],
  },
  PRESIDENCY_MEETING: {
    title: 'Presidency Meeting',
    venue: 'Classroom / Virtual',
    startTime: '08:00',
    endTime: '09:00',
    topics: [
      { id: '1', title: 'Prayer & Spiritual Thought', presenter: 'Presidency Member', minutes: 10, notes: 'Unity and spiritual guidance' },
      { id: '2', title: 'Member Ministering & Needs', presenter: 'President', minutes: 20, notes: 'Reviewing assigned families & sisters/brethren' },
      { id: '3', title: 'Upcoming Lessons & Activities', presenter: 'Counselor', minutes: 20, notes: 'Sunday instruction & quorum/class activities' },
    ],
  },
  OTHER_MEETING: {
    title: 'Ward Committee Meeting',
    venue: 'Ward Chapel',
    startTime: '08:00',
    endTime: '09:00',
    topics: [
      { id: '1', title: 'Welcome & Opening Exercises', presenter: 'Conducting Officer', minutes: 10, notes: 'Prayer and vision' },
      { id: '2', title: 'Agenda Discussion Items', presenter: 'Committee Chair', minutes: 35, notes: 'Specific committee business' },
      { id: '3', title: 'Action Assignments & Next Meeting', presenter: 'Secretary', minutes: 15, notes: 'Assignments and closing' },
    ],
  },
};

export function OtherAgendaModal({
  isOpen,
  onClose,
  agenda,
  members,
  onSave,
  saving,
}: OtherAgendaModalProps) {
  const { session } = useAuthStore();
  const isBishopricOrAdmin = session?.role === 'ADMIN' || session?.role === 'BISHOPRIC';

  const [meetingType, setMeetingType] = useState<OtherAgendaMeetingType>('BISHOPRIC_MEETING');
  const [meetingTypeOther, setMeetingTypeOther] = useState('');
  const [title, setTitle] = useState('Bishopric Meeting');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:30');
  const [venue, setVenue] = useState("Bishop's Office");
  const [presiding, setPresiding] = useState('');
  const [presidingRole, setPresidingRole] = useState('Bishop');
  const [conducting, setConducting] = useState('');
  const [conductingRole, setConductingRole] = useState('1st Counselor');
  const [openingHymn, setOpeningHymn] = useState('');
  const [openingPrayer, setOpeningPrayer] = useState('');
  const [spiritualThoughtBy, setSpiritualThoughtBy] = useState('');
  const [spiritualThoughtTopic, setSpiritualThoughtTopic] = useState('');
  const [closingPrayer, setClosingPrayer] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  const [attendees, setAttendees] = useState<OtherAgendaAttendee[]>([]);
  const [topics, setTopics] = useState<OtherAgendaTopic[]>([]);
  const [assignments, setAssignments] = useState<OtherAgendaAssignment[]>([]);

  // Hydrate from existing agenda or default template
  useEffect(() => {
    if (agenda) {
      setMeetingType(agenda.meeting_type || 'BISHOPRIC_MEETING');
      setMeetingTypeOther(agenda.meeting_type_other || '');
      setTitle(agenda.title || 'Bishopric Meeting');
      setDate(agenda.date ? agenda.date.substring(0, 10) : new Date().toISOString().substring(0, 10));
      setStartTime(agenda.start_time || '07:00');
      setEndTime(agenda.end_time || '08:30');
      setVenue(agenda.venue || "Bishop's Office");
      setPresiding(agenda.presiding || '');
      setPresidingRole(agenda.presiding_role || 'Bishop');
      setConducting(agenda.conducting || '');
      setConductingRole(agenda.conducting_role || '1st Counselor');
      setOpeningHymn(agenda.opening_hymn || '');
      setOpeningPrayer(agenda.opening_prayer || '');
      setSpiritualThoughtBy(agenda.spiritual_thought_by || '');
      setSpiritualThoughtTopic(agenda.spiritual_thought_topic || '');
      setClosingPrayer(agenda.closing_prayer || '');
      setGeneralNotes(agenda.general_notes || '');

      try {
        if (typeof agenda.attendees === 'string') {
          setAttendees(JSON.parse(agenda.attendees || '[]'));
        } else if (Array.isArray(agenda.attendees)) {
          setAttendees(agenda.attendees);
        }
      } catch { setAttendees([]); }

      try {
        if (typeof agenda.topics === 'string') {
          setTopics(JSON.parse(agenda.topics || '[]'));
        } else if (Array.isArray(agenda.topics)) {
          setTopics(agenda.topics);
        }
      } catch { setTopics([]); }

      try {
        if (typeof agenda.assignments === 'string') {
          setAssignments(JSON.parse(agenda.assignments || '[]'));
        } else if (Array.isArray(agenda.assignments)) {
          setAssignments(agenda.assignments);
        }
      } catch { setAssignments([]); }
    } else {
      // Default to Bishopric Meeting template
      applyTemplate('BISHOPRIC_MEETING');
    }
  }, [agenda, isOpen]);

  const applyTemplate = (type: OtherAgendaMeetingType) => {
    const template = DEFAULT_TEMPLATES[type];
    setMeetingType(type);
    setTitle(template.title);
    setVenue(template.venue);
    setStartTime(template.startTime);
    setEndTime(template.endTime);
    setTopics(template.topics);
    setAssignments([
      { id: '1', task: '', assignee: '', assignee_email: '', assignee_phone: '', due_date: '', status: 'PENDING' }
    ]);
  };

  const handleMeetingTypeChange = (newType: OtherAgendaMeetingType) => {
    setMeetingType(newType);
    if (!agenda) {
      applyTemplate(newType);
    } else {
      const template = DEFAULT_TEMPLATES[newType];
      setTitle(template.title);
    }
  };

  // Helper to auto-lookup email and phone when an assignee name is typed
  const handleAssigneeChange = (index: number, name: string) => {
    const found = members.find(m => m.name.toLowerCase() === name.toLowerCase());
    const updated = [...assignments];
    updated[index] = {
      ...updated[index],
      assignee: name,
      assignee_email: found?.email || updated[index].assignee_email || '',
      assignee_phone: found?.phone || updated[index].assignee_phone || '',
    };
    setAssignments(updated);
  };

  const handleAddTopic = () => {
    setTopics([
      ...topics,
      { id: String(Date.now()), title: '', presenter: '', minutes: 10, notes: '' }
    ]);
  };

  const handleRemoveTopic = (idx: number) => {
    setTopics(topics.filter((_, i) => i !== idx));
  };

  const handleAddAssignment = () => {
    setAssignments([
      ...assignments,
      { id: String(Date.now()), task: '', assignee: '', assignee_email: '', assignee_phone: '', due_date: '', status: 'PENDING' }
    ]);
  };

  const handleRemoveAssignment = (idx: number) => {
    setAssignments(assignments.filter((_, i) => i !== idx));
  };

  const handleAddAttendee = () => {
    setAttendees([
      ...attendees,
      { name: '', calling: '', present: true }
    ]);
  };

  const handleRemoveAttendee = (idx: number) => {
    setAttendees(attendees.filter((_, i) => i !== idx));
  };

  const handleSubmit = (actionType: 'DRAFT' | 'SUBMIT' | 'APPROVE') => {
    if (!title.trim() || !date.trim()) {
      toast.error('Meeting Title and Date are required');
      return;
    }

    const payload: Partial<OtherAgenda> = {
      meeting_type: meetingType,
      meeting_type_other: meetingTypeOther,
      title: title.trim(),
      date: date.trim(),
      start_time: startTime,
      end_time: endTime,
      venue: venue.trim(),
      presiding: presiding.trim(),
      presiding_role: presidingRole,
      conducting: conducting.trim(),
      conducting_role: conductingRole,
      opening_hymn: openingHymn.trim(),
      opening_prayer: openingPrayer.trim(),
      spiritual_thought_by: spiritualThoughtBy.trim(),
      spiritual_thought_topic: spiritualThoughtTopic.trim(),
      closing_prayer: closingPrayer.trim(),
      attendees: JSON.stringify(attendees.filter(a => a.name.trim())),
      topics: JSON.stringify(topics.filter(t => t.title.trim())),
      assignments: JSON.stringify(assignments.filter(a => a.task.trim())),
      general_notes: generalNotes.trim(),
    };

    onSave(payload, actionType);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>{agenda ? 'Edit Meeting Agenda' : 'Create Leadership & Committee Agenda'}</span>
        </div>
      }
      size="xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 py-2">
        
        {/* Preset Templates Selector */}
        {!agenda && (
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Select Meeting Template:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyTemplate('BISHOPRIC_MEETING')}
                className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition ${meetingType === 'BISHOPRIC_MEETING' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                🏛️ Bishopric Meeting
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('WARD_COUNCIL')}
                className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition ${meetingType === 'WARD_COUNCIL' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                👥 Ward Council
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('WARD_YOUTH_COUNCIL')}
                className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition ${meetingType === 'WARD_YOUTH_COUNCIL' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                🌱 Ward Youth Council
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('OTHER_MEETING')}
                className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition ${meetingType === 'OTHER_MEETING' || meetingType === 'PRESIDENCY_MEETING' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              >
                📋 Other Ward Meeting
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Meeting Basics */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            📅 1. Meeting Schedule & Leadership
          </h4>

          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <Select
                label="Meeting Category"
                value={meetingType}
                onChange={(e) => handleMeetingTypeChange(e.target.value as OtherAgendaMeetingType)}
                options={[
                  { value: 'BISHOPRIC_MEETING', label: 'Bishopric Meeting' },
                  { value: 'WARD_COUNCIL', label: 'Ward Council Meeting' },
                  { value: 'WARD_YOUTH_COUNCIL', label: 'Ward Youth Council Meeting' },
                  { value: 'PRESIDENCY_MEETING', label: 'Presidency Meeting' },
                  { value: 'OTHER_MEETING', label: 'Other Ward Meeting' },
                ]}
              />
            </div>

            {meetingType === 'OTHER_MEETING' && (
              <div className="sm:col-span-4">
                <Input
                  label="Specify Meeting Type"
                  placeholder="e.g. Activities Committee / Correlation"
                  value={meetingTypeOther}
                  onChange={(e) => setMeetingTypeOther(e.target.value)}
                />
              </div>
            )}

            <div className={meetingType === 'OTHER_MEETING' ? "sm:col-span-4" : "sm:col-span-8"}>
              <Input
                label="Meeting Title"
                placeholder="e.g. Ward Council Meeting"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                type="date"
                label="Meeting Date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                type="time"
                label="Start Time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                type="time"
                label="End Time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div className="sm:col-span-3">
              <Input
                label="Venue / Room"
                placeholder="e.g. Bishop's Office"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>

            {/* Presiding & Conducting */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">Presiding Officer</label>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <select
                    value={presidingRole}
                    onChange={(e) => setPresidingRole(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Bishop">Bishop</option>
                    <option value="Stake President">Stake President</option>
                    <option value="High Councilor">High Councilor</option>
                    <option value="President">President</option>
                  </select>
                </div>
                <div className="col-span-8">
                  <input
                    type="text"
                    placeholder="Search or enter presiding leader..."
                    list="members_presiding_list"
                    value={presiding}
                    onChange={(e) => setPresiding(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                  />
                  <datalist id="members_presiding_list">
                    {members.map(m => (
                      <option key={m.name} value={m.name}>{m.calling ? `${m.name} (${m.calling})` : m.name}</option>
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">Conducting Officer</label>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <select
                    value={conductingRole}
                    onChange={(e) => setConductingRole(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  >
                    <option value="1st Counselor">1st Counselor</option>
                    <option value="2nd Counselor">2nd Counselor</option>
                    <option value="Bishop">Bishop</option>
                    <option value="Secretary">Secretary</option>
                    <option value="President">President</option>
                  </select>
                </div>
                <div className="col-span-8">
                  <input
                    type="text"
                    placeholder="Search or enter conducting leader..."
                    list="members_conducting_list"
                    value={conducting}
                    onChange={(e) => setConducting(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium focus:border-blue-500 focus:outline-none"
                  />
                  <datalist id="members_conducting_list">
                    {members.map(m => (
                      <option key={m.name} value={m.name}>{m.calling ? `${m.name} (${m.calling})` : m.name}</option>
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Opening Exercises */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            🕊️ 2. Opening Exercises & Spiritual Thought
          </h4>

          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">Opening Prayer</label>
              <input
                type="text"
                placeholder="Search member name for opening prayer..."
                list="members_list_op"
                value={openingPrayer}
                onChange={(e) => setOpeningPrayer(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <datalist id="members_list_op">
                {members.map(m => (
                  <option key={m.name} value={m.name}>{m.calling ? `${m.name} (${m.calling})` : m.name}</option>
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-6">
              <Input
                label="Opening Hymn (Optional)"
                placeholder="e.g. #2 The Spirit of God"
                value={openingHymn}
                onChange={(e) => setOpeningHymn(e.target.value)}
              />
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">Spiritual Thought Assigned To</label>
              <input
                type="text"
                placeholder="Search member name for spiritual thought..."
                list="members_list_st"
                value={spiritualThoughtBy}
                onChange={(e) => setSpiritualThoughtBy(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <datalist id="members_list_st">
                {members.map(m => (
                  <option key={m.name} value={m.name}>{m.calling ? `${m.name} (${m.calling})` : m.name}</option>
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-6">
              <Input
                label="Spiritual Thought Topic / Scripture"
                placeholder="e.g. Alma 37:37 / Ministering with love"
                value={spiritualThoughtTopic}
                onChange={(e) => setSpiritualThoughtTopic(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Attendees & Roll */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              👥 3. Attendees & Leadership Roll ({attendees.length})
            </h4>
            <Button size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={handleAddAttendee}>
              Add Attendee
            </Button>
          </div>

          <div className="space-y-2">
            {attendees.map((att, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  checked={att.present !== false}
                  onChange={(e) => {
                    const updated = [...attendees];
                    updated[idx].present = e.target.checked;
                    setAttendees(updated);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  title="Mark Attendance Present"
                />
                <input
                  type="text"
                  placeholder="Leader name..."
                  list="members_attendees_list"
                  value={att.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = members.find(m => m.name.toLowerCase() === val.toLowerCase());
                    const updated = [...attendees];
                    updated[idx] = {
                      ...updated[idx],
                      name: val,
                      calling: found?.calling || updated[idx].calling || '',
                      email: found?.email || updated[idx].email || '',
                    };
                    setAttendees(updated);
                  }}
                  className="w-1/2 rounded-md border border-slate-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Calling / Role..."
                  value={att.calling || ''}
                  onChange={(e) => {
                    const updated = [...attendees];
                    updated[idx].calling = e.target.value;
                    setAttendees(updated);
                  }}
                  className="w-1/2 rounded-md border border-slate-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttendee(idx)}
                  className="text-slate-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <datalist id="members_attendees_list">
              {members.map(m => (
                <option key={m.name} value={m.name}>{m.calling ? `${m.name} (${m.calling})` : m.name}</option>
              ))}
            </datalist>
          </div>
        </div>

        {/* Section 4: Agenda Topics */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              💬 4. Agenda Discussion Topics ({topics.length})
            </h4>
            <Button size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={handleAddTopic}>
              Add Topic
            </Button>
          </div>

          <div className="space-y-3">
            {topics.map((t, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    Topic #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(idx)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      placeholder="Topic title / business item..."
                      value={t.title}
                      onChange={(e) => {
                        const updated = [...topics];
                        updated[idx].title = e.target.value;
                        setTopics(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Discussion lead..."
                      value={t.presenter}
                      onChange={(e) => {
                        const updated = [...topics];
                        updated[idx].presenter = e.target.value;
                        setTopics(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      placeholder="Mins"
                      value={t.minutes || ''}
                      onChange={(e) => {
                        const updated = [...topics];
                        updated[idx].minutes = e.target.value ? Number(e.target.value) : '';
                        setTopics(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-right focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-12">
                    <textarea
                      rows={1}
                      placeholder="Key discussion notes / details..."
                      value={t.notes || ''}
                      onChange={(e) => {
                        const updated = [...topics];
                        updated[idx].notes = e.target.value;
                        setTopics(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Action Items & Assignments */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                ✅ 5. Action Items & Assignments ({assignments.length})
              </h4>
              <p className="text-2xs text-slate-500">
                Assigned leaders will automatically receive an email notice when this agenda is approved.
              </p>
            </div>
            <Button size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={handleAddAssignment}>
              Add Action Item
            </Button>
          </div>

          <div className="space-y-3">
            {assignments.map((a, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                    Action Item #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAssignment(idx)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      placeholder="Task description (e.g. Schedule temple interview with Bro. Davis)..."
                      value={a.task}
                      onChange={(e) => {
                        const updated = [...assignments];
                        updated[idx].task = e.target.value;
                        setAssignments(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Assigned to (auto-lookups email)..."
                      list={`members_assignee_list_${idx}`}
                      value={a.assignee}
                      onChange={(e) => handleAssigneeChange(idx, e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <datalist id={`members_assignee_list_${idx}`}>
                      {members.map(m => (
                        <option key={m.name} value={m.name}>{m.calling ? `${m.name} (${m.calling})` : m.name}</option>
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Target due date (e.g. Next Sunday)..."
                      value={a.due_date}
                      onChange={(e) => {
                        const updated = [...assignments];
                        updated[idx].due_date = e.target.value;
                        setAssignments(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      type="email"
                      placeholder="Assignee Email (auto-populated or manual)..."
                      value={a.assignee_email || ''}
                      onChange={(e) => {
                        const updated = [...assignments];
                        updated[idx].assignee_email = e.target.value;
                        setAssignments(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-2xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      placeholder="Additional notes / context..."
                      value={a.notes || ''}
                      onChange={(e) => {
                        const updated = [...assignments];
                        updated[idx].notes = e.target.value;
                        setAssignments(updated);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1 text-2xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Closing & Notes */}
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            🙏 6. Closing Exercises & General Notes
          </h4>

          <div className="grid sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">Closing Prayer</label>
              <input
                type="text"
                placeholder="Search member name for closing prayer..."
                list="members_list_cp"
                value={closingPrayer}
                onChange={(e) => setClosingPrayer(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              />
              <datalist id="members_list_cp">
                {members.map(m => (
                  <option key={m.name} value={m.name}>{m.calling ? `${m.name} (${m.calling})` : m.name}</option>
                ))}
              </datalist>
            </div>

            <div className="sm:col-span-12">
              <Textarea
                label="Special Meeting Notes / Next Steps"
                rows={2}
                placeholder="e.g. Next meeting scheduled for 2nd Sunday @ 7:00 AM..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          {/* Save Draft */}
          <Button
            variant="outline"
            onClick={() => handleSubmit('DRAFT')}
            disabled={saving}
          >
            Save Draft
          </Button>

          {/* Submit for Approval (for clerks / secretary) */}
          {(!isBishopricOrAdmin || agenda?.state === 'DRAFT') && (
            <Button
              variant="secondary"
              icon={<Send className="h-4 w-4" />}
              onClick={() => handleSubmit('SUBMIT')}
              disabled={saving}
            >
              Submit for Approval
            </Button>
          )}

          {/* Approve Agenda & Dispatch Emails (for Bishop / Bishopric) */}
          {isBishopricOrAdmin && (
            <Button
              variant="primary"
              icon={<CheckCircle2 className="h-4 w-4" />}
              onClick={() => handleSubmit('APPROVE')}
              disabled={saving}
            >
              {agenda?.state === 'APPROVED' ? 'Save & Re-Dispatch Emails' : 'Approve & Send Emails'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
