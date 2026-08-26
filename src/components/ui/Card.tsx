import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className, onClick, hoverable }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[20px] border border-slate-200/80 bg-white shadow-sm overflow-hidden transition-all duration-200',
        hoverable && 'cursor-pointer stat-card-hover hover:border-blue-300',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between border-b border-slate-100/80 px-5 py-4', className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('border-t border-slate-100/80 px-5 py-3 flex items-center justify-end gap-2 bg-slate-50/50', className)}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  badge?: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  gradientBar?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  badge,
  subtext,
  trend,
  trendValue,
  color = 'bg-blue-500',
  gradientBar = 'from-blue-600 to-sky-400',
  onClick,
  className,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-sm stat-card-hover overflow-hidden',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Top Accent Gradient Bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', gradientBar)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm shrink-0', color)}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">{value}</p>
          </div>
        </div>

        {badge && (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 shrink-0">
            {badge}
          </span>
        )}
      </div>

      {(subtext || trendValue) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
          {subtext && <span className="truncate">{subtext}</span>}
          {trendValue && (
            <span
              className={cn(
                'inline-flex items-center font-medium ml-auto',
                trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-600'
              )}
            >
              {trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

