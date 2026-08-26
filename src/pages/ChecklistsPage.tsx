import { useState, useEffect } from 'react';
import { Plus, RefreshCw, CheckSquare } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { checklistsApi } from '../services/api';
import type { ChecklistItem, ChecklistStatus } from '../types';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { value: ChecklistStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

export function ChecklistsPage() {
  const { session } = useAuthStore();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<ChecklistItem>>({ status: 'PENDING' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await checklistsApi.list(session.token) as { ok: boolean; data: ChecklistItem[] };
      if (res.ok) setItems(res.data || []);
    } catch {
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const updateStatus = async (item: ChecklistItem, status: ChecklistStatus) => {
    if (!session) return;
    try {
      await checklistsApi.update(session.token, { ...item, status, updated_by: session.name, updated_date: new Date().toISOString() });
      setItems((prev) => prev.map((i) => i.checklist_id === item.checklist_id ? { ...i, status } : i));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleCreate = async () => {
    if (!session || !form.task) { toast.error('Task is required'); return; }
    setSaving(true);
    try {
      const res = await checklistsApi.create(session.token, {
        ...form,
        created_by: session.name,
        updated_by: session.name,
        updated_date: new Date().toISOString(),
      }) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success('Checklist item added');
      setShowForm(false);
      setForm({ status: 'PENDING' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  // Group by week_label
  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    const key = item.week_label || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const doneCount = items.filter((i) => i.status === 'DONE').length;
  const total = items.length;

  return (
    <div>
      <Header
        title="Checklists"
        subtitle="Weekly preparation and task checklists"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>Refresh</Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>Add Task</Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        {/* Progress bar */}
        {total > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Overall Progress</span>
              <span className="text-sm font-bold text-blue-600">{doneCount}/{total} tasks done</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card><CardBody className="py-16 text-center">
            <CheckSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium mb-1">No checklist items</p>
            <p className="text-sm text-slate-400 mb-5">Add tasks to track weekly preparation.</p>
            <Button onClick={() => setShowForm(true)} icon={<Plus className="h-4 w-4" />}>Add First Task</Button>
          </CardBody></Card>
        ) : (
          Object.entries(grouped).map(([week, weekItems]) => {
            const weekDone = weekItems.filter((i) => i.status === 'DONE').length;
            return (
              <Card key={week}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-slate-900">{week}</span>
                    <span className="text-xs text-slate-400">{weekDone}/{weekItems.length} done</span>
                  </div>
                  <div className="w-24 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${weekItems.length > 0 ? (weekDone / weekItems.length) * 100 : 0}%` }}
                    />
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {weekItems.map((item) => (
                      <li key={item.checklist_id} className="flex items-center gap-4 px-5 py-3">
                        <button
                          onClick={() => updateStatus(item, item.status === 'DONE' ? 'PENDING' : 'DONE')}
                          className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            item.status === 'DONE'
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 hover:border-blue-400'
                          }`}
                        >
                          {item.status === 'DONE' && (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {item.task}
                          </p>
                          {item.responsible && (
                            <p className="text-xs text-slate-400">Responsible: {item.responsible}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={item.status} />
                          <select
                            value={item.status}
                            onChange={(e) => updateStatus(item, e.target.value as ChecklistStatus)}
                            className="text-xs rounded border border-slate-200 bg-white px-1.5 py-1 focus:outline-none"
                          >
                            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Add Checklist Task"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Add Task</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Task" required value={form.task || ''} onChange={(e) => setForm({ ...form, task: e.target.value })} placeholder="e.g. Confirm sacrament hymn number" />
          <Input label="Week Label" value={form.week_label || ''} onChange={(e) => setForm({ ...form, week_label: e.target.value })} placeholder="e.g. Week 1 — Jan 5" />
          <Input label="Responsible Person" value={form.responsible || ''} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          <Select label="Status" options={STATUS_OPTIONS} value={form.status || 'PENDING'} onChange={(e) => setForm({ ...form, status: e.target.value as ChecklistStatus })} />
        </div>
      </Modal>
    </div>
  );
}
