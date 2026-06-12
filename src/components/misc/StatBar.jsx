import { cn } from '@/lib/utils'

/**
 * StatBar — a row of connected metric blocks inside a single bordered container,
 * cells divided by vertical rules. Use for page-level summary metrics.
 *
 *   <StatBar>
 *     <StatCell label="Total" value={42} icon={<Users />} iconBg="bg-blue-100" />
 *     <StatCell label="Churn Risk" value={3} valueClass="text-rose-600" />
 *   </StatBar>
 */
export function StatBar({ children, className }) {
  return (
    <div className={cn('rounded-xl border flex flex-wrap divide-x divide-border', className)}>
      {children}
    </div>
  )
}

export function StatCell({ label, value, valueClass, sub, icon, iconBg }) {
  return (
    <div className="flex-1 min-w-35 px-5 py-3.5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
        <p className={cn('text-2xl font-bold tracking-tight', valueClass)}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
      {icon && (
        <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', iconBg ?? 'bg-muted/80')}>
          {icon}
        </span>
      )}
    </div>
  )
}
