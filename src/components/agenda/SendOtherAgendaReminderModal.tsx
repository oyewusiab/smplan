import { useState, useEffect, useMemo } from 'react';
import { Mail, Send, AlertTriangle, CheckCircle2, Clock, Users, Calendar, MapPin, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { otherAgendasApi } from '../../services/api';
import type { OtherAgenda, Member, OtherAgendaActionItem, OtherAgendaAttendee } from '../../types';
import { getMemberEmail, namesMatch, tokenizeName } from '../../utils/memberTitle';
import toast from 'react-hot-toast';

interface RecipientItem {
  id: string;
  name: string;
  email: string;
  roles: string[];
  assignments: string[];
  isAttendee: boolean;
  selected: boolean;
}

interface SendOtherAgendaReminderModalProps {
  open: boolean;
  onClose: () => void;
  agenda: OtherAgenda | null;
  members: Member[];
  onSentSuccess?: () => void;
}

export function SendOtherAgendaReminderModal({
  open,
  onClose,
  agenda,
  members,
  onSentSuccess,
}: SendOtherAgendaReminderModalProps) {
  const { session } = useAuthStore();
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const readableType = useMemo(() => {
    if (!agenda) return 'Ward Leadership Meeting';
    const labels: Record<string, string> = {
      BISHOPRIC_MEETING: 'Bishopric Meeting',
      WARD_COUNCIL: 'Ward Council Meeting',
      WARD_YOUTH_COUNCIL: 'Ward Youth Council Meeting',
      PRESIDENCY_MEETING: 'Presidency Meeting',
      OTHER_MEETING: agenda.meeting_type_other || 'Ward Leadership Meeting',
    };
    return labels[agenda.meeting_type] || agenda.title || 'Ward Meeting';
  }, [agenda]);

  // Build recipients list on open or agenda change
  useEffect(() => {
    if (!open || !agenda) return;

    const map: Record<string, {
      name: string;
      email: string;
      roles: string[];
      assignments: string[];
      isAttendee: boolean;
    }> = {};

    const findExistingKey = (name: string): string | null => {
      for (const k in map) {
        if (namesMatch(map[k].name, name)) {
          return k;
        }
      }
      return null;
    };

    const addPerson = (
      name: string | undefined,
      roleOrTask: string,
      type: 'role' | 'assignment' | 'attendee',
      directEmail?: string
    ) => {
      if (!name || typeof name !== 'string') return;
      const trimmed = name.trim();
      if (!trimmed || trimmed.length < 2) return;
      if (/^(tbd|none|n\/a|unassigned|brother|sister)$/i.test(trimmed)) return;

      const existingKey = findExistingKey(trimmed);
      const key = existingKey || tokenizeName(trimmed).sort().join('_') || trimmed.toLowerCase();

      const resolvedEmail = (directEmail && directEmail.includes('@')) 
        ? directEmail.trim() 
        : getMemberEmail(trimmed, members);

      if (!map[key]) {
        map[key] = {
          name: trimmed,
          email: resolvedEmail,
          roles: [],
          assignments: [],
          isAttendee: false,
        };
      } else if (!map[key].email && resolvedEmail) {
        map[key].email = resolvedEmail;
      }

      if (type === 'role' && !map[key].roles.includes(roleOrTask)) {
        map[key].roles.push(roleOrTask);
      } else if (type === 'assignment' && !map[key].assignments.includes(roleOrTask)) {
        map[key].assignments.push(roleOrTask);
      } else if (type === 'attendee') {
        map[key].isAttendee = true;
      }
    };

    // 1. Presiding & Conducting
    if (agenda.presiding) {
      addPerson(agenda.presiding, `Presiding Officer (${agenda.presiding_role || 'Presiding'})`, 'role');
    }
    if (agenda.conducting) {
      addPerson(agenda.conducting, `Conducting Officer (${agenda.conducting_role || 'Conducting'})`, 'role');
    }

    // 2. Prayers & Spiritual Thought
    if (agenda.opening_prayer) {
      addPerson(agenda.opening_prayer, 'Opening Prayer', 'role');
    }
    if (agenda.spiritual_thought_by) {
      const stDesc = `Spiritual Thought${agenda.spiritual_thought_topic ? ` (${agenda.spiritual_thought_topic})` : ''}`;
      addPerson(agenda.spiritual_thought_by, stDesc, 'role');
    }
    if (agenda.closing_remarks_by) {
      addPerson(agenda.closing_remarks_by, 'Closing Remarks', 'role');
    }
    if (agenda.closing_prayer) {
      addPerson(agenda.closing_prayer, 'Closing Prayer', 'role');
    }

    // 3. Action Items / Assignments
    let assignmentsList: OtherAgendaActionItem[] = [];
    try {
      if (typeof agenda.assignments === 'string') {
        assignmentsList = JSON.parse(agenda.assignments || '[]');
      } else if (Array.isArray(agenda.assignments)) {
        assignmentsList = agenda.assignments as OtherAgendaActionItem[];
      }
    } catch {}

    assignmentsList.forEach((item) => {
      if (item.assignee && item.assignee.trim()) {
        const desc = `Task: "${item.task || 'Action Item'}" (Due: ${item.due_date || 'Next Meeting'})`;
        addPerson(item.assignee, desc, 'assignment', item.assignee_email);
      }
    });

    // 4. Proposed Attendees Roll
    let attendeesList: OtherAgendaAttendee[] = [];
    try {
      if (typeof agenda.attendees === 'string') {
        attendeesList = JSON.parse(agenda.attendees || '[]');
      } else if (Array.isArray(agenda.attendees)) {
        attendeesList = agenda.attendees as OtherAgendaAttendee[];
      }
    } catch {}

    attendeesList.forEach((att) => {
      if (att.name && att.name.trim()) {
        addPerson(att.name, att.calling || 'Attendee', 'attendee', att.email);
      }
    });

    // Convert map to recipient items
    const list: RecipientItem[] = Object.entries(map).map(([k, v], idx) => ({
      id: `rcp_${idx}_${k.replace(/[^a-z0-9]/g, '')}`,
      name: v.name,
      email: v.email || '',
      roles: v.roles,
      assignments: v.assignments,
      isAttendee: v.isAttendee,
      selected: true,
    }));

    setRecipients(list);
  }, [open, agenda, members]);

  const handleToggleSelectAll = (checked: boolean) => {
    setRecipients((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleToggleRecipient = (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleUpdateEmail = (id: string, email: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, email } : r))
    );
  };

  const selectedRecipients = recipients.filter((r) => r.selected);
  const missingEmailCount = selectedRecipients.filter((r) => !r.email.trim()).length;

  const handleSend = async () => {
    if (!session || !agenda) return;
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    const withEmail = selectedRecipients.filter((r) => r.email.trim().length > 0);
    if (withEmail.length === 0) {
      toast.error('No recipients have a valid email address entered');
      return;
    }

    setSending(true);
    try {
      const payloadRecipients = withEmail.map((r) => ({
        name: r.name,
        email: r.email.trim(),
        roles: r.roles,
        assignments: r.assignments,
        isAttendee: r.isAttendee,
      }));

      const res = (await otherAgendasApi.sendEmails(
        session.token,
        agenda.other_agenda_id,
        payloadRecipients
      )) as { ok: boolean; emailSummary?: { sentCount: number; details?: Array<{ email: string; name: string }> }; error?: string };

      if (!res.ok) throw new Error(res.error || 'Failed to dispatch emails');

      const sent = res.emailSummary?.sentCount || withEmail.length;
      toast.success(`Successfully dispatched ${sent} notification email(s)!`);
      if (onSentSuccess) onSentSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error sending leadership agenda emails');
    } finally {
      setSending(false);
    }
  };

  if (!agenda) return null;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Dispatch Meeting Agenda Notifications"
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="h-4 w-4 text-slate-400" />
            <span>
              <strong>{selectedRecipients.length}</strong> selected (
              <strong className="text-emerald-700">{selectedRecipients.length - missingEmailCount}</strong> ready,{' '}
              <strong className={missingEmailCount > 0 ? 'text-amber-600' : 'text-slate-400'}>
                {missingEmailCount} missing email
              </strong>
              )
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="h-4 w-4" />}
              onClick={handleSend}
              loading={sending}
              disabled={selectedRecipients.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send Notification Emails ({selectedRecipients.length})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Notice Banner */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
            <Mail className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
              {readableType} — Email Notification Notice
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Sends an official meeting notice with the approved agenda, assigned discussion topics, action items, and venue details for <strong>{agenda.date}</strong> at <strong>{agenda.start_time} - {agenda.end_time}</strong>.
            </p>
          </div>
        </div>

        {/* Missing Email Alert */}
        {missingEmailCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{missingEmailCount} leader(s)</strong> do not have an email address in the Member Directory. You can type their email directly into the box below before sending.
            </span>
          </div>
        )}

        {/* Recipients Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedRecipients.length === recipients.length && recipients.length > 0}
                onChange={(e) => handleToggleSelectAll(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Meeting Leaders & Attendees ({recipients.length} People)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1.5"
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreview ? 'Hide Preview' : 'Show Email Preview'}
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {recipients.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No leaders or attendees found in this agenda. Please add attendees or assignees in the agenda editor.
              </div>
            ) : (
              recipients.map((r) => (
                <div
                  key={r.id}
                  className={`p-3 transition-colors ${
                    r.selected ? 'bg-white' : 'bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={() => handleToggleRecipient(r.id)}
                        className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                          {r.isAttendee && (
                            <span className="px-1.5 py-0.5 rounded-full text-2xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Attendee
                            </span>
                          )}
                          {r.roles.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              {r.roles.join(' · ')}
                            </span>
                          )}
                          {r.assignments.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              {r.assignments.length} Action Item{r.assignments.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {r.assignments.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {r.assignments.map((asg, aIdx) => (
                              <li key={aIdx} className="text-xs text-slate-600 flex items-start gap-1">
                                <span className="text-blue-500 font-bold">•</span>
                                <span className="truncate">{asg}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="sm:w-64 shrink-0 pl-6 sm:pl-0">
                      <input
                        type="email"
                        placeholder="Enter email address..."
                        value={r.email}
                        onChange={(e) => handleUpdateEmail(r.id, e.target.value)}
                        className={`w-full text-xs rounded-lg px-2.5 py-1.5 border transition ${
                          !r.email.trim()
                            ? 'border-amber-300 bg-amber-50/40 text-amber-900 focus:border-amber-500'
                            : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Preview Drawer */}
        {showPreview && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                Email Preview
              </h5>
              <span className="text-2xs text-slate-500">Subject: [{readableType}] {agenda.date}</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg text-xs space-y-3 shadow-2xs font-sans">
              <div className="border-b border-blue-600 pb-2 text-center">
                <div className="text-blue-900 font-extrabold text-sm uppercase">
                  The Church of Jesus Christ of Latter-day Saints
                </div>
                <div className="text-blue-700 font-bold text-xs">
                  {readableType} — {agenda.date}
                </div>
              </div>

              <p className="text-slate-700">
                Dear <strong>[Recipient Leader Name]</strong>,
              </p>
              <p className="text-slate-600">
                This is to provide you with the official meeting agenda and assignments for the upcoming <strong>{readableType}</strong>.
              </p>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1 text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <strong>Date:</strong> {agenda.date}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <strong>Time:</strong> {agenda.start_time} - {agenda.end_time}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  <strong>Venue:</strong> {agenda.venue || "Bishop's Office / Council Room"}
                </div>
              </div>

              <div className="p-2 bg-blue-50 border border-blue-100 rounded text-blue-900 text-2xs">
                Includes agenda discussion items, personal assignments, and notes approved by the Bishopric.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
