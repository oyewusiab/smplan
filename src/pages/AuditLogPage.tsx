import { useState, useEffect } from 'react';
import { ScrollText, RefreshCw, Search } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { useAuthStore } from '../store/authStore';
import { auditApi } from '../services/api';
import type { AuditLog } from '../types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const ACTION_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'default',
  LOGOUT: 'outline',
  APPROVE: 'success',
  REJECT: 'danger',
  UNAUTHORIZED: 'danger',
  ARCHIVE: 'warning',
};

export function AuditLogPage() {
  const { session } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(100);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await auditApi.list(session.token, limit) as { ok: boolean; data: AuditLog[] };
      if (res.ok) setLogs(res.data || []);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session, limit]);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return !q ||
      l.action?.toLowerCase().includes(q) ||
      l.user_id?.toLowerCase().includes(q) ||
      l.table_name?.toLowerCase().includes(q) ||
      l.status?.toLowerCase().includes(q);
  });

  const columns = [
    { key: 'timestamp', header: 'Timestamp', render: (l: AuditLog) =>
      l.timestamp ? format(parseISO(l.timestamp), 'MMM d, yyyy HH:mm:ss') : '—'
    },
    { key: 'user_id', header: 'User', render: (l: AuditLog) => (
      <span className="font-mono text-xs">{l.user_id}</span>
    )},
    { key: 'action', header: 'Action', render: (l: AuditLog) => (
      <Badge variant={ACTION_COLORS[l.action] || 'default'}>{l.action}</Badge>
    )},
    { key: 'table_name', header: 'Table', render: (l: AuditLog) => (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-600">{l.table_name}</span>
    )},
    { key: 'record_id', header: 'Record ID', render: (l: AuditLog) => (
      <span className="font-mono text-xs text-slate-400">{l.record_id?.slice(0, 12) || '—'}</span>
    )},
    { key: 'status', header: 'Status', render: (l: AuditLog) => (
      <Badge variant={l.status === 'OK' ? 'success' : l.status === 'FAIL' ? 'danger' : 'default'}>
        {l.status}
      </Badge>
    )},
  ];

  return (
    <div>
      <Header
        title="Audit Logs"
        subtitle="System activity and security audit trail"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {[50, 100, 200, 500].map((n) => <option key={n} value={n}>Last {n}</option>)}
            </select>
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>
              Refresh
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700">
          <div className="flex gap-2">
            <ScrollText className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Audit Trail</p>
              <p className="mt-0.5">
                All important backend operations are recorded server-side by Google Apps Script.
                These logs cannot be modified from the frontend. RBAC: ADMIN and CLERK can view logs.
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {logs.length === 0 && !loading ? (
          <Card><CardBody className="py-16 text-center">
            <ScrollText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No audit logs found</p>
            <p className="text-sm text-slate-400 mt-1">
              Logs appear here once your Apps Script backend is connected and operations are performed.
            </p>
          </CardBody></Card>
        ) : (
          <>
            <p className="text-xs text-slate-400">Showing {filtered.length} of {logs.length} records</p>
            <Table
              columns={columns}
              data={filtered}
              keyExtractor={(l) => l.log_id}
              loading={loading}
              emptyMessage="No logs match your search."
            />
          </>
        )}
      </div>
    </div>
  );
}
