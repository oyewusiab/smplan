import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Users, BookOpen, CheckSquare, Bell, Calendar,
  ArrowRight, Plus, TrendingUp, Church, RefreshCw
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import { plannersApi, activitiesApi, todosApi, notificationsApi, agendasApi, checklistsApi } from '../services/api';
import { formatMemberTitle } from '../utils/memberTitles';
import type { Planner, Activity, Todo, Notification, Agenda, ChecklistItem } from '../types';
import { format, isToday, isFuture, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSunday } from 'date-fns';

export function DashboardPage() {
  const { session } = useAuthStore();
  const navigate = useNavigate();

  const [planners, setPlanners] = useState<Planner[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (force = false) => {
    if (!session) return;
    setLoading(true);
    try {
      const [pRes, aRes, tRes, nRes] = await Promise.allSettled([
        plannersApi.list(session.token, { forceRefresh: force }) as Promise<{ ok: boolean; data: Planner[] }>,
        activitiesApi.list(session.token, { forceRefresh: force }) as Promise<{ ok: boolean; data: Activity[] }>,
        todosApi.list(session.token, { forceRefresh: force }) as Promise<{ ok: boolean; data: Todo[] }>,
        notificationsApi.list(session.token, session.user_id) as Promise<{ ok: boolean; data: Notification[] }>,
      ]);
      let loadedPlanners: Planner[] = [];
      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        loadedPlanners = pRes.value.data || [];
        setPlanners(loadedPlanners);
      }
      if (aRes.status === 'fulfilled' && aRes.value.ok) setActivities(aRes.value.data || []);
      if (tRes.status === 'fulfilled' && tRes.value.ok) setTodos(tRes.value.data || []);
      if (nRes.status === 'fulfilled' && nRes.value.ok) setNotifications(nRes.value.data || []);

      // Load agendas and checklists for current month's planner if available
      const now = new Date();
      const curr = loadedPlanners.find(
        (p) => p.month === now.getMonth() + 1 && p.year === now.getFullYear()
      ) || loadedPlanners[0];

      if (curr) {
        const [agRes, chRes] = await Promise.allSettled([
          agendasApi.list(session.token, curr.planner_id, { forceRefresh: force }) as Promise<{ ok: boolean; data: Agenda[] }>,
          checklistsApi.list(session.token, curr.planner_id, { forceRefresh: force }) as Promise<{ ok: boolean; data: ChecklistItem[] }>,
        ]);
        if (agRes.status === 'fulfilled' && agRes.value.ok) setAgendas(agRes.value.data || []);
        if (chRes.status === 'fulfilled' && chRes.value.ok) setChecklists(chRes.value.data || []);
      }
    } catch {
      // Best-effort
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [session]);

  const currentMonth = new Date();
  const activePlanners = planners.filter((p) => p.state !== 'ARCHIVED');
  const currentPlanner = planners.find(
    (p) => p.month === currentMonth.getMonth() + 1 && p.year === currentMonth.getFullYear()
  ) || activePlanners[0];

  const upcomingActivities = activities
    .filter((a) => a.date && isFuture(parseISO(a.date)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const openTodos = todos.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const unreadNotifs = notifications.filter((n) => !n.read);

  // Compute upcoming Sundays in current month
  const monthIntervalDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const allSundays = monthIntervalDays.filter(isSunday);
  const upcomingSundays = allSundays.filter(d => isToday(d) || isFuture(d));
  const upcomingSundaysCount = Math.max(1, upcomingSundays.length);

  // Compute assigned speakers count safely
  let speakersAssignedCount = 0;
  if (Array.isArray(agendas) && agendas.length > 0) {
    agendas.forEach((ag) => {
      if (!ag || !ag.speakers) return;
      if (Array.isArray(ag.speakers)) {
        speakersAssignedCount += ag.speakers.filter(
          (s: any) => s && (typeof s === 'string' ? s.trim().length > 0 : (s.speaker || s.name || s.person))
        ).length;
      } else if (typeof ag.speakers === 'string') {
        const str = ag.speakers.trim();
        if (!str || str === '[]' || str === '{}') return;
        try {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            speakersAssignedCount += parsed.filter(
              (s: any) => s && (typeof s === 'string' ? s.trim().length > 0 : (s.speaker || s.name || s.person))
            ).length;
          } else {
            speakersAssignedCount += 1;
          }
        } catch {
          speakersAssignedCount += str.split(/\r?\n/).filter(line => line.trim().length > 0).length;
        }
      }
    });
  }

  if (speakersAssignedCount === 0 && currentPlanner?.weeks) {
    try {
      const weeksData = typeof currentPlanner.weeks === 'string'
        ? JSON.parse(currentPlanner.weeks || '[]')
        : currentPlanner.weeks;
      if (Array.isArray(weeksData)) {
        weeksData.forEach((w: any) => {
          if (w && w.speakers) {
            if (Array.isArray(w.speakers)) {
              speakersAssignedCount += w.speakers.length;
            } else if (typeof w.speakers === 'string' && w.speakers.trim() !== '[]') {
              speakersAssignedCount += 1;
            }
          }
        });
      }
    } catch { /* fallback */ }
  }

  // Compute checklist % done safely
  let checklistPercent = 0;
  if (Array.isArray(checklists) && checklists.length > 0) {
    const done = checklists.filter((c) => c && c.status === 'DONE').length;
    checklistPercent = Math.round((done / checklists.length) * 100);
  }

  // Format greeting name with proper Latter-day Saint title prefix
  const formattedName = formatMemberTitle(
    session?.preferred_name || session?.name,
    session?.gender,
    session?.calling,
    session?.role
  ) || 'Bishop Adebayo Oyewusi';

  const unitName = currentPlanner?.unit_name || session?.organisation || 'OBANTOKO WARD';

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle={format(currentMonth, 'MMMM yyyy')}
        actions={
          <Button size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => loadData(true)} loading={loading}>
            Refresh
          </Button>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Dominant #082749 Dashboard Hero Banner with 2x sm_image.png */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#082749] via-[#0d3c73] to-[#082749] border border-[#082749]/40 p-6 sm:p-8 text-white shadow-xl shadow-[#082749]/20">
          {/* Overlapping subtle translucent circles */}
          <div className="absolute -right-12 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute right-10 -top-16 w-72 h-72 rounded-full border-[36px] border-white/10 pointer-events-none" />
          <div className="absolute right-36 bottom-0 w-48 h-48 rounded-full bg-cyan-400/15 blur-xl pointer-events-none" />
          <div className="absolute right-24 top-6 w-56 h-56 rounded-full border-[18px] border-cyan-200/10 pointer-events-none" />

          {/* Banner Flex Layout (Greeting on left, 2x Logo on right) */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              {/* Kicker */}
              <p className="text-[11px] font-bold tracking-widest text-cyan-300 uppercase mb-2">
                {format(currentMonth, 'MMMM yyyy')} · {unitName}
              </p>

              {/* Main Greeting Headline with correct Church prefix */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Good {getGreeting()}, {formattedName}
              </h2>

              {/* Subtitle */}
              <p className="mt-2 text-xs sm:text-sm text-cyan-100/95 font-normal leading-relaxed">
                Your sacrament meeting coordinator dashboard. Everything you need for this month&apos;s planning is right here.
              </p>

              {/* Floating Metric Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shadow-xs hover:bg-white/25 transition-colors select-none">
                  <span className="text-sm">📅</span>
                  <span>{upcomingSundaysCount} upcoming Sunday{upcomingSundaysCount === 1 ? '' : 's'}</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shadow-xs hover:bg-white/25 transition-colors select-none">
                  <span className="text-sm">🎙️</span>
                  <span>{speakersAssignedCount} speakers assigned</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white border border-white/20 shadow-xs hover:bg-white/25 transition-colors select-none">
                  <span className="text-sm">✅</span>
                  <span>{checklistPercent}% checklist done</span>
                </div>
              </div>
            </div>

            {/* Prominent 2x Platform Logo Container */}
            <div className="hidden md:flex h-28 w-28 lg:h-32 lg:w-32 items-center justify-center rounded-3xl bg-white/10 backdrop-blur-md p-3 border border-white/25 shadow-2xl shadow-black/40 overflow-hidden shrink-0">
              <img
                src="/sm_image.png"
                alt="SM Planner Logo"
                className="h-full w-full object-contain drop-shadow-md"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/logo.png')) {
                    target.src = '/logo.png';
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Planners"
            value={loading ? '—' : activePlanners.length}
            icon={<ClipboardList className="h-5 w-5" />}
            badge="2026 Goal"
            gradientBar="from-blue-600 to-sky-400"
            subtext="Monthly Schedules"
            color="bg-blue-600"
          />
          <StatCard
            label="Upcoming Activities"
            value={loading ? '—' : upcomingActivities.length}
            icon={<Calendar className="h-5 w-5" />}
            gradientBar="from-indigo-600 to-purple-400"
            subtext="Ward Events"
            color="bg-indigo-600"
          />
          <StatCard
            label="Open To-Dos"
            value={loading ? '—' : openTodos.length}
            icon={<CheckSquare className="h-5 w-5" />}
            gradientBar="from-amber-500 to-yellow-400"
            subtext="Action Items"
            color="bg-amber-500"
          />
          <StatCard
            label="Notifications"
            value={loading ? '—' : unreadNotifs.length}
            icon={<Bell className="h-5 w-5" />}
            gradientBar="from-rose-500 to-pink-400"
            subtext={unreadNotifs.length > 0 ? 'Unread alerts' : 'All clear'}
            color="bg-rose-500"
          />
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Current Month Planner */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current planner card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-slate-900">
                    {format(currentMonth, 'MMMM yyyy')} Planner
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/planners')}>
                  View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="py-8 text-center text-slate-400">Loading…</div>
                ) : currentPlanner ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{currentPlanner.unit_name}</p>
                        <p className="text-sm text-slate-500">
                          Conducted by: {currentPlanner.conducting_officer || 'TBD'}
                        </p>
                      </div>
                      <StatusBadge status={currentPlanner.state} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {[
                        { label: 'State', value: currentPlanner.state },
                        { label: 'Month', value: format(new Date(currentPlanner.year, currentPlanner.month - 1), 'MMM yyyy') },
                        { label: 'Music', value: currentPlanner.music_status || 'Pending' },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs text-slate-400">{item.label}</p>
                          <p className="text-sm font-medium text-slate-700">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => navigate(`/planners/${currentPlanner.planner_id}`)}>
                        Open Planner
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate('/agendas')}>
                        View Agendas
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 mb-4">No planner for this month yet.</p>
                    <Button size="sm" onClick={() => navigate('/planners')}>
                      <Plus className="h-4 w-4 mr-1" /> Create Planner
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Upcoming Activities */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span className="font-semibold text-slate-900">Upcoming Activities</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/calendar')}>
                  Calendar <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardBody className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-slate-400">Loading…</div>
                ) : upcomingActivities.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">No upcoming activities.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {upcomingActivities.map((a) => (
                      <li key={a.activity_id} className="flex items-center gap-4 px-5 py-3">
                        <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-indigo-50 shrink-0">
                          <span className="text-xs font-bold text-indigo-600">
                            {a.date ? format(parseISO(a.date), 'd') : '?'}
                          </span>
                          <span className="text-xs text-indigo-400">
                            {a.date ? format(parseISO(a.date), 'MMM') : ''}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{a.activity}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {a.organisation} · {a.time || 'Time TBD'}
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Open Todos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-slate-900">Open To-Dos</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/todos')}>
                  All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardBody className="p-0">
                {loading ? (
                  <div className="py-6 text-center text-slate-400 text-sm">Loading…</div>
                ) : openTodos.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-sm">All caught up! 🎉</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {openTodos.slice(0, 6).map((t) => (
                      <li key={t.todo_id} className="flex items-start gap-3 px-5 py-3">
                        <div
                          className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                            t.priority === 'HIGH'
                              ? 'bg-red-500'
                              : t.priority === 'MEDIUM'
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{t.title}</p>
                          {t.due_date && (
                            <p className={`text-xs ${isToday(parseISO(t.due_date)) ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                              Due {format(parseISO(t.due_date), 'MMM d')}
                            </p>
                          )}
                        </div>
                        <Badge variant={t.priority === 'HIGH' ? 'danger' : t.priority === 'MEDIUM' ? 'warning' : 'default'}>
                          {t.priority}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-rose-600" />
                  <span className="font-semibold text-slate-900">Notifications</span>
                  {unreadNotifs.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                      {unreadNotifs.length}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/notifications')}>
                  All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardHeader>
              <CardBody className="p-0">
                {loading ? (
                  <div className="py-6 text-center text-slate-400 text-sm">Loading…</div>
                ) : unreadNotifs.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-sm">No new notifications.</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {unreadNotifs.slice(0, 5).map((n) => (
                      <li key={n.notification_id} className="px-5 py-3">
                        <div className="flex items-start gap-2">
                          <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            {/* Recent Planners */}
            {activePlanners.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-slate-900">Recent Planners</span>
                  </div>
                </CardHeader>
                <CardBody className="p-0">
                  <ul className="divide-y divide-slate-100">
                    {activePlanners.slice(0, 4).map((p) => (
                      <li
                        key={p.planner_id}
                        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50"
                        onClick={() => navigate(`/planners/${p.planner_id}`)}
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {format(new Date(p.year, p.month - 1), 'MMMM yyyy')}
                          </p>
                          <p className="text-xs text-slate-400">{p.unit_name}</p>
                        </div>
                        <StatusBadge status={p.state} />
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
