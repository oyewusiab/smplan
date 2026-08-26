import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, RefreshCw } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { activitiesApi } from '../services/api';
import type { Activity, ActivityStatus } from '../types';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, parseISO, addMonths, subMonths,
  startOfWeek, endOfWeek
} from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Planned' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const ORG_OPTIONS = [
  { value: 'Ward', label: 'Ward' },
  { value: 'Elders Quorum', label: 'Elders Quorum' },
  { value: 'Relief Society', label: 'Relief Society' },
  { value: 'Young Men', label: 'Young Men' },
  { value: 'Young Women', label: 'Young Women' },
  { value: 'Primary', label: 'Primary' },
  { value: 'Bishopric', label: 'Bishopric' },
];

const STATUS_COLORS: Record<ActivityStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-red-100 text-red-700 line-through',
};

export function CalendarPage() {
  const { session } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState<Partial<Activity>>({ status: 'PLANNED' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await activitiesApi.list(session.token) as { ok: boolean; data: Activity[] };
      if (res.ok) setActivities(res.data || []);
    } catch {
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getActivitiesForDay = (day: Date) =>
    activities.filter((a) => a.date && isSameDay(parseISO(a.date), day));

  const selectedDayActivities = selectedDay ? getActivitiesForDay(selectedDay) : [];

  const handleSave = async () => {
    if (!session || !form.activity || !form.date) { toast.error('Activity name and date required'); return; }
    setSaving(true);
    try {
      if (editActivity) {
        const res = await activitiesApi.update(session.token, { ...form, activity_id: editActivity.activity_id }) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('Activity updated');
      } else {
        const res = await activitiesApi.create(session.token, form) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('Activity added');
      }
      setShowForm(false);
      setEditActivity(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = (day: Date) => {
    setEditActivity(null);
    setForm({ status: 'PLANNED', date: format(day, 'yyyy-MM-dd') });
    setShowForm(true);
  };

  return (
    <div>
      <Header
        title="Calendar"
        subtitle="Ward activities and events calendar"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>Refresh</Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setEditActivity(null); setForm({ status: 'PLANNED', date: format(new Date(), 'yyyy-MM-dd') }); setShowForm(true); }}>
              Add Activity
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {/* Month nav */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="rounded-lg p-2 hover:bg-slate-100">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="font-semibold text-slate-900">{format(currentDate, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-lg p-2 hover:bg-slate-100">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400">{d}</div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const dayActivities = getActivitiesForDay(day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const today = isToday(day);
                  const inMonth = isSameMonth(day, currentDate);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(isSameDay(day, selectedDay || new Date('1900')) ? null : day)}
                      className={`min-h-[80px] border-b border-r border-slate-100 p-1.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        today ? 'bg-blue-600 text-white' :
                        isSelected ? 'text-blue-700' :
                        inMonth ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {dayActivities.slice(0, 2).map((a) => (
                          <div key={a.activity_id} className={`rounded px-1 py-0.5 text-xs truncate ${STATUS_COLORS[a.status]}`}>
                            {a.activity}
                          </div>
                        ))}
                        {dayActivities.length > 2 && (
                          <div className="text-xs text-slate-400 px-1">+{dayActivities.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Selected day */}
            {selectedDay ? (
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{format(selectedDay, 'EEEE')}</p>
                    <p className="text-sm text-slate-500">{format(selectedDay, 'MMMM d, yyyy')}</p>
                  </div>
                  <Button size="xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openCreate(selectedDay)}>Add</Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {selectedDayActivities.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No activities scheduled.
                    </div>
                  ) : (
                    selectedDayActivities.map((a) => (
                      <div key={a.activity_id} className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-slate-900">{a.activity}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{a.organisation} · {a.time || 'Time TBD'}</p>
                            {a.those_involved && (
                              <p className="text-xs text-slate-500 mt-1">{a.those_involved}</p>
                            )}
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="mt-2 flex gap-1">
                          <Button size="xs" variant="ghost" onClick={() => { setEditActivity(a); setForm(a); setShowForm(true); }}>Edit</Button>
                          <Button size="xs" variant="ghost" className="text-red-500" onClick={async () => {
                            if (!session) return;
                            await activitiesApi.delete(session.token, a.activity_id);
                            toast.success('Activity removed');
                            load();
                            setSelectedDay(null);
                          }}>Delete</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Click a day to view activities</p>
              </div>
            )}

            {/* Upcoming activities */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="font-semibold text-slate-900">This Month</p>
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {activities
                  .filter((a) => {
                    if (!a.date) return false;
                    const d = parseISO(a.date);
                    return isSameMonth(d, currentDate);
                  })
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((a) => (
                    <div key={a.activity_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="text-center shrink-0">
                        <p className="text-xs font-bold text-slate-900">{format(parseISO(a.date), 'd')}</p>
                        <p className="text-xs text-slate-400">{format(parseISO(a.date), 'EEE')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{a.activity}</p>
                        <p className="text-xs text-slate-400">{a.organisation}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                {activities.filter((a) => a.date && isSameMonth(parseISO(a.date), currentDate)).length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-400">No activities this month.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Form Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editActivity ? 'Edit Activity' : 'Add Activity'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editActivity ? 'Save Changes' : 'Add Activity'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Activity Name" required value={form.activity || ''} onChange={(e) => setForm({ ...form, activity: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" required value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Input label="Time" type="time" value={form.time || ''} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </div>
          <Select label="Organisation" options={ORG_OPTIONS} placeholder="Select organisation" value={form.organisation || ''} onChange={(e) => setForm({ ...form, organisation: e.target.value })} />
          <Select label="Status" options={STATUS_OPTIONS} value={form.status || 'PLANNED'} onChange={(e) => setForm({ ...form, status: e.target.value as ActivityStatus })} />
          <Textarea label="Those Involved" rows={2} value={form.those_involved || ''} onChange={(e) => setForm({ ...form, those_involved: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
