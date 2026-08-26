import { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Assignment } from '../../types';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';

interface WhatsAppInviteModalProps {
  open: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  unitName?: string;
  secretaryName?: string;
  secretaryTitle?: string;
  onSent?: (assignmentId: string, newStatus: 'SENT' | 'REMINDED') => void;
}

export function WhatsAppInviteModal({
  open,
  onClose,
  assignment,
  unitName = 'Obantoko Ward',
  secretaryName = 'Oloyede Michael Oluwagbemiga',
  secretaryTitle = 'Secretary',
  onSent,
}: WhatsAppInviteModalProps) {
  const [templateType, setTemplateType] = useState<'INVITE' | 'REMINDER'>('INVITE');
  const [phone, setPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Format Nigerian or international phone numbers to standard wa.me format (e.g. 2348033333333)
  const cleanPhoneNumber = (rawPhone: string) => {
    if (!rawPhone) return '';
    let digits = rawPhone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      // Nigerian standard 080..., 070..., 090..., 081... -> prepend 234 and remove leading 0
      digits = '234' + digits.slice(1);
    } else if (digits.length === 10 && !digits.startsWith('234')) {
      // 10-digit local number -> prepend 234
      digits = '234' + digits;
    }
    return digits;
  };

  // Format date as 16-Aug-2026
  const formatDateDDMMMYYYY = (dateStr?: string) => {
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
    return `Brother ${trimmed}`;
  };

  // Generate message matching exact format requested
  const generateMessage = () => {
    if (!assignment) return '';

    const greeting = `Dear ${formatGreetingName(assignment.person)},`;
    const meetingDate = formatDateDDMMMYYYY(assignment.date);
    const r = (assignment.role || '').toUpperCase();

    let dutyDescription = '';
    if (r.includes('OPENING_PRAYER') || r === 'INVOCATION') {
      dutyDescription = `give the Opening Prayer (2 minutes maximum)`;
    } else if (r.includes('CLOSING_PRAYER') || r === 'BENEDICTION') {
      dutyDescription = `give the Closing Prayer (2 minutes maximum)`;
    } else if (r.includes('SACRAMENT_PREPARING')) {
      dutyDescription = `prepare the Sacrament`;
    } else if (r.includes('SACRAMENT_BLESSING')) {
      dutyDescription = `bless the Sacrament`;
    } else if (r.includes('SACRAMENT_PASSING')) {
      dutyDescription = `pass the Sacrament`;
    } else if (r.includes('SACRAMENT')) {
      dutyDescription = `administer the Sacrament`;
    } else {
      const topicPart = assignment.topic ? `on the topic: "${assignment.topic}"` : 'give a talk';
      const refPart = assignment.scripture_ref ? ` (Reference: ${assignment.scripture_ref})` : '';
      const minPart = assignment.minutes ? ` (Time allotted: ${assignment.minutes} minutes)` : ' (Time allotted: 10 minutes)';
      dutyDescription = `give a talk ${topicPart}${refPart}${minPart}`;
    }

    if (templateType === 'INVITE') {
      return [
        greeting,
        '',
        `On behalf of the Bishopric of the ${unitName}, you have been assigned to ${dutyDescription} in Sacrament Meeting on ${meetingDate}.`,
        assignment.talk_link ? `\nReference Link: ${assignment.talk_link}` : '',
        '\nPlease plan to arrive at the chapel and join the Bishopric 15 minutes before the meeting starts.',
        '\nIf for any reason you are unable to fulfill this assignment, please contact the Bishopric or the Ward Secretary as soon as possible.',
        '\nWarm regards,',
        secretaryName,
        `${secretaryTitle || 'Secretary'}, ${unitName}`,
      ].filter(Boolean).join('\n');
    } else {
      // REMINDER TEMPLATE
      return [
        greeting,
        '',
        `This is a gentle reminder regarding your upcoming assignment on behalf of the Bishopric of the ${unitName}:`,
        `• Assignment: ${dutyDescription}`,
        `• Date: ${meetingDate}`,
        `• Venue: ${assignment.venue || 'Main Chapel'}`,
        assignment.talk_link ? `• Reference Link: ${assignment.talk_link}` : '',
        '\nPlease plan to arrive at the chapel and join the Bishopric 15 minutes before the meeting starts.',
        '\nIf for any reason you are unable to fulfill this assignment, please contact the Bishopric or the Ward Secretary as soon as possible.',
        '\nWarm regards,',
        secretaryName,
        `${secretaryTitle || 'Secretary'}, ${unitName}`,
      ].filter(Boolean).join('\n');
    }
  };

  useEffect(() => {
    if (assignment) {
      const cleaned = cleanPhoneNumber(assignment.phone || '');
      setPhone(cleaned);
      setTemplateType(assignment.status === 'SENT' ? 'REMINDER' : 'INVITE');
    }
  }, [assignment]);

  useEffect(() => {
    setCustomMessage(generateMessage());
  }, [assignment, templateType, unitName, secretaryName, secretaryTitle]);

  if (!open || !assignment) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    toast.success('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const finalPhone = cleanPhoneNumber(phone);
    if (!finalPhone) {
      toast.error('Please enter a valid phone number');
      return;
    }

    const encoded = encodeURIComponent(customMessage);
    const url = `https://wa.me/${finalPhone}?text=${encoded}`;
    window.open(url, '_blank');

    const nextStatus = templateType === 'INVITE' ? 'SENT' : 'REMINDED';
    if (onSent && assignment.assignment_id) {
      onSent(assignment.assignment_id, nextStatus);
    }
    toast.success(`WhatsApp opened! Assignment marked as ${nextStatus}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Assignment Dispatch</h2>
              <p className="text-xs text-slate-500">
                Personalized WhatsApp invitation signed by the Ward Executive Secretary
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
          {/* Template Selector Tabs */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Select Message Template</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('INVITE')}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-all ${
                  templateType === 'INVITE'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                📨 New Assignment Invite
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('REMINDER')}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition-all ${
                  templateType === 'REMINDER'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                ⏰ Assignment Reminder
              </button>
            </div>
          </div>

          {/* Member & Phone Input */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Recipient Member</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                <span>{assignment.person}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Phone Number (International format)</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. 2348033333333"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <span className="text-[10px] text-slate-500">Auto-formatted for Nigerian (+234) & global numbers</span>
            </div>
          </div>

          {/* Message Preview & Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">WhatsApp Message Content</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Text'}
              </button>
            </div>
            <textarea
              rows={11}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-sans"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 rounded-b-2xl">
          <span className="text-xs text-slate-500">
            Automatically marks status as <span className="font-semibold text-emerald-700">{templateType === 'INVITE' ? 'SENT' : 'REMINDED'}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              icon={<Send className="h-4 w-4" />}
              onClick={handleOpenWhatsApp}
            >
              Open WhatsApp Web
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
