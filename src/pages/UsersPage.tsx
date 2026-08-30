import { useState, useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Users, Shield, Key, CheckCircle, Search, Link2, UserCheck } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { RoleBadge, Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { usersApi, membersApi } from '../services/api';
import type { User, UserRole, Member } from '../types';
import { formatMemberTitle } from '../utils/memberTitles';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin (Bishop)' },
  { value: 'BISHOPRIC', label: 'Bishopric (1st & 2nd Counsellors)' },
  { value: 'CLERK', label: 'Ward Clerk / Assistant Clerk' },
  { value: 'SECRETARY', label: 'Executive Secretary' },
  { value: 'MUSIC', label: 'Ward Music Coordinator' },
];

export function UsersPage() {
  const { session } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Form state
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetModal, setResetModal] = useState<User | null>(null);
  const [form, setForm] = useState<Partial<User & { temp_password: string }>>({ role: 'CLERK' });
  const [saving, setSaving] = useState(false);
  const [tempPw, setTempPw] = useState('');

  // Member search / autocomplete in user creation modal
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [uRes, mRes] = await Promise.allSettled([
        usersApi.list(session.token) as Promise<{ ok: boolean; data: User[] }>,
        membersApi.list(session.token) as Promise<{ ok: boolean; data: Member[] }>,
      ]);
      if (uRes.status === 'fulfilled' && uRes.value.ok) setUsers(uRes.value.data || []);
      if (mRes.status === 'fulfilled' && mRes.value.ok) setMembers(mRes.value.data || []);
    } catch {
      toast.error('Failed to load user and membership data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [session]);

  // Filtered members matching query in user modal
  const memberSuggestions = useMemo(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return members.filter(m => {
      const name = String(m.name || '').toLowerCase();
      const mId = String(m.members_id || m.member_id || '').toLowerCase();
      const email = String(m.email || '').toLowerCase();
      const phone = String(m.phone || '');
      return name.includes(q) || mId.includes(q) || email.includes(q) || phone.includes(q);
    }).slice(0, 6);
  }, [members, memberSearchQuery]);

  // Handle selecting a member to auto-generate user fields
  const handleSelectMember = (m: Member) => {
    setSelectedMember(m);
    const mId = m.members_id || m.member_id || '';
    
    // Auto-generate preferred name and username
    const cleanName = m.name.replace(/^(Brother|Sister|Bishop|Elder|President|Bro\.|Sis\.)\s+/i, '').trim();
    const nameParts = cleanName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    
    let suggestedUsername = '';
    if (m.email && m.email.includes('@')) {
      suggestedUsername = m.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
    } else if (firstName && lastName) {
      suggestedUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    } else {
      suggestedUsername = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.');
    }

    setForm(prev => ({
      ...prev,
      member_id: mId,
      members_id: mId,
      name: m.name,
      preferred_name: prev.preferred_name || firstName,
      username: prev.username || suggestedUsername,
      email: m.email || prev.email || '',
      phone: m.phone || prev.phone || '',
      gender: (m.gender === 'M' || m.gender === 'F') ? m.gender : prev.gender,
      organisation: m.organisation || prev.organisation || '',
      calling: m.calling || prev.calling || '',
    }));

    setMemberSearchQuery('');
    toast.success(`Linked with member: ${m.name} (#${mId})`);
  };

  const handleOpenCreate = () => {
    setEditUser(null);
    setSelectedMember(null);
    setMemberSearchQuery('');
    setForm({ role: 'CLERK' });
    setShowForm(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditUser(u);
    const matchedMember = members.find(m => (m.members_id && m.members_id === u.member_id) || (m.member_id && m.member_id === u.member_id));
    setSelectedMember(matchedMember || null);
    setMemberSearchQuery('');
    setForm(u);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!session || !form.name || !form.username || !form.email) {
      toast.error('Full Name, username, and email are required');
      return;
    }
    setSaving(true);
    try {
      if (editUser) {
        const res = await usersApi.update(session.token, { ...form, user_id: editUser.user_id }) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('User updated successfully');
      } else {
        if (!form.temp_password) { toast.error('Temporary password required for new user'); setSaving(false); return; }
        const res = await usersApi.create(session.token, form) as { ok: boolean; error?: string };
        if (!res.ok) throw new Error(res.error);
        toast.success('User created — password must be changed on first login');
      }
      setShowForm(false);
      setEditUser(null);
      setForm({ role: 'CLERK' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async (user: User) => {
    if (!session) return;
    try {
      await usersApi.disable(session.token, user.user_id);
      toast.success(`User account ${user.disabled ? 'enabled' : 'disabled'}`);
      load();
    } catch {
      toast.error('Action failed');
    }
  };

  const handleResetPassword = async () => {
    if (!session || !resetModal || !tempPw) { toast.error('Temporary password required'); return; }
    if (tempPw.length < 6) { toast.error('Temporary password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      await usersApi.resetPassword(session.token, resetModal.user_id, tempPw);
      toast.success('Password reset — user must change on next login');
      setResetModal(null);
      setTempPw('');
    } catch (err: any) {
      toast.error(err?.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name', header: 'Name & Stewardship',
      render: (u: User) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-900">
              {formatMemberTitle(u.name, u.gender, u.calling, u.role)}
            </span>
            {u.preferred_name && (
              <span className="text-xs text-slate-400">"{u.preferred_name}"</span>
            )}
            {(u.members_id || u.member_id) ? (
              <span className="inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200" title="Linked Member ID">
                <Link2 className="h-2.5 w-2.5 mr-0.5" />
                #{u.members_id || u.member_id}
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                Unlinked
              </span>
            )}
          </div>
          {u.calling && <p className="text-xs text-slate-500">{u.calling}</p>}
        </div>
      )
    },
    { key: 'username', header: 'Username', render: (u: User) => <code className="text-xs font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">{u.username}</code> },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u: User) => <RoleBadge role={u.role} /> },
    { key: 'organisation', header: 'Organisation', render: (u: User) => u.organisation || 'Ward' },
    {
      key: 'status', header: 'Status',
      render: (u: User) => (
        <Badge variant={u.disabled ? 'danger' : 'success'}>
          {u.disabled ? 'Disabled' : 'Active'}
        </Badge>
      )
    },
    {
      key: 'last_login', header: 'Last Login',
      render: (u: User) => u.last_login_date ? format(parseISO(u.last_login_date), 'MMM d, yyyy') : 'Never'
    },
    {
      key: 'actions', header: '',
      render: (u: User) => (
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" onClick={() => handleOpenEdit(u)}>Edit</Button>
          <Button size="xs" variant="ghost" icon={<Key className="h-3.5 w-3.5" />} onClick={() => { setResetModal(u); setTempPw(''); }}>Reset PW</Button>
          <Button size="xs" variant="ghost" className={u.disabled ? 'text-emerald-600' : 'text-red-500'} onClick={() => handleDisable(u)}>
            {u.disabled ? 'Enable' : 'Disable'}
          </Button>
        </div>
      )
    },
  ];

  if (session?.role !== 'ADMIN') {
    return (
      <div>
        <Header title="User Management" />
        <div className="p-6">
          <Card><CardBody className="py-16 text-center">
            <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Admin access required</p>
            <p className="text-sm text-slate-400 mt-1">Only administrators can manage user accounts.</p>
          </CardBody></Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="User Accounts & Leaders Access"
        subtitle="Manage leadership platform credentials, linked member IDs, and roles"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={load} loading={loading}>Refresh</Button>
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              New User
            </Button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-5">
        {/* Security & Correlation notice */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-semibold">Unified Member & User Correlation</p>
              <p className="mt-0.5 text-xs text-blue-700">
                Each user profile correlates directly with their 6-character <strong>Member ID</strong> from the Membership Directory.
                When creating a new leadership account, search and pick their Member ID to auto-populate their basic information.
              </p>
            </div>
          </div>
        </div>

        {/* Role summary */}
        <div className="flex flex-wrap gap-2">
          {ROLE_OPTIONS.map((r) => (
            <div key={r.value} className="rounded-xl border border-slate-200 bg-white px-4 py-2 flex items-center gap-2 shadow-xs">
              <RoleBadge role={r.value} />
              <span className="text-sm font-bold text-slate-700">
                {users.filter((u) => u.role === r.value).length}
              </span>
            </div>
          ))}
        </div>

        {users.length === 0 && !loading ? (
          <Card><CardBody className="py-16 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No users found</p>
            <p className="text-sm text-slate-400 mt-1">Create the first user account.</p>
          </CardBody></Card>
        ) : (
          <Table
            columns={columns}
            data={users}
            keyExtractor={(u) => u.user_id}
            loading={loading}
            emptyMessage="No users found."
          />
        )}
      </div>

      {/* Create/Edit User Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editUser ? `Edit User: ${editUser.name}` : 'Create New Leadership User'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editUser ? 'Save Changes' : 'Create User'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Step 1: Member Correlation & Auto-Fill */}
          {!editUser && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Select Member from Roster (Auto-Populate Details)
                </label>
                {form.member_id && (
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Linked: #{form.member_id}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Type member name or 6-char Member ID (e.g. #M8K2P9)..."
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Suggestions Dropdown */}
              {memberSuggestions.length > 0 && (
                <div className="border border-slate-200 rounded-lg bg-white shadow-md divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {memberSuggestions.map((m) => (
                    <button
                      key={m.members_id || m.member_id || m.name}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50/70 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900">{m.name}</p>
                        <p className="text-[11px] text-slate-500">{m.calling || m.organisation || 'Ward Member'}</p>
                      </div>
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        #{m.members_id || m.member_id || 'ID'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Member ID (Optional)"
              value={form.member_id || form.members_id || ''}
              onChange={(e) => setForm({ ...form, member_id: e.target.value, members_id: e.target.value })}
              placeholder="e.g. M8K2P9"
            />
            <Select
              label="System Role"
              required
              options={ROLE_OPTIONS}
              value={form.role || 'CLERK'}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            />

            <Input
              label="Full Name"
              required
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="sm:col-span-2"
            />
            <Input
              label="Preferred Name"
              value={form.preferred_name || ''}
              onChange={(e) => setForm({ ...form, preferred_name: e.target.value })}
            />
            <Input
              label="Username"
              required
              value={form.username || ''}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              required
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Calling / Position"
              value={form.calling || ''}
              onChange={(e) => setForm({ ...form, calling: e.target.value })}
            />
            <Input
              label="Organisation"
              value={form.organisation || ''}
              onChange={(e) => setForm({ ...form, organisation: e.target.value })}
            />

            {!editUser && (
              <Input
                label="Temporary Password"
                type="password"
                required
                value={form.temp_password || ''}
                onChange={(e) => setForm({ ...form, temp_password: e.target.value })}
                hint="User must change this temporary password at their first login"
                className="sm:col-span-2"
              />
            )}
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetModal}
        onClose={() => setResetModal(null)}
        title={`Reset Password — ${resetModal?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetModal(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} loading={saving}>Reset Password</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Enter a temporary password. The user will be required to change it at their next login.
          </p>
          <Input
            label="Temporary Password"
            type="password"
            required
            value={tempPw}
            onChange={(e) => setTempPw(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
