import { cn } from '../../utils/cn';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'sky' | 'rose' | 'amber' | 'emerald';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border border-slate-200/60',
  success: 'bg-emerald-100/90 text-emerald-700 border border-emerald-200/60',
  emerald: 'bg-emerald-100/90 text-emerald-700 border border-emerald-200/60',
  warning: 'bg-amber-100/90 text-amber-700 border border-amber-200/60',
  amber: 'bg-amber-100/90 text-amber-700 border border-amber-200/60',
  danger: 'bg-rose-100/90 text-rose-700 border border-rose-200/60',
  rose: 'bg-rose-100/90 text-rose-700 border border-rose-200/60',
  info: 'bg-sky-100/90 text-sky-700 border border-sky-200/60',
  sky: 'bg-sky-100/90 text-sky-700 border border-sky-200/60',
  outline: 'border border-slate-300 text-slate-600 bg-white/50',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-500',
  success: 'bg-emerald-500',
  emerald: 'bg-emerald-500',
  warning: 'bg-amber-500',
  amber: 'bg-amber-500',
  danger: 'bg-rose-500',
  rose: 'bg-rose-500',
  info: 'bg-sky-500',
  sky: 'bg-sky-500',
  outline: 'bg-slate-400',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ children, variant = 'default', dot = false, pulse = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight shadow-2xs select-none',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            dotColors[variant],
            pulse && 'animate-pulse-glow'
          )}
        />
      )}
      {children}
    </span>
  );
}

export function RoleBadge({ role, label }: { role: string; label?: string }) {
  const map: Record<string, { variant: BadgeVariant; display: string }> = {
    ADMIN: { variant: 'info', display: 'Bishop' },
    BISHOPRIC: { variant: 'info', display: 'Bishopric' },
    CLERK: { variant: 'success', display: 'Ward Clerk' },
    SECRETARY: { variant: 'warning', display: 'Executive Secretary' },
    MUSIC: { variant: 'sky', display: 'Music Leader' },
  };
  const config = map[role] || { variant: 'default', display: role };
  return <Badge variant={config.variant}>{label || config.display}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; dot?: boolean; pulse?: boolean }> = {
    // Complete / Active (Emerald)
    APPROVED: { variant: 'success', dot: true },
    CONFIRMED: { variant: 'success', dot: true },
    COMPLETED: { variant: 'success' },
    ACTIVE: { variant: 'success', dot: true },
    DONE: { variant: 'success' },
    SENT: { variant: 'success' },

    // Pending / Doing (Amber)
    PENDING: { variant: 'warning', dot: true, pulse: true },
    DRAFT: { variant: 'warning' },
    IN_PROGRESS: { variant: 'warning', dot: true, pulse: true },
    OPEN: { variant: 'warning' },

    // Will Do / Plan (Sky)
    SUBMITTED: { variant: 'info', dot: true },
    PLANNED: { variant: 'info' },
    SCHEDULED: { variant: 'info' },
    VISITOR: { variant: 'info' },

    // Conflict / Less-Active (Rose)
    REJECTED: { variant: 'danger' },
    CONFLICT: { variant: 'danger', dot: true, pulse: true },
    CANCELLED: { variant: 'danger' },
    FAILED: { variant: 'danger' },
    LESS_ACTIVE: { variant: 'danger' },
    ARCHIVED: { variant: 'outline' },
    MOVED: { variant: 'outline' },
  };

  const config = map[status] || { variant: 'default' };
  return (
    <Badge variant={config.variant} dot={config.dot} pulse={config.pulse}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

