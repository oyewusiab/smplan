import React, { useState } from 'react';
import { Share2, Copy, Check, MessageSquare, Send, UserCheck, Calendar, Clock, MapPin, ExternalLink, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { OtherAgenda, OtherAgendaAssignment, OtherAgendaTopic, Member } from '../../types';
import { formatOtherAgendaWhatsApp, formatParticipantWhatsApp, openWhatsApp } from '../../utils/otherAgendaWhatsApp';
import toast from 'react-hot-toast';

interface OtherAgendaWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda: OtherAgenda | null;
  members: Member[];
}

export function OtherAgendaWhatsAppModal({
  isOpen,
  onClose,
  agenda,
  members,
}: OtherAgendaWhatsAppModalProps) {
  if (!agenda) return null;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'full'>('individual');

  const fullAgendaText = formatOtherAgendaWhatsApp(agenda);

  const getMemberPhone = (name?: string): string => {
    if (!name) return '';
    const clean = name.replace(/^(Brother|Sister|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
    const found = members.find(m => m.name.trim().toLowerCase() === clean || m.name.trim().toLowerCase() === name.trim().toLowerCase());
    return found?.phone || '';
  };

  // Extract all participants with roles or assignments
  const participantsMap: Record<string, { name: string; roles: string[]; assignments: OtherAgendaAssignment[]; phone: string }> = {};

  const addRole = (name: string | undefined, roleLabel: string) => {
    if (!name || !name.trim()) return;
    const cleanName = name.trim();
    if (!participantsMap[cleanName]) {
      participantsMap[cleanName] = {
        name: cleanName,
        roles: [],
        assignments: [],
        phone: getMemberPhone(cleanName),
      };
    }
    participantsMap[cleanName].roles.push(roleLabel);
  };

  // 1. Opening Prayer
  if (agenda.opening_prayer) addRole(agenda.opening_prayer, 'Opening Prayer');

  // 2. Spiritual Thought
  if (agenda.spiritual_thought_by) {
    addRole(agenda.spiritual_thought_by, `Spiritual Thought${agenda.spiritual_thought_topic ? ` ("${agenda.spiritual_thought_topic}")` : ''}`);
  }

  // 3. Closing Remarks
  if (agenda.closing_remarks_by) addRole(agenda.closing_remarks_by, 'Closing Remarks');

  // 4. Closing Prayer
  if (agenda.closing_prayer) addRole(agenda.closing_prayer, 'Closing Prayer');

  // 5. Action Items
  let assignmentsList: OtherAgendaAssignment[] = [];
  try {
    if (typeof agenda.assignments === 'string') {
      assignmentsList = JSON.parse(agenda.assignments || '[]');
    } else if (Array.isArray(agenda.assignments)) {
      assignmentsList = agenda.assignments;
    }
  } catch {
    assignmentsList = [];
  }

  assignmentsList.forEach((a) => {
    if (a.assignee && a.assignee.trim()) {
      const cleanName = a.assignee.trim();
      if (!participantsMap[cleanName]) {
        participantsMap[cleanName] = {
          name: cleanName,
          roles: [],
          assignments: [],
          phone: a.assignee_phone || getMemberPhone(cleanName),
        };
      }
      participantsMap[cleanName].assignments.push(a);
      if (a.assignee_phone && !participantsMap[cleanName].phone) {
        participantsMap[cleanName].phone = a.assignee_phone;
      }
    }
  });

  const participants = Object.values(participantsMap);

  const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({});

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendFullAgenda = () => {
    openWhatsApp(fullAgendaText);
  };

  const handleSendIndividual = (participant: typeof participants[0]) => {
    const text = formatParticipantWhatsApp(agenda, participant.name, participant.roles, participant.assignments);
    const phone = phoneOverrides[participant.name] !== undefined ? phoneOverrides[participant.name] : participant.phone;
    openWhatsApp(text, phone);
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-green-600" />
          <span>Share Meeting & Assignment Notices via WhatsApp</span>
        </div>
      }
      size="4xl"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 py-1">
        
        {/* Tab Switcher: Individual Participant Notices vs Full Agenda */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'individual'
                ? 'bg-white text-green-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="h-4 w-4 text-green-600" />
            <span>Personal WhatsApp to Participants ({participants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('full')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'full'
                ? 'bg-white text-blue-800 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span>Full Meeting Agenda Broadcast</span>
          </button>
        </div>

        {/* Tab 1: Individual Participant Messages */}
        {activeTab === 'individual' && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50/70 border border-green-200 rounded-xl text-xs text-green-900 flex items-center justify-between">
              <div>
                <strong>Personalized Direct WhatsApp Messages:</strong>
                <p className="text-2xs text-green-800/80 mt-0.5">
                  Send tailored reminders with specific assigned duties and action items directly to each leader.
                </p>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs">
                No participants or action items found on this agenda. Add prayers, spiritual thought, or assignments in the agenda editor.
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((p, idx) => {
                  const currentPhone = phoneOverrides[p.name] !== undefined ? phoneOverrides[p.name] : p.phone;
                  const messageText = formatParticipantWhatsApp(agenda, p.name, p.roles, p.assignments);
                  const isCopied = copiedKey === `ind_${idx}`;

                  return (
                    <div key={idx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">{p.name}</span>
                            {p.roles.map((r, rIdx) => (
                              <span key={rIdx} className="px-2 py-0.5 bg-green-100 text-green-800 text-2xs font-extrabold rounded-md border border-green-200">
                                {r}
                              </span>
                            ))}
                            {p.assignments.length > 0 && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-2xs font-extrabold rounded-md border border-blue-200">
                                {p.assignments.length} Action Item{p.assignments.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct Send & Copy Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(messageText, `ind_${idx}`)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1.5"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSendIndividual(p)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Send WhatsApp</span>
                          </button>
                        </div>
                      </div>

                      {/* Phone & Assignment Preview */}
                      <div className="grid sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-4">
                          <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Phone Number (WhatsApp)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. +2348012345678"
                            value={currentPhone}
                            onChange={(e) => {
                              setPhoneOverrides({
                                ...phoneOverrides,
                                [p.name]: e.target.value,
                              });
                            }}
                            className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg focus:border-green-500 focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-8">
                          <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Message Preview
                          </label>
                          <pre className="text-2xs font-sans text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap max-h-24 overflow-y-auto">
                            {messageText}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Agenda Broadcast */}
        {activeTab === 'full' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-xs text-blue-900 font-medium">
                Broadcast the complete meeting agenda including schedule, topics, and all action items to leadership groups.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={copiedKey === 'full' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  onClick={() => handleCopy(fullAgendaText, 'full')}
                >
                  {copiedKey === 'full' ? 'Copied' : 'Copy Full Text'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700 border-none"
                  icon={<Send className="h-4 w-4" />}
                  onClick={handleSendFullAgenda}
                >
                  Open in WhatsApp
                </Button>
              </div>
            </div>

            <pre className="text-xs font-sans text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap max-h-[50vh] overflow-y-auto leading-relaxed shadow-inner">
              {fullAgendaText}
            </pre>
          </div>
        )}

      </div>
    </Modal>
  );
}
