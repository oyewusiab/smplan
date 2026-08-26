import { useState, useEffect } from 'react';
import { Plus, Clock, RefreshCw, X } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { remindersApi } from '../services/api';
import type { Reminder, ReminderChannel } from '../types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const CHANNEL_OPTIONS = [
  { value: 'INTERNAL', label: 'Internal (In-App)' },
  { value: 'EMAIL', label: 'Email' },
];

export function RemindersPage() {
  const { session } = useAuthStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Reminder>>({ channel: 'INTERNAL', status: 'SCHEDULED' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await remindersApi.list(session.token) as { ok: boolean; data: Reminder[] };
      if (res.ok) setReminders(res.data || []);
    } catch {
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const handleCreate = async () => {
    if (!session || !form.to_person || !form.title || !form.scheduled_for_date) {
      toast.error('Recipient, title, and date are required');
      return;
    }
    setSaving(true);
    try {
      const res = await remindersApi.create(session.token, {
        ...form,
        created_by_user_id: session.user_id,
      }) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success('Reminder scheduled');
      setShowForm(false);
      setForm({ channel: 'INTERNAL', status: 'SCHEDULED' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!session) return;
    try {
      await remindersApi.cancel(session.token, id);
      toast.success('Reminder cancelled');
      load();
    } catch {
      toast.error('Failed to cancel reminder');
    }
  };

  const columns = [
    { key: 'to_person', header: 'To', render: (r: Reminder) => <span className="font-medium">{r.to_person}</span> },
    { key: 'title', header: 'Title' },
    { key: 'channel', header: 'Channel', render: (r: Reminder) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.channel === 'EMAIL' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
        {r.channel}
      </span>
    )},
    { key: 'scheduled_for_date', header: 'Scheduled For', render: (r: Reminder) =>
      r.scheduled_for_date ? format(parseISO(r.scheduled_for_date), 'MMM d, yyyy') : '—'
    },
    { key: 'status', header: 'Status', render: (r: Reminder) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: '', render: (r: Reminder) =>
      r.status === 'SCHEDULED' ? (
        <Button size="xs" variant="ghost" className="text-red-500" icon={<X className="h-3.5 w-3.5" />} onClick={() => handleCancel(r.reminder_id)}>
          Cancel
        </Button>
      ) : null
    },
  ];

  const scheduled = reminders.filter((r) => r.status === 'SCHEDULED').length;
  const sent = reminders.filter((r) => r.status === 'SENT').length;

  return (
    <div>
      <Header
        title="Reminders"
        subtitle="Assignment and event reminders"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>Refresh</Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>
              Schedule Reminder
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', count: reminders.length, color: 'bg-slate-50 text-slate-700' },
            { label: 'Scheduled', count: scheduled, color: 'bg-blue-50 text-blue-700' },
            { label: 'Sent', count: sent, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Failed', count: reminders.filter((r) => r.status === 'FAILED').length, color: 'bg-red-50 text-red-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-sm font-medium opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Info box about automated processing */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm">
          <div className="flex gap-2">
            <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-amber-700">
              <p className="font-semibold">Automated Processing</p>
              <p className="mt-0.5">
                Reminders are automatically processed daily by the Google Apps Script
                time-driven trigger (<code className="bg-amber-100 rounded px-1">processReminders()</code>).
                Scheduled reminders with a past date will be sent on the next trigger run.
              </p>
            </div>
          </div>
        </div>

        {reminders.length === 0 && !loading ? (
          <Card><CardBody className="py-16 text-center">
            <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No reminders scheduled</p>
            <p className="text-sm text-slate-400 mt-1">Create reminders for upcoming assignments and events.</p>
          </CardBody></Card>
        ) : (
          <Table
            columns={columns}
            data={reminders}
            keyExtractor={(r) => r.reminder_id}
            loading={loading}
            emptyMessage="No reminders found."
          />
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Schedule Reminder"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Schedule</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Recipient (Person Name)" required value={form.to_person || ''} onChange={(e) => setForm({ ...form, to_person: e.target.value })} />
          <Input label="Recipient User ID" value={form.to_user_id || ''} onChange={(e) => setForm({ ...form, to_user_id: e.target.value })} hint="Optional — links to a user account" />
          <Select label="Channel" options={CHANNEL_OPTIONS} value={form.channel || 'INTERNAL'} onChange={(e) => setForm({ ...form, channel: e.target.value as ReminderChannel })} />
          <Input label="Title" required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sacrament Meeting Speaker Reminder" />
          <Textarea label="Message Body" rows={3} value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Input label="Scheduled For Date" type="date" required value={form.scheduled_for_date || ''} onChange={(e) => setForm({ ...form, scheduled_for_date: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
