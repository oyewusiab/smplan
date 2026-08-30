import { useState, useEffect } from 'react';
import { X, Mail, Calendar, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Assignment } from '../../types';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { formatTime12h } from '../../utils/formatters';

interface EmailInviteModalProps {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  unitName?: string;
  secretaryName?: string;
  secretaryTitle?: string;
  onSent?: (assignmentId: string, newStatus: 'SENT' | 'REMINDED') => void;
}

export function EmailInviteModal({
  open,
  onClose,
  assignment,
  unitName = 'Obantoko Ward',
  secretaryName = 'Oloyede Michael Oluwagbemiga',
  secretaryTitle = 'Secretary',
  onSent,
}: EmailInviteModalProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'Sunday';
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) return format(parsed, 'dd-MMM-yyyy');
      const d = new Date(dateStr);
      if (isValid(d)) return format(d, 'dd-MMM-yyyy');
    } catch { /* fallback */ }
    return dateStr;
  };

  const formatGreetingName = (person?: string) => {
    if (!person) return 'Member';
    const trimmed = person.trim();
    if (
      trimmed.startsWith('Brother') || trimmed.startsWith('Sister') ||
      trimmed.startsWith('Elder') || trimmed.startsWith('Bishop') ||
      trimmed.startsWith('President')
    ) {
      return trimmed;
    }
    if (trimmed.startsWith('Bro.')) {
      return `Brother ${trimmed.replace(/^Bro\.\s*/i, '')}`;
    }
    if (trimmed.startsWith('Sis.')) {
      return `Sister ${trimmed.replace(/^Sis\.\s*/i, '')}`;
    }
    return `Brother/Sister ${trimmed}`;
  };

  useEffect(() => {
    if (assignment) {
      setEmail(assignment.email || '');
      const meetingDateStr = formatDateDisplay(assignment.date);
      const roleName = (assignment.role || 'Sacrament Assignment').replace(/_/g, ' ');

      const defaultSubject = `Sacrament Meeting Assignment: ${assignment.topic || roleName} — ${meetingDateStr} (${unitName})`;
      setSubject(defaultSubject);

      const rsvpLink = `https://smplanner.app/rsvp/${assignment.assignment_id || 'asg_preview'}`;
      const defaultBody = [
        `Dear ${formatGreetingName(assignment.person)},`,
        '',
        `On behalf of the Bishopric of the ${unitName}, you have been assigned to participate in Sacrament Meeting on ${meetingDateStr}.`,
        '',
        `ASSIGNMENT DETAILS:`,
        `• Role: ${roleName}`,
        assignment.topic ? `• Topic / Subject: ${assignment.topic}` : '',
        assignment.scripture_ref ? `• Scripture Reference: ${assignment.scripture_ref}` : '',
        assignment.minutes ? `• Time Allotted: ${assignment.minutes} minutes` : '',
        `• Venue: ${assignment.venue || 'Main Chapel'}`,
        `• Meeting Time: ${formatTime12h(assignment.meeting_time)}`,
        assignment.talk_link ? `• Study / Talk Reference Link: ${assignment.talk_link}` : '',
        '',
        `IMPORTANT INSTRUCTIONS:`,
        `* Please plan to arrive at the chapel and join the Bishopric on the stand 15 minutes before the meeting starts.`,
        `* If for any reason you are unable to fulfill this assignment, please contact the Bishopric or the Ward Secretary as soon as possible.`,
        '',
        `RSVP / Confirm Attendance:`,
        `${rsvpLink}`,
        '',
        `Warm regards,`,
        secretaryName,
        `${secretaryTitle}, ${unitName}`,
      ].filter(Boolean).join('\n');

      setBody(defaultBody);
    }
  }, [assignment, unitName, secretaryName, secretaryTitle]);

  if (!open || !assignment) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    toast.success('Email body copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMailClient = () => {
    const encodedSubj = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailtoUrl = `mailto:${email}?subject=${encodedSubj}&body=${encodedBody}`;
    window.location.href = mailtoUrl;

    if (onSent && assignment.assignment_id) {
      onSent(assignment.assignment_id, 'SENT');
    }
    toast.success('Mail client opened! Marked as SENT');
    onClose();
  };

  // Google Calendar URL generator
  const handleOpenGoogleCalendar = () => {
    if (!assignment.date) return;
    const dateFormatted = assignment.date.replace(/-/g, '');
    const startTimeStr = (assignment.meeting_time || '10:00').replace(':', '');
    const startIso = `${dateFormatted}T${startTimeStr}00`;
    // default 1 hour meeting duration
    const endIso = `${dateFormatted}T110000`;

    const calTitle = encodeURIComponent(`Sacrament Meeting Assignment: ${assignment.topic || assignment.role || 'Sacrament Talk'}`);
    const calDetails = encodeURIComponent(body);
    const calLocation = encodeURIComponent(assignment.venue || unitName || 'Sacrament Hall');

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${startIso}/${endIso}&details=${calDetails}&location=${calLocation}`;
    window.open(googleCalUrl, '_blank');
  };

  // Download .ics file
  const handleDownloadIcs = () => {
    if (!assignment.date) return;
    const dateFormatted = assignment.date.replace(/-/g, '');
    const startTimeStr = (assignment.meeting_time || '10:00').replace(':', '');
    const startIso = `${dateFormatted}T${startTimeStr}00`;
    const endIso = `${dateFormatted}T110000`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SM Planner//Assignment Calendar//EN',
      'BEGIN:VEVENT',
      `UID:assignment-${assignment.assignment_id || Date.now()}@smplanner.app`,
      `DTSTAMP:${dateFormatted}T000000Z`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:Sacrament Meeting: ${assignment.topic || assignment.role || 'Sacrament Duty'}`,
      `DESCRIPTION:${body.replace(/\n/g, '\\n')}`,
      `LOCATION:${assignment.venue || unitName}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assignment-${assignment.person.replace(/\s+/g, '_')}-${assignment.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Calendar .ics file downloaded');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Email Assignment Dispatch</h2>
              <p className="text-xs text-slate-500">
                Send official email invite with talk references & Google/Apple calendar integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Email recipient */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Member</label>
              <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                {assignment.person}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                placeholder="member@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="text-xs font-semibold text-slate-700">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Email Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Message Body</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <textarea
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-sans"
            />
          </div>

          {/* Calendar Integration Bar */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Smart Calendar Integration</p>
                <p className="text-[11px] text-slate-500">Attach .ics file or generate Google Calendar event link</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="xs" variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={handleDownloadIcs}>
                Download .ics
              </Button>
              <Button size="xs" variant="outline" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={handleOpenGoogleCalendar}>
                Google Calendar
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <span className="text-xs text-slate-500">
            Clicking send opens your default mail client with pre-filled text
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              icon={<Mail className="h-4 w-4" />}
              onClick={handleOpenMailClient}
            >
              Open in Mail Client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
