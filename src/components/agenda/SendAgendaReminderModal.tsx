import { useState, useEffect, useMemo } from 'react';
import { Mail, Send, AlertTriangle, CheckCircle2, Clock, Users, X, Info } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { agendasApi } from '../../services/api';
import type { Agenda, SpeakerItem, Member } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface RecipientItem {
  id: string;
  name: string;
  email: string;
  assignments: string[];
  selected: boolean;
}

interface SendAgendaReminderModalProps {
  open: boolean;
  onClose: () => void;
  agenda: Partial<Agenda>;
  speakers: SpeakerItem[];
  members: Member[];
}

export function SendAgendaReminderModal({
  open,
  onClose,
  agenda,
  speakers,
  members,
}: SendAgendaReminderModalProps) {
  const { session } = useAuthStore();
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Calculate 15 minutes before start time
  const briefingTime = useMemo(() => {
    const startTimeStr = agenda.start_time || '9:00 AM';
    try {
      const match = startTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        let minutes = parseInt(match[2], 10);
        const ampm = (match[3] || '').toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;

        let total = hours * 60 + minutes - 15;
        if (total < 0) total += 24 * 60;
        const bHours = Math.floor(total / 60);
        const bMinutes = total % 60;
        const bAmpm = bHours >= 12 ? 'PM' : 'AM';
        let bDisplayHours = bHours % 12;
        if (bDisplayHours === 0) bDisplayHours = 12;
        const bDisplayMins = bMinutes < 10 ? `0${bMinutes}` : bMinutes;
        return `${bDisplayHours}:${bDisplayMins} ${bAmpm}`;
      }
    } catch {}
    return '15 minutes before start time';
  }, [agenda.start_time]);

  // Clean name helper to match directory
  const cleanNameForLookup = (name: string) => {
    return name
      .replace(/^(brother|sister|elder|bishop|president|bro\.|sis\.|pres\.)\s+/i, '')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const findMemberEmail = (name: string): string => {
    const clean = cleanNameForLookup(name);
    if (!clean) return '';
    const match = members.find((m) => {
      const mClean = cleanNameForLookup(m.name || '');
      return mClean === clean || mClean.includes(clean) || clean.includes(mClean);
    });
    return match?.email || '';
  };

  // Build recipients list on open or agenda change
  useEffect(() => {
    if (!open) return;

    const map: Record<string, { name: string; email: string; assignments: string[] }> = {};

    const add = (name: string | undefined, assignment: string) => {
      if (!name || typeof name !== 'string') return;
      const trimmed = name.trim();
      if (!trimmed || trimmed.length < 2) return;
      if (/^(tbd|none|n\/a|unassigned|brother|sister)$/i.test(trimmed)) return;

      const key = cleanNameForLookup(trimmed) || trimmed;
      if (!map[key]) {
        map[key] = {
          name: trimmed,
          email: findMemberEmail(trimmed),
          assignments: [],
        };
      }
      if (!map[key].assignments.includes(assignment)) {
        map[key].assignments.push(assignment);
      }
    };

    // 1. Presiding & Conducting
    if (agenda.presiding) add(agenda.presiding, `Presiding Officer (${agenda.presiding_position || 'Presiding'})`);
    if (agenda.conducting) add(agenda.conducting, `Conducting Officer (${agenda.conducting_position || 'Conducting'})`);

    // Format meeting hymns for music leaders
    const hymnsInfo: string[] = [];
    if (agenda.opening_hymn) {
      hymnsInfo.push(`Opening Hymn: ${agenda.opening_hymn_number ? `#${agenda.opening_hymn_number} ` : ''}${agenda.opening_hymn}`);
    }
    if (agenda.sacrament_hymn) {
      hymnsInfo.push(`Sacrament Hymn: ${agenda.sacrament_hymn_number ? `#${agenda.sacrament_hymn_number} ` : ''}${agenda.sacrament_hymn}`);
    }
    if (agenda.closing_hymn) {
      hymnsInfo.push(`Closing Hymn: ${agenda.closing_hymn_number ? `#${agenda.closing_hymn_number} ` : ''}${agenda.closing_hymn}`);
    }
    if (agenda.prelude_music) {
      hymnsInfo.push(`Prelude: ${agenda.prelude_music}`);
    }
    if (agenda.postlude_music) {
      hymnsInfo.push(`Postlude: ${agenda.postlude_music}`);
    }

    // 2. Music Leaders (Includes Meeting Music / Hymns)
    if (agenda.music_director) {
      let desc = 'Music Director (Chorister)';
      if (hymnsInfo.length > 0) {
        desc += ` — Program Music: ${hymnsInfo.join(' · ')}`;
      }
      add(agenda.music_director, desc);
    }

    if (agenda.organist) {
      let desc = 'Organist / Pianist';
      if (hymnsInfo.length > 0) {
        desc += ` — Program Music: ${hymnsInfo.join(' · ')}`;
      }
      add(agenda.organist, desc);
    }

    // 3. Choir Director (Includes Special Music if selected)
    if (agenda.choir_director) {
      let desc = 'Choir Director';
      if (agenda.special_music && agenda.special_music.trim()) {
        desc += ` — Special Music Presentation: "${agenda.special_music.trim()}"`;
      }
      add(agenda.choir_director, desc);
    }

    // 4. Prayers
    if (agenda.opening_prayer) add(agenda.opening_prayer, 'Opening Prayer (Invocation)');
    if (agenda.closing_prayer) add(agenda.closing_prayer, 'Closing Prayer (Benediction)');

    // 5. Special Music Individual/Choir item (if assigned separately)
    if (agenda.special_music && agenda.special_music.length > 3 && !/^(choir|congregation)$/i.test(agenda.special_music.trim())) {
      if (!agenda.choir_director || !agenda.choir_director.includes(agenda.special_music)) {
        add(agenda.special_music, `Special Musical Item: "${agenda.special_music}"`);
      }
    }

    // 5. Speakers
    speakers.forEach((sp, idx) => {
      if (sp.name && sp.name.trim()) {
        let desc = `Speaker / Talk #${idx + 1}`;
        if (sp.topic) desc += ` — Topic: "${sp.topic}"`;
        if (sp.scripture_ref) desc += ` (Ref: ${sp.scripture_ref})`;
        if (sp.minutes) desc += ` [${sp.minutes} Minutes]`;
        add(sp.name, desc);
      }
    });

    const items: RecipientItem[] = Object.entries(map).map(([key, val], i) => ({
      id: `rec_${i}_${key}`,
      name: val.name,
      email: val.email,
      assignments: val.assignments,
      selected: true,
    }));

    setRecipients(items);
  }, [open, agenda, speakers, members]);

  const handleToggleSelectAll = (selected: boolean) => {
    setRecipients((prev) => prev.map((r) => ({ ...r, selected })));
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
    if (!session) return;
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
      const res = (await agendasApi.sendReminders(session.token, {
        agenda: {
          agenda_id: agenda.agenda_id,
          planner_id: agenda.planner_id,
          date: agenda.date,
          ward_branch: agenda.ward_branch,
          start_time: agenda.start_time,
          presiding: agenda.presiding,
          presiding_position: agenda.presiding_position,
          conducting: agenda.conducting,
          conducting_position: agenda.conducting_position,
          music_director: agenda.music_director,
          choir_director: agenda.choir_director,
          organist: agenda.organist,
          opening_prayer: agenda.opening_prayer,
          closing_prayer: agenda.closing_prayer,
          special_music: agenda.special_music,
        },
        recipients: withEmail.map((r) => ({
          name: r.name,
          email: r.email,
          assignments: r.assignments,
        })),
        speakers,
      })) as { ok: boolean; sent_count?: number; missing_email_count?: number; error?: string };

      if (!res.ok) throw new Error(res.error || 'Failed to send reminders');

      toast.success(`Successfully sent ${res.sent_count || withEmail.length} assignment reminder email(s)!`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error sending reminders');
    } finally {
      setSending(false);
    }
  };

  const formattedDate = agenda.date ? format(new Date(agenda.date), 'EEEE, MMMM d, yyyy') : 'Sunday Service';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send Order-of-Service Email Reminders"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>Bishopric Briefing: <strong>{briefingTime}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Send className="h-4 w-4" />}
              onClick={handleSend}
              loading={sending}
              disabled={selectedRecipients.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Send Reminders ({selectedRecipients.length})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Notice Banner */}
        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5">
            <Mail className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Sacrament Meeting Order-of-Service Reminder Notice
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Sends an official email reminder to each brother and sister assigned on <strong>Page 1 (Order of Service)</strong> for <strong>{formattedDate}</strong> at <strong>{agenda.start_time || '9:00 AM'}</strong>.
              Consolidates multiple assignments for the same person and reminds them to meet with the Bishopric <strong>15 minutes before the service (at {briefingTime})</strong>.
            </p>
          </div>
        </div>

        {/* Missing Email Alert */}
        {missingEmailCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>{missingEmailCount} member(s)</strong> do not have an email address in the Member Directory. You can type their email directly into the box below before sending.
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
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Page 1 Assignees ({recipients.length} People)</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              {showPreview ? 'Hide Email Preview' : 'Show Email Preview'}
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
            {recipients.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No assignees found on Page 1 of this Agenda yet.
              </div>
            ) : (
              recipients.map((r) => (
                <div key={r.id} className={`p-3 transition-colors ${r.selected ? 'bg-white' : 'bg-slate-50/60 opacity-60'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={() => handleToggleRecipient(r.id)}
                        className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                          {r.assignments.length > 1 && (
                            <span className="px-1.5 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              {r.assignments.length} Assignments
                            </span>
                          )}
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {r.assignments.map((asg, aIdx) => (
                            <li key={aIdx} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-indigo-500 font-bold">•</span>
                              <span className="truncate">{asg}</span>
                            </li>
                          ))}
                        </ul>
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
                            : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-500'
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
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700 animate-fadeIn">
            <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-1.5">
              <span>Sample Email Template Preview</span>
              <span className="text-slate-400 font-normal">Subject: Sacrament Meeting Assignment Reminder — {agenda.ward_branch || 'Ward'}</span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 text-slate-800">
              <p>Dear <strong>[Member Name]</strong>,</p>
              <p>This is a friendly reminder of your scheduled assignment(s) for the upcoming Sacrament Meeting on <strong>{formattedDate}</strong> at <strong>{agenda.start_time || '9:00 AM'}</strong>.</p>
              <div className="p-2 bg-slate-50 border-l-4 border-indigo-600 rounded text-slate-800 font-medium">
                <p className="font-bold uppercase text-2xs text-slate-500 mb-1">Your Assigned Service:</p>
                <p>• [Assignment 1, e.g. Speaker / Talk — Topic: "Faith in Jesus Christ"]</p>
                <p>• [Assignment 2, if applicable]</p>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-900">
                <p className="font-bold text-xs">⏰ Meeting with the Bishopric Before Service:</p>
                <p className="text-xs">Please plan to meet with the Bishopric <strong>15 minutes before the start of the service (at {briefingTime})</strong> on the stand / in the Bishop's office for brief coordination and prayer.</p>
              </div>
              <p className="text-slate-500 text-2xs pt-1">With regards,<br />The Bishopric · {agenda.ward_branch || 'Ward'}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
