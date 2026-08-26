import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import type { AuthSession } from '../types';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setSession, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(username.trim(), password) as { ok: boolean; session: AuthSession; error?: string };
      if (!res.ok) throw new Error(res.error || 'Login failed');
      setSession(res.session);
      toast.success(`Welcome back, ${res.session.preferred_name || res.session.name}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding with #082749 dominant theme */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#082749] via-[#0b3464] to-[#082749] p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-xl" />
        <div className="absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[550px] rounded-full bg-white/3" />

        <div className="relative z-10 text-center max-w-md">
          {/* Logo container (6x larger, crisp presentation) */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex h-44 w-44 items-center justify-center rounded-3xl bg-white p-4 shadow-2xl shadow-[#041427]/70 border border-white/20 overflow-hidden">
              <img
                src="/sm_image.png"
                alt="SM Planner Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/logo.png')) {
                    target.src = '/logo.png';
                  } else {
                    target.style.display = 'none';
                    if (target.nextElementSibling) {
                      (target.nextElementSibling as HTMLElement).style.display = 'block';
                    }
                  }
                }}
              />
              <Church className="h-16 w-16 text-[#082749] hidden" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">SM Planner</h1>
          <p className="text-lg text-cyan-200 font-semibold mb-6">Sacrament Meeting Planner</p>
          <p className="text-slate-200 text-sm leading-relaxed">
            A professional all-in-one platform for Latter-day Saint Ward and Branch leadership.
            Plan meetings, manage assignments, build bulletins, and coordinate activities — all in one secure platform.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3.5 text-left">
            {[
              { label: 'Monthly Planning', desc: 'Organize full month schedules' },
              { label: 'Weekly Agendas', desc: 'Prepare detailed meeting programs' },
              { label: 'Bulletin Builder', desc: 'Create professional bulletins' },
              { label: 'Smart Assignments', desc: 'Fair speaker rotation system' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-3.5">
                <p className="text-white font-bold text-xs">{f.label}</p>
                <p className="text-slate-200 text-[11px] mt-0.5 leading-snug">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo (enlarged) */}
          <div className="flex lg:hidden items-center gap-3.5 mb-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-200 p-2 overflow-hidden shrink-0">
              <img
                src="/sm_image.png"
                alt="SM Planner Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/logo.png')) {
                    target.src = '/logo.png';
                  } else {
                    target.style.display = 'none';
                    if (target.nextElementSibling) {
                      (target.nextElementSibling as HTMLElement).style.display = 'block';
                    }
                  }
                }}
              />
              <Church className="h-8 w-8 text-[#082749] hidden" />
            </div>
            <div>
              <p className="font-extrabold text-lg text-[#082749] tracking-tight leading-tight">SM Planner</p>
              <p className="text-xs text-slate-500 font-medium">Sacrament Meeting Planner</p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-[#082749] mb-1 tracking-tight">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-8">Sign in to your ward administration account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username or email"
                required
                autoComplete="username"
                className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#082749] focus:outline-none focus:ring-2 focus:ring-[#082749]/20 transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#082749] focus:outline-none focus:ring-2 focus:ring-[#082749]/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs font-medium text-red-600">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#082749] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#061e38] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-[#082749]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            SM Planner v1.0.0 · Secure Cloud Leadership Platform
          </p>
        </div>
      </div>
    </div>
  );
}
