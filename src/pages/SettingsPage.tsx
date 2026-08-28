import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Save, Download, Database, Server, AlertTriangle, Send, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { useAuthStore } from '../store/authStore';
import { settingsApi, syncApi, authApi } from '../services/api';
import type { UnitSetting, SettingsRequest } from '../types';
import toast from 'react-hot-toast';
import { APP_VERSION, APP_NAME, API_BASE_URL } from '../config/api';
import { format, parseISO } from 'date-fns';

const SETTING_FIELDS = [
  { key: 'UNIT_NAME', label: 'Ward / Branch Name' },
  { key: 'STAKE_NAME', label: 'Stake / District Name' },
  { key: 'BISHOP_NAME', label: "Bishop's Name" },
  { key: 'FIRST_COUNSELOR', label: '1st Counselor Name' },
  { key: 'FIRST_COUNSELOR_PHONE', label: '1st Counselor Phone' },
  { key: 'SECOND_COUNSELOR', label: '2nd Counselor Name' },
  { key: 'SECOND_COUNSELOR_PHONE', label: '2nd Counselor Phone' },
  { key: 'WARD_CLERK', label: 'Ward Clerk Name' },
  { key: 'WARD_CLERK_PHONE', label: 'Ward Clerk Phone' },
  { key: 'EXECUTIVE_SECRETARY', label: 'Executive Secretary Name' },
  { key: 'EXECUTIVE_SECRETARY_PHONE', label: 'Executive Secretary Phone' },
  { key: 'MEETING_TIME', label: 'Sacrament Meeting Time' },
  { key: 'MEETING_VENUE', label: 'Meetinghouse Venue / Address' },
  { key: 'WARD_EMAIL', label: 'Ward Email Address' },
  { key: 'WHATSAPP_LINK', label: 'Ward WhatsApp Group Link' },
  { key: 'WEBSITE_URL', label: 'Ward Website URL' },
  { key: 'WARD_ADDRESS', label: 'Physical Building Address' },
];

export function SettingsPage() {
  const { session, clearSession } = useAuthStore();
  const [settings, setSettings] = useState<UnitSetting[]>([]);
  const [requests, setRequests] = useState<SettingsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [alignLoading, setAlignLoading] = useState(false);

  const handleAlignDatabase = async () => {
    if (!session) return;
    setAlignLoading(true);
    try {
      const res = await syncApi.alignDatabase(session.token) as { ok: boolean; data?: { results?: string[] }; error?: string };
      if (!res.ok) throw new Error(res.error || 'Alignment failed');
      toast.success('Database realigned successfully! Fixed shifted Sunday dates & clean time formats.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Alignment failed');
    } finally {
      setAlignLoading(false);
    }
  };

  // Clerk change request modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedFieldKey, setSelectedFieldKey] = useState('UNIT_NAME');
  const [proposedValue, setProposedValue] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Admin decision modal
  const [decisionModal, setDecisionModal] = useState<{ req: SettingsRequest; action: 'approve' | 'reject' } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [deciding, setDeciding] = useState(false);

  // Password change
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const isAdmin = session?.role === 'ADMIN';
  const isClerk = session?.role === 'CLERK';

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await settingsApi.get(session.token) as { ok: boolean; data: UnitSetting[] };
      if (res.ok) setSettings(res.data || []);

      // Load change requests for admin or clerk
      const reqRes = await settingsApi.listRequests(session.token) as { ok: boolean; data: SettingsRequest[] };
      if (reqRes.ok) setRequests(reqRes.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  const getSetting = (key: string) => settings.find((s) => s.Key === key)?.Value || '';

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => {
      const exists = prev.find((s) => s.Key === key);
      if (exists) return prev.map((s) => s.Key === key ? { ...s, Value: value } : s);
      return [...prev, { Key: key, Value: value }];
    });
  };

  const handleSaveDirect = async () => {
    if (!session) return;
    if (!isAdmin) {
      toast.error('Only the Bishop (ADMIN) can directly update live settings.');
      return;
    }
    setSaving(true);
    try {
      const patch: Record<string, string> = {};
      settings.forEach((s) => { patch[s.Key] = s.Value; });
      await settingsApi.adminUpdate(session.token, patch);
      toast.success('Live unit settings updated successfully');
      load();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRequestModal = (initialKey?: string) => {
    const key = initialKey || 'UNIT_NAME';
    setSelectedFieldKey(key);
    setProposedValue(getSetting(key));
    setRequestReason('');
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!session || !selectedFieldKey || !proposedValue.trim() || !requestReason.trim()) {
      toast.error('Field, proposed value, and reason for change are required.');
      return;
    }
    setSubmittingRequest(true);
    try {
      const patch = { [selectedFieldKey]: proposedValue.trim() };
      await settingsApi.requestChange(session.token, patch, requestReason.trim());
      toast.success('Change request submitted for Bishop approval');
      setShowRequestModal(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleDecideRequest = async () => {
    if (!session || !decisionModal) return;
    setDeciding(true);
    try {
      if (decisionModal.action === 'approve') {
        await settingsApi.approveRequest(session.token, decisionModal.req.request_id, decisionComment);
        toast.success('Change request approved and settings updated');
      } else {
        await settingsApi.rejectRequest(session.token, decisionModal.req.request_id, decisionComment);
        toast.success('Change request rejected');
      }
      setDecisionModal(null);
      setDecisionComment('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Decision failed');
    } finally {
      setDeciding(false);
    }
  };

  const handlePing = async () => {
    setPingLoading(true);
    setPingResult(null);
    try {
      const start = Date.now();
      const res = await syncApi.ping() as { ok: boolean; ts?: string };
      const elapsed = Date.now() - start;
      setPingResult(`✅ Connected — ${elapsed}ms${res.ts ? ` · Server time: ${res.ts}` : ''}`);
    } catch (err) {
      setPingResult(`❌ Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPingLoading(false);
    }
  };

  const handleExport = async () => {
    if (!session) return;
    setExportLoading(true);
    try {
      const res = await syncApi.export(session.token) as { ok: boolean; data: unknown };
      if (!res.ok) throw new Error('Export failed');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sm-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Export failed. Ensure Apps Script backend is connected.');
    } finally {
      setExportLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!session) return;
    if (!pwForm.current || !pwForm.newPw) { toast.error('Current and new passwords required'); return; }
    if (pwForm.newPw !== pwForm.confirm) { toast.error('New passwords do not match'); return; }
    if (pwForm.newPw.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      const res = await authApi.changePassword(session.token, pwForm.current, pwForm.newPw) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success('Password changed successfully. Please log in again.');
      clearSession();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password change failed');
    } finally {
      setPwSaving(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  return (
    <div>
      <Header
        title="Unit Settings & Governance"
        subtitle={isAdmin ? 'Supreme Live Configuration & Approval Authority' : 'Ward Records & Unit Settings Change Queue'}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>Refresh</Button>
            {isAdmin && (
              <Button size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSaveDirect} loading={saving}>Save Live Settings</Button>
            )}
            {isClerk && (
              <Button size="sm" icon={<Send className="h-4 w-4" />} onClick={() => handleOpenRequestModal()}>Request Setting Change</Button>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6">
        {/* Role Notice Banner */}
        {isClerk && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Clerk Stewardship Mode</p>
              <p className="text-xs text-amber-700 mt-0.5">
                As Ward Clerk, you can view the official unit configuration and submit change requests (e.g. updated phone numbers or times).
                All changes are safely queued and require Bishop (ADMIN) approval before taking effect live.
              </p>
            </div>
          </div>
        )}

        {/* Admin Pending Requests Queue Card */}
        {isAdmin && pendingRequests.length > 0 && (
          <Card className="border-amber-300 bg-amber-50/40">
            <CardHeader className="bg-amber-100/50">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <span className="font-bold text-amber-900">Pending Clerk Change Requests ({pendingRequests.length})</span>
                </div>
                <Badge variant="warning">Action Required</Badge>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-amber-200/60">
                {pendingRequests.map((req) => {
                  let parsedPatch: Record<string, string> = {};
                  try { parsedPatch = typeof req.patch === 'string' ? JSON.parse(req.patch) : req.patch; } catch {}
                  return (
                    <div key={req.request_id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 text-sm">Requested Changes:</span>
                          {Object.entries(parsedPatch).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-xs font-mono border border-slate-300">
                              <strong>{k}:</strong> {v}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-600"><strong>Reason:</strong> {req.reason}</p>
                        <p className="text-xs text-slate-400">Submitted on {req.created_date ? format(parseISO(req.created_date), 'MMM d, yyyy h:mm a') : '—'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="success" icon={<CheckCircle className="h-4 w-4" />} onClick={() => setDecisionModal({ req, action: 'approve' })}>
                          Approve & Apply
                        </Button>
                        <Button size="sm" variant="danger" icon={<XCircle className="h-4 w-4" />} onClick={() => setDecisionModal({ req, action: 'reject' })}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Unit Configuration Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-900">Unit Settings & Leader Info</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isAdmin ? 'success' : 'info'}>
                  {isAdmin ? 'Direct Live Editing' : 'Approval Queue Mode'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="space-y-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-100 animate-pulse" />)}</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Ward / Branch Name"
                  value={getSetting('UNIT_NAME')}
                  onChange={(e) => updateSetting('UNIT_NAME', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Stake / District"
                  value={getSetting('STAKE_NAME')}
                  onChange={(e) => updateSetting('STAKE_NAME', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Bishop's Name"
                  value={getSetting('BISHOP_NAME')}
                  onChange={(e) => updateSetting('BISHOP_NAME', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="1st Counselor Name"
                  value={getSetting('FIRST_COUNSELOR')}
                  onChange={(e) => updateSetting('FIRST_COUNSELOR', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="1st Counselor Phone"
                  value={getSetting('FIRST_COUNSELOR_PHONE')}
                  onChange={(e) => updateSetting('FIRST_COUNSELOR_PHONE', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="2nd Counselor Name"
                  value={getSetting('SECOND_COUNSELOR')}
                  onChange={(e) => updateSetting('SECOND_COUNSELOR', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="2nd Counselor Phone"
                  value={getSetting('SECOND_COUNSELOR_PHONE')}
                  onChange={(e) => updateSetting('SECOND_COUNSELOR_PHONE', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Ward Clerk Name"
                  value={getSetting('WARD_CLERK')}
                  onChange={(e) => updateSetting('WARD_CLERK', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Ward Clerk Phone"
                  value={getSetting('WARD_CLERK_PHONE')}
                  onChange={(e) => updateSetting('WARD_CLERK_PHONE', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Executive Secretary Name"
                  value={getSetting('EXECUTIVE_SECRETARY')}
                  onChange={(e) => updateSetting('EXECUTIVE_SECRETARY', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Executive Secretary Phone"
                  value={getSetting('EXECUTIVE_SECRETARY_PHONE')}
                  onChange={(e) => updateSetting('EXECUTIVE_SECRETARY_PHONE', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Sacrament Meeting Time"
                  type="time"
                  value={getSetting('MEETING_TIME')}
                  onChange={(e) => updateSetting('MEETING_TIME', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Ward Email"
                  type="email"
                  value={getSetting('WARD_EMAIL')}
                  onChange={(e) => updateSetting('WARD_EMAIL', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="WhatsApp Group Link"
                  type="url"
                  value={getSetting('WHATSAPP_LINK')}
                  onChange={(e) => updateSetting('WHATSAPP_LINK', e.target.value)}
                  disabled={!isAdmin}
                />
                <Input
                  label="Website URL"
                  type="url"
                  value={getSetting('WEBSITE_URL')}
                  onChange={(e) => updateSetting('WEBSITE_URL', e.target.value)}
                  disabled={!isAdmin}
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <Textarea
                    label="Physical Building Address & Venue Details"
                    rows={2}
                    value={getSetting('WARD_ADDRESS')}
                    onChange={(e) => updateSetting('WARD_ADDRESS', e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Change Request History (Clerk & Admin) */}
        {requests.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-slate-900">Change Request History & Status</span>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <Table
                data={requests}
                keyExtractor={(r) => r.request_id}
                emptyMessage="No change requests submitted."
                columns={[
                  {
                    key: 'request_id',
                    header: 'Request ID',
                    render: (r: SettingsRequest) => <span className="font-mono text-xs text-slate-500">{r.request_id.slice(0, 8)}…</span>,
                  },
                  {
                    key: 'patch',
                    header: 'Proposed Update',
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
                  {
                    key: 'reason',
                    header: 'Reason',
                    render: (r: SettingsRequest) => <span className="text-xs text-slate-700">{r.reason}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r: SettingsRequest) => <StatusBadge status={r.status} />,
                  },
                  {
                    key: 'created_date',
                    header: 'Submitted',
                    render: (r: SettingsRequest) => r.created_date ? format(parseISO(r.created_date), 'MMM d, yyyy') : '—',
                  },
                  {
                    key: 'decided_by',
                    header: 'Decision',
                    render: (r: SettingsRequest) => r.decided_by ? `${r.decided_by} (${r.status})` : 'Pending Bishop Review',
                  },
                ]}
              />
            </CardBody>
          </Card>
        )}

        {/* API Connection & System Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-slate-900">API Connection & System Status</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Server Connection Endpoint</span>
                <code className="text-xs bg-slate-100 rounded px-2 py-1 max-w-xs truncate text-slate-700">
                  {API_BASE_URL}
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">App Version</span>
                <span className="font-medium">{APP_NAME} v{APP_VERSION}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handlePing} loading={pingLoading}>
                Test Server Connection
              </Button>
              {pingResult && (
                <p className="text-sm text-slate-600">{pingResult}</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Backup, Self-Healing & Sync (Admin / Clerk) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-slate-900">Database Integrity & Backups</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600">
              Export database archives or run self-healing realignment to automatically fix any historical date shifts, time formats, or sheet synchronizations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                icon={<Download className="h-4 w-4" />}
                onClick={handleExport}
                loading={exportLoading}
                disabled={API_BASE_URL.includes('PLACEHOLDER')}
              >
                Export Full Backup (.JSON)
              </Button>
              {isAdmin && (
                <Button
                  variant="secondary"
                  icon={<RefreshCw className="h-4 w-4" />}
                  onClick={handleAlignDatabase}
                  loading={alignLoading}
                >
                  Run Database Realignment & Self-Healing
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Account / Password */}
        <Card>
          <CardHeader>
            <span className="font-semibold text-slate-900">My Account</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Name</p>
                <p className="font-medium text-slate-900">{session?.preferred_name || session?.name}</p>
              </div>
              <div>
                <p className="text-slate-400">Role</p>
                <Badge variant="info">{session?.role}</Badge>
              </div>
              <div>
                <p className="text-slate-400">Email</p>
                <p className="font-medium text-slate-900">{session?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPwChange(true)}>
              Change Password
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Clerk Change Request Modal */}
      <Modal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Submit Unit Setting Change Request"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} loading={submittingRequest}>Submit for Bishop Approval</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Select the setting you would like to update. Once submitted, the Bishop can review and apply the change.
          </p>
          <Select
            label="Setting to Change"
            value={selectedFieldKey}
            onChange={(e) => {
              const k = e.target.value;
              setSelectedFieldKey(k);
              setProposedValue(getSetting(k));
            }}
            options={SETTING_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
          />
          <Input
            label="Proposed New Value"
            required
            value={proposedValue}
            onChange={(e) => setProposedValue(e.target.value)}
            placeholder="Enter the new value"
          />
          <Textarea
            label="Reason / Explanation for Change"
            required
            rows={3}
            value={requestReason}
            onChange={(e) => setRequestReason(e.target.value)}
            placeholder="e.g. Updated counselor phone number following sustaining"
          />
        </div>
      </Modal>

      {/* Admin Approve / Reject Modal */}
      <Modal
        open={!!decisionModal}
        onClose={() => setDecisionModal(null)}
        title={decisionModal?.action === 'approve' ? 'Approve Setting Change' : 'Reject Setting Change'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDecisionModal(null)}>Cancel</Button>
            <Button
              variant={decisionModal?.action === 'approve' ? 'success' : 'danger'}
              onClick={handleDecideRequest}
              loading={deciding}
            >
              {decisionModal?.action === 'approve' ? 'Confirm & Apply Live' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {decisionModal && (
            <>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-sm space-y-1">
                <p><strong>Proposed Change:</strong></p>
                <code className="block bg-white p-2 rounded border font-mono text-xs">
                  {decisionModal.req.patch}
                </code>
                <p><strong>Reason given:</strong> {decisionModal.req.reason}</p>
              </div>
              <Textarea
                label="Comment / Feedback to Clerk (Optional)"
                rows={2}
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                placeholder="Optional decision note..."
              />
            </>
          )}
        </div>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        open={showPwChange}
        onClose={() => setShowPwChange(false)}
        title="Change Password"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPwChange(false)}>Cancel</Button>
            <Button onClick={handlePasswordChange} loading={pwSaving}>Change Password</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Current Password" type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
          <Input label="New Password" type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} hint="Minimum 8 characters" />
          <Input label="Confirm New Password" type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
