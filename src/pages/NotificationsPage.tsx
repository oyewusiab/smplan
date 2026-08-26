import { useState, useEffect } from 'react';
import { Bell, RefreshCw, CheckCheck } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { notificationsApi } from '../services/api';
import type { Notification } from '../types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

export function NotificationsPage() {
  const { session } = useAuthStore();
  const { setUnreadNotifications } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await notificationsApi.list(session.token, session.user_id) as { ok: boolean; data: Notification[] };
      if (res.ok) {
        setNotifications(res.data || []);
        setUnreadNotifications((res.data || []).filter((n) => !n.read).length);
      }
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const markRead = async (notification_id: string) => {
    if (!session) return;
    try {
      await notificationsApi.markRead(session.token, notification_id);
      setNotifications((prev) => prev.map((n) => n.notification_id === notification_id ? { ...n, read: true } : n));
      setUnreadNotifications(notifications.filter((n) => !n.read && n.notification_id !== notification_id).length);
    } catch { /* best effort */ }
  };

  const markAll = async () => {
    if (!session) return;
    try {
      await notificationsApi.markAllRead(session.token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotifications(0);
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unread = notifications.filter((n) => !n.read);

  return (
    <div>
      <Header
        title="Notifications"
        subtitle="Your alerts and system messages"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>Refresh</Button>
            {unread.length > 0 && (
              <Button size="sm" variant="secondary" icon={<CheckCheck className="h-4 w-4" />} onClick={markAll}>
                Mark All Read
              </Button>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : notifications.length === 0 ? (
          <Card><CardBody className="py-16 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No notifications</p>
            <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
          </CardBody></Card>
        ) : (
          notifications.map((n) => (
            <div
              key={n.notification_id}
              onClick={() => !n.read && markRead(n.notification_id)}
              className={cn(
                'flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-colors',
                n.read
                  ? 'border-slate-200 bg-white text-slate-500'
                  : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
              )}
            >
              <div className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-full shrink-0', n.read ? 'bg-slate-100' : 'bg-blue-100')}>
                <Bell className={cn('h-4 w-4', n.read ? 'text-slate-400' : 'text-blue-600')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm font-semibold', n.read ? 'text-slate-500' : 'text-slate-900')}>
                    {n.title}
                  </p>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                  )}
                </div>
                <p className={cn('text-sm mt-0.5', n.read ? 'text-slate-400' : 'text-slate-600')}>{n.body}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {n.type && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{n.type}</span>
                  )}
                  {n.created_date && (
                    <span className="text-xs text-slate-400">
                      {format(parseISO(n.created_date), 'MMM d, yyyy HH:mm')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
