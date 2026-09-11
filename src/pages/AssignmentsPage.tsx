import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, RefreshCw, Printer, Sparkles, MessageSquare, Mail,
  CheckCircle2, Clock, AlertCircle, Calendar, Trash2, Edit3,
  SlidersHorizontal, CheckSquare, Square, Download, ChevronRight, UserCheck, ShieldAlert
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { assignmentsApi, membersApi, plannersApi, usersApi, agendasApi } from '../services/api';
import type { Assignment, Member, Planner, User, AssignmentStatus, AssignmentRsvpStatus } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { formatTime12h, formatDateDisplay, isPastDate } from '../utils/formatters';
import { parseSpeakersList } from '../utils/AgendaPrintEngine';
import { AssignmentSlipPrintModal } from '../components/assignments/AssignmentSlipPrintModal';
import { WhatsAppInviteModal } from '../components/assignments/WhatsAppInviteModal';
import { EmailInviteModal } from '../components/assignments/EmailInviteModal';

const ROLE_OPTIONS = [
  { value: 'SPEAKER_1', label: 'Speaker 1 (10 min)' },
  { value: 'SPEAKER_2', label: 'Speaker 2 (10 min)' },
  { value: 'SPEAKER_3', label: 'Speaker 3 / Youth Speaker (15 min)' },
  { value: 'SPEAKER', label: 'Speaker (General)' },
  { value: 'OPENING_PRAYER', label: 'Invocation / Opening Prayer (2 min)' },
  { value: 'CLOSING_PRAYER', label: 'Benediction / Closing Prayer (2 min)' },
  { value: 'SACRAMENT_PREPARING', label: 'Sacrament: Preparing' },
  { value: 'SACRAMENT_BLESSING', label: 'Sacrament: Blessing' },
  { value: 'SACRAMENT_PASSING', label: 'Sacrament: Passing' },
  { value: 'SACRAMENT', label: 'Sacrament Administration' },
  { value: 'MUSIC', label: 'Music Accompaniment' },
  { value: 'CHORISTER', label: 'Music Chorister' },
];

export function AssignmentsPage() {
  const { session } = useAuthStore();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);

  // Secretary & Unit Details
  const [secretaryInfo, setSecretaryInfo] = useState({
    name: 'Oloyede Michael Oluwagbemiga',
    calling: 'SECRETARY',
    signature_data_url: '',
    unit_name: 'Obantoko Ward',
  });

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showPastAssignments, setShowPastAssignments] = useState(true);

  // Selection for Batch Actions / 3-Up Printing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Assignment>>({ role: 'SPEAKER_1', minutes: 10, status: 'PENDING' });
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Member[]>([]);

  const [activePrintModal, setActivePrintModal] = useState(false);
  const [activeWhatsAppModal, setActiveWhatsAppModal] = useState(false);
  const [activeEmailModal, setActiveEmailModal] = useState(false);
  const [modalAssignment, setModalAssignment] = useState<Assignment | null>(null);

function parseSacramentDuties(val: unknown): { preparing: string[]; blessing: string[]; passing: string[] } | null {
  if (!val) return null;
  let obj = val;
  if (typeof obj === 'string' && obj.trim() && obj.trim() !== '{}') {
    try { obj = JSON.parse(obj); } catch { return null; }
  }
  if (typeof obj === 'object' && obj !== null) {
    const rec = obj as Record<string, unknown>;
    const prep = Array.isArray(rec.preparing) ? rec.preparing.map(String).filter(Boolean) : [];
    const bles = Array.isArray(rec.blessing) ? rec.blessing.map(String).filter(Boolean) : [];
    const pass = Array.isArray(rec.passing) ? rec.passing.map(String).filter(Boolean) : [];
    if (prep.length > 0 || bles.length > 0 || pass.length > 0) {
      return {
        preparing: prep,
        blessing: bles,
        passing: pass,
      };
    }
  }
  return null;
}

const buildAssignmentsFromPlanner = (
  planner: Planner,
  rawAgendas: any[],
  existingList: Assignment[],
  memberList: Member[]
): Assignment[] => {
  let agendas = Array.isArray(rawAgendas) && rawAgendas.length > 0 ? rawAgendas : [];
  if (agendas.length === 0 && planner.weeks) {
    try {
      const parsed = typeof planner.weeks === 'string' ? JSON.parse(planner.weeks) : planner.weeks;
      if (Array.isArray(parsed)) agendas = parsed;
    } catch {}
  }

  const memberMap: Record<string, Member> = {};
  memberList.forEach(m => {
    if (m && m.name) {
      const raw = m.name.replace(/^(Brother|Sister|Bro\.|Sis\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
      memberMap[raw] = m;
      memberMap[m.name.trim().toLowerCase()] = m;
    }
  });

  const getContact = (name: string) => {
    if (!name) return { phone: '', email: '' };
    const raw = name.replace(/^(Brother|Sister|Bro\.|Sis\.|Elder|Bishop|President)\s+/i, '').trim().toLowerCase();
    const m = memberMap[raw] || memberMap[name.trim().toLowerCase()];
    return {
      phone: m ? m.phone : '',
      email: m ? m.email : '',
    };
  };

  let sacAdminMap: Record<string, any> | null = null;
  if (planner.sacrament_administration) {
    try {
      sacAdminMap = typeof planner.sacrament_administration === 'string'
        ? JSON.parse(planner.sacrament_administration)
        : planner.sacrament_administration;
    } catch {}
  }

  const unitName = planner.unit_name || 'Obantoko Ward';
  const result: Assignment[] = [];

  agendas.forEach((ag, idx) => {
    const meetingDate = ag.date;
    const meetingTime = ag.meeting_time_override || ag.start_time || '10:00 AM';
    const venue = ag.venue_override || ag.ward_branch || unitName;
    const weekId = ag.week_id || `week_${idx + 1}`;

    // 1. Invocation (Opening Prayer)
    if (ag.opening_prayer && ag.opening_prayer.trim()) {
      const pName = ag.opening_prayer.trim();
      const contact = getContact(pName);
      const existing = existingList.find(ea =>
        ea.date === meetingDate &&
        (ea.person || '').trim().toLowerCase() === pName.toLowerCase() &&
        ea.role === 'OPENING_PRAYER'
      );

      result.push({
        assignment_id: existing?.assignment_id || `ASN_OP_${planner.planner_id}_${idx}`,
        planner_id: planner.planner_id,
        week_id: weekId,
        date: meetingDate,
        person: pName,
        role: 'OPENING_PRAYER',
        topic: 'Opening Prayer',
        minutes: 2,
        venue: venue,
        meeting_time: meetingTime,
        phone: existing?.phone || contact.phone,
        email: existing?.email || contact.email,
        status: existing?.status || 'PENDING',
        rsvp_status: existing?.rsvp_status || 'PENDING',
        scripture_ref: '',
        talk_link: '',
        notes: existing?.notes || '',
        created_date: existing?.created_date,
        updated_date: existing?.updated_date,
      });
    }

    // 2. Benediction (Closing Prayer)
    if (ag.closing_prayer && ag.closing_prayer.trim()) {
      const pName = ag.closing_prayer.trim();
      const contact = getContact(pName);
      const existing = existingList.find(ea =>
        ea.date === meetingDate &&
        (ea.person || '').trim().toLowerCase() === pName.toLowerCase() &&
        ea.role === 'CLOSING_PRAYER'
      );

      result.push({
        assignment_id: existing?.assignment_id || `ASN_CP_${planner.planner_id}_${idx}`,
        planner_id: planner.planner_id,
        week_id: weekId,
        date: meetingDate,
        person: pName,
        role: 'CLOSING_PRAYER',
        topic: 'Closing Prayer',
        minutes: 2,
        venue: venue,
        meeting_time: meetingTime,
        phone: existing?.phone || contact.phone,
        email: existing?.email || contact.email,
        status: existing?.status || 'PENDING',
        rsvp_status: existing?.rsvp_status || 'PENDING',
        scripture_ref: '',
        talk_link: '',
        notes: existing?.notes || '',
        created_date: existing?.created_date,
        updated_date: existing?.updated_date,
      });
    }

    // 3. Speakers
    const speakersList = parseSpeakersList(ag.speakers);
    speakersList.forEach((sp, sIdx) => {
      if (sp && sp.name && sp.name.trim()) {
        const pName = sp.name.trim();
        const contact = getContact(pName);
        const roleLabel = sIdx === 0 ? 'SPEAKER_1' : sIdx === 1 ? 'SPEAKER_2' : sIdx === 2 ? 'SPEAKER_3' : 'SPEAKER';
        const existing = existingList.find(ea =>
          ea.date === meetingDate &&
          (ea.person || '').trim().toLowerCase() === pName.toLowerCase() &&
          (ea.role === roleLabel || ea.role?.includes('SPEAKER'))
        );

        result.push({
          assignment_id: existing?.assignment_id || `ASN_SP_${planner.planner_id}_${idx}_${sIdx}`,
          planner_id: planner.planner_id,
          week_id: weekId,
          date: meetingDate,
          person: pName,
          role: roleLabel,
          topic: sp.topic || 'Sacrament Talk',
          minutes: Number(sp.minutes) || (sIdx === 0 ? 10 : sIdx === 1 ? 10 : 15),
          venue: venue,
          meeting_time: meetingTime,
          phone: existing?.phone || contact.phone,
          email: existing?.email || contact.email,
          scripture_ref: sp.scripture_ref || existing?.scripture_ref || '',
          talk_link: sp.talk_link || existing?.talk_link || '',
          status: existing?.status || 'PENDING',
          rsvp_status: existing?.rsvp_status || 'PENDING',
          notes: existing?.notes || '',
          created_date: existing?.created_date,
          updated_date: existing?.updated_date,
        });
      }
    });

    // 4. Sacrament Duties
    let duties = parseSacramentDuties(ag.sacrament_duties) || parseSacramentDuties(ag.sacrament);
    if (!duties && sacAdminMap) {
      const fromMap = sacAdminMap[weekId] || sacAdminMap[`week_${idx + 1}`] || sacAdminMap[meetingDate] || (Array.isArray(sacAdminMap) ? sacAdminMap[idx] : null);
      if (fromMap) {
        duties = parseSacramentDuties((fromMap as any)?.duties || (fromMap as any)?.sacrament_duties || (fromMap as any)?.sacrament || fromMap);
      }
    }

    if (duties) {
      (['preparing', 'blessing', 'passing'] as const).forEach(dutyType => {
        const list = duties![dutyType];
        if (Array.isArray(list)) {
          list.forEach((name, dIdx) => {
            if (name && name.trim()) {
              const pName = name.trim();
              const contact = getContact(pName);
              const roleName = `SACRAMENT_${dutyType.toUpperCase()}`;
              const existing = existingList.find(ea =>
                ea.date === meetingDate &&
                (ea.person || '').trim().toLowerCase() === pName.toLowerCase() &&
                ea.role === roleName
              );

              result.push({
                assignment_id: existing?.assignment_id || `ASN_SAC_${planner.planner_id}_${idx}_${dutyType}_${dIdx}`,
                planner_id: planner.planner_id,
                week_id: weekId,
                date: meetingDate,
                person: pName,
                role: roleName,
                topic: `Sacrament ${dutyType.charAt(0).toUpperCase() + dutyType.slice(1)}`,
                minutes: 5,
                venue: venue,
                meeting_time: meetingTime,
                phone: existing?.phone || contact.phone,
                email: existing?.email || contact.email,
                status: existing?.status || 'PENDING',
                rsvp_status: existing?.rsvp_status || 'PENDING',
                scripture_ref: '',
                talk_link: '',
                notes: existing?.notes || '',
                created_date: existing?.created_date,
                updated_date: existing?.updated_date,
              });
            }
          });
        }
      });
    }
  });

  return result;
};

  // Load and reconcile assignments for a specific planner
  const loadPlannerAssignments = async (plannerId: string, availablePlanners?: Planner[], availableMembers?: Member[]) => {
    if (!session || !plannerId) return;
    const allPlanners = availablePlanners || planners;
    const allMembers = availableMembers || members;
    const currentPl = allPlanners.find(p => p.planner_id === plannerId);

    try {
      const [agRes, asRes] = await Promise.allSettled([
        agendasApi.list(session.token, plannerId) as Promise<{ ok: boolean; data: any[] }>,
        assignmentsApi.list(session.token, plannerId) as Promise<{ ok: boolean; data: Assignment[] }>,
      ]);

      const rawAgendas = (agRes.status === 'fulfilled' && agRes.value.ok && Array.isArray(agRes.value.data)) ? agRes.value.data : [];
      const existingList = (asRes.status === 'fulfilled' && asRes.value.ok && Array.isArray(asRes.value.data)) ? asRes.value.data : [];

      if (currentPl) {
        const reconciled = buildAssignmentsFromPlanner(currentPl, rawAgendas, existingList, allMembers);
        setAssignments(reconciled);
        setSelectedIds(new Set());
      } else {
        setAssignments(existingList);
        setSelectedIds(new Set());
      }
    } catch {
      toast.error('Failed to load duties for selected planner');
    }
  };

  // Load all initial data
  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [pRes, mRes, sRes] = await Promise.allSettled([
        plannersApi.list(session.token) as Promise<{ ok: boolean; data: Planner[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
        assignmentsApi.getSecretaryInfo(session.token) as Promise<{ ok: boolean; data: any }>,
      ]);

      let loadedPlanners: Planner[] = [];
      let loadedMembers: Member[] = [];
      let initialPlId = selectedPlannerId;

      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        loadedPlanners = pRes.value.data || [];
        setPlanners(loadedPlanners);
        const submitted = loadedPlanners.filter(p => p.state === 'SUBMITTED');
        if (!initialPlId && submitted.length > 0) {
          initialPlId = submitted[0].planner_id;
          setSelectedPlannerId(initialPlId);
        } else if (!initialPlId && loadedPlanners.length > 0) {
          initialPlId = loadedPlanners[0].planner_id;
          setSelectedPlannerId(initialPlId);
        }
      }

      if (mRes.status === 'fulfilled' && mRes.value.ok) {
        loadedMembers = mRes.value.data || [];
        setMembers(loadedMembers);
      }

      if (sRes.status === 'fulfilled' && sRes.value.ok && sRes.value.data) {
        const defaultName = session?.role === 'SECRETARY' ? (session.name || session.preferred_name) : sRes.value.data.name;
        setSecretaryInfo({
          name: defaultName || 'Ward Executive Secretary',
          calling: sRes.value.data.calling || 'Ward Executive Secretary',
          signature_data_url: sRes.value.data.signature_data_url || '',
          unit_name: sRes.value.data.unit_name || 'Sacrament Meeting',
        });
      } else if (session?.role === 'SECRETARY') {
        setSecretaryInfo(prev => ({
          ...prev,
          name: session.name || session.preferred_name || 'Ward Executive Secretary',
          calling: 'Ward Executive Secretary',
        }));
      }

      if (initialPlId) {
        await loadPlannerAssignments(initialPlId, loadedPlanners, loadedMembers);
      }
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  // When planner selection changes, refresh assignments
  const handlePlannerChange = async (newPlannerId: string) => {
    setSelectedPlannerId(newPlannerId);
    if (!session) return;
    setLoading(true);
    try {
      await loadPlannerAssignments(newPlannerId);
    } finally {
      setLoading(false);
    }
  };

  // Auto-Extract and Sync assignments from selected planner to database
  const handleExtractFromPlanner = async () => {
    if (!session || !selectedPlannerId) {
      toast.error('Please select a planner first to extract duties');
      return;
    }
    const currentPl = planners.find(p => p.planner_id === selectedPlannerId);
    if (!currentPl) return;

    setExtracting(true);
    try {
      const res = await assignmentsApi.extractFromPlanner(session.token, selectedPlannerId) as { ok: boolean; data: Assignment[]; count?: number };
      if (res && res.ok && res.data && res.data.length > 0) {
        setAssignments(res.data);
        toast.success(`Extracted & synced ${res.count || res.data.length} duties from planner agendas!`);
      } else {
        const agRes = await agendasApi.list(session.token, selectedPlannerId) as { ok: boolean; data: any[] };
        const rawAgendas = agRes.ok && Array.isArray(agRes.data) ? agRes.data : [];
        const asRes = await assignmentsApi.list(session.token, selectedPlannerId) as { ok: boolean; data: Assignment[] };
        const existingList = asRes.ok && Array.isArray(asRes.data) ? asRes.data : [];

        const reconciled = buildAssignmentsFromPlanner(currentPl, rawAgendas, existingList, members);

        for (const item of reconciled) {
          const alreadyInDb = existingList.find(e => e.assignment_id === item.assignment_id);
          if (alreadyInDb) {
            assignmentsApi.update(session.token, item).catch(() => {});
          } else {
            assignmentsApi.create(session.token, item).catch(() => {});
          }
        }

        setAssignments(reconciled);
        toast.success(`Extracted & synced ${reconciled.length} duties from planner agendas!`);
      }
    } catch {
      try {
        const agRes = await agendasApi.list(session.token, selectedPlannerId) as { ok: boolean; data: any[] };
        const rawAgendas = agRes.ok && Array.isArray(agRes.data) ? agRes.data : [];
        const asRes = await assignmentsApi.list(session.token, selectedPlannerId) as { ok: boolean; data: Assignment[] };
        const existingList = asRes.ok && Array.isArray(asRes.data) ? asRes.data : [];

        const reconciled = buildAssignmentsFromPlanner(currentPl, rawAgendas, existingList, members);

        for (const item of reconciled) {
          const alreadyInDb = existingList.find(e => e.assignment_id === item.assignment_id);
          if (alreadyInDb) {
            assignmentsApi.update(session.token, item).catch(() => {});
          } else {
            assignmentsApi.create(session.token, item).catch(() => {});
          }
        }

        setAssignments(reconciled);
        toast.success(`Extracted & synced ${reconciled.length} duties from planner agendas!`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Extraction error');
      }
    } finally {
      setExtracting(false);
    }
  };

  // Suggestions for modal
  const loadSuggestions = async () => {
    if (!session || !form.role || !form.date) return;
    try {
      const res = await assignmentsApi.suggest(session.token, form.role, form.date) as { ok: boolean; data: Member[] };
      if (res.ok) setSuggestions(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => { if (showForm) loadSuggestions(); }, [form.role, form.date, showForm]);

  // Filtered list
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // Search filter
      const q = search.toLowerCase().trim();
      const matchSearch = !q ||
        a.person?.toLowerCase().includes(q) ||
        a.role?.toLowerCase().includes(q) ||
        a.topic?.toLowerCase().includes(q) ||
        a.scripture_ref?.toLowerCase().includes(q) ||
        a.date?.includes(q);

      if (!matchSearch) return false;

      // Role filter
      if (roleFilter !== 'ALL') {
        const r = (a.role || '').toUpperCase();
        if (roleFilter === 'SPEAKERS') {
          if (!r.includes('SPEAKER') && !r.includes('TALK') && !r.includes('LESSON')) return false;
        } else if (roleFilter === 'PRAYERS') {
          if (!r.includes('PRAYER') && !r.includes('INVOCATION') && !r.includes('BENEDICTION')) return false;
        } else if (roleFilter === 'SACRAMENT') {
          if (!r.includes('SACRAMENT') && !r.includes('PREPAR') && !r.includes('BLESS') && !r.includes('PASS')) return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL' && a.status !== statusFilter) {
        return false;
      }

      // Show past toggle: when unchecked, hide past dates
      if (!showPastAssignments && a.date) {
        if (isPastDate(a.date)) {
          return false;
        }
      }

      return true;
    });
  }, [assignments, search, roleFilter, statusFilter, showPastAssignments]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAssignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssignments.map(a => a.assignment_id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Direct status update
  const handleUpdateStatus = async (assignmentId: string, nextStatus: AssignmentStatus) => {
    if (!session) return;
    setAssignments(prev => prev.map(a => a.assignment_id === assignmentId ? { ...a, status: nextStatus } : a));
    toast.success(`Marked as ${nextStatus}`);

    try {
      const target = assignments.find(a => a.assignment_id === assignmentId);
      if (!target) return;
      await assignmentsApi.update(session.token, {
        ...target,
        assignment_id: assignmentId,
        status: nextStatus,
      });
    } catch {
      // Non-critical, state already updated optimistically
    }
  };

  // Direct minutes update
  const handleUpdateMinutes = async (assignmentId: string, minutes: number) => {
    if (!session) return;
    setAssignments(prev => prev.map(a => a.assignment_id === assignmentId ? { ...a, minutes } : a));

    try {
      const target = assignments.find(a => a.assignment_id === assignmentId);
      if (!target) return;
      await assignmentsApi.update(session.token, {
        ...target,
        assignment_id: assignmentId,
        minutes: minutes,
      });
    } catch {
      // ignore
    }
  };

  // Toggle RSVP status simulation
  const handleToggleRsvp = async (assignmentId: string, currentRsvp?: AssignmentRsvpStatus) => {
    if (!session) return;
    const nextRsvp: AssignmentRsvpStatus = currentRsvp === 'CONFIRMED'
      ? 'SUBSTITUTE_REQUESTED'
      : currentRsvp === 'SUBSTITUTE_REQUESTED'
      ? 'PENDING'
      : 'CONFIRMED';

    setAssignments(prev => prev.map(a => a.assignment_id === assignmentId ? { ...a, rsvp_status: nextRsvp } : a));
    toast.success(`RSVP: ${nextRsvp === 'CONFIRMED' ? 'Confirmed Attendance' : nextRsvp === 'SUBSTITUTE_REQUESTED' ? 'Substitute Requested' : 'Pending'}`);

    try {
      await assignmentsApi.updateRsvp(session.token, assignmentId, nextRsvp);
    } catch {
      // Fallback
      const target = assignments.find(a => a.assignment_id === assignmentId);
      if (target) {
        assignmentsApi.update(session.token, { ...target, rsvp_status: nextRsvp }).catch(() => {});
      }
    }
  };

  // Batch actions
  const handleBatchMarkStatus = async (status: AssignmentStatus) => {
    if (!session || selectedIds.size === 0) return;
    const updates = Array.from(selectedIds).map(id => {
      const item = assignments.find(a => a.assignment_id === id);
      return { ...(item || {}), assignment_id: id, status };
    });

    // Optimistically update UI
    setAssignments(prev => prev.map(a => selectedIds.has(a.assignment_id) ? { ...a, status } : a));
    toast.success(`Updated ${selectedIds.size} assignments to ${status}`);

    try {
      const res = await assignmentsApi.batchUpdate(session.token, updates) as { ok: boolean };
      if (!res || !res.ok) {
        await Promise.allSettled(updates.map(u => assignmentsApi.update(session.token, u)));
      }
    } catch {
      // Fallback to individual updates
      await Promise.allSettled(updates.map(u => assignmentsApi.update(session.token, u)));
    }
  };

  const handleBatchDelete = async () => {
    if (!session || selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to remove ${selectedIds.size} selected assignments?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => assignmentsApi.delete(session.token, id)));
      setAssignments(prev => prev.filter(a => !selectedIds.has(a.assignment_id)));
      setSelectedIds(new Set());
      toast.success('Selected assignments removed');
    } catch {
      toast.error('Failed to delete selected assignments');
    }
  };

  // Save manual assignment
  const handleSave = async () => {
    if (!session || !form.person || !form.date || !form.role) {
      toast.error('Person, date, and role are required');
      return;
    }
    setSaving(true);
    try {
      const action = form.assignment_id ? assignmentsApi.update : assignmentsApi.create;
      const res = await action(session.token, {
        ...form,
        planner_id: form.planner_id || selectedPlannerId || '',
      }) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success(form.assignment_id ? 'Assignment updated' : 'Assignment created');
      setShowForm(false);
      setForm({ role: 'SPEAKER_1', minutes: 10, status: 'PENDING' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!session) return;
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await assignmentsApi.delete(session.token, id);
      setAssignments(prev => prev.filter(a => a.assignment_id !== id));
      toast.success('Assignment removed');
    } catch {
      toast.error('Failed to remove assignment');
    }
  };

  // Open 3-Up Print
  const handleOpenPrintSlips = (itemsToPrint?: Assignment[]) => {
    const list = itemsToPrint && itemsToPrint.length > 0
      ? itemsToPrint
      : selectedIds.size > 0
      ? assignments.filter(a => selectedIds.has(a.assignment_id))
      : filteredAssignments;

    if (list.length === 0) {
      toast.error('No assignments selected for printing');
      return;
    }
    setActivePrintModal(true);
  };

  // Member select options
  const memberOptions = members
    .filter((m) => m.status === 'ACTIVE')
    .sort((a, b) => (b.readiness_score || 0) - (a.readiness_score || 0))
    .map((m) => ({ value: m.name, label: `${m.name} (score: ${Math.round(m.readiness_score || 0)})` }));

  const submittedPlanners = planners.filter(p => p.state === 'SUBMITTED');
  const currentPlanner = planners.find(p => p.planner_id === selectedPlannerId);
  const activeUnitName = currentPlanner?.unit_name || secretaryInfo.unit_name || 'Obantoko Ward';

  const formatDisplayDate = (dStr?: string) => {
    if (!dStr) return '—';
    try {
      const parsed = parseISO(dStr);
      if (isValid(parsed)) return format(parsed, 'dd-MMM-yyyy');
      const d = new Date(dStr);
      if (isValid(d)) return format(d, 'dd-MMM-yyyy');
    } catch { /* fallback */ }
    return dStr;
  };

  return (
    <div>
      <Header
        title="Assignment Notifications Hub"
        subtitle="Automated Duty Slips, Multi-Channel WhatsApp/Email Dispatch & Status Tracking"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={load}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Printer className="h-4 w-4 text-slate-600" />}
              onClick={() => handleOpenPrintSlips()}
            >
              Print 3-Up Slips ({selectedIds.size > 0 ? selectedIds.size : filteredAssignments.length})
            </Button>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setForm({
                  role: 'SPEAKER_1',
                  minutes: 10,
                  status: 'PENDING',
                  planner_id: selectedPlannerId,
                });
                setShowForm(true);
              }}
            >
              New Assignment
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        {/* Step 1 & 2: Planner Selection & Extraction Hub */}
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/40">
          <CardBody className="p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Select Monthly Sacrament Planner</h3>
                </div>
                <p className="text-xs text-slate-600">
                  Select a submitted monthly planner to instantly extract speakers, prayers, and sacrament duties.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedPlannerId}
                  onChange={(e) => handlePlannerChange(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Select Submitted Planner --</option>
                  {submittedPlanners.map((p) => (
                    <option key={p.planner_id} value={p.planner_id}>
                      {format(new Date(p.year, p.month - 1), 'MMMM yyyy')} — {p.unit_name}
                    </option>
                  ))}
                </select>

                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  icon={<Sparkles className="h-4 w-4 text-amber-300" />}
                  loading={extracting}
                  onClick={handleExtractFromPlanner}
                  disabled={!selectedPlannerId}
                >
                  Auto-Extract Duties
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Filter Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search member name, topic, role, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Filter Pills & Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-700">
              <span className="px-2 text-slate-400 text-[11px] font-semibold">ROLE:</span>
              {['ALL', 'SPEAKERS', 'PRAYERS', 'SACRAMENT'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    roleFilter === r ? 'bg-white shadow-sm font-bold text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-700">
              <span className="px-2 text-slate-400 text-[11px] font-semibold">STATUS:</span>
              {['ALL', 'PENDING', 'SENT', 'REMINDED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    statusFilter === s ? 'bg-white shadow-sm font-bold text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Show Past Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none ml-2">
              <input
                type="checkbox"
                checked={showPastAssignments}
                onChange={(e) => setShowPastAssignments(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span>Show past dates</span>
            </label>
          </div>
        </div>

        {/* Batch Actions Bar (when items selected) */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2.5 text-white shadow-md transition-all">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="font-bold text-blue-400">{selectedIds.size}</span>
              <span>assignment{selectedIds.size !== 1 ? 's' : ''} selected</span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-400 hover:text-white underline ml-2"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                className="border-slate-700 text-slate-200 hover:bg-slate-800"
                icon={<Printer className="h-3.5 w-3.5" />}
                onClick={() => handleOpenPrintSlips()}
              >
                Print 3-Up Slips
              </Button>
              <Button
                size="xs"
                variant="outline"
                className="border-emerald-700 text-emerald-300 hover:bg-emerald-950"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() => handleBatchMarkStatus('SENT')}
              >
                Mark as Sent
              </Button>
              <Button
                size="xs"
                variant="outline"
                className="border-blue-700 text-blue-300 hover:bg-blue-950"
                icon={<Clock className="h-3.5 w-3.5" />}
                onClick={() => handleBatchMarkStatus('REMINDED')}
              >
                Mark as Reminded
              </Button>
              <Button
                size="xs"
                variant="outline"
                className="border-red-800 text-red-300 hover:bg-red-950"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={handleBatchDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Top Ready Members Leaderboard Bar */}
        {members.length > 0 && (
          <Card className="border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top Ready Members</span>
                <span className="text-[11px] text-slate-400">(ready to be assigned talks/prayers)</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Ranked by readiness score</span>
            </div>
            <CardBody className="p-0">
              <div className="flex overflow-x-auto gap-2.5 p-3">
                {members
                  .filter((m) => m.status === 'ACTIVE')
                  .sort((a, b) => (b.readiness_score || 0) - (a.readiness_score || 0))
                  .slice(0, 8)
                  .map((m) => (
                    <div
                      key={m.name}
                      onClick={() => {
                        setForm({
                          person: m.name,
                          role: 'SPEAKER_1',
                          minutes: 10,
                          status: 'PENDING',
                          phone: m.phone,
                          email: m.email,
                          planner_id: selectedPlannerId,
                        });
                        setShowForm(true);
                      }}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 p-2.5 w-32 text-center transition-all cursor-pointer group"
                    >
                      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {m.name[0]}
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate">{m.name}</p>
                      <div className="mt-1.5 flex items-center justify-center gap-1">
                        <div className="w-14 bg-slate-200 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, m.readiness_score || 0)}%` }} />
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold">{Math.round(m.readiness_score || 0)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Assignments Table & Multi-Channel Actions */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Table Header Controls */}
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                {selectedIds.size === filteredAssignments.length && filteredAssignments.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                <span>Select All ({filteredAssignments.length})</span>
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Showing {filteredAssignments.length} duty item{filteredAssignments.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
              <p className="text-sm">Loading assignments...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-12 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No assignments found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {selectedPlannerId
                  ? 'Click "Auto-Extract Duties" to extract all speakers, prayers, and sacrament duties from the selected planner agendas.'
                  : 'Select a monthly planner or click "New Assignment" to create an individual assignment.'}
              </p>
              {selectedPlannerId && (
                <Button
                  size="sm"
                  className="mt-4"
                  icon={<Sparkles className="h-4 w-4" />}
                  onClick={handleExtractFromPlanner}
                  loading={extracting}
                >
                  Auto-Extract from Agendas
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAssignments.map((a) => {
                const isSelected = selectedIds.has(a.assignment_id);
                const roleUpper = (a.role || '').toUpperCase();
                const isSpeaker = roleUpper.includes('SPEAKER');
                const isPrayer = roleUpper.includes('PRAYER');
                const isSacrament = roleUpper.includes('SACRAMENT');

                return (
                  <div
                    key={a.assignment_id}
                    className={`p-4 transition-colors hover:bg-slate-50/80 ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Checkbox + Member + Role + Details */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(a.assignment_id)}
                          className="mt-1 text-slate-400 hover:text-blue-600 focus:outline-none"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Name + Role Badge + Minutes */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{a.person}</span>

                            {/* Role Badge */}
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                                isSpeaker
                                  ? 'bg-blue-100 text-blue-800'
                                  : isPrayer
                                  ? 'bg-purple-100 text-purple-800'
                                  : isSacrament
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {a.role?.replace(/_/g, ' ')}
                            </span>

                            {/* Inline Minutes editor */}
                            <div className="flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Min:</span>
                              <input
                                type="number"
                                value={a.minutes || 10}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  handleUpdateMinutes(a.assignment_id, val);
                                }}
                                className="w-10 bg-transparent text-center font-bold text-slate-800 focus:bg-white focus:outline-none rounded"
                              />
                            </div>

                            {/* Status Badge (Clickable to cycle) */}
                            <button
                              type="button"
                              onClick={() => {
                                const next: AssignmentStatus = a.status === 'PENDING' ? 'SENT' : a.status === 'SENT' ? 'REMINDED' : 'PENDING';
                                handleUpdateStatus(a.assignment_id, next);
                              }}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold cursor-pointer transition-all hover:scale-105 ${
                                a.status === 'SENT'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : a.status === 'REMINDED'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title="Click to cycle status (Pending -> Sent -> Reminded)"
                            >
                              {a.status === 'SENT' ? (
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              ) : a.status === 'REMINDED' ? (
                                <Clock className="h-3 w-3 text-blue-600" />
                              ) : (
                                <AlertCircle className="h-3 w-3 text-amber-600" />
                              )}
                              <span>{a.status || 'PENDING'}</span>
                            </button>

                            {/* Interactive RSVP Status Badge */}
                            <button
                              type="button"
                              onClick={() => handleToggleRsvp(a.assignment_id, a.rsvp_status)}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-all hover:opacity-80 ${
                                a.rsvp_status === 'CONFIRMED'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : a.rsvp_status === 'SUBSTITUTE_REQUESTED'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                              title="Click to toggle RSVP simulation"
                            >
                              <UserCheck className="h-3 w-3" />
                              <span>
                                RSVP: {a.rsvp_status === 'CONFIRMED' ? 'Confirmed' : a.rsvp_status === 'SUBSTITUTE_REQUESTED' ? 'Substitute Needed' : 'Pending'}
                              </span>
                            </button>
                          </div>

                          {/* Meeting details row: Date + Topic + Ref */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {formatDisplayDate(a.date)}
                              {a.meeting_time ? <span className="text-slate-500 font-normal">({formatTime12h(a.meeting_time)})</span> : null}
                            </span>
                            {a.topic && (
                              <span className="truncate max-w-xs">
                                <strong className="text-slate-700">Topic:</strong> {a.topic}
                              </span>
                            )}
                            {a.scripture_ref && (
                              <span className="italic text-slate-500">
                                Ref: {a.scripture_ref}
                              </span>
                            )}
                            {a.talk_link && (
                              <a
                                href={a.talk_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline truncate max-w-[160px]"
                              >
                                {a.talk_link}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: One-Click WhatsApp / Email / Slips / Edit / Delete */}
                      <div className="flex items-center gap-1.5 self-end lg:self-center">
                        {/* One-Click WhatsApp */}
                        <Button
                          size="xs"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          icon={<MessageSquare className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setModalAssignment(a);
                            setActiveWhatsAppModal(true);
                          }}
                        >
                          WhatsApp
                        </Button>

                        {/* One-Click Email */}
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-blue-700 hover:bg-blue-50 border-blue-200"
                          icon={<Mail className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setModalAssignment(a);
                            setActiveEmailModal(true);
                          }}
                        >
                          Email
                        </Button>

                        {/* Individual Slip Print */}
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-slate-600 hover:bg-slate-100"
                          icon={<Printer className="h-3.5 w-3.5" />}
                          onClick={() => handleOpenPrintSlips([a])}
                          title="Print 3-Up Slip Card"
                        />

                        {/* Edit */}
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-slate-600 hover:bg-slate-100"
                          icon={<Edit3 className="h-3.5 w-3.5" />}
                          onClick={() => {
                            setForm(a);
                            setShowForm(true);
                          }}
                          title="Edit Assignment"
                        />

                        {/* Delete */}
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => handleDelete(a.assignment_id)}
                          title="Delete Assignment"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3-Up A4 Printable Slips Modal */}
      <AssignmentSlipPrintModal
        open={activePrintModal}
        onClose={() => setActivePrintModal(false)}
        assignments={
          selectedIds.size > 0
            ? assignments.filter(a => selectedIds.has(a.assignment_id))
            : filteredAssignments
        }
        unitName={activeUnitName}
        secretaryName={secretaryInfo.name}
        secretaryTitle={secretaryInfo.calling}
        signatureDataUrl={secretaryInfo.signature_data_url}
      />

      {/* WhatsApp Modal */}
      <WhatsAppInviteModal
        open={activeWhatsAppModal}
        onClose={() => {
          setActiveWhatsAppModal(false);
          setModalAssignment(null);
        }}
        assignment={modalAssignment}
        unitName={activeUnitName}
        secretaryName={secretaryInfo.name}
        secretaryTitle={secretaryInfo.calling}
        onSent={(id, nextStatus) => {
          handleUpdateStatus(id, nextStatus);
        }}
      />

      {/* Email Modal */}
      <EmailInviteModal
        open={activeEmailModal}
        onClose={() => {
          setActiveEmailModal(false);
          setModalAssignment(null);
        }}
        assignment={modalAssignment}
        unitName={activeUnitName}
        secretaryName={secretaryInfo.name}
        secretaryTitle={secretaryInfo.calling}
        onSent={(id, nextStatus) => {
          handleUpdateStatus(id, nextStatus);
        }}
      />

      {/* Form Modal (Create / Edit Assignment) */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={form.assignment_id ? 'Edit Duty Assignment' : 'New Duty Assignment'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Save Assignment</Button>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            required
            value={form.date || ''}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Select
            label="Role"
            required
            options={ROLE_OPTIONS}
            value={form.role || 'SPEAKER_1'}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Suggested members (by readiness score):
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 5).map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setForm({ ...form, person: m.name, phone: m.phone, email: m.email })}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {m.name} ({Math.round(m.readiness_score || 0)})
                  </button>
                ))}
              </div>
            </div>
          )}

          <Select
            label="Person"
            required
            options={memberOptions}
            placeholder="Select member"
            value={form.person || ''}
            onChange={(e) => {
              const matchedMember = members.find(m => m.name === e.target.value);
              setForm({
                ...form,
                person: e.target.value,
                phone: matchedMember?.phone || form.phone,
                email: matchedMember?.email || form.email,
              });
            }}
            className="sm:col-span-2"
          />

          <Input
            label="Phone Number"
            type="text"
            placeholder="e.g. 08033333333"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="member@example.com"
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <Textarea
            label="Topic / Subject"
            rows={2}
            value={form.topic || ''}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            className="sm:col-span-2"
          />

          <Input
            label="Scripture Reference"
            placeholder="e.g. Alma 32:21-43"
            value={form.scripture_ref || ''}
            onChange={(e) => setForm({ ...form, scripture_ref: e.target.value })}
          />
          <Input
            label="Study / Talk Link"
            placeholder="https://churchofjesuschrist.org/..."
            value={form.talk_link || ''}
            onChange={(e) => setForm({ ...form, talk_link: e.target.value })}
          />

          <Input
            label="Duration (minutes)"
            type="number"
            value={form.minutes || 10}
            onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })}
          />
          <Input
            label="Meeting Time"
            type="time"
            value={form.meeting_time || '10:00'}
            onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
          />

          <Input
            label="Venue"
            value={form.venue || ''}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
          />
          <Select
            label="Status"
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'SENT', label: 'Sent' },
              { value: 'REMINDED', label: 'Reminded' },
            ]}
            value={form.status || 'PENDING'}
            onChange={(e) => setForm({ ...form, status: e.target.value as AssignmentStatus })}
          />
        </div>
      </Modal>
    </div>
  );
}
