import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import {
  LayoutDashboard, CalendarDays, ClipboardList, BookOpen, Users,
  UserCheck, Music, CheckSquare, ListTodo, Bell, Clock, Settings,
  ShieldCheck, ScrollText, LogOut, ChevronDown, ChevronRight,
  FileText, X, Church, Archive
} from 'lucide-react';
import { useState } from 'react';
import { Badge, RoleBadge } from '../ui/Badge';
import { UserProfileModal } from '../profile/UserProfileModal';
import { formatMemberTitle } from '../../utils/memberTitles';

interface NavItemDef {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
}

interface NavGroupDef {
  group: string;
  items: NavItemDef[];
}

const navGroups: NavGroupDef[] = [
  {
    group: 'Main',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY', 'MUSIC'] },
      { label: 'Calendar', to: '/calendar', icon: <CalendarDays className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
    ],
  },
  {
    group: 'Planning',
    items: [
      { label: 'Planner', to: '/planners', icon: <ClipboardList className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
      { label: 'Agenda', to: '/agendas', icon: <BookOpen className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
      { label: 'Bulletin', to: '/bulletins', icon: <FileText className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
      { label: 'Assignment', to: '/assignments', icon: <UserCheck className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
    ],
  },
  {
    group: 'Ward Admin',
    items: [
      { label: 'Members', to: '/members', icon: <Users className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK'] },
      { label: 'Music Workspace', to: '/music', icon: <Music className="h-4 w-4" />, roles: ['ADMIN', 'MUSIC'] },
      { label: 'Checklists', to: '/checklists', icon: <CheckSquare className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
      { label: 'To-Dos', to: '/todos', icon: <ListTodo className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
    ],
  },
  {
    group: 'Communication',
    items: [
      { label: 'Notifications', to: '/notifications', icon: <Bell className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY', 'MUSIC'] },
      { label: 'Reminders', to: '/reminders', icon: <Clock className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC', 'CLERK', 'SECRETARY'] },
    ],
  },
  {
    group: 'Administration',
    items: [
      { label: 'Approval Requests', to: '/approvals', icon: <ShieldCheck className="h-4 w-4" />, roles: ['ADMIN', 'BISHOPRIC'] },
      { label: 'User Management', to: '/users', icon: <Users className="h-4 w-4" />, roles: ['ADMIN'] },
      { label: 'Audit Logs', to: '/audit', icon: <ScrollText className="h-4 w-4" />, roles: ['ADMIN', 'CLERK'] },
      { label: 'Archive', to: '/archive', icon: <Archive className="h-4 w-4" />, roles: ['ADMIN', 'CLERK'] },
      { label: 'Settings', to: '/settings', icon: <Settings className="h-4 w-4" />, roles: ['ADMIN', 'CLERK'] },
    ],
  },
];

function NavGroup({ group, items }: NavGroupDef) {
  const { session } = useAuthStore();
  const { toggleSidebar, sidebarOpen } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  void location;

  const visibleItems = items.filter((item) => {
    if (!item.roles) return true;
    if (!session) return false;
    if (session.role === 'ADMIN') return true;
    return item.roles.includes(session.role);
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className="mb-2.5">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span>{group}</span>
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {!collapsed && (
        <div className="space-y-1 mt-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (sidebarOpen && window.innerWidth < 1024) {
                  toggleSidebar();
                }
              }}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 select-none',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25 font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-rose-500 text-[11px] text-white font-bold shadow-xs">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { session, clearSession } = useAuthStore();
  const { sidebarOpen, toggleSidebar, unreadNotifications, syncStatus } = useAppStore();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = () => {
    clearSession();
    window.location.href = '/login';
  };

  const unitName = session?.organisation || 'Obantoko Ward';

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-gradient-to-b from-[#1e293b] via-[#162032] to-[#0f172a] text-white border-r border-slate-800 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto shrink-0'
        )}
      >
        {/* Top Logo & App Title Bar */}
        <div className="flex items-center justify-between gap-2.5 border-b border-slate-800/80 px-4 py-3.5 shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-3 min-w-0">
            {/* White Logo Container */}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-md shadow-slate-950/30 shrink-0 overflow-hidden">
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
              <Church className="h-7 w-7 text-blue-800 stroke-[1.75] hidden" />
            </div>
            {/* 3-line Stacked Title */}
            <div className="flex flex-col leading-none">
              <span className="text-[11px] font-black tracking-wider text-white uppercase">SACRAMENT</span>
              <span className="text-[12px] font-bold text-slate-200 leading-tight">Meeting</span>
              <span className="text-[11px] font-bold text-cyan-400 tracking-wide">Planner</span>
            </div>
          </div>

          {/* Top Right Notification Bell / Mobile Close */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate('/notifications')}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-black text-slate-950 shadow-xs">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
            <button
              onClick={toggleSidebar}
              className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Ward / Unit Status Card */}
        <div className="mx-3.5 my-3 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 shadow-inner">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white tracking-tight truncate">{unitName}</p>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">Ward · Active</p>
          </div>
        </div>

        {/* Navigation Section Title */}
        <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          NAVIGATION
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {navGroups.map((g) => (
            <NavGroup key={g.group} {...g} />
          ))}
        </nav>

        {/* User Profile Card Footer */}
        {session && (
          <div className="border-t border-slate-800/80 p-3 shrink-0 bg-slate-900/50">
            <div
              onClick={() => setShowProfileModal(true)}
              title="Click to view and edit your profile and security settings"
              className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-2.5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group select-none"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 text-white text-xs font-bold shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                {(session.preferred_name || session.name || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                  {formatMemberTitle(session.preferred_name || session.name, session.gender, session.calling, session.role)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <RoleBadge role={session.role} label={session.role === 'ADMIN' ? 'Bishop' : undefined} />
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                title="Sign out"
                className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* User Profile & Security Modal */}
      <UserProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
}
