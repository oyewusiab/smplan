import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  ListTodo,
  Filter,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Printer,
  Search,
  Trash2,
  Edit2,
  Check,
  Tag,
  Layers,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { MemberAutocomplete } from '../components/checklist/MemberAutocomplete';
import { useAuthStore } from '../store/authStore';
import { todosApi, membersApi } from '../services/api';
import type { Todo, TodoPriority, TodoStatus, TodoCategory, Member } from '../types';
import { format, isPast, isToday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const CATEGORY_OPTIONS: { value: TodoCategory | 'ALL'; label: string; icon: string }[] = [
  { value: 'ALL', label: 'All Items', icon: '📋' },
  { value: 'SUNDAY_PREP', label: 'Sunday Readiness', icon: '🍞' },
  { value: 'BUILDING_MAINTENANCE', label: 'Building & Facilities', icon: '🔧' },
  { value: 'YOUTH_INTERVIEWS', label: 'Youth & Interviews', icon: '👥' },
  { value: 'WELFARE', label: 'Welfare & Needs', icon: '🤝' },
  { value: 'MUSIC', label: 'Music & Choir', icon: '🎵' },
  { value: 'ADMIN', label: 'Administration', icon: '📁' },
];

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'LOW', label: 'Low Priority' },
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
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState<TodoCategory | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<TodoStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TodoPriority | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState<Partial<Todo>>({
    priority: 'MEDIUM',
    status: 'OPEN',
    category: 'GENERAL',
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [todosRes, membersRes] = await Promise.all([
        todosApi.list(session.token) as Promise<{ ok: boolean; data: Todo[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
      ]);

      if (todosRes.ok) setTodos(todosRes.data || []);
      if (membersRes.ok) setMembers(membersRes.data || []);
    } catch {
      toast.error('Failed to load to-dos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Filtered & Sorted To-dos
  const filtered = useMemo(() => {
    return todos.filter((t) => {
      const matchCat =
        activeCategory === 'ALL' ||
        t.category === activeCategory ||
        (!t.category && activeCategory === 'GENERAL');
      const matchStatus = !filterStatus || t.status === filterStatus;
      const matchPriority = !filterPriority || t.priority === filterPriority;
      const matchSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.assigned_to_name || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchStatus && matchPriority && matchSearch;
    });
  }, [todos, activeCategory, filterStatus, filterPriority, searchQuery]);

  const handleSave = async () => {
    if (!session || !form.title) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    const nowIso = new Date().toISOString();

    try {
      if (editTodo) {
        const res = (await todosApi.update(session.token, {
          ...form,
          todo_id: editTodo.todo_id,
          updated_date: nowIso,
          completed_date: form.status === 'DONE' ? nowIso : '',
        })) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('Action item updated');
      } else {
        const res = (await todosApi.create(session.token, {
          ...form,
          created_by_user_id: session.user_id,
          created_by_name: session.name,
          created_date: nowIso,
          updated_date: nowIso,
        })) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('Action item created');
      }
      setShowForm(false);
      setEditTodo(null);
      setForm({ priority: 'MEDIUM', status: 'OPEN', category: 'GENERAL' });
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const quickToggleComplete = async (todo: Todo) => {
    if (!session) return;
    const isDone = todo.status === 'DONE';
    const newStatus: TodoStatus = isDone ? 'OPEN' : 'DONE';
    const nowIso = new Date().toISOString();

    setTodos((prev) =>
      prev.map((t) =>
        t.todo_id === todo.todo_id
          ? {
              ...t,
              status: newStatus,
              completed_date: newStatus === 'DONE' ? nowIso : '',
            }
          : t
      )
    );

    try {
      await todosApi.update(session.token, {
        ...todo,
        status: newStatus,
        completed_date: newStatus === 'DONE' ? nowIso : '',
        updated_date: nowIso,
      });
      toast.success(newStatus === 'DONE' ? 'Marked complete ✓' : 'Re-opened item');
    } catch {
      toast.error('Failed to update status');
      loadData();
    }
  };

  const handleDelete = async (todoId: string) => {
    if (!session) return;
    if (!confirm('Are you sure you want to delete this action item?')) return;

    setTodos((prev) => prev.filter((t) => t.todo_id !== todoId));
    try {
      await todosApi.delete(session.token, todoId);
      toast.success('Action item deleted');
    } catch {
      toast.error('Failed to delete');
      loadData();
    }
  };

  const openEdit = (todo: Todo) => {
    setEditTodo(todo);
    setForm(todo);
    setShowForm(true);
  };

  // Metrics
  const counts = {
    open: todos.filter((t) => t.status === 'OPEN').length,
    inProgress: todos.filter((t) => t.status === 'IN_PROGRESS').length,
    done: todos.filter((t) => t.status === 'DONE').length,
    overdue: todos.filter(
      (t) =>
        t.due_date &&
        isPast(parseISO(t.due_date)) &&
        t.status !== 'DONE' &&
        t.status !== 'CANCELLED'
    ).length,
  };

  return (
    <div className="space-y-6 pb-12">
      <Header
        title="Leadership Action Items & To-Dos"
        subtitle="Ward leadership task tracking, building maintenance, interviews & general action items"
        actions={
          <div className="flex items-center gap-2">
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
              onClick={() => window.print()}
            >
              Print Action List
            </Button>
            <Button
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditTodo(null);
                setForm({ priority: 'MEDIUM', status: 'OPEN', category: activeCategory !== 'ALL' ? activeCategory : 'GENERAL' });
                setShowForm(true);
              }}
            >
              Add Action Item
            </Button>
          </div>
        }
      />

      <div className="px-4 lg:px-8 space-y-5">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Open Tasks', count: counts.open, color: 'text-blue-700 bg-blue-50/80 border border-blue-100', icon: ListTodo },
            { label: 'In Progress', count: counts.inProgress, color: 'text-amber-700 bg-amber-50/80 border border-amber-100', icon: Clock },
            { label: 'Completed', count: counts.done, color: 'text-emerald-700 bg-emerald-50/80 border border-emerald-100', icon: CheckCircle2 },
            { label: 'Overdue Items', count: counts.overdue, color: 'text-red-700 bg-red-50/80 border border-red-100', icon: AlertTriangle },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={cn('rounded-2xl p-4 shadow-xs flex items-center justify-between', s.color)}>
                <div>
                  <p className="text-2xl font-black">{s.count}</p>
                  <p className="text-xs font-semibold opacity-90 mt-0.5">{s.label}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60">
                  <Icon className="h-5 w-5 opacity-80" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = activeCategory === cat.value;
            const count =
              cat.value === 'ALL'
                ? todos.length
                : todos.filter((t) => t.category === cat.value).length;

            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border',
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls Bar: Search, Status, Priority */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search action items, assignee, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent focus:outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TodoStatus | '')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium focus:outline-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TodoPriority | '')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium focus:outline-none"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <span className="text-xs text-slate-400 pl-2">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Action Items List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <ListTodo className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">No Action Items Found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery || filterStatus || filterPriority
                  ? 'Try clearing your search or status filters.'
                  : 'All caught up! Create a new leadership action item or long-term todo.'}
              </p>
              <Button
                className="mt-4"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setEditTodo(null);
                  setForm({ priority: 'MEDIUM', status: 'OPEN', category: activeCategory !== 'ALL' ? activeCategory : 'GENERAL' });
                  setShowForm(true);
                }}
              >
                Create Action Item
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered
              .sort((a, b) => {
                // Done at bottom
                if (a.status === 'DONE' && b.status !== 'DONE') return 1;
                if (a.status !== 'DONE' && b.status === 'DONE') return -1;
                // High priority first
                const pOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
              })
              .map((todo) => {
                const isOverdue =
                  todo.due_date &&
                  isPast(parseISO(todo.due_date)) &&
                  todo.status !== 'DONE' &&
                  todo.status !== 'CANCELLED';
                const isDueToday = todo.due_date && isToday(parseISO(todo.due_date));
                const isDone = todo.status === 'DONE';

                return (
                  <div
                    key={todo.todo_id}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl border p-4 transition-all shadow-xs group',
                      isDone
                        ? 'bg-slate-50/70 border-slate-200 text-slate-500'
                        : isOverdue
                        ? 'bg-red-50/20 border-red-200 hover:border-red-300'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => quickToggleComplete(todo)}
                      className={cn(
                        'mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                        isDone
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 bg-white hover:border-blue-500'
                      )}
                      title={isDone ? 'Mark Open' : 'Mark Done'}
                    >
                      {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    {/* Priority Dot */}
                    <div
                      className={cn(
                        'mt-2 h-2.5 w-2.5 rounded-full shrink-0',
                        priorityColor[todo.priority]
                      )}
                      title={`${todo.priority} Priority`}
                    />

                    {/* Content */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => openEdit(todo)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            'text-sm font-bold',
                            isDone ? 'line-through text-slate-400' : 'text-slate-900'
                          )}
                        >
                          {todo.title}
                        </p>

                        {/* Category Tag */}
                        {todo.category && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            <Tag className="h-2.5 w-2.5" />
                            {CATEGORY_OPTIONS.find((c) => c.value === todo.category)?.label ||
                              todo.category}
                          </span>
                        )}
                      </div>

                      {todo.details && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {todo.details}
                        </p>
                      )}

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                        {todo.assigned_to_name && (
                          <span className="font-semibold text-slate-700">
                            👤 Assigned to: {todo.assigned_to_name}
                          </span>
                        )}

                        {todo.due_date && (
                          <span
                            className={cn(
                              'font-semibold flex items-center gap-1',
                              isOverdue
                                ? 'text-red-600 font-bold'
                                : isDueToday
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-500'
                            )}
                          >
                            <Calendar className="h-3 w-3" />
                            {isOverdue
                              ? '⚠ Overdue — '
                              : isDueToday
                              ? '📅 Due Today — '
                              : 'Due '}
                            {format(parseISO(todo.due_date), 'MMM d, yyyy')}
                          </span>
                        )}

                        {todo.completed_date && (
                          <span className="text-emerald-700 font-medium">
                            ✓ Completed on {format(parseISO(todo.completed_date), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Badges & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={
                          todo.priority === 'HIGH'
                            ? 'danger'
                            : todo.priority === 'MEDIUM'
                            ? 'warning'
                            : 'default'
                        }
                        className="text-[10px]"
                      >
                        {todo.priority}
                      </Badge>
                      <StatusBadge status={todo.status} />

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(todo)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(todo.todo_id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal: Create / Edit Action Item */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTodo ? 'Edit Action Item' : 'New Leadership Action Item'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editTodo ? 'Save Changes' : 'Create Item'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Action Item Title"
            required
            value={form.title || ''}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Order more sacrament cups, repair microphone cable..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={form.category || 'GENERAL'}
                onChange={(e) => setForm({ ...form, category: e.target.value as TodoCategory })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {CATEGORY_OPTIONS.filter((c) => c.value !== 'ALL').map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            <Select
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={form.priority || 'MEDIUM'}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TodoPriority })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assign to Ward Member or Leader
            </label>
            <MemberAutocomplete
              value={form.assigned_to_name || ''}
              onChange={(name) => setForm({ ...form, assigned_to_name: name })}
              members={members}
              placeholder="Select leader or member..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Target Due Date"
              type="date"
              value={form.due_date || ''}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status || 'OPEN'}
              onChange={(e) => setForm({ ...form, status: e.target.value as TodoStatus })}
            />
          </div>

          <Textarea
            label="Details & Instructions"
            rows={3}
            value={form.details || ''}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
            placeholder="Add relevant notes, links, contact info, or specifications..."
          />
        </div>
      </Modal>
    </div>
  );
}
