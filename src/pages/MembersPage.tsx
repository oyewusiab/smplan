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
import { setMembersDirectoryRegistry } from '../utils/memberTitle';
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
  { value: 'Sunday School', label: 'Sunday School (Adult Sunday School)' },
  { value: 'Bishopric', label: 'Bishopric' },
  { value: 'YSA', label: 'Young Single Adults (YSA)' },
  { value: 'High Priests', label: 'High Priests' },
];

const AGE_BRACKET_OPTIONS = [
  { value: '', label: 'All Ages' },
  { value: 'CHILDREN', label: 'Children (0–11 yrs)' },
  { value: 'YOUTH', label: 'Youth (12–17 yrs)' },
  { value: 'YSA', label: 'Young Single Adults (18–30 yrs)' },
  { value: 'ADULTS', label: 'Adults (31–59 yrs)' },
  { value: 'SENIORS', label: 'Seniors (60+ yrs)' },
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

const PRIESTHOOD_FILTER_OPTIONS = [
  { value: '', label: 'All Priesthood' },
  { value: 'AARONIC', label: 'Aaronic Priesthood' },
  { value: 'MELCHIZEDEK', label: 'Melchizedek Priesthood' },
  { value: 'Deacon', label: 'Deacon' },
  { value: 'Teacher', label: 'Teacher' },
  { value: 'Priest', label: 'Priest' },
  { value: 'Elder', label: 'Elder' },
  { value: 'High Priest', label: 'High Priest' },
  { value: 'NONE', label: 'None / Auxiliary' },
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
  birthdate: '',
  confirmation_date: '',
  confirmationdate: '',
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
  const [genderFilter, setGenderFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [priesthoodFilter, setPriesthoodFilter] = useState('');
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
        const mems = membersRes.value.data || [];
        setMembers(mems);
        setMembersDirectoryRegistry(mems);
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

  // Dynamically extract ALL unique organisations across all members in the ward
  const availableOrganisations = useMemo(() => {
    const orgMap = new Map<string, string>(); // lowercase -> display string

    // Seed standard base options
    const standardOrgs = [
      'Elders Quorum',
      'Relief Society',
      'Young Men',
      'Young Women',
      'Primary',
      'Sunday School',
      'Bishopric',
      'Young Single Adults (YSA)',
      'High Priests',
      'Ward Missionaries',
      'Temple & Family History',
      'Choir',
      'Activities Committee',
      'Ward Council',
      'Aaronic Priesthood Quorum',
      'Single Adults',
      'Self-Reliance',
      'Seminary & Institute'
    ];

    standardOrgs.forEach(o => orgMap.set(o.toLowerCase(), o));

    // Extract every unique organisation from the active member roster (splitting comma-separated entries)
    members.forEach(m => {
      if (!m.organisation) return;
      const parts = String(m.organisation).split(',');
      parts.forEach(p => {
        const trimmed = p.trim();
        if (trimmed && trimmed !== '—' && trimmed !== '-') {
          const lower = trimmed.toLowerCase();
          if (!orgMap.has(lower)) {
            orgMap.set(lower, trimmed);
          }
        }
      });
    });

    return Array.from(orgMap.values()).sort((a, b) => a.localeCompare(b));
  }, [members]);

  // Filtered members list with accurate multi-organisation, birthdate age, gender & priesthood checks
  const filtered = useMemo(() => {
    return members.filter((m) => {
      const q = search.toLowerCase().trim();
      const bDate = m.birthdate || m.birth_date || '';
      const dynamicAge = getDynamicAge(bDate, m.age);
      const memberOrgs = String(m.organisation || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      // Search Query Match across all member fields
      const matchQ =
        !q ||
        String(m.name || '').toLowerCase().includes(q) ||
        String(m.members_id || m.member_id || '').toLowerCase().includes(q) ||
        String(m.email || '').toLowerCase().includes(q) ||
        String(m.phone || '').includes(q) ||
        String(m.calling || '').toLowerCase().includes(q) ||
        String(m.priesthood_office || '').toLowerCase().includes(q) ||
        String(m.household_id || '').toLowerCase().includes(q) ||
        String(m.notes || '').toLowerCase().includes(q) ||
        memberOrgs.some(org => org.includes(q));

      // Status Match
      const statusUpper = String(m.status || '').toUpperCase().replace('-', '_');
      const filterUpper = statusFilter.toUpperCase().replace('-', '_');
      const matchStatus = !statusFilter || statusUpper === filterUpper || String(m.status) === statusFilter;

      // Organisation Match (Supports multi-organisation comma separation & Sunday School = Adult Sunday School)
      let matchOrg = true;
      if (orgFilter) {
        const filterLower = orgFilter.toLowerCase().trim();
        const isFilterSS = filterLower.includes('sunday school');

        matchOrg = memberOrgs.some(org => {
          if (isFilterSS && org.includes('sunday school')) return true;
          if (org === filterLower) return true;
          if (org.includes(filterLower) || filterLower.includes(org)) return true;
          return false;
        });
      }

      // Gender Match
      const memberGender = String(m.gender || '').toUpperCase();
      const matchGender =
        !genderFilter ||
        (genderFilter === 'M' && (memberGender === 'M' || memberGender === 'MALE')) ||
        (genderFilter === 'F' && (memberGender === 'F' || memberGender === 'FEMALE'));

      // Age Bracket Match
      let matchAge = true;
      if (ageFilter) {
        if (ageFilter === 'CHILDREN') matchAge = dynamicAge >= 0 && dynamicAge <= 11;
        else if (ageFilter === 'YOUTH') matchAge = dynamicAge >= 12 && dynamicAge <= 17;
        else if (ageFilter === 'YSA') matchAge = dynamicAge >= 18 && dynamicAge <= 30;
        else if (ageFilter === 'ADULTS') matchAge = dynamicAge >= 31 && dynamicAge <= 59;
        else if (ageFilter === 'SENIORS') matchAge = dynamicAge >= 60;
      }

      // Priesthood Office Match
      let matchPriesthood = true;
      if (priesthoodFilter) {
        const po = String(m.priesthood_office || '').toLowerCase();
        if (priesthoodFilter === 'AARONIC') {
          matchPriesthood = po.includes('deacon') || po.includes('teacher') || po.includes('priest');
        } else if (priesthoodFilter === 'MELCHIZEDEK') {
          matchPriesthood = po.includes('elder') || po.includes('high priest') || po.includes('bishop');
        } else if (priesthoodFilter === 'NONE') {
          matchPriesthood = !po || po === 'none' || po === 'auxiliary';
        } else {
          matchPriesthood = po.includes(priesthoodFilter.toLowerCase());
        }
      }

      return matchQ && matchStatus && matchOrg && matchGender && matchAge && matchPriesthood;
    });
  }, [members, search, statusFilter, orgFilter, genderFilter, ageFilter, priesthoodFilter]);

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
    const bDate = m.birthdate || m.birth_date || '';
    const cDate = m.confirmationdate || m.confirmation_date || '';
    setForm({
      ...m,
      birth_date: bDate,
      birthdate: bDate,
      confirmation_date: cDate,
      confirmationdate: cDate,
      age: getDynamicAge(bDate, m.age)
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
      const rawBDate = form.birthdate || form.birth_date || '';
      const formattedBDate = rawBDate ? formatBirthDateForStorage(rawBDate) : '';
      const rawCDate = form.confirmationdate || form.confirmation_date || '';
      const formattedCDate = rawCDate ? formatBirthDateForStorage(rawCDate) : '';
      const calcAge = getDynamicAge(rawBDate, form.age);

      const payload: Partial<Member> = {
        ...form,
        age: calcAge,
        birth_date: formattedBDate,
        birthdate: formattedBDate,
        confirmation_date: formattedCDate,
        confirmationdate: formattedCDate,
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
        const dynamicAge = getDynamicAge(m.birthdate || m.birth_date, m.age);
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
      render: (m: Member) => {
        const orgs = String(m.organisation || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (orgs.length === 0) {
          return <span className="text-slate-400">—</span>;
        }

        return (
          <div className="flex flex-wrap gap-1">
            {orgs.map((org, i) => {
              const isSS = org.toLowerCase().includes('sunday school');
              const isEQ = org.toLowerCase().includes('elder');
              const isRS = org.toLowerCase().includes('relief');
              const isYM = org.toLowerCase().includes('young men');
              const isYW = org.toLowerCase().includes('young women');
              const isPri = org.toLowerCase().includes('primary');
              const isBish = org.toLowerCase().includes('bishopric');

              return (
                <span
                  key={i}
                  className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isEQ
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : isRS
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isSS
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : isYM
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : isYW
                      ? 'bg-pink-50 text-pink-700 border-pink-200'
                      : isPri
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isBish
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {org}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'birthday',
      header: 'Birthday',
      render: (m: Member) => (
        <span className="text-xs text-slate-600 font-medium">
          {normalizeBirthDate(m.birthdate || m.birth_date)}
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
        subtitle="Intelligent membership directory & Bishopric analytics hub"
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
            <div className="flex flex-wrap items-center gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, org, calling, phone, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Organisation Filter (Dynamically populated from all 20+ organisations) */}
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none text-slate-700 max-w-[200px]"
                title="Filter by Organisation"
              >
                <option value="">All Organisations ({availableOrganisations.length})</option>
                {availableOrganisations.map((orgName) => (
                  <option key={orgName} value={orgName}>
                    {orgName}
                  </option>
                ))}
              </select>

              {/* Gender Filter */}
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none text-slate-700"
                title="Filter by Gender"
              >
                <option value="">All Genders</option>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>

              {/* Age Bracket Filter */}
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none text-slate-700"
                title="Filter by Age Group"
              >
                {AGE_BRACKET_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>

              {/* Priesthood Office Filter */}
              <select
                value={priesthoodFilter}
                onChange={(e) => setPriesthoodFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none text-slate-700"
                title="Filter by Priesthood Office"
              >
                {PRIESTHOOD_FILTER_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none text-slate-700"
                title="Filter by Member Status"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(search || orgFilter || statusFilter || genderFilter || ageFilter || priesthoodFilter) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setOrgFilter('');
                    setStatusFilter('');
                    setGenderFilter('');
                    setAgeFilter('');
                    setPriesthoodFilter('');
                  }}
                  className="px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition border border-rose-200"
                  title="Reset all filters"
                >
                  Reset
                </button>
              )}

              {/* Bulk Actions Button */}
              {selectedMemberNames.size > 0 && canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setShowDeleteConfirmModal(true)}
                >
                  Delete ({selectedMemberNames.size})
                </Button>
              )}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {filtered.length} of {members.length}
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
        ) : yearAnalytics ? (
          /* ─── Workspace 2: Calendar Year Analytics Mode ─────────────────────── */
          <MemberAnalyticsDashboard
            analytics={yearAnalytics}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        ) : (
          <div className="py-12 text-center text-sm text-slate-500">
            Calculating Bishopric analytics...
          </div>
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
              value={form.birth_date || form.birthdate || ''}
              onChange={(e) => {
                const val = e.target.value;
                const calcAge = getDynamicAge(val, form.age);
                setForm({
                  ...form,
                  birth_date: val,
                  birthdate: val,
                  age: calcAge > 0 ? calcAge : form.age,
                });
              }}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {(form.birth_date || form.birthdate) && (
              <p className="text-[11px] text-blue-600 mt-1">
                Calculated Age: <strong>{getDynamicAge(form.birth_date || form.birthdate, form.age)} yrs</strong> · Birthday: {normalizeBirthDate(form.birth_date || form.birthdate)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmation Date (Convert / Baptism)
            </label>
            <input
              type="text"
              placeholder="YYYY-MM-DD or DD-MMM-YYYY"
              value={form.confirmation_date || form.confirmationdate || ''}
              onChange={(e) => {
                const val = e.target.value;
                setForm({
                  ...form,
                  confirmation_date: val,
                  confirmationdate: val,
                });
              }}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {(form.confirmation_date || form.confirmationdate) && (
              <p className="text-[11px] text-emerald-600 mt-1">
                Recorded Confirmation: <strong>{form.confirmation_date || form.confirmationdate}</strong>
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

          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Organisation(s) (Member can belong to multiple, separated by commas)
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {availableOrganisations.length} ward groups
              </span>
            </div>
            {/* Quick Toggle Chips for all unique ward organisations */}
            <div className="flex flex-wrap gap-1.5 pb-1 max-h-32 overflow-y-auto pr-1">
              {availableOrganisations.map((orgName) => {
                const currentOrgs = String(form.organisation || '')
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
                const isSelected = currentOrgs.some(
                  o => o.toLowerCase() === orgName.toLowerCase() ||
                  (orgName.toLowerCase().includes('sunday school') && o.toLowerCase().includes('sunday school'))
                );

                return (
                  <button
                    key={orgName}
                    type="button"
                    onClick={() => {
                      let nextOrgs: string[];
                      if (isSelected) {
                        nextOrgs = currentOrgs.filter(
                          o => o.toLowerCase() !== orgName.toLowerCase() &&
                          !(orgName.toLowerCase().includes('sunday school') && o.toLowerCase().includes('sunday school'))
                        );
                      } else {
                        nextOrgs = [...currentOrgs, orgName];
                      }
                      setForm({ ...form, organisation: nextOrgs.join(', ') });
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{orgName}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <input
                type="text"
                list="unique-orgs-datalist"
                value={form.organisation || ''}
                onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                placeholder="e.g. Relief Society, Sunday School"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <datalist id="unique-orgs-datalist">
                {availableOrganisations.map((orgName) => (
                  <option key={orgName} value={orgName} />
                ))}
              </datalist>
            </div>
          </div>

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
            label="Bishopric Notes / Availability"
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
