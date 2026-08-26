import { useState, useEffect } from 'react';
import { Plus, RefreshCw, ListTodo, Filter } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { todosApi } from '../services/api';
import type { Todo, TodoPriority, TodoStatus } from '../types';
import { format, isPast, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const priorityColor: Record<TodoPriority, string> = {
  HIGH: 'bg-red-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-slate-300',
};

export function TodosPage() {
  const { session } = useAuthStore();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TodoStatus | ''>('');
  const [priority, setPriority] = useState<TodoPriority | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState<Partial<Todo>>({ priority: 'MEDIUM', status: 'OPEN' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await todosApi.list(session.token) as { ok: boolean; data: Todo[] };
      if (res.ok) setTodos(res.data || []);
    } catch {
      toast.error('Failed to load to-dos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const filtered = todos.filter((t) => {
    const matchStatus = !filter || t.status === filter;
    const matchPriority = !priority || t.priority === priority;
    return matchStatus && matchPriority;
  });

  const handleSave = async () => {
    if (!session || !form.title) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      if (editTodo) {
        const res = await todosApi.update(session.token, { ...form, todo_id: editTodo.todo_id }) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('To-do updated');
      } else {
        const res = await todosApi.create(session.token, { ...form, created_by_user_id: session.user_id }) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('To-do created');
      }
      setShowForm(false);
      setEditTodo(null);
      setForm({ priority: 'MEDIUM', status: 'OPEN' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const quickComplete = async (todo: Todo) => {
    if (!session) return;
    const newStatus: TodoStatus = todo.status === 'DONE' ? 'OPEN' : 'DONE';
    try {
      await todosApi.update(session.token, {
        ...todo,
        status: newStatus,
        completed_date: newStatus === 'DONE' ? new Date().toISOString() : '',
      });
      setTodos((prev) => prev.map((t) => t.todo_id === todo.todo_id ? { ...t, status: newStatus } : t));
    } catch {
      toast.error('Failed to update');
    }
  };

  const openEdit = (todo: Todo) => { setEditTodo(todo); setForm(todo); setShowForm(true); };

  const counts = {
    open: todos.filter((t) => t.status === 'OPEN').length,
    inProgress: todos.filter((t) => t.status === 'IN_PROGRESS').length,
    done: todos.filter((t) => t.status === 'DONE').length,
    overdue: todos.filter((t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== 'DONE' && t.status !== 'CANCELLED').length,
  };

  return (
    <div>
      <Header
        title="To-Dos"
        subtitle="Leadership task management"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>Refresh</Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditTodo(null); setForm({ priority: 'MEDIUM', status: 'OPEN' }); setShowForm(true); }}>
              Add To-Do
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Open', count: counts.open, color: 'text-blue-600 bg-blue-50' },
            { label: 'In Progress', count: counts.inProgress, color: 'text-amber-600 bg-amber-50' },
            { label: 'Done', count: counts.done, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Overdue', count: counts.overdue, color: 'text-red-600 bg-red-50' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-sm font-medium opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TodoStatus | '')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority | '')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="text-sm text-slate-400 ml-auto">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Todo list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card><CardBody className="py-16 text-center">
            <ListTodo className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No to-dos found</p>
            <p className="text-sm text-slate-400 mt-1">
              {filter || priority ? 'Try removing filters.' : 'All caught up! Add a new task.'}
            </p>
          </CardBody></Card>
        ) : (
          <div className="space-y-2">
            {filtered
              .sort((a, b) => {
                const pOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
              })
              .map((todo) => {
                const isOverdue = todo.due_date && isPast(parseISO(todo.due_date)) && todo.status !== 'DONE' && todo.status !== 'CANCELLED';
                const isDueToday = todo.due_date && isToday(parseISO(todo.due_date));

                return (
                  <div
                    key={todo.todo_id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-200 transition-colors"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => quickComplete(todo)}
                      className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        todo.status === 'DONE'
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {todo.status === 'DONE' && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>

                    {/* Priority dot */}
                    <div className={`mt-2 h-2 w-2 rounded-full shrink-0 ${priorityColor[todo.priority]}`} />

                    {/* Content */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(todo)}>
                      <p className={`text-sm font-medium ${todo.status === 'DONE' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {todo.title}
                      </p>
                      {todo.details && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{todo.details}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {todo.due_date && (
                          <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : isDueToday ? 'text-amber-600' : 'text-slate-400'}`}>
                            {isOverdue ? '⚠ Overdue — ' : isDueToday ? '📅 Today — ' : ''}
                            Due {format(parseISO(todo.due_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={todo.priority === 'HIGH' ? 'danger' : todo.priority === 'MEDIUM' ? 'warning' : 'default'}>
                        {todo.priority}
                      </Badge>
                      <StatusBadge status={todo.status} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTodo ? 'Edit To-Do' : 'New To-Do'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editTodo ? 'Save Changes' : 'Create To-Do'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
          <Textarea label="Details" rows={3} value={form.details || ''} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <Select label="Priority" options={PRIORITY_OPTIONS} value={form.priority || 'MEDIUM'} onChange={(e) => setForm({ ...form, priority: e.target.value as TodoPriority })} />
          </div>
          <Select label="Status" options={STATUS_OPTIONS} value={form.status || 'OPEN'} onChange={(e) => setForm({ ...form, status: e.target.value as TodoStatus })} />
          <Input label="Assigned To (User ID)" value={form.assigned_to_user_id || ''} onChange={(e) => setForm({ ...form, assigned_to_user_id: e.target.value })} hint="Optional: assign to a specific user ID" />
        </div>
      </Modal>
    </div>
  );
}
