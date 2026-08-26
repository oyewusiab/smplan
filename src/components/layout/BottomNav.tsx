import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, ClipboardList, BookOpen, Menu } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../utils/cn';

interface BottomNavItem {
  label: string;
  to?: string;
  icon: React.ReactNode;
  isAction?: boolean;
  action?: () => void;
}

export function BottomNav() {
  const { toggleSidebar } = useAppStore();

  const navItems: BottomNavItem[] = [
    { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Calendar', to: '/calendar', icon: <CalendarDays className="h-5 w-5" /> },
    { label: 'Planners', to: '/planners', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Agendas', to: '/agendas', icon: <BookOpen className="h-5 w-5" /> },
    { label: 'More', icon: <Menu className="h-5 w-5" />, isAction: true, action: toggleSidebar },
  ];

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-30 lg:hidden select-none no-print">
      <div className="mx-auto max-w-md rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xl px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item, idx) => {
          if (item.isAction) {
            return (
              <button
                key={idx}
                onClick={item.action}
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl text-slate-500 hover:text-slate-900 active:scale-95 transition-all"
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to!}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all active:scale-95',
                  isActive
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-lg p-0.5 transition-colors',
                      isActive && 'bg-blue-50 text-blue-600'
                    )}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
