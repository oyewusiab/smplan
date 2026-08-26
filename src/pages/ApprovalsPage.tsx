import { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle, XCircle, Settings, ClipboardList } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { approvalsApi, settingsApi } from '../services/api';
import type { PlannerApprovalRequest, SettingsRequest } from '../types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

export function ApprovalsPage() {
  const { session, can } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'planners' | 'settings'>('planners');

  // Planner Approvals
  const [plannerRequests, setPlannerRequests] = useState<PlannerApprovalRequest[]>([]);
  const [loadingPlanners, setLoadingPlanners] = useState(true);
  const [decideModal, setDecideModal] = useState<{ request: PlannerApprovalRequest; action: 'approve' | 'reject' } | null>(null);
  const [plannerComment, setPlannerComment] = useState('');
  const [decidingPlanner, setDecidingPlanner] = useState(false);

  // Settings Requests
  const [settingsRequests, setSettingsRequests] = useState<SettingsRequest[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [decideSettingsModal, setDecideSettingsModal] = useState<{ request: SettingsRequest; action: 'approve' | 'reject' } | null>(null);
  const [settingsComment, setSettingsComment] = useState('');
  const [decidingSettings, setDecidingSettings] = useState(false);

  const isAdmin = session?.role === 'ADMIN';
  const canDecidePlanners = can('PLANNER_APPROVE');

  const loadData = async () => {
    if (!session) return;
    setLoadingPlanners(true);
    setLoadingSettings(true);
    try {
      const pRes = await approvalsApi.list(session.token) as { ok: boolean; data: PlannerApprovalRequest[] };
      if (pRes.ok) setPlannerRequests(pRes.data || []);

      if (isAdmin) {
        const sRes = await settingsApi.listRequests(session.token) as { ok: boolean; data: SettingsRequest[] };
        if (sRes.ok) setSettingsRequests(sRes.data || []);
      }
    } catch {
      toast.error('Failed to load approval queues');
    } finally {
      setLoadingPlanners(false);
      setLoadingSettings(false);
    }
  };

  useEffect(() => { loadData(); }, [session]);

  const handleDecidePlanner = async () => {
    if (!session || !decideModal) return;
    setDecidingPlanner(true);
    try {
      if (decideModal.action === 'approve') {
        await approvalsApi.approve(session.token, decideModal.request.request_id, plannerComment);
        toast.success('Planner approved successfully');
      } else {
        await approvalsApi.reject(session.token, decideModal.request.request_id, plannerComment);
        toast.success('Planner rejected');
      }
      setDecideModal(null);
      setPlannerComment('');
      loadData();
    } catch {
      toast.error('Decision failed');
    } finally {
      setDecidingPlanner(false);
    }
  };

  const handleDecideSettings = async () => {
    if (!session || !decideSettingsModal) return;
    setDecidingSettings(true);
    try {
      if (decideSettingsModal.action === 'approve') {
        await settingsApi.approveRequest(session.token, decideSettingsModal.request.request_id, settingsComment);
        toast.success('Settings change approved and applied');
      } else {
        await settingsApi.rejectRequest(session.token, decideSettingsModal.request.request_id, settingsComment);
        toast.success('Settings change rejected');
      }
      setDecideSettingsModal(null);
      setSettingsComment('');
      loadData();
    } catch {
      toast.error('Decision failed');
    } finally {
      setDecidingSettings(false);
    }
  };

  const pendingPlanners = plannerRequests.filter((r) => r.status === 'PENDING');
  const pendingSettings = settingsRequests.filter((r) => r.status === 'PENDING');

  return (
    <div>
      <Header
        title="Approval Queues & Stewards Hub"
        subtitle="Ecclesiastical oversight and asynchronous approval workflows"
        actions={
          <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={loadData} loading={loadingPlanners || loadingSettings}>
            Refresh
          </Button>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('planners')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'planners'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Planner Submissions ({pendingPlanners.length} pending)
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings Change Requests ({pendingSettings.length} pending)
            </button>
          )}
        </div>

        {/* Tab 1: Planner Approvals */}
        {activeTab === 'planners' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pending Planners', count: pendingPlanners.length, color: 'bg-amber-50 text-amber-700' },
                { label: 'Approved Planners', count: plannerRequests.filter((r) => r.status === 'APPROVED').length, color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Rejected Planners', count: plannerRequests.filter((r) => r.status === 'REJECTED').length, color: 'bg-red-50 text-red-700' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-sm font-medium opacity-80">{s.label}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardBody className="p-0">
                <Table
                  data={plannerRequests}
                  keyExtractor={(r) => r.request_id}
                  emptyMessage="No planner approval requests found."
                  columns={[
                    {
                      key: 'request_id', header: 'Request ID',
                      render: (r: PlannerApprovalRequest) => <span className="font-mono text-xs text-slate-500">{r.request_id?.slice(0, 8)}…</span>,
                    },
                    {
                      key: 'planner_id', header: 'Planner ID',
                      render: (r: PlannerApprovalRequest) => <span className="font-mono text-xs text-slate-500">{r.planner_id}</span>,
                    },
                    { key: 'requested_by', header: 'Requested By' },
                    {
                      key: 'created_date', header: 'Submitted Date',
                      render: (r: PlannerApprovalRequest) => r.created_date ? format(parseISO(r.created_date), 'MMM d, yyyy') : '—',
                    },
                    { key: 'status', header: 'Status', render: (r: PlannerApprovalRequest) => <StatusBadge status={r.status} /> },
                    { key: 'decided_by', header: 'Decided By', render: (r: PlannerApprovalRequest) => r.decided_by || '—' },
                    {
                      key: 'comment', header: 'Comment',
                      render: (r: PlannerApprovalRequest) => <span className="text-xs text-slate-500">{r.comment || '—'}</span>,
                    },
                    ...(canDecidePlanners ? [{
                      key: 'actions', header: '',
                      render: (r: PlannerApprovalRequest) => r.status === 'PENDING' ? (
                        <div className="flex gap-1">
                          <Button size="xs" variant="success" icon={<CheckCircle className="h-3.5 w-3.5" />}
                            onClick={() => { setDecideModal({ request: r, action: 'approve' }); setPlannerComment(''); }}>
                            Approve
                          </Button>
                          <Button size="xs" variant="danger" icon={<XCircle className="h-3.5 w-3.5" />}
                            onClick={() => { setDecideModal({ request: r, action: 'reject' }); setPlannerComment(''); }}>
                            Reject
                          </Button>
                        </div>
                      ) : null,
                    }] : []),
                  ]}
                />
              </CardBody>
            </Card>
          </div>
        )}

        {/* Tab 2: Settings Approvals (Admin) */}
        {activeTab === 'settings' && isAdmin && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pending Settings Requests', count: pendingSettings.length, color: 'bg-amber-50 text-amber-700' },
                { label: 'Approved Changes', count: settingsRequests.filter((r) => r.status === 'APPROVED').length, color: 'bg-emerald-50 text-emerald-700' },
                { label: 'Rejected Changes', count: settingsRequests.filter((r) => r.status === 'REJECTED').length, color: 'bg-red-50 text-red-700' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-sm font-medium opacity-80">{s.label}</p>
                </div>
              ))}
            </div>

            <Card>
              <CardBody className="p-0">
                <Table
                  data={settingsRequests}
                  keyExtractor={(r) => r.request_id}
                  emptyMessage="No settings change requests found."
                  columns={[
                    {
                      key: 'request_id', header: 'Request ID',
                      render: (r: SettingsRequest) => <span className="font-mono text-xs text-slate-500">{r.request_id?.slice(0, 8)}…</span>,
                    },
                    {
                      key: 'patch', header: 'Proposed Update',
                      render: (r: SettingsRequest) => {
                        try {
                          const parsed = typeof r.patch === 'string' ? JSON.parse(r.patch) : r.patch;
                          return (
                            <div className="text-xs space-y-0.5">
                              {Object.entries(parsed).map(([k, v]) => (
                                <span key={k} className="inline-block bg-slate-100 px-1.5 py-0.5 rounded font-mono mr-1">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          );
                        } catch {
                          return <span className="text-xs font-mono">{r.patch}</span>;
                        }
                      },
                    },
                    { key: 'reason', header: 'Reason given' },
                    {
                      key: 'created_date', header: 'Submitted Date',
                      render: (r: SettingsRequest) => r.created_date ? format(parseISO(r.created_date), 'MMM d, yyyy') : '—',
                    },
                    { key: 'status', header: 'Status', render: (r: SettingsRequest) => <StatusBadge status={r.status} /> },
                    { key: 'decided_by', header: 'Decided By', render: (r: SettingsRequest) => r.decided_by || 'Pending' },
                    {
                      key: 'actions', header: '',
                      render: (r: SettingsRequest) => r.status === 'PENDING' ? (
                        <div className="flex gap-1">
                          <Button size="xs" variant="success" icon={<CheckCircle className="h-3.5 w-3.5" />}
                            onClick={() => { setDecideSettingsModal({ request: r, action: 'approve' }); setSettingsComment(''); }}>
                            Approve
                          </Button>
                          <Button size="xs" variant="danger" icon={<XCircle className="h-3.5 w-3.5" />}
                            onClick={() => { setDecideSettingsModal({ request: r, action: 'reject' }); setSettingsComment(''); }}>
                            Reject
                          </Button>
                        </div>
                      ) : null,
                    },
                  ]}
                />
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {/* Decide Modal: Planner */}
      <Modal
        open={!!decideModal}
        onClose={() => setDecideModal(null)}
        title={`${decideModal?.action === 'approve' ? 'Approve' : 'Reject'} Planner`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDecideModal(null)}>Cancel</Button>
            <Button
              variant={decideModal?.action === 'approve' ? 'success' : 'danger'}
              onClick={handleDecidePlanner}
              loading={decidingPlanner}
            >
              Confirm {decideModal?.action === 'approve' ? 'Approval' : 'Rejection'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {decideModal?.action === 'approve'
              ? 'Approving this planner will finalize the monthly program and notify the conductor and speakers.'
              : 'Rejecting this planner will return it to DRAFT state for the creator to make edits.'}
          </p>
          <Textarea
            label="Comment (Optional for approval, recommended for rejection)"
            rows={3}
            value={plannerComment}
            onChange={(e) => setPlannerComment(e.target.value)}
            placeholder="Add a note or instruction for the requester..."
          />
        </div>
      </Modal>

      {/* Decide Modal: Settings */}
      <Modal
        open={!!decideSettingsModal}
        onClose={() => setDecideSettingsModal(null)}
        title={`${decideSettingsModal?.action === 'approve' ? 'Approve' : 'Reject'} Settings Request`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDecideSettingsModal(null)}>Cancel</Button>
            <Button
              variant={decideSettingsModal?.action === 'approve' ? 'success' : 'danger'}
              onClick={handleDecideSettings}
              loading={decidingSettings}
            >
              Confirm {decideSettingsModal?.action === 'approve' ? 'Approval & Apply Live' : 'Rejection'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {decideSettingsModal?.action === 'approve'
              ? 'Approving this change request will immediately apply the changes to live unit settings.'
              : 'Rejecting this request will mark it as rejected.'}
          </p>
          <Textarea
            label="Comment / Feedback (Optional)"
            rows={2}
            value={settingsComment}
            onChange={(e) => setSettingsComment(e.target.value)}
            placeholder="Feedback for the clerk..."
          />
        </div>
      </Modal>
    </div>
  );
}
