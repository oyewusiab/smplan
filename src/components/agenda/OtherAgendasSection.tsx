import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, RefreshCw, Printer, Edit3, Trash2, CheckCircle2,
  Share2, Mail, Users, Calendar, Clock, MapPin, Sparkles, Filter,
  Shield, Send, FileText, CheckSquare, AlertCircle, Eye
} from 'lucide-react';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { OtherAgendaModal } from './OtherAgendaModal';
import { OtherAgendaPrintModal } from './OtherAgendaPrintModal';
import { OtherAgendaWhatsAppModal } from './OtherAgendaWhatsAppModal';
import type { OtherAgenda, OtherAgendaMeetingType, OtherAgendaState, Member } from '../../types';
import { otherAgendasApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface OtherAgendasSectionProps {
  members: Member[];
  unitName?: string;
}

export function OtherAgendasSection({ members, unitName }: OtherAgendasSectionProps) {
  const { session } = useAuthStore();
  const isBishopricOrAdmin = session?.role === 'ADMIN' || session?.role === 'BISHOPRIC';

  const [agendas, setAgendas] = useState<OtherAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<OtherAgenda | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printingAgenda, setPrintingAgenda] = useState<OtherAgenda | null>(null);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppAgenda, setWhatsAppAgenda] = useState<OtherAgenda | null>(null);

  const loadOtherAgendas = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await otherAgendasApi.list(session.token) as { ok: boolean; data: OtherAgenda[] };
      if (res && res.ok) {
        setAgendas(res.data || []);
      }
    } catch {
      toast.error('Failed to load leadership agendas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOtherAgendas();
  }, [session]);

  // Filtered Agendas
  const filteredAgendas = useMemo(() => {
    return agendas.filter((item) => {
      // Type filter
      if (selectedTypeFilter !== 'ALL' && item.meeting_type !== selectedTypeFilter) {
        return false;
      }
      // State filter
      if (selectedStateFilter !== 'ALL' && item.state !== selectedStateFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inPresiding = (item.presiding || '').toLowerCase().includes(q);
        const inConducting = (item.conducting || '').toLowerCase().includes(q);
        const inDate = (item.date || '').toLowerCase().includes(q);
        const inVenue = (item.venue || '').toLowerCase().includes(q);
        const inNotes = (item.general_notes || '').toLowerCase().includes(q);
        return inTitle || inPresiding || inConducting || inDate || inVenue || inNotes;
      }
      return true;
    });
  }, [agendas, selectedTypeFilter, selectedStateFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = agendas.length;
    const approved = agendas.filter(a => a.state === 'APPROVED').length;
    const submitted = agendas.filter(a => a.state === 'SUBMITTED').length;
    const drafts = agendas.filter(a => a.state === 'DRAFT').length;
    return { total, approved, submitted, drafts };
  }, [agendas]);

  // Save / Update Handler
  const handleSaveAgenda = async (payload: Partial<OtherAgenda>, actionType: 'DRAFT' | 'SUBMIT' | 'APPROVE') => {
    if (!session) return;
    setSaving(true);
    try {
      let finalState: OtherAgendaState = 'DRAFT';
      if (actionType === 'APPROVE') finalState = 'APPROVED';
      else if (actionType === 'SUBMIT') finalState = 'SUBMITTED';

      const dataToSave = {
        ...payload,
        state: finalState,
      };

      if (editingAgenda) {
        if (actionType === 'APPROVE') {
          const res = await otherAgendasApi.approve(session.token, editingAgenda.other_agenda_id) as { ok: boolean; emailSummary?: { sentCount: number } };
          if (res && res.ok) {
            toast.success(
              res.emailSummary && res.emailSummary.sentCount > 0
                ? `Agenda approved! Automated emails sent to ${res.emailSummary.sentCount} assigned leaders.`
                : 'Agenda approved successfully!'
            );
          }
        } else {
          await otherAgendasApi.update(session.token, {
            other_agenda_id: editingAgenda.other_agenda_id,
            ...dataToSave,
          });
          toast.success(actionType === 'SUBMIT' ? 'Agenda submitted for Bishopric approval!' : 'Agenda draft saved!');
        }
      } else {
        const res = await otherAgendasApi.create(session.token, dataToSave) as { ok: boolean; emailSummary?: { sentCount: number } };
        if (res && res.ok) {
          if (actionType === 'APPROVE') {
            toast.success(
              res.emailSummary && res.emailSummary.sentCount > 0
                ? `Agenda created & approved! Automated emails sent to ${res.emailSummary.sentCount} leaders.`
                : 'Agenda created & approved!'
            );
          } else if (actionType === 'SUBMIT') {
            toast.success('Agenda created and submitted for Bishopric approval!');
          } else {
            toast.success('Agenda draft created!');
          }
        }
      }

      setModalOpen(false);
      setEditingAgenda(null);
      await loadOtherAgendas();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save agenda');
    } finally {
      setSaving(false);
    }
  };

  // Hierarchical Approval Checker:
  // - Counselors cannot approve agendas created by themselves or by the Bishop.
  // - Counselors can only approve agendas created by Clerks or Secretaries.
  // - The Bishop (or Admin) can approve agendas created by counselors, clerks, secretaries, or directly self-approve.
  const checkCanApprove = (agenda: OtherAgenda): { allowed: boolean; reason?: string } => {
    if (!session) return { allowed: false, reason: 'Not logged in' };
    if (session.role === 'ADMIN') return { allowed: true };
    if (session.role !== 'BISHOPRIC') return { allowed: false, reason: 'Only Bishopric members can approve agendas' };

    const isBishop = (session.calling && /bishop/i.test(session.calling)) || (session.name && /bishop/i.test(session.name)) || (!session.calling || !/counselor/i.test(session.calling));
    
    // Bishop can approve anything
    if (isBishop) return { allowed: true };

    // Counselor:
    // 1. Cannot self-approve
    if (agenda.created_by === session.user_id) {
      return { allowed: false, reason: 'Counselors cannot approve agendas created by themselves. The Bishop must approve.' };
    }
    // 2. Cannot approve agenda created by the Bishop
    if (agenda.created_by_name && /bishop/i.test(agenda.created_by_name)) {
      return { allowed: false, reason: 'Counselors cannot approve agendas created by the Bishop.' };
    }
    // 3. Cannot approve another counselor's agenda
    if (agenda.created_by_name && /counselor/i.test(agenda.created_by_name)) {
      return { allowed: false, reason: 'Agendas created by Bishopric counselors must be approved by the Bishop.' };
    }

    return { allowed: true };
  };

  // Direct Quick Approve
  const handleQuickApprove = async (agenda: OtherAgenda) => {
    if (!session) return;
    const check = checkCanApprove(agenda);
    if (!check.allowed) {
      toast.error(check.reason || 'You do not have permission to approve this agenda');
      return;
    }

    if (!window.confirm(`Approve agenda for "${agenda.title}" (${agenda.date}) and send automated email notifications to all assigned leaders?`)) {
      return;
    }

    try {
      const res = await otherAgendasApi.approve(session.token, agenda.other_agenda_id) as { ok: boolean; emailSummary?: { sentCount: number } };
      if (res && res.ok) {
        toast.success(
          res.emailSummary && res.emailSummary.sentCount > 0
            ? `Approved! Automated notifications sent to ${res.emailSummary.sentCount} assigned leaders.`
            : 'Agenda approved successfully!'
        );
        loadOtherAgendas();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Approval failed');
    }
  };

  // Resend Emails
  const handleResendEmails = async (agenda: OtherAgenda) => {
    if (!session) return;
    if (!window.confirm(`Dispatch / Resend email notices to all leaders with assignments in "${agenda.title}"?`)) {
      return;
    }

    try {
      const res = await otherAgendasApi.sendEmails(session.token, agenda.other_agenda_id) as { ok: boolean; emailSummary?: { sentCount: number } };
      if (res && res.ok) {
        toast.success(
          res.emailSummary && res.emailSummary.sentCount > 0
            ? `Sent! ${res.emailSummary.sentCount} notification emails delivered.`
            : 'No recipients with valid email addresses found.'
        );
        loadOtherAgendas();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Email dispatch failed');
    }
  };

  // Delete Handler
  const handleDeleteAgenda = async (agenda: OtherAgenda) => {
    if (!session) return;
    if (!window.confirm(`Are you sure you want to delete the agenda for "${agenda.title}"?`)) {
      return;
    }

    try {
      await otherAgendasApi.delete(session.token, agenda.other_agenda_id);
      toast.success('Agenda deleted');
      loadOtherAgendas();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete agenda');
    }
  };

  // Share WhatsApp
  const handleShareWhatsApp = (agenda: OtherAgenda) => {
    setWhatsAppAgenda(agenda);
    setWhatsAppModalOpen(true);
  };

  const getMeetingTypeBadge = (type: OtherAgendaMeetingType) => {
    switch (type) {
      case 'BISHOPRIC_MEETING':
        return <span className="px-2.5 py-1 rounded-md text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">🏛️ Bishopric Meeting</span>;
      case 'WARD_COUNCIL':
        return <span className="px-2.5 py-1 rounded-md text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">👥 Ward Council</span>;
      case 'WARD_YOUTH_COUNCIL':
        return <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-200">🌱 Youth Council</span>;
      case 'PRESIDENCY_MEETING':
        return <span className="px-2.5 py-1 rounded-md text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">👑 Presidency</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">📋 Other Ward Meeting</span>;
    }
  };

  const getStateBadge = (state: OtherAgendaState) => {
    switch (state) {
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-green-100 text-green-800 border border-green-200 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> APPROVED</span>;
      case 'SUBMITTED':
        return <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1"><Clock className="h-3 w-3" /> PENDING APPROVAL</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-slate-100 text-slate-700 border border-slate-200">DRAFT</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-300" />
            Ward Leadership & Committee Agendas
          </h2>
          <p className="text-xs text-blue-100/80 mt-1 max-w-2xl">
            Create, approve, and track agendas for <strong>Bishopric Meetings</strong>, <strong>Ward Council</strong>, <strong>Ward Youth Council</strong>, and presidency meetings. Assigned leaders automatically receive email notifications upon approval.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-white border-white/30 hover:bg-white/10"
            icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={loadOtherAgendas}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 border-none shadow-sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingAgenda(null);
              setModalOpen(true);
            }}
          >
            Create Meeting Agenda
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Total Agendas</span>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-green-600">Approved</span>
          <div className="text-2xl font-black text-green-700 mt-0.5">{stats.approved}</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-amber-600">Pending Approval</span>
          <div className="text-2xl font-black text-amber-700 mt-0.5">{stats.submitted}</div>
        </div>
        <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">Drafts</span>
          <div className="text-2xl font-black text-slate-700 mt-0.5">{stats.drafts}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search meetings by title, leader, date, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Meeting Types</option>
            <option value="BISHOPRIC_MEETING">Bishopric Meetings</option>
            <option value="WARD_COUNCIL">Ward Council Meetings</option>
            <option value="WARD_YOUTH_COUNCIL">Ward Youth Council</option>
            <option value="PRESIDENCY_MEETING">Presidency Meetings</option>
            <option value="OTHER_MEETING">Other Ward Meetings</option>
          </select>

          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Pending Approval</option>
            <option value="DRAFT">Drafts</option>
          </select>
        </div>
      </div>

      {/* Agendas Cards List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-blue-600 mb-2" />
          <p className="text-sm font-medium">Loading leadership agendas...</p>
        </div>
      ) : filteredAgendas.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-800">No Leadership Agendas Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedTypeFilter !== 'ALL' || selectedStateFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating an agenda for your upcoming Bishopric Meeting or Ward Council.'}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditingAgenda(null);
              setModalOpen(true);
            }}
          >
            Create Meeting Agenda
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredAgendas.map((item) => {
            let topicsCount = 0;
            try {
              const t = typeof item.topics === 'string' ? JSON.parse(item.topics) : item.topics;
              topicsCount = Array.isArray(t) ? t.length : 0;
            } catch { topicsCount = 0; }

            let assignmentsCount = 0;
            try {
              const a = typeof item.assignments === 'string' ? JSON.parse(item.assignments) : item.assignments;
              assignmentsCount = Array.isArray(a) ? a.length : 0;
            } catch { assignmentsCount = 0; }

            return (
              <Card key={item.other_agenda_id} className="border border-slate-200 shadow-2xs hover:shadow-sm transition flex flex-col justify-between">
                <CardBody className="p-5 space-y-4">
                  
                  {/* Top Badges & Meta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-3xs font-extrabold uppercase bg-blue-900 text-white tracking-wider">
                          Ward: {unitName ? (unitName.toUpperCase().endsWith('WARD') || unitName.toUpperCase().endsWith('BRANCH') ? unitName.toUpperCase() : `${unitName.toUpperCase()} WARD`) : 'OBANTOKO WARD'}
                        </span>
                        {getMeetingTypeBadge(item.meeting_type)}
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        Meeting type: {item.title.endsWith('Agenda') ? item.title : `${item.title} Agenda`}
                      </h3>
                    </div>
                    <div>
                      {getStateBadge(item.state)}
                    </div>
                  </div>

                  {/* Date, Time & Venue */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>{item.date ? format(new Date(item.date), 'EEE, MMM d, yyyy') : 'No Date'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <span>{item.start_time} - {item.end_time}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 text-slate-600 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{item.venue || "Bishop's Office / Council Room"}</span>
                    </div>
                  </div>

                  {/* Presiding & Conducting */}
                  <div className="text-xs space-y-1 text-slate-600">
                    <p>👤 <strong>Presiding:</strong> {item.presiding || 'Bishop'} ({item.presiding_role || 'Bishop'})</p>
                    <p>🗣️ <strong>Conducting:</strong> {item.conducting || 'Conducting Officer'} ({item.conducting_role || 'Counselor'})</p>
                  </div>

                  {/* Counts & Automated Email Notice */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-2xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-700">💬 {topicsCount} Topics</span>
                      <span className="font-semibold text-emerald-700">✅ {assignmentsCount} Action Items</span>
                    </div>

                    {item.state === 'APPROVED' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1" title="Automated notification emails sent upon approval">
                        <Mail className="h-3 w-3" /> Emails Dispatched
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Emails on Approval
                      </span>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {/* Edit */}
                      <button
                        title="Edit Agenda"
                        onClick={() => {
                          setEditingAgenda(item);
                          setModalOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {/* Print Preview */}
                      <button
                        title="Print / Download Official Agenda"
                        onClick={() => {
                          setPrintingAgenda(item);
                          setPrintModalOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>

                      {/* Share WhatsApp */}
                      <button
                        title="Share Agenda via WhatsApp"
                        onClick={() => handleShareWhatsApp(item)}
                        className="p-1.5 text-slate-600 hover:text-green-700 hover:bg-green-50 rounded-lg border border-slate-200 transition"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Send / Resend Emails */}
                      {item.state === 'APPROVED' && (
                        <button
                          title="Resend Notification Emails"
                          onClick={() => handleResendEmails(item)}
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-slate-200 transition"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      {isBishopricOrAdmin && (
                        <button
                          title="Delete Agenda"
                          onClick={() => handleDeleteAgenda(item)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Approve Action for Bishopric */}
                    {isBishopricOrAdmin && item.state !== 'APPROVED' && (
                      <Button
                        size="xs"
                        variant="primary"
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        onClick={() => handleQuickApprove(item)}
                      >
                        Approve & Send Emails
                      </Button>
                    )}
                  </div>

                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Interactive Modal */}
      {modalOpen && (
        <OtherAgendaModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingAgenda(null);
          }}
          agenda={editingAgenda}
          members={members}
          onSave={handleSaveAgenda}
          saving={saving}
        />
      )}

      {/* Printable Document Preview Modal */}
      {printModalOpen && (
        <OtherAgendaPrintModal
          isOpen={printModalOpen}
          onClose={() => {
            setPrintModalOpen(false);
            setPrintingAgenda(null);
          }}
          agenda={printingAgenda}
          unitName={unitName}
        />
      )}

      {/* Direct WhatsApp Messaging Modal */}
      {whatsAppModalOpen && (
        <OtherAgendaWhatsAppModal
          isOpen={whatsAppModalOpen}
          onClose={() => {
            setWhatsAppModalOpen(false);
            setWhatsAppAgenda(null);
          }}
          agenda={whatsAppAgenda}
          members={members}
        />
      )}

    </div>
  );
}
