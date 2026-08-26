import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive, Search, RefreshCw, Eye, RotateCcw, Trash2, Printer, ClipboardList,
  AlertTriangle
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
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

export function ArchivePage() {
  const { session } = useAuthStore();
  const navigate = useNavigate();

  const [archivedPlanners, setArchivedPlanners] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Delete modal state
  const [deletePlanner, setDeletePlanner] = useState<Planner | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Printable modal state
  const [printModalPlanner, setPrintModalPlanner] = useState<Planner | null>(null);
  const [printModalAgendas, setPrintModalAgendas] = useState<Agenda[]>([]);

  const loadArchived = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await plannersApi.list(session.token) as { ok: boolean; data: Planner[] };
      if (res.ok) {
        const allPlanners = res.data || [];
        setArchivedPlanners(allPlanners.filter(p => p.state === 'ARCHIVED'));
      }
    } catch {
      toast.error('Failed to load archived items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadArchived(); }, [session]);

  const filtered = archivedPlanners.filter((p) => {
    const q = search.toLowerCase();
    const monthName = MONTHS.find(m => m.value === String(p.month))?.label.toLowerCase() || '';
    return (
      !q ||
      p.unit_name?.toLowerCase().includes(q) ||
      p.conducting_officer?.toLowerCase().includes(q) ||
      String(p.year).includes(q) ||
      monthName.includes(q)
    );
  });

  const handleRestore = async (planner: Planner) => {
    if (!session) return;
    try {
      await plannersApi.restore(session.token, planner.planner_id);
      toast.success(`Planner for ${MONTHS.find(m => m.value === String(planner.month))?.label} ${planner.year} restored to Submitted status`);
      await loadArchived();
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
      toast.success('Archived planner permanently deleted');
      setDeletePlanner(null);
      setDeleteConfirmInput('');
      await loadArchived();
    } catch {
      toast.error('Failed to delete archived planner');
    } finally {
      setDeleting(false);
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

  const isAdmin = session?.role === 'ADMIN';

  return (
    <div>
      <Header
        title="Historical Archive"
        subtitle="Central vault for completed, past, and archived planners & agendas"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={loadArchived} loading={loading}>
              Refresh Archive
            </Button>
            <Button size="sm" variant="outline" icon={<ClipboardList className="h-4 w-4" />} onClick={() => navigate('/planners')}>
              Active Planners
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">

        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search archived plans by month, year, unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filtered.length} Archived {filtered.length === 1 ? 'Record' : 'Records'} Stored
          </span>
        </div>

        {/* Archive Cards Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <Archive className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-700 font-semibold text-base mb-1">No archived records found</p>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                {search ? 'No archived plans match your search query.' : 'When monthly planners or agendas are archived, they will safely appear here for historical reference.'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => {
              const monthName = MONTHS.find(m => m.value === String(p.month))?.label || `Month ${p.month}`;
              const periodLabel = `${monthName} ${p.year}`;

              return (
                <Card key={p.planner_id} hoverable className="flex flex-col justify-between border border-slate-200">
                  <div>
                    <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase block mb-0.5">
                          Archived Plan
                        </span>
                        <h3 className="font-bold text-lg text-slate-800">
                          {periodLabel}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">{p.unit_name}</p>
                      </div>
                      <StatusBadge status={p.state} />
                    </CardHeader>

                    <CardBody className="py-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-400">Conducting Officer</span>
                        <span className="font-medium text-slate-700">{p.conducting_officer || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-100">
                        <span className="text-slate-400">Archive Date</span>
                        <span className="font-medium text-slate-600">
                          {p.archive_date ? format(new Date(p.archive_date), 'MMM d, yyyy') : '—'}
                        </span>
                      </div>
                    </CardBody>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => navigate(`/planners/${p.planner_id}`)}
                      >
                        View
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<Printer className="h-3.5 w-3.5" />}
                        onClick={() => openPrintModal(p)}
                      >
                        Print PDF
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <button
                          title="Restore to Active Submitted Status"
                          onClick={() => handleRestore(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-green-50 hover:text-green-600 transition"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          title="Permanently Delete Archive"
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

      {/* Double Confirmation Delete Modal */}
      {deletePlanner && (
        <Modal
          open={Boolean(deletePlanner)}
          onClose={() => setDeletePlanner(null)}
          title="Permanently Delete Archived Record"
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
                <p className="font-bold">Permanent Deletion Notice</p>
                <p className="text-xs text-red-700 mt-0.5">
                  This action will permanently purge this archived planner and all linked records from the Google Sheets database.
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
