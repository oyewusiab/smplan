import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { useAuthStore } from '../../store/authStore';
import { usersApi } from '../../services/api';
import toast from 'react-hot-toast';

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const { session, updateSession } = useAuthStore();
  const [tab, setTab] = useState<'profile' | 'security'>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    preferred_name: '',
    gender: 'M',
    phone: '',
    whatsapp: '',
    address: '',
    lga: '',
    state: '',
    country: 'Nigeria',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    signature_data_url: '',
    notes: '',
    email: '',
    username: '',
    original_username: '',
    username_change_count: 0,
    current_password: '',
    new_password: '',
    confirm_password: '',
    role: '',
    organisation: '',
    calling: '',
    created_date: '',
    last_login_date: '',
  });

  useEffect(() => {
    if (open && session) {
      loadProfile();
    }
  }, [open, session]);

  const loadProfile = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await usersApi.getProfile(session.token) as { ok: boolean; data: any };
      if (res.ok && res.data) {
        const u = res.data;
        setForm({
          name: u.name || session.name || '',
          preferred_name: u.preferred_name || session.preferred_name || '',
          gender: u.gender || 'M',
          phone: u.phone || '',
          whatsapp: u.whatsapp || '',
          address: u.address || '',
          lga: u.lga || '',
          state: u.state || '',
          country: u.country || 'Nigeria',
          emergency_contact_name: u.emergency_contact_name || '',
          emergency_contact_phone: u.emergency_contact_phone || '',
          signature_data_url: u.signature_data_url || '',
          notes: u.notes || '',
          email: u.email || session.email || '',
          username: u.username || '',
          original_username: u.username || '',
          username_change_count: Number(u.username_change_count) || (u.username_changed ? 1 : 0),
          current_password: '',
          new_password: '',
          confirm_password: '',
          role: u.role || session.role || 'ADMIN',
          organisation: u.organisation || session.organisation || 'Bishopric',
          calling: u.calling || (session.role === 'ADMIN' ? 'Bishop' : 'Leader'),
          created_date: u.created_date || '3/11/2026, 12:38:51 PM',
          last_login_date: u.last_login_date || '8/10/2026, 5:49:55 AM',
        });
      }
    } catch {
      // fallback to session
      setForm((prev) => ({
        ...prev,
        name: session.name || '',
        preferred_name: session.preferred_name || '',
        email: session.email || '',
        role: session.role || 'ADMIN',
        organisation: session.organisation || 'Bishopric',
        calling: session.role === 'ADMIN' ? 'Bishop' : 'Leader',
        original_username: prev.username || '',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error('Signature file must be under 1MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, signature_data_url: reader.result as string }));
      toast.success('Signature loaded');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!session) return;

    // Check username update restriction for non-admin
    if (
      session.role !== 'ADMIN' &&
      form.username.trim().toLowerCase() !== form.original_username.trim().toLowerCase() &&
      form.username_change_count >= 1
    ) {
      toast.error('You can only update your username once by yourself. Contact the Bishop for further updates.');
      return;
    }

    // Check password matching if new password is typed
    if (form.new_password) {
      if (!form.confirm_password || form.new_password !== form.confirm_password) {
        toast.error('New password and confirmation password do not match');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        preferred_name: form.preferred_name,
        gender: form.gender,
        phone: form.phone,
        whatsapp: form.whatsapp,
        address: form.address,
        lga: form.lga,
        state: form.state,
        country: form.country,
        emergency_contact_name: form.emergency_contact_name,
        emergency_contact_phone: form.emergency_contact_phone,
        signature_data_url: form.signature_data_url,
        notes: form.notes,
        email: form.email,
        username: form.username,
      };

      if (tab === 'security' && form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
        payload.confirm_password = form.confirm_password;
      }

      const res = await usersApi.updateProfile(session.token, payload) as { ok: boolean; data: any };
      if (res.ok) {
        toast.success(tab === 'security' && form.new_password ? 'Security settings & password updated' : 'Profile saved successfully');
        if (updateSession) {
          updateSession({
            name: form.name,
            preferred_name: form.preferred_name,
            email: form.email,
          });
        }
        if (form.new_password) {
          setForm((prev) => ({ ...prev, current_password: '', new_password: '' }));
        }
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-white">
          <h2 className="text-base font-bold text-slate-900 tracking-tight">My Profile</h2>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Tab Selector & Header Badges */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('profile')}
              className={
                tab === 'profile'
                  ? 'rounded-xl px-4 py-1.5 text-xs font-bold transition-all bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'rounded-xl px-4 py-1.5 text-xs font-bold transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }
            >
              Profile
            </button>
            <button
              onClick={() => setTab('security')}
              className={
                tab === 'security'
                  ? 'rounded-xl px-4 py-1.5 text-xs font-bold transition-all bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'rounded-xl px-4 py-1.5 text-xs font-bold transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }
            >
              Security
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-sky-100/90 text-sky-700 border border-sky-200/60 px-2.5 py-0.5 text-xs font-bold">
              {form.role || 'ADMIN'}
            </span>
            <span className="rounded-full bg-slate-100 text-slate-700 border border-slate-200/60 px-2.5 py-0.5 text-xs font-medium">
              {form.calling || 'Bishop'}
            </span>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading profile data…</div>
          ) : tab === 'profile' ? (
            <div className="space-y-4">
              {/* Row 1: Full Name & Preferred Name */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="FULL NAME"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Adebayo Oyewusi"
                />
                <Input
                  label="PREFERRED NAME (OPTIONAL)"
                  value={form.preferred_name}
                  onChange={(e) => setForm({ ...form, preferred_name: e.target.value })}
                  placeholder="e.g. Bishop Adebayo"
                />
              </div>

              {/* Row 2: Gender & Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="GENDER"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  options={[
                    { value: 'M', label: 'Male' },
                    { value: 'F', label: 'Female' },
                  ]}
                />
                <Input
                  label="PHONE"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 8160486023"
                />
              </div>

              {/* Row 3: WhatsApp & Address */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="WHATSAPP"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="e.g. +2348160486023"
                />
                <Input
                  label="ADDRESS"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. 1, Adesanya Avenue, off Somorin Street, Obantoko"
                />
              </div>

              {/* Row 4: LGA & State */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="LGA"
                  value={form.lga}
                  onChange={(e) => setForm({ ...form, lga: e.target.value })}
                  placeholder="e.g. Abeokuta South"
                />
                <Input
                  label="STATE"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="e.g. Ogun State"
                />
              </div>

              {/* Row 5: Country & Emergency Contact Name */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="COUNTRY"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="e.g. Nigeria"
                />
                <Input
                  label="EMERGENCY CONTACT NAME"
                  value={form.emergency_contact_name}
                  onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                  placeholder="Emergency contact person"
                />
              </div>

              {/* Row 6: Emergency Contact Phone */}
              <Input
                label="EMERGENCY CONTACT PHONE"
                value={form.emergency_contact_phone}
                onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                placeholder="Emergency contact phone number"
              />

              {/* Row 7: Signature */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  SIGNATURE (OPTIONAL)
                </label>
                <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs">
                      <Upload className="h-3.5 w-3.5 text-slate-500" />
                      <span>Choose File</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                    </label>

                    {form.signature_data_url && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, signature_data_url: '' })}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Used on printed assignment notifications when you are the signatory.
                  </p>
                  {form.signature_data_url ? (
                    <div className="mt-3 p-2 rounded-lg bg-slate-50 border border-slate-200/80 inline-block">
                      <img src={form.signature_data_url} alt="Signature Preview" className="h-10 object-contain" />
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">No signature uploaded.</p>
                  )}
                </div>
              </div>

              {/* Row 8: Notes */}
              <Textarea
                label="NOTES (ADMIN/CO-ADMIN ONLY)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes (optional)"
                rows={2}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Row 1: Email and Username */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="EMAIL (LOGIN)"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. oyewusi.adebayo1@gmail.com"
                />
                <div>
                  <Input
                    label="USERNAME (LOGIN)"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. admin"
                    disabled={session?.role !== 'ADMIN' && form.username_change_count >= 1}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    {session?.role !== 'ADMIN' && form.username_change_count >= 1
                      ? '🔒 Username updated (can only be updated once by yourself. Contact Bishop to change).'
                      : 'Users can sign in with either email or username. (Username can only be updated once by yourself).'}
                  </p>
                </div>
              </div>

              {/* Row 2: Account Card & Password Card */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Account Card */}
                <div className="rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Account</h4>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-700">Role:</span> {form.role || 'ADMIN'}</p>
                    <p><span className="font-semibold text-slate-700">Organisation:</span> {form.organisation || 'Bishopric'}</p>
                    <p><span className="font-semibold text-slate-700">Calling:</span> {form.calling || 'Bishop'}</p>
                    <p className="text-[11px] text-slate-400 pt-1">Created: {form.created_date || '3/11/2026, 12:38:51 PM'}</p>
                    <p className="text-[11px] text-slate-400">Last login: {form.last_login_date || '8/10/2026, 5:49:55 AM'}</p>
                  </div>
                </div>

                {/* Password Card with Confirm Password */}
                <div className="rounded-[14px] border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Password</h4>
                  <Input
                    label="CURRENT PASSWORD"
                    type="password"
                    value={form.current_password}
                    onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <Input
                    label="NEW PASSWORD"
                    type="password"
                    value={form.new_password}
                    onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                    placeholder="Enter new password"
                  />
                  <div>
                    <Input
                      label="CONFIRM NEW PASSWORD"
                      type="password"
                      value={form.confirm_password}
                      onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                      placeholder="Re-enter new password"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Use 6+ characters. Password resets for other users are handled in Settings.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                You can update your own login email, username, and password here.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3.5 flex items-center justify-end gap-2.5 shrink-0 bg-slate-50/50">
          <Button variant="secondary" size="md" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} loading={saving}>
            {tab === 'security' && form.new_password ? 'Update password' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
