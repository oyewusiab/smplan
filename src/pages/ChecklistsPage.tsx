import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  CheckSquare,
  Printer,
  RotateCcw,
  CheckCheck,
  Calendar,
  Sparkles,
  Search,
  Trash2,
  ListTodo,
  BarChart3,
  Clock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  MessageCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { MemberAutocomplete } from '../components/checklist/MemberAutocomplete';
import { ChecklistPrintModal } from '../components/checklist/ChecklistPrintModal';
import { ChecklistWhatsAppModal } from '../components/checklist/ChecklistWhatsAppModal';
import { useAuthStore } from '../store/authStore';
import { checklistsApi, plannersApi, membersApi } from '../services/api';
import type { ChecklistItem, Planner, Agenda, Member, ChecklistWeekAggregate } from '../types';
import { format, parseISO, isAfter, startOfDay, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

// Standard 8 Sacrament Readiness Tasks
export const STANDARD_CHECKLIST_TASKS = [
  'Microphones tested',
  'Sacrament bread ready',
  'Water cups ready',
  'Sacrament table prepared & covered',
  'Hymn numbers displayed on board',
  'Podium prepared (water, program, scriptures)',
  'Speakers confirmed present on stand',
  'Presiding authority confirmed & greeted',
];

export function ChecklistsPage() {
  const { session } = useAuthStore();

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<'weekly' | 'aggregate'>('weekly');

  // Core Data
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selection
  const [selectedPlannerId, setSelectedPlannerId] = useState<string>('');
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DONE' | 'PENDING'>('ALL');

  // Modals & Actions
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ChecklistItem>>({ status: 'PENDING' });
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTaskResp, setQuickTaskResp] = useState('');
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Load all initial data
  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [checklistsRes, plannersRes, membersRes] = await Promise.all([
        checklistsApi.list(session.token) as Promise<{ ok: boolean; data: ChecklistItem[] }>,
        plannersApi.list(session.token) as Promise<{ ok: boolean; data: Planner[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
      ]);

      if (checklistsRes.ok) setItems(checklistsRes.data || []);
      if (membersRes.ok) setMembers(membersRes.data || []);

      if (plannersRes.ok && plannersRes.data && plannersRes.data.length > 0) {
        const loadedPlanners = plannersRes.data;
        setPlanners(loadedPlanners);

        // Select the active/first planner if not set
        if (!selectedPlannerId) {
          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const currentPlanner = loadedPlanners.find(
            (p) => Number(p.month) === currentMonth && Number(p.year) === currentYear
          ) || loadedPlanners[0];

          if (currentPlanner) {
            setSelectedPlannerId(currentPlanner.planner_id);
            // Default to first week
            const parsedWeeks = parsePlannerWeeks(currentPlanner);
            if (parsedWeeks.length > 0 && !selectedWeekId) {
              setSelectedWeekId(parsedWeeks[0].week_id);
            }
          }
        }
      }
    } catch {
      toast.error('Failed to load checklist data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Helper to parse agendas/weeks from a planner
  const parsePlannerWeeks = (planner?: Planner): Agenda[] => {
    if (!planner || !planner.weeks) return [];
    try {
      if (typeof planner.weeks === 'string') {
        return JSON.parse(planner.weeks);
      }
      return planner.weeks as unknown as Agenda[];
    } catch {
      return [];
    }
  };

  // Currently selected planner and its agendas
  const selectedPlanner = useMemo(
    () => planners.find((p) => p.planner_id === selectedPlannerId) || planners[0],
    [planners, selectedPlannerId]
  );

  const plannerWeeks = useMemo(
    () => parsePlannerWeeks(selectedPlanner),
    [selectedPlanner]
  );

  // Set default week when planner changes
  useEffect(() => {
    if (plannerWeeks.length > 0) {
      const exists = plannerWeeks.some((w) => w.week_id === selectedWeekId);
      if (!exists) {
        setSelectedWeekId(plannerWeeks[0].week_id);
      }
    }
  }, [plannerWeeks, selectedWeekId]);

  // Currently selected agenda / week
  const selectedAgenda = useMemo(
    () => plannerWeeks.find((w) => w.week_id === selectedWeekId) || plannerWeeks[0],
    [plannerWeeks, selectedWeekId]
  );

  // Identify the Next Upcoming Sunday across all planners
  const nextSundayFocus = useMemo(() => {
    const today = startOfDay(new Date());
    let nextAg: { agenda: Agenda; planner: Planner } | null = null;
    let minDiff = Infinity;

    planners.forEach((p) => {
      const weeks = parsePlannerWeeks(p);
      weeks.forEach((w) => {
        if (w.date && !w.is_canceled) {
          try {
            const meetingDate = parseISO(w.date);
            if (isAfter(meetingDate, addDays(today, -1))) {
              const diff = meetingDate.getTime() - today.getTime();
              if (diff >= 0 && diff < minDiff) {
                minDiff = diff;
                nextAg = { agenda: w, planner: p };
              }
            }
          } catch {
            // ignore parse error
          }
        }
      });
    });

    return nextAg;
  }, [planners]);

  // Filter items for the currently selected week
  const currentWeekItems = useMemo(() => {
    if (!selectedAgenda && !selectedWeekId) return [];
    return items.filter(
      (item) =>
        (selectedWeekId && item.week_id === selectedWeekId) ||
        (selectedAgenda?.week_id && item.week_id === selectedAgenda.week_id) ||
        (item.planner_id === selectedPlannerId &&
          item.week_label?.toLowerCase().includes((selectedAgenda?.date || '').toLowerCase()))
    );
  }, [items, selectedWeekId, selectedAgenda, selectedPlannerId]);

  // Filtered items by search and status
  const visibleItems = useMemo(() => {
    return currentWeekItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.responsible || '').toLowerCase().includes(searchQuery.toLowerCase());

      const isDone = item.status === 'DONE' || item.status === true;
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'DONE'
          ? isDone
          : !isDone;

      return matchesSearch && matchesStatus;
    });
  }, [currentWeekItems, searchQuery, statusFilter]);

  // Current week readiness metrics
  const doneCount = currentWeekItems.filter((i) => i.status === 'DONE' || i.status === true).length;
  const totalCount = currentWeekItems.length;
  const readinessPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const pendingCount = totalCount - doneCount;

  // Aggregate Stats Data for All Weeks in Selected Planner (Tab 2)
  const aggregateWeeksData: ChecklistWeekAggregate[] = useMemo(() => {
    return plannerWeeks.map((week, idx) => {
      const weekItems = items.filter(
        (i) =>
          i.week_id === week.week_id ||
          (i.planner_id === selectedPlannerId &&
            i.week_label?.toLowerCase().includes((week.date || '').toLowerCase()))
      );

      const done = weekItems.filter((i) => i.status === 'DONE' || i.status === true).length;
      const total = weekItems.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;

      let status: 'Ready ✓' | 'In Progress' | 'Pending' | 'Not Started' = 'Not Started';
      if (total > 0) {
        if (pct === 100) status = 'Ready ✓';
        else if (pct > 0) status = 'In Progress';
        else status = 'Pending';
      }

      const formattedDate = week.date ? format(parseISO(week.date), 'MMM d, yyyy') : `Week ${idx + 1}`;
      const weekLabel = `Week ${idx + 1} — ${formattedDate}`;

      return {
        week_id: week.week_id,
        week_label: weekLabel,
        date: formattedDate,
        totalTasks: total,
        doneTasks: done,
        progressPct: pct,
        status,
        conducting: week.conducting || selectedPlanner?.conducting_officer || '',
        venue: week.venue_override || selectedPlanner?.unit_name || 'Main Chapel',
        time: week.meeting_time_override || week.start_time || '9:00 AM',
      };
    });
  }, [plannerWeeks, items, selectedPlannerId, selectedPlanner]);

  // Handlers for Checklist Items

  // 1. Live Checkbox Toggle
  const toggleItemStatus = async (item: ChecklistItem) => {
    if (!session) return;
    const isCurrentlyDone = item.status === 'DONE' || item.status === true;
    const newStatus = isCurrentlyDone ? 'PENDING' : 'DONE';
    const nowIso = new Date().toISOString();
    const updatedBy = session.name || session.username || 'User';

    // Optimistic Update
    setItems((prev) =>
      prev.map((i) =>
        i.checklist_id === item.checklist_id
          ? { ...i, status: newStatus, updated_by: updatedBy, updated_date: nowIso }
          : i
      )
    );

    try {
      await checklistsApi.update(session.token, {
        checklist_id: item.checklist_id,
        status: newStatus,
        responsible: item.responsible,
        task: item.task,
        updated_by: updatedBy,
        updated_date: nowIso,
      });
      toast.success(newStatus === 'DONE' ? 'Task checked off ✓' : 'Task marked pending');
    } catch {
      toast.error('Failed to update status on server');
      loadData();
    }
  };

  // 2. Assign Responsible Person
  const updateResponsible = async (item: ChecklistItem, newResponsible: string, phone?: string) => {
    if (!session) return;
    const nowIso = new Date().toISOString();

    setItems((prev) =>
      prev.map((i) =>
        i.checklist_id === item.checklist_id
          ? { ...i, responsible: newResponsible, phone: phone || i.phone, updated_date: nowIso }
          : i
      )
    );

    try {
      await checklistsApi.update(session.token, {
        checklist_id: item.checklist_id,
        responsible: newResponsible,
        phone: phone || item.phone,
        status: item.status,
        task: item.task,
        updated_by: session.name,
        updated_date: nowIso,
      });
      toast.success(`Assigned to ${newResponsible || 'Unassigned'}`);
    } catch {
      toast.error('Failed to update assignment');
    }
  };

  // 3. Delete Task
  const handleDeleteItem = async (checklistId: string) => {
    if (!session) return;
    setItems((prev) => prev.filter((i) => i.checklist_id !== checklistId));

    try {
      await checklistsApi.delete(session.token, checklistId);
      toast.success('Task removed');
    } catch {
      toast.error('Failed to delete task');
      loadData();
    }
  };

  // 4. Auto-Seed Standard 8 Tasks
  const handleSeedStandardTasks = async () => {
    if (!session || !selectedPlannerId || !selectedAgenda) {
      toast.error('Please select a valid planner and week');
      return;
    }

    setSaving(true);
    const weekLabel = `Week ${plannerWeeks.findIndex((w) => w.week_id === selectedAgenda.week_id) + 1} — ${
      selectedAgenda.date ? format(parseISO(selectedAgenda.date), 'MMM d, yyyy') : 'Sunday'
    }`;

    try {
      await checklistsApi.seed(session.token, {
        planner_id: selectedPlannerId,
        week_id: selectedAgenda.week_id,
        week_label: weekLabel,
        date: selectedAgenda.date,
      });
      toast.success('Seeded 8 Standard Sacrament Meeting Tasks!');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to auto-seed tasks');
    } finally {
      setSaving(false);
    }
  };

  // 5. Bulk Assign Pending Tasks
  const handleBulkAssignPending = async () => {
    if (!session || !bulkAssignee.trim()) {
      toast.error('Please select or type a member name to assign');
      return;
    }

    setSaving(true);
    try {
      await checklistsApi.bulkAssign(session.token, {
        planner_id: selectedPlannerId,
        week_id: selectedAgenda?.week_id || selectedWeekId,
        responsible: bulkAssignee,
      });
      toast.success(`Assigned all pending tasks to ${bulkAssignee}`);
      setBulkAssignee('');
      loadData();
    } catch {
      toast.error('Bulk assignment failed');
    } finally {
      setSaving(false);
    }
  };

  // 6. Reset Week
  const handleResetWeek = async () => {
    if (!session || !selectedAgenda) return;
    if (!confirm('Are you sure you want to reset all tasks for this week to Pending?')) return;

    setSaving(true);
    try {
      await checklistsApi.resetWeek(session.token, {
        planner_id: selectedPlannerId,
        week_id: selectedAgenda.week_id,
      });
      toast.success('Week reset to fresh pending status');
      loadData();
    } catch {
      toast.error('Failed to reset week');
    } finally {
      setSaving(false);
    }
  };

  // 7. Mark All Done / Pending
  const handleSetAllStatus = async (targetStatus: 'DONE' | 'PENDING') => {
    if (!session || currentWeekItems.length === 0) return;

    const updated = currentWeekItems.map((i) => ({
      ...i,
      status: targetStatus,
      updated_by: session.name,
      updated_date: new Date().toISOString(),
    }));

    setItems((prev) =>
      prev.map((i) => {
        const match = updated.find((u) => u.checklist_id === i.checklist_id);
        return match ? match : i;
      })
    );

    try {
      await checklistsApi.bulkUpdate(session.token, { items: updated });
      toast.success(targetStatus === 'DONE' ? 'All tasks marked done ✓' : 'All tasks marked pending');
    } catch {
      toast.error('Failed to update all tasks');
      loadData();
    }
  };

  // 8. Add Quick Custom Task
  const handleAddQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !quickTaskText.trim()) return;

    setSaving(true);
    const weekLabel = selectedAgenda
      ? `Week ${plannerWeeks.findIndex((w) => w.week_id === selectedAgenda.week_id) + 1} — ${
          selectedAgenda.date ? format(parseISO(selectedAgenda.date), 'MMM d, yyyy') : 'Sunday'
        }`
      : 'General';

    try {
      const res = (await checklistsApi.create(session.token, {
        planner_id: selectedPlannerId,
        week_id: selectedAgenda?.week_id || selectedWeekId,
        week_label: weekLabel,
        task: quickTaskText.trim(),
        responsible: quickTaskResp.trim(),
        status: 'PENDING',
        updated_by: session.name,
        updated_date: new Date().toISOString(),
      })) as { ok: boolean; error?: string };

      if (!res.ok) throw new Error(res.error);
      toast.success('Task added');
      setQuickTaskText('');
      setQuickTaskResp('');
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setSaving(false);
    }
  };

  // Format Helper for timestamps
  const formatTimestamp = (isoDate?: string, byUser?: string) => {
    if (!isoDate) return null;
    try {
      const date = parseISO(isoDate);
      const timeStr = format(date, 'h:mm a');
      return byUser ? `Checked off by ${byUser} at ${timeStr}` : `Completed at ${timeStr}`;
    } catch {
      return byUser ? `Updated by ${byUser}` : null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <Header
        title="Sunday Readiness & Checklists"
        subtitle="Sunday morning mission control & sacrament meeting readiness engine"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={loadData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => setShowPrintModal(true)}
            >
              Print Sheet
            </Button>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setForm({ status: 'PENDING', planner_id: selectedPlannerId, week_id: selectedAgenda?.week_id });
                setShowForm(true);
              }}
            >
              Add Task
            </Button>
          </div>
        }
      />

      <div className="px-4 lg:px-8 space-y-5">
        {/* STEP 1: Next Sunday Focus Banner */}
        {nextSundayFocus && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 text-white shadow-lg">
            <div className="absolute right-0 top-0 translate-x-10 -translate-y-6 opacity-10 pointer-events-none">
              <ShieldCheck className="h-48 w-48 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider">
                    <Clock className="h-3 w-3" /> NEXT MEETING — FOCUS
                  </span>
                  <span className="text-xs text-blue-200 font-medium">
                    {nextSundayFocus.planner.unit_name || 'Obantoko Ward'}
                  </span>
                </div>

                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  Sunday,{' '}
                  {nextSundayFocus.agenda.date
                    ? format(parseISO(nextSundayFocus.agenda.date), 'MMMM d, yyyy')
                    : 'Upcoming'}
                </h2>

                <p className="text-xs md:text-sm text-blue-100/90 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>🏛 {nextSundayFocus.agenda.venue_override || nextSundayFocus.planner.unit_name || 'Main Chapel'}</span>
                  <span>•</span>
                  <span>⏰ {nextSundayFocus.agenda.meeting_time_override || nextSundayFocus.agenda.start_time || '9:00 AM'}</span>
                  {nextSundayFocus.agenda.conducting && (
                    <>
                      <span>•</span>
                      <span>Conducting: {nextSundayFocus.agenda.conducting}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  className="bg-white text-blue-900 hover:bg-blue-50 font-bold shadow-md"
                  icon={<ArrowRight className="h-4 w-4 text-blue-700" />}
                  onClick={() => {
                    setSelectedPlannerId(nextSundayFocus.planner.planner_id);
                    setSelectedWeekId(nextSundayFocus.agenda.week_id);
                    setActiveTab('weekly');
                    toast.success('Focused on Next Sunday Readiness Checklist');
                  }}
                >
                  Prepare Now →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher Tabs & Planner Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('weekly')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all',
                activeTab === 'weekly'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <CheckSquare className="h-4 w-4" />
              Weekly Readiness Matrix
            </button>
            <button
              onClick={() => setActiveTab('aggregate')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all',
                activeTab === 'aggregate'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Aggregate Monthly Stats (Tab 2)
            </button>
          </div>

          {/* Planner Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Plan Month:
            </span>
            <select
              value={selectedPlannerId}
              onChange={(e) => setSelectedPlannerId(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {planners.map((p) => (
                <option key={p.planner_id} value={p.planner_id}>
                  {format(new Date(Number(p.year), Number(p.month) - 1, 1), 'MMMM yyyy')} ({p.unit_name || 'Ward'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────────── */}
        {/* TAB 1: WEEKLY READINESS DASHBOARD */}
        {/* ────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'weekly' && (
          <div className="space-y-5">
            {/* Week Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {plannerWeeks.map((ag, idx) => {
                const isSelected = (selectedAgenda?.week_id || selectedWeekId) === ag.week_id;
                const formattedDate = ag.date ? format(parseISO(ag.date), 'MMM d') : `Week ${idx + 1}`;
                const weekTasks = items.filter((i) => i.week_id === ag.week_id);
                const doneWeekTasks = weekTasks.filter((i) => i.status === 'DONE' || i.status === true).length;
                const isAllDone = weekTasks.length > 0 && doneWeekTasks === weekTasks.length;

                return (
                  <button
                    key={ag.week_id || idx}
                    onClick={() => setSelectedWeekId(ag.week_id)}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border',
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : isAllDone
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Week {idx + 1} — {formattedDate}</span>
                    {weekTasks.length > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : isAllDone
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {doneWeekTasks}/{weekTasks.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Meeting Header & Progress Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      WEEKLY READINESS DASHBOARD
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-semibold text-slate-600">
                      {selectedAgenda?.venue_override || selectedPlanner?.unit_name || 'Main Chapel'} • {selectedAgenda?.meeting_time_override || selectedAgenda?.start_time || '9:00 AM'}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-extrabold text-slate-900 mt-0.5">
                    Selected Meeting:{' '}
                    {selectedAgenda?.date
                      ? format(parseISO(selectedAgenda.date), 'EEEE, MMMM d, yyyy')
                      : 'Sunday'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conducting: <span className="font-semibold text-slate-700">{selectedAgenda?.conducting || selectedPlanner?.conducting_officer || 'Conducting Leader'}</span>
                  </p>
                </div>

                {/* Score Pills */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Readiness Score</p>
                    <p className={cn(
                      'text-xl font-black',
                      readinessPct === 100 ? 'text-emerald-600' : readinessPct > 50 ? 'text-blue-600' : 'text-amber-600'
                    )}>
                      {readinessPct}% Ready
                    </p>
                  </div>
                  <Badge variant={readinessPct === 100 ? 'success' : pendingCount > 0 ? 'warning' : 'default'} className="text-xs px-2.5 py-1">
                    {readinessPct === 100 ? 'All 100% Ready ✓' : `${pendingCount} Pending Task${pendingCount !== 1 ? 's' : ''}`}
                  </Badge>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={cn(
                    'h-3 rounded-full transition-all duration-500',
                    readinessPct === 100 ? 'bg-emerald-500' : readinessPct > 50 ? 'bg-blue-600' : 'bg-amber-500'
                  )}
                  style={{ width: `${readinessPct}%` }}
                />
              </div>

              {/* Quick Actions & Bulk Assignment Toolbar */}
              <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Left: Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Printer className="h-3.5 w-3.5 text-slate-600" />}
                    onClick={() => setShowPrintModal(true)}
                  >
                    Printable Version
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<RotateCcw className="h-3.5 w-3.5 text-slate-600" />}
                    onClick={handleResetWeek}
                    loading={saving}
                  >
                    Reset Week
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<CheckCheck className="h-3.5 w-3.5 text-emerald-600" />}
                    onClick={() => handleSetAllStatus('DONE')}
                    loading={saving}
                  >
                    Mark All Done
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<CheckSquare className="h-3.5 w-3.5 text-slate-500" />}
                    onClick={() => handleSetAllStatus('PENDING')}
                    loading={saving}
                  >
                    Mark All Pending
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    icon={<MessageCircle className="h-3.5 w-3.5" />}
                    onClick={() => setShowWhatsAppModal(true)}
                  >
                    WhatsApp Reminders
                  </Button>
                </div>

                {/* Right: Bulk Assign to Leader */}
                <div className="flex items-center gap-2 min-w-[280px]">
                  <div className="flex-1">
                    <MemberAutocomplete
                      size="sm"
                      value={bulkAssignee}
                      onChange={(val) => setBulkAssignee(val)}
                      members={members}
                      placeholder="Assign all pending to..."
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<UserCheck className="h-3.5 w-3.5" />}
                    onClick={handleBulkAssignPending}
                    loading={saving}
                    disabled={!bulkAssignee.trim()}
                  >
                    Assign Pending
                  </Button>
                </div>
              </div>
            </div>

            {/* Task Matrix List */}
            <Card>
              <CardHeader className="py-3 px-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    Sunday Morning Tasks Matrix ({visibleItems.length})
                  </h4>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search task or member..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'DONE' | 'PENDING')}
                    className="text-xs rounded-lg border border-slate-300 bg-white px-2 py-1 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Only</option>
                    <option value="DONE">Done Only</option>
                  </select>
                </div>
              </CardHeader>

              <CardBody className="p-0">
                {currentWeekItems.length === 0 ? (
                  <div className="py-16 px-6 text-center space-y-4">
                    <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h4 className="text-base font-bold text-slate-900">No Checklist Tasks Seeded Yet</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Get Sunday morning ready instantly by auto-seeding the 8 standard sacrament preparation tasks.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        icon={<Sparkles className="h-4 w-4" />}
                        onClick={handleSeedStandardTasks}
                        loading={saving}
                      >
                        Auto-Seed 8 Standard Tasks
                      </Button>
                      <Button
                        variant="outline"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => setShowForm(true)}
                      >
                        Add Custom Task
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/75 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                          <th className="py-2.5 px-4 w-12 text-center">Status</th>
                          <th className="py-2.5 px-4 font-bold text-slate-800">Preparation Task</th>
                          <th className="py-2.5 px-4 w-64 font-bold text-slate-800">Responsible Member</th>
                          <th className="py-2.5 px-4 w-52 font-bold text-slate-800">Completion Log</th>
                          <th className="py-2.5 px-4 w-20 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleItems.map((item) => {
                          const isDone = item.status === 'DONE' || item.status === true;
                          const logStr = formatTimestamp(item.updated_date, item.updated_by);

                          return (
                            <tr
                              key={item.checklist_id}
                              className={cn(
                                'transition-colors hover:bg-slate-50/80',
                                isDone ? 'bg-emerald-50/35 text-slate-800' : 'bg-white'
                              )}
                            >
                              {/* Checkbox Toggle */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleItemStatus(item)}
                                  className={cn(
                                    'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mx-auto transition-all shadow-xs',
                                    isDone
                                      ? 'border-emerald-600 bg-emerald-600 text-white scale-105'
                                      : 'border-slate-300 bg-white hover:border-blue-500'
                                  )}
                                  title={isDone ? 'Mark Pending' : 'Mark Done'}
                                >
                                  {isDone && (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12">
                                      <path
                                        d="M2 6l3 3 5-5"
                                        stroke="currentColor"
                                        strokeWidth="2.2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </button>
                              </td>

                              {/* Task Name */}
                              <td className="py-3 px-4">
                                <span
                                  className={cn(
                                    'text-sm font-medium transition-all',
                                    isDone ? 'line-through text-slate-400 font-normal' : 'text-slate-900 font-semibold'
                                  )}
                                >
                                  {item.task}
                                </span>
                              </td>

                              {/* Responsible Person with Member Autocomplete */}
                              <td className="py-2 px-4">
                                <MemberAutocomplete
                                  size="sm"
                                  value={item.responsible || ''}
                                  onChange={(name, phone) => updateResponsible(item, name, phone)}
                                  members={members}
                                  placeholder="Assign member..."
                                />
                              </td>

                              {/* Time-stamped Completion Log */}
                              <td className="py-3 px-4">
                                {isDone ? (
                                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate">{logStr || 'Checked off ✓'}</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-normal italic">
                                    Pending setup
                                  </span>
                                )}
                              </td>

                              {/* Delete Action */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteItem(item.checklist_id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                                  title="Delete task"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Inline Quick Add Task Form */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-200">
                  <form onSubmit={handleAddQuickTask} className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="+ Add Custom Task (e.g. Clean overflow chairs, setup youth class...)"
                        value={quickTaskText}
                        onChange={(e) => setQuickTaskText(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="w-full sm:w-60">
                      <MemberAutocomplete
                        size="sm"
                        value={quickTaskResp}
                        onChange={(name) => setQuickTaskResp(name)}
                        members={members}
                        placeholder="Assignee (optional)..."
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      icon={<Plus className="h-3.5 w-3.5" />}
                      loading={saving}
                      disabled={!quickTaskText.trim()}
                    >
                      Add Task
                    </Button>
                  </form>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────── */}
        {/* TAB 2: AGGREGATE MONTHLY STATS MODE */}
        {/* ────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'aggregate' && (
          <div className="space-y-5">
            <Card>
              <CardHeader className="py-4 px-6 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ALL WEEKS — COMPLETION SUMMARY
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-level sacrament meeting readiness overview across all weeks in{' '}
                    {format(
                      new Date(
                        Number(selectedPlanner?.year || new Date().getFullYear()),
                        Number(selectedPlanner?.month || new Date().getMonth() + 1) - 1,
                        1
                      ),
                      'MMMM yyyy'
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Printer className="h-4 w-4" />}
                  onClick={() => setShowPrintModal(true)}
                >
                  Print Summary
                </Button>
              </CardHeader>

              <CardBody className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                        <th className="py-3 px-5 font-bold">Week</th>
                        <th className="py-3 px-5 font-bold">Date</th>
                        <th className="py-3 px-5 font-bold text-center">Done / Total</th>
                        <th className="py-3 px-5 font-bold w-64">Completion Progress</th>
                        <th className="py-3 px-5 font-bold text-center">Readiness Status</th>
                        <th className="py-3 px-5 text-right font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {aggregateWeeksData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                            No weeks found in selected monthly planner.
                          </td>
                        </tr>
                      ) : (
                        aggregateWeeksData.map((week, idx) => (
                          <tr
                            key={week.week_id || idx}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedWeekId(week.week_id);
                              setActiveTab('weekly');
                            }}
                          >
                            <td className="py-4 px-5 font-bold text-slate-900">
                              Week {idx + 1}
                            </td>
                            <td className="py-4 px-5 font-medium text-slate-700">
                              📅 {week.date}
                            </td>
                            <td className="py-4 px-5 text-center font-bold text-slate-800">
                              {week.doneTasks} / {week.totalTasks}
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-2.5 rounded-full transition-all duration-300',
                                      week.progressPct === 100
                                        ? 'bg-emerald-500'
                                        : week.progressPct > 0
                                        ? 'bg-blue-600'
                                        : 'bg-slate-200'
                                    )}
                                    style={{ width: `${week.progressPct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-black text-slate-700 w-10 text-right">
                                  {week.progressPct}%
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
                                  week.status === 'Ready ✓'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : week.status === 'In Progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : week.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                )}
                              >
                                {week.status}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWeekId(week.week_id);
                                  setActiveTab('weekly');
                                }}
                              >
                                Open Week →
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* Add Custom Task Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Checklist Task"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!session || !form.task) {
                  toast.error('Task description is required');
                  return;
                }
                setSaving(true);
                try {
                  const res = (await checklistsApi.create(session.token, {
                    planner_id: selectedPlannerId,
                    week_id: selectedAgenda?.week_id || selectedWeekId,
                    week_label: selectedAgenda
                      ? `Week — ${selectedAgenda.date || ''}`
                      : form.week_label || 'General',
                    task: form.task,
                    responsible: form.responsible || '',
                    status: form.status || 'PENDING',
                    updated_by: session.name,
                    updated_date: new Date().toISOString(),
                  })) as { ok: boolean; error?: string };

                  if (!res.ok) throw new Error(res.error);
                  toast.success('Task created');
                  setShowForm(false);
                  setForm({ status: 'PENDING' });
                  loadData();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to create');
                } finally {
                  setSaving(false);
                }
              }}
              loading={saving}
            >
              Add Task
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Task Description"
            required
            value={form.task || ''}
            onChange={(e) => setForm({ ...form, task: e.target.value })}
            placeholder="e.g. Test pulpit audio microphone height"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Responsible Person
            </label>
            <MemberAutocomplete
              value={form.responsible || ''}
              onChange={(name) => setForm({ ...form, responsible: name })}
              members={members}
              placeholder="Assign ward brother or sister..."
            />
          </div>

          <Select
            label="Status"
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'DONE', label: 'Done' },
            ]}
            value={form.status === 'DONE' || form.status === true ? 'DONE' : 'PENDING'}
            onChange={(e) => setForm({ ...form, status: e.target.value as ChecklistItem['status'] })}
          />
        </div>
      </Modal>

      {/* Printable Clipboard View Modal */}
      <ChecklistPrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        items={currentWeekItems}
        weekLabel={
          selectedAgenda
            ? `Week ${plannerWeeks.findIndex((w) => w.week_id === selectedAgenda.week_id) + 1}`
            : 'Sunday'
        }
        dateStr={selectedAgenda?.date}
        unitName={selectedPlanner?.unit_name || 'Obantoko Ward'}
        venue={selectedAgenda?.venue_override || 'Main Chapel'}
        time={selectedAgenda?.meeting_time_override || selectedAgenda?.start_time || '9:00 AM'}
        conducting={selectedAgenda?.conducting || selectedPlanner?.conducting_officer}
      />

      {/* Saturday Night WhatsApp Reminders Modal */}
      <ChecklistWhatsAppModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        items={currentWeekItems}
        members={members}
        weekLabel={
          selectedAgenda?.date
            ? format(parseISO(selectedAgenda.date), 'EEEE, MMM d')
            : 'Sunday'
        }
        unitName={selectedPlanner?.unit_name || 'Obantoko Ward'}
        venue={selectedAgenda?.venue_override || 'Chapel'}
        time={selectedAgenda?.meeting_time_override || selectedAgenda?.start_time || '8:30 AM'}
      />
    </div>
  );
}
