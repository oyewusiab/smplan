import { useState } from 'react';
import { MessageSquare, Send, Copy, Check, X, Phone, User } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ChecklistItem, Member } from '../../types';
import toast from 'react-hot-toast';

interface ChecklistWhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  items: ChecklistItem[];
  members: Member[];
  weekLabel: string;
  unitName?: string;
  venue?: string;
  time?: string;
}

export function ChecklistWhatsAppModal({
  open,
  onClose,
  items,
  members,
  weekLabel,
  unitName = 'Ward',
  venue = 'Chapel',
  time = '8:30 AM',
}: ChecklistWhatsAppModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open) return null;

  // Build member contact dictionary
  const memberMap: Record<string, Member> = {};
  members.forEach((m) => {
    const raw = (m.name || '').replace(/^(Sister|Brother|Sis\.|Bro\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
    memberMap[raw] = m;
    memberMap[(m.name || '').trim().toLowerCase()] = m;
  });

  // Filter tasks that have a responsible person
  const assignedItems = items.filter((i) => i.responsible && i.responsible.trim().length > 0);

  const generateMessage = (item: ChecklistItem) => {
    const resp = item.responsible || 'Member';
    return `Hi ${resp}, this is a friendly reminder from ${unitName} that you are assigned for *${item.task}* tomorrow (${weekLabel}) at ${time} in the ${venue}. Thank you for your faithful service! 🙏`;
  };

  const handleCopy = (item: ChecklistItem) => {
    const msg = generateMessage(item);
    navigator.clipboard.writeText(msg);
    setCopiedId(item.checklist_id);
    toast.success(`Copied reminder for ${item.responsible}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWhatsApp = (item: ChecklistItem) => {
    const cleanName = (item.responsible || '').replace(/^(Sister|Brother|Sis\.|Bro\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
    const matched = memberMap[cleanName] || memberMap[(item.responsible || '').trim().toLowerCase()];
    const phone = item.phone || matched?.phone || '';
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    const text = encodeURIComponent(generateMessage(item));
    let url = `https://wa.me/?text=${text}`;
    if (cleanPhone) {
      url = `https://wa.me/${cleanPhone.replace('+', '')}?text=${text}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Saturday Night WhatsApp Reminders</h3>
              <p className="text-xs text-slate-500">Dispatch reminder messages to assigned preparation brethren & sisters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <span className="text-base">📱</span>
            <div>
              <p className="font-semibold">Suggested Timing: Saturday Evening at 7:00 PM</p>
              <p className="text-emerald-700 mt-0.5">
                Quickly remind members responsible for bread, water cups, microphones, and podium setup before Sunday morning.
              </p>
            </div>
          </div>

          {assignedItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <User className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No members assigned yet</p>
              <p className="text-xs text-slate-400 mt-1">Assign members to checklist tasks first to dispatch WhatsApp reminders.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedItems.map((item) => {
                const cleanName = (item.responsible || '').replace(/^(Sister|Brother|Sis\.|Bro\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
                const matched = memberMap[cleanName] || memberMap[(item.responsible || '').trim().toLowerCase()];
                const phone = item.phone || matched?.phone || '';
                const msg = generateMessage(item);

                return (
                  <div
                    key={item.checklist_id}
                    className="rounded-xl border border-slate-200 p-4 bg-white hover:border-emerald-300 transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{item.responsible}</span>
                          {phone ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                              <Phone className="h-3 w-3 text-slate-400" /> {phone}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              No phone on file
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">
                          Task: {item.task}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(item)}
                          className="p-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
                          title="Copy Message"
                        >
                          {copiedId === item.checklist_id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span className="hidden sm:inline">Copy</span>
                        </button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          icon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => handleSendWhatsApp(item)}
                        >
                          Send WhatsApp
                        </Button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 border border-slate-100 font-mono">
                      "{msg}"
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
          <span className="text-xs text-slate-500">
            {assignedItems.length} member{assignedItems.length !== 1 ? 's' : ''} assigned
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
