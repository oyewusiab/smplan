import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ClipboardList, Search, RefreshCw, Archive, Send, Eye, Edit3, Lock,
  Trash2, RotateCcw, Printer, AlertTriangle
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../store/authStore';
import { plannersApi, agendasApi } from '../services/api';
import type { Planner, Agenda } from '../types';
import { PlannerPrintModal } from '../components/planner/PlannerPrintModal';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const MONTHS = [
  { value: '1', label: 'January' }, { value: '2', label: 'February' },
  { value: '3', label: 'March' }, { value: '4', label: 'April' },
  { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' },
  { value: '9', label: 'September' }, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - 1 + i),
  label: String(currentYear - 1 + i),
}));

export function getSundaysInMonth(year: number, month: number): Date[] {
  const sundays: Date[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === 0) { // 0 = Sunday
      sundays.push(d);
    }
  }
  return sundays;
}

export function PlannersPage() {
  const { session, can } = useAuthStore();
  const navigate = useNavigate();

  const [planners, setPlanners] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'ARCHIVED'>('ALL');

  // Modals state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [requestAccessPlanner, setRequestAccessPlanner] = useState<Planner | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [deletePlanner, setDeletePlanner] = useState<Planner | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [printModalPlanner, setPrintModalPlanner] = useState<Planner | null>(null);
  const [printModalAgendas, setPrintModalAgendas] = useState<Agenda[]>([]);

  const [form, setForm] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(currentYear),
    conducting_officer: session?.preferred_name || session?.name || '',
    unit_name: 'Lagos Ward',
  });

  // Keep form conducting_officer up to date with session user
  useEffect(() => {
    if (session) {
      setForm(prev => ({
        ...prev,
        conducting_officer: prev.conducting_officer || session.preferred_name || session.name || '',
      }));
    }
  }, [session]);

  const load = async (force = false) => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await plannersApi.list(session.token, { forceRefresh: force }) as { ok: boolean; data: Planner[] };
      if (res.ok) {
        // Planner page contains only drafted and submitted planners (archived belong on /archive)
        // Draft privacy rule: DRAFT planners are visible ONLY to the creator/initiator until submitted
        setPlanners((res.data || []).filter(p => p.state !== 'ARCHIVED' && (p.state !== 'DRAFT' || p.created_by === session.user_id)));
      }
    } catch {
      toast.error('Failed to load planners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const filtered = planners.filter((p) => {
    const q = search.toLowerCase();
    const monthName = MONTHS.find(m => m.value === String(p.month))?.label.toLowerCase() || '';
    const matchesSearch =
      !q ||
      p.unit_name?.toLowerCase().includes(q) ||
      p.conducting_officer?.toLowerCase().includes(q) ||
      String(p.year).includes(q) ||
      monthName.includes(q);

    const matchesStatus = statusFilter === 'ALL' || p.state === statusFilter || (statusFilter === 'SUBMITTED' && p.state === 'APPROVED');
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!session) return;
    setCreating(true);
    try {
      const conductingLeader = session.preferred_name || session.name || '';
      const unitName = session.organisation || 'OBANTOKO WARD';
      const res = await plannersApi.create(session.token, {
        month: Number(form.month),
        year: Number(form.year),
        conducting_officer: conductingLeader,
        unit_name: unitName,
      }) as { ok: boolean; data: Planner; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success('Planner created successfully');
      setShowCreate(false);
      await load();
      if (res.data?.planner_id) {
        navigate(`/planners/${res.data.planner_id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create planner');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (planner: Planner) => {
    if (!session) return;
    try {
      await plannersApi.submit(session.token, planner.planner_id);
      toast.success('Planner submitted to Bishopric for approval');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit planner');
    }
  };

  const handleArchive = async (planner: Planner) => {
    if (!session) return;
    try {
      await plannersApi.archive(session.token, planner.planner_id);
      toast.success('Planner archived');
      await load();
    } catch {
      toast.error('Failed to archive planner');
    }
  };

  const handleRestore = async (planner: Planner) => {
    if (!session) return;
    try {
      await plannersApi.restore(session.token, planner.planner_id);
      toast.success('Planner restored to submitted status');
      await load();
    } catch {
      toast.error('Failed to restore planner');
    }
  };

  const handleConfirmDelete = async () => {
    if (!session || !deletePlanner) return;
    if (deleteConfirmInput !== 'DELETE') {
      toast.error('Please type "DELETE" exactly to confirm');
      return;
    }
    setDeleting(true);
    try {
      await plannersApi.delete(session.token, deletePlanner.planner_id);
      toast.success('Planner and associated records permanently deleted');
      setDeletePlanner(null);
      setDeleteConfirmInput('');
      await load();
    } catch {
      toast.error('Failed to delete planner');
    } finally {
      setDeleting(false);
    }
  };

  const handleRequestEditAccess = async () => {
    if (!session || !requestAccessPlanner || !requestReason.trim()) {
      toast.error('Please state a reason for requesting edit access');
      return;
    }
    setSubmittingRequest(true);
    try {
      await plannersApi.requestEditAccess(session.token, requestAccessPlanner.planner_id, requestReason);
      toast.success('Edit access request dispatched to the Bishop');
      setRequestAccessPlanner(null);
      setRequestReason('');
    } catch {
      toast.error('Failed to send request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openPrintModal = async (planner: Planner) => {
    if (!session) return;
    try {
      const res = await agendasApi.list(session.token, planner.planner_id) as { ok: boolean; data: Agenda[] };
      if (res.ok) {
        setPrintModalAgendas(res.data || []);
        setPrintModalPlanner(planner);
      }
    } catch {
      toast.error('Failed to fetch agendas for preview');
    }
  };

  const canCreate = can('PLANNER_CREATE');
  const isAdmin = session?.role === 'ADMIN';

  return (
    <div>
      <Header
        title="Planner"
        subtitle="Monthly scheduling engine for draft & submitted sacrament planners"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => load(true)} loading={loading}>
              Refresh
            </Button>
            <Button size="sm" variant="outline" icon={<Archive className="h-4 w-4" />} onClick={() => navigate('/archive')}>
              Archive Vault
            </Button>
            {canCreate && (
              <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
                + Create New Monthly Planner
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">
        
        {/* Controls Bar: Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          
          {/* Search Input */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by month, year, unit or conducting leader..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto overflow-x-auto">
            {(['ALL', 'DRAFT', 'SUBMITTED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {st === 'ALL' ? 'Active Planners' : st}
              </button>
            ))}
          </div>

        </div>

        {/* Grid View */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7 text-blue-600" />}
            title={search || statusFilter !== 'ALL' ? 'No Matching Planners' : 'No Submitted Planners Yet'}
            description={
              search || statusFilter !== 'ALL'
                ? 'No monthly planners match your current search or filter criteria.'
                : 'When a monthly planner is created or submitted, sacrament meeting schedules will appear here.'
            }
            actionLabel={canCreate && !search && statusFilter === 'ALL' ? 'Create Draft Planner' : undefined}
            onAction={canCreate && !search && statusFilter === 'ALL' ? () => setShowCreate(true) : undefined}
            actionIcon={<Plus className="h-4 w-4" />}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => {
              const monthName = MONTHS.find(m => m.value === String(p.month))?.label || `Month ${p.month}`;
              const periodLabel = `${monthName} ${p.year}`;
              const isOwner = p.created_by === session?.user_id;
              const isDraft = p.state === 'DRAFT';
              const isSubmitted = p.state === 'SUBMITTED' || p.state === 'APPROVED';
              const isArchived = p.state === 'ARCHIVED';

              // Access check
              const canEditThis = isAdmin || session?.role === 'BISHOPRIC' || (isDraft && canCreate && isOwner);

              return (
                <Card
                  key={p.planner_id}
                  hoverable
                  className="group flex flex-col justify-between transition-all duration-200 hover:shadow-md border border-slate-200 hover:border-slate-300"
                >
                  <div>
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold tracking-wider text-blue-600 uppercase">
                            Monthly Plan
                          </span>
                          {p.state === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-green-100 text-green-800 border border-green-200">
                              100% Ready
                            </span>
                          ) : p.state === 'SUBMITTED' ? (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                              Submitted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                              Draft
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                          {periodLabel}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{p.unit_name}</p>
                      </div>
                      <StatusBadge status={p.state} />
                    </CardHeader>

                    <CardBody className="py-4 space-y-3">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-400">Conducting Officer</span>
                          <span className="font-medium text-slate-700 truncate max-w-[140px]">
                            {p.conducting_officer || 'TBD'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-400">Music Coordinator</span>
                          <span className="font-medium text-slate-700">{p.music_status || 'Pending'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-400">Last Updated</span>
                          <span className="font-medium text-slate-600">
                            {p.updated_date ? format(new Date(p.updated_date), 'MMM d, yyyy') : '—'}
                          </span>
                        </div>
                      </div>
                    </CardBody>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 pt-0 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                    
                    {/* Primary Action Button */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => navigate(`/planners/${p.planner_id}?mode=view`)}
                      >
                        View
                      </Button>

                      {canEditThis && (
                        <Button
                          size="xs"
                          variant="primary"
                          icon={<Edit3 className="h-3.5 w-3.5" />}
                          onClick={() => navigate(`/planners/${p.planner_id}`)}
                        >
                          Edit
                        </Button>
                      )}

                      {/* Request Edit Access button for non-admins on submitted plans */}
                      {isSubmitted && !canEditThis && (
                        <Button
                          size="xs"
                          variant="outline"
                          icon={<Lock className="h-3.5 w-3.5" />}
                          onClick={() => setRequestAccessPlanner(p)}
                        >
                          Request Edit
                        </Button>
                      )}

                      {/* Submit button for draft owners */}
                      {isDraft && (canCreate || isOwner) && (
                        <Button
                          size="xs"
                          variant="secondary"
                          icon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => handleSubmit(p)}
                        >
                          Submit
                        </Button>
                      )}
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-1">
                      
                      {/* Preview Printable Table */}
                      <button
                        title="Print Preview & PDF Export"
                        onClick={() => openPrintModal(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      {/* Admin Only Actions: Archive, Restore, Delete */}
                      {isAdmin && isSubmitted && (
                        <button
                          title="Archive Planner"
                          onClick={() => handleArchive(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}

                      {isAdmin && isArchived && (
                        <button
                          title="Restore Planner"
                          onClick={() => handleRestore(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-green-600 transition"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          title="Permanently Delete Planner"
                          onClick={() => {
                            setDeletePlanner(p);
                            setDeleteConfirmInput('');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                    </div>

                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Planner Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Monthly Planner"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating}>Create Planner</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select the target month and year. All Sunday dates (4 or 5 weeks) and meeting agendas will be <strong>automatically calculated and pre-populated</strong>.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Month"
              required
              options={MONTHS}
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            />
            <Select
              label="Year"
              required
              options={YEARS}
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
          </div>

          {/* Auto-Populated Sundays Preview */}
          {(() => {
            const previewSundays = getSundaysInMonth(Number(form.year), Number(form.month));
            return (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-900">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span>📅</span> Auto-Populated Sunday Schedule
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-200 text-blue-800">
                    {previewSundays.length} Sundays
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {previewSundays.map((sDate, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-blue-100 shadow-2xs">
                      <p className="font-bold text-slate-800">
                        Week {i + 1} {i === 0 ? '· Fast Sunday' : ''}
                      </p>
                      <p className="text-slate-500 font-mono text-2xs mt-0.5">
                        {format(sDate, 'EEEE, MMM d')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </Modal>

      {/* Request Edit Access Modal */}
      {requestAccessPlanner && (
        <Modal
          open={Boolean(requestAccessPlanner)}
          onClose={() => setRequestAccessPlanner(null)}
          title="Request Edit Access"
          footer={
            <>
              <Button variant="outline" onClick={() => setRequestAccessPlanner(null)}>Cancel</Button>
              <Button onClick={handleRequestEditAccess} loading={submittingRequest}>
                Send Request
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              This planner is currently <strong>SUBMITTED</strong>. To make changes, submit an Edit Access Request to the Bishop detailing your reason.
            </p>
            <Textarea
              label="Reason for Edit Request"
              required
              rows={3}
              placeholder="e.g. Need to update speaker assignments for Week 3 due to travel."
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* Double-Confirmation Delete Modal */}
      {deletePlanner && (
        <Modal
          open={Boolean(deletePlanner)}
          onClose={() => setDeletePlanner(null)}
          title="Permanently Delete Planner"
          footer={
            <>
              <Button variant="outline" onClick={() => setDeletePlanner(null)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={deleteConfirmInput !== 'DELETE'}
                loading={deleting}
                onClick={handleConfirmDelete}
              >
                Permanently Delete
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Caution: This action cannot be undone.</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Deleting this planner will permanently erase all linked weekly agendas, speaker assignments, and checklists from the database.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <span className="font-bold text-red-600">DELETE</span> below to confirm:
              </label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Preview Modal */}
      {printModalPlanner && (
        <PlannerPrintModal
          open={Boolean(printModalPlanner)}
          onClose={() => setPrintModalPlanner(null)}
          planner={printModalPlanner}
          agendas={printModalAgendas}
        />
      )}

    </div>
  );
}
