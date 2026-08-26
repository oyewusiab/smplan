import { useState } from 'react';
import { Menu, Bell, RefreshCw, Wifi, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import { UserProfileModal } from '../profile/UserProfileModal';
import type { SyncStatus } from '../../types';

const syncInfo: Record<SyncStatus, { icon: React.ReactNode; label: string; bg: string; text: string; dot: string; pulse?: boolean }> = {
  saved: { icon: <CheckCircle className="h-3.5 w-3.5" />, label: 'Synced', bg: 'bg-emerald-50 border-emerald-200/60', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  saving: { icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />, label: 'Saving…', bg: 'bg-blue-50 border-blue-200/60', text: 'text-blue-700', dot: 'bg-blue-500', pulse: true },
  pending: { icon: <Wifi className="h-3.5 w-3.5" />, label: 'Offline / Pending', bg: 'bg-amber-50 border-amber-200/60', text: 'text-amber-700', dot: 'bg-amber-500', pulse: true },
  failed: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Sync Failed', bg: 'bg-rose-50 border-rose-200/60', text: 'text-rose-700', dot: 'bg-rose-500' },
};

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggleSidebar, syncStatus, unreadNotifications } = useAppStore();
  const { session } = useAuthStore();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const sync = syncInfo[syncStatus] || syncInfo.saved;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 glass-header px-4 lg:px-6 shrink-0 select-none">
      {/* Mobile menu trigger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="Open Navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Page Title & Subtitle */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>

      {/* Cloud Sync Status Badge */}
      <div className={cn('hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-2xs', sync.bg, sync.text)}>
        <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', sync.dot, sync.pulse && 'animate-pulse-glow')} />
        <span className="shrink-0">{sync.icon}</span>
        <span className="truncate">{sync.label}</span>
      </div>

      {/* Page-level Action Buttons */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}

      {/* Notification Bell */}
      <button
        className="relative rounded-xl p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadNotifications > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white font-bold animate-pulse-glow">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      {/* User Avatar */}
      {session && (
        <div
          onClick={() => setShowProfileModal(true)}
          title={`Click to view profile (${session.preferred_name || session.name || 'User'})`}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 text-white text-xs font-bold shadow-xs shrink-0 select-none cursor-pointer hover:scale-105 transition-transform"
        >
          {(session.preferred_name || session.name || 'U')[0].toUpperCase()}
        </div>
      )}

      {/* User Profile & Security Modal */}
      <UserProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
}

