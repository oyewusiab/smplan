import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Download,
  Upload,
  Printer,
  Trash2,
  Users,
  BarChart3,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  Edit2,
  Shield,
  Home,
  CheckSquare,
  Square
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { MemberImportModal } from '../components/members/MemberImportModal';
import { MemberRosterPrintModal } from '../components/members/MemberRosterPrintModal';
import { MemberAnalyticsDashboard } from '../components/members/MemberAnalyticsDashboard';
import { useAuthStore } from '../store/authStore';
import { membersApi, assignmentsApi, agendasApi, plannersApi } from '../services/api';
import {
  getDynamicAge,
  normalizeBirthDate,
  formatBirthDateForStorage,
  compileYearAnalytics
} from '../utils/memberAnalyticsEngine';
import { exportMembersToCsv } from '../utils/memberRosterParsers';
import { formatMemberTitle } from '../utils/memberTitles';
import type { Member, Assignment, Agenda, Planner, RoleCandidate } from '../types';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'LESS_ACTIVE', label: 'Less Active' },
  { value: 'NEW MOVE-IN', label: 'New Move-in' },
  { value: 'VISITOR', label: 'Visitor' },
  { value: 'MOVED', label: 'Moved' },
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
];

const ORG_OPTIONS = [
  { value: 'Elders Quorum', label: 'Elders Quorum' },
  { value: 'Relief Society', label: 'Relief Society' },
  { value: 'Young Men', label: 'Young Men' },
  { value: 'Young Women', label: 'Young Women' },
  { value: 'Primary', label: 'Primary' },
  { value: 'Sunday School', label: 'Sunday School' },
  { value: 'Bishopric', label: 'Bishopric' },
];

const PRIESTHOOD_OFFICE_OPTIONS = [
  { value: '', label: 'None / Auxiliary' },
  { value: 'Deacon', label: 'Deacon (Aaronic)' },
  { value: 'Teacher', label: 'Teacher (Aaronic)' },
  { value: 'Priest', label: 'Priest (Aaronic)' },
  { value: 'Elder', label: 'Elder (Melchizedek)' },
  { value: 'High Priest', label: 'High Priest (Melchizedek)' },
  { value: 'Bishop', label: 'Bishop' },
];

const emptyMember: Partial<Member> = {
  name: '',
  gender: '',
  age: 0,
  phone: '',
  email: '',
  organisation: '',
  calling: '',
  priesthood_office: '',
  household_id: '',
  status: 'ACTIVE',
  birth_date: '',
  notes: '',
};

export function MembersPage() {
  const { session } = useAuthStore();

  // Navigation / Workspace tab state
  const [activeTab, setActiveTab] = useState<'directory' | 'analytics'>('directory');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Data state
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & selection
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [selectedMemberNames, setSelectedMemberNames] = useState<Set<string>>(new Set());

  // Modals state
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [form, setForm] = useState<Partial<Member>>(emptyMember);
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { can } = useAuthStore();
  const canEdit = can('MEMBER_EDIT');
  const canDelete = can('MEMBER_DELETE');

  // Load all necessary dataset for analytics & directory
  const loadAllData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [membersRes, assignmentsRes, agendasRes, plannersRes] = await Promise.allSettled([
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
        assignmentsApi.list(session.token) as Promise<{ ok: boolean; data: Assignment[] }>,
        agendasApi.list(session.token) as Promise<{ ok: boolean; data: Agenda[] }>,
        plannersApi.list(session.token) as Promise<{ ok: boolean; data: Planner[] }>,
      ]);

      if (membersRes.status === 'fulfilled' && membersRes.value?.ok) {
        setMembers(membersRes.value.data || []);
      }
      if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value?.ok) {
        setAssignments(assignmentsRes.value.data || []);
      }
      if (agendasRes.status === 'fulfilled' && agendasRes.value?.ok) {
        setAgendas(agendasRes.value.data || []);
      }
      if (plannersRes.status === 'fulfilled' && plannersRes.value?.ok) {
        setPlanners(plannersRes.value.data || []);
      }
    } catch {
      toast.error('Failed to load member records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [session]);

  // Filtered members list
  const filtered = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase().trim();
      const matchQ =
        !q ||
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.members_id || m.member_id || '').toLowerCase().includes(q) ||
        String(m.email || '').toLowerCase().includes(q) ||
        String(m.phone || '').includes(q) ||
        String(m.calling || '').toLowerCase().includes(q) ||
        String(m.priesthood_office || '').toLowerCase().includes(q) ||
        String(m.household_id || '').toLowerCase().includes(q) ||
        String(m.notes || '').toLowerCase().includes(q);

      const statusUpper = String(m.status || '').toUpperCase().replace('-', '_');
      const filterUpper = statusFilter.toUpperCase().replace('-', '_');
      const matchStatus = !statusFilter || statusUpper === filterUpper || String(m.status) === statusFilter;
      const matchOrg = !orgFilter || String(m.organisation) === orgFilter;

      return matchQ && matchStatus && matchOrg;
    });
  }, [members, search, statusFilter, orgFilter]);

  // Analytics compiled data
  const yearAnalytics = useMemo(() => {
    try {
      return compileYearAnalytics(selectedYear, members || [], assignments || [], agendas || [], planners || [], new Date());
    } catch (e) {
      console.error('Analytics compilation error:', e);
      return null;
    }
  }, [selectedYear, members, assignments, agendas, planners]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedMemberNames.size === filtered.length) {
      setSelectedMemberNames(new Set());
    } else {
      setSelectedMemberNames(new Set(filtered.map((m) => m.name)));
    }
  };

  const toggleSelectMember = (name: string) => {
    const next = new Set(selectedMemberNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedMemberNames(next);
  };

  // Open Create & Edit Form Modal
  const openCreate = () => {
    setEditMember(null);
    setForm(emptyMember);
    setShowForm(true);
  };

  const openEdit = (m: Member) => {
    setEditMember(m);
    setForm({
      ...m,
      age: getDynamicAge(m.birth_date, m.age)
    });
    setShowForm(true);
  };

  // Save single Member
  const handleSave = async () => {
    if (!session || !form.name) {
      toast.error('Member name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Member> = {
        ...form,
        age: getDynamicAge(form.birth_date, form.age),
        birth_date: form.birth_date ? formatBirthDateForStorage(form.birth_date) : '',
      };

      if (editMember) {
        const res = (await membersApi.update(session.token, payload as Record<string, unknown>)) as {
          ok: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(res.error || 'Update failed');
        toast.success(`Updated ${payload.name}`);
      } else {
        const res = (await membersApi.create(session.token, payload as Record<string, unknown>)) as {
          ok: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(res.error || 'Creation failed');
        toast.success(`Added ${payload.name} to directory`);
      }
      setShowForm(false);
      loadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Bulk import handler from modal
  const handleBatchImport = async (importedMembers: Member[], mode: 'MERGE' | 'OVERWRITE') => {
    if (!session) return;
    try {
      const res = (await membersApi.batchImport(session.token, importedMembers, mode)) as {
        ok: boolean;
        count?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(res.error || 'Batch import failed');
      toast.success(
        mode === 'MERGE'
          ? `Successfully merged ${res.count || importedMembers.length} members!`
          : `Successfully updated entire directory with ${res.count || importedMembers.length} members!`
      );
      loadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
      throw err;
    }
  };

  // Bulk delete handler
  const handleBatchDelete = async () => {
    if (!session || selectedMemberNames.size === 0) return;
    setSaving(true);
    try {
      const namesList = Array.from(selectedMemberNames);
      const res = (await membersApi.batchDelete(session.token, namesList)) as {
        ok: boolean;
        deletedCount?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(res.error || 'Bulk delete failed');
      toast.success(`Deleted ${res.deletedCount || namesList.length} members`);
      setSelectedMemberNames(new Set());
      setShowDeleteConfirmModal(false);
      loadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk delete failed');
    } finally {
      setSaving(false);
    }
  };

  // Single delete handler
  const handleDeleteSingle = async (name: string) => {
    if (!session) return;
    if (!confirm(`Are you sure you want to remove ${name} from the directory?`)) return;
    try {
      const res = (await membersApi.delete(session.token, name)) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      toast.success(`Removed ${name}`);
      loadAllData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (filtered.length === 0) {
      toast.error('No member records to export');
      return;
    }
    exportMembersToCsv(filtered, `ward_members_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${filtered.length} member records to CSV`);
  };

  // Table Columns Definition
  const columns = [
    {
      key: 'select',
      header: (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={toggleSelectAll}
            className="text-slate-400 hover:text-slate-600 focus:outline-none"
            title="Select all"
          >
            {selectedMemberNames.size > 0 && selectedMemberNames.size === filtered.length ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
      render: (m: Member) => (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => toggleSelectMember(m.name)}
            className="text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {selectedMemberNames.has(m.name) ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name & Calling',
      render: (m: Member) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(m.members_id || m.member_id) && (
              <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                #{m.members_id || m.member_id}
              </span>
            )}
            <span className="font-semibold text-slate-900">
              {formatMemberTitle(m.name, m.gender, m.calling)}
            </span>
            {m.priesthood_office && (
              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                {m.priesthood_office}
              </span>
            )}
            {m.household_id && (
              <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded" title={`Household: ${m.household_id}`}>
                <Home className="h-2.5 w-2.5 mr-0.5" />
                {m.household_id}
              </span>
            )}
          </div>
          {m.calling && (
            <p className="text-xs font-medium text-amber-700">{m.calling}</p>
          )}
          {m.email && <p className="text-[11px] text-slate-400">{m.email}</p>}
        </div>
      ),
    },
    {
      key: 'age',
      header: 'Age',
      render: (m: Member) => {
        const dynamicAge = getDynamicAge(m.birth_date, m.age);
        return (
          <span className="font-mono text-xs text-slate-700 font-medium">
            {dynamicAge > 0 ? `${dynamicAge} yrs` : '—'}
          </span>
        );
      },
    },
    {
      key: 'gender',
      header: 'Gender',
      render: (m: Member) =>
        m.gender === 'M' ? (
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">M</span>
        ) : m.gender === 'F' ? (
          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">F</span>
        ) : (
          '—'
        ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (m: Member) =>
        m.phone ? (
          <a
            href={`tel:${m.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-mono text-slate-700 hover:text-blue-600 flex items-center gap-1"
          >
            <Phone className="h-3 w-3 text-slate-400" />
            {m.phone}
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'organisation',
      header: 'Organisation',
      render: (m: Member) => (
        <Badge variant={m.organisation?.includes('Elders') ? 'default' : m.organisation?.includes('Relief') ? 'info' : 'outline'}>
          {m.organisation || '—'}
        </Badge>
      ),
    },
    {
      key: 'birthday',
      header: 'Birthday',
      render: (m: Member) => (
        <span className="text-xs text-slate-600 font-medium">
          {normalizeBirthDate(m.birth_date)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m: Member) => <StatusBadge status={m.status} />,
    },
    {
      key: 'readiness_score',
      header: 'Readiness',
      render: (m: Member) => {
        const score = Math.round(m.readiness_score || 0);
        return (
          <div className="flex items-center gap-1.5" title={`Readiness: ${score}/100`}>
            <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${
                  score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-slate-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-semibold text-slate-600">{score}</span>
          </div>
        );
      },
    },
    {
      key: 'assignments_count',
      header: 'Assignments',
      render: (m: Member) => (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
            {m.spoken_count || 0} talks
          </Badge>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
            {m.prayers_count || 0} prayers
          </Badge>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (m: Member) =>
        (canEdit || canDelete) ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                onClick={() => openEdit(m)}
                title="Edit Member"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                onClick={() => handleDeleteSingle(m.name)}
                title="Delete Member"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <Header
        title="Members"
        subtitle="Intelligent membership directory & pastoral analytics hub"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              icon={<RefreshCw className="h-4 w-4" />}
              onClick={loadAllData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => setShowPrintModal(true)}
            >
              Print / Vector PDF
            </Button>
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Upload className="h-4 w-4" />}
                  onClick={() => setShowImportModal(true)}
                >
                  Import (PDF / LCR CSV)
                </Button>
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                  Add Member
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        {/* ─── 2 Core Workspace Tabs ────────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            Tab 1: Member Directory ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Tab 2: Calendar Year Analytics ({selectedYear})
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-bold">
              AI Predictions
            </span>
          </button>
        </div>

        {/* ─── Workspace 1: Directory Mode ──────────────────────────────────── */}
        {activeTab === 'directory' ? (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, calling, phone, email, household…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-slate-700"
              >
                <option value="">All Organisations</option>
                {ORG_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none text-slate-700"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Bulk Actions Button */}
              {selectedMemberNames.size > 0 && canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setShowDeleteConfirmModal(true)}
                >
                  Delete Selected ({selectedMemberNames.size})
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {filtered.length} member{filtered.length !== 1 ? 's' : ''}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Download className="h-4 w-4" />}
                  onClick={handleExportCsv}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { label: 'Active', count: members.filter((m) => (m.status || '').toUpperCase() === 'ACTIVE').length, variant: 'success' as const },
                { label: 'New Move-ins', count: members.filter((m) => (m.status || '').toUpperCase().includes('MOVE')).length, variant: 'info' as const },
                { label: 'Less Active', count: members.filter((m) => (m.status || '').toUpperCase().includes('LESS')).length, variant: 'warning' as const },
                { label: 'Visitors', count: members.filter((m) => (m.status || '').toUpperCase() === 'VISITOR').length, variant: 'default' as const },
              ].map((b) => (
                <Badge key={b.label} variant={b.variant} className="py-1 px-2.5">
                  {b.count} {b.label}
                </Badge>
              ))}
            </div>

            {/* Table */}
            <Table
              columns={columns}
              data={filtered}
              keyExtractor={(m) => m.name + (m.phone || '')}
              loading={loading}
              emptyMessage="No members found matching your search. Add members or import an official PDF / LCR CSV."
              onRowClick={canEdit ? openEdit : undefined}
            />
          </div>
        ) : (
          /* ─── Workspace 2: Calendar Year Analytics Mode ─────────────────────── */
          <MemberAnalyticsDashboard
            analytics={yearAnalytics}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        )}
      </div>

      {/* ─── Add / Edit Member Modal ────────────────────────────────────────── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editMember ? `Edit ${editMember.name}` : 'Add Member'}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            {editMember && canEdit ? (
              <Button
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={() => {
                  setShowForm(false);
                  handleDeleteSingle(editMember.name);
                }}
              >
                Delete
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editMember ? 'Save Changes' : 'Add Member'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="text-slate-500 font-medium">Member ID:</span>
            <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
              {form.members_id || form.member_id ? `#${form.members_id || form.member_id}` : 'Auto-generated (6-character Alphanumeric)'}
            </span>
          </div>

          <Input
            label="Full Name"
            required
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Brother / Sister Full Name"
            className="sm:col-span-2"
          />

          <Select
            label="Gender"
            options={GENDER_OPTIONS}
            placeholder="Select gender"
            value={form.gender || ''}
            onChange={(e) => setForm({ ...form, gender: e.target.value as 'M' | 'F' })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Birth Date (e.g. 1992-07-14 or 14-Jul)
            </label>
            <input
              type="text"
              placeholder="YYYY-MM-DD or DD-MMM-YYYY"
              value={form.birth_date || ''}
              onChange={(e) => {
                const val = e.target.value;
                const calcAge = getDynamicAge(val, form.age);
                setForm({
                  ...form,
                  birth_date: val,
                  age: calcAge > 0 ? calcAge : form.age,
                });
              }}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {form.birth_date && (
              <p className="text-[11px] text-blue-600 mt-1">
                Calculated Age: {getDynamicAge(form.birth_date, form.age)} yrs · Birthday Label: {normalizeBirthDate(form.birth_date)}
              </p>
            )}
          </div>

          <Input
            label="Phone Number"
            type="tel"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+2348012345678"
          />

          <Input
            label="Email Address"
            type="email"
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="member@example.com"
          />

          <Select
            label="Organisation"
            options={ORG_OPTIONS}
            placeholder="Select organisation"
            value={form.organisation || ''}
            onChange={(e) => setForm({ ...form, organisation: e.target.value })}
          />

          <Select
            label="Priesthood Office"
            options={PRIESTHOOD_OFFICE_OPTIONS}
            value={form.priesthood_office || ''}
            onChange={(e) => setForm({ ...form, priesthood_office: e.target.value })}
          />

          <Input
            label="Calling / Position"
            value={form.calling || ''}
            onChange={(e) => setForm({ ...form, calling: e.target.value })}
            placeholder="e.g. Elders Quorum President, RS Counselor"
          />

          <Input
            label="Household ID / Family Unit"
            value={form.household_id || ''}
            onChange={(e) => setForm({ ...form, household_id: e.target.value })}
            placeholder="e.g. adeleke_family"
          />

          <Select
            label="Member Status"
            options={STATUS_OPTIONS}
            value={form.status || 'ACTIVE'}
            onChange={(e) => setForm({ ...form, status: e.target.value as Member['status'] })}
          />

          <Textarea
            label="Pastoral Notes / Availability"
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Available for early Sunday speaking assignments, music abilities, etc."
            className="sm:col-span-2"
          />
        </div>
      </Modal>

      {/* ─── Bulk Delete Confirmation Modal ─────────────────────────────────── */}
      <Modal
        open={showDeleteConfirmModal}
        onClose={() => setShowDeleteConfirmModal(false)}
        title="Confirm Bulk Deletion"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBatchDelete}
              loading={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete {selectedMemberNames.size} Members
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete the <strong>{selectedMemberNames.size}</strong> selected member(s)?
          This action will remove them from the active ward roster.
        </p>
      </Modal>

      {/* ─── PDF / LCR CSV Import Modal ──────────────────────────────────────── */}
      <MemberImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        existingMembers={members}
        onConfirmImport={handleBatchImport}
      />

      {/* ─── Printable Vector PDF Modal ─────────────────────────────────────── */}
      <MemberRosterPrintModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        members={filtered}
        unitName={session?.organisation || 'Ward Member Directory'}
      />
    </div>
  );
}
