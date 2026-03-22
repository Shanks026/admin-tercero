import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * KpiCard — reusable metric card for dashboards and summary rows.
 *
 * Props:
 *   title      {string}         — label shown above the value (uppercased automatically)
 *   value      {string|number}  — primary metric to display
 *   sub        {string}         — optional secondary line below the value
 *   icon       {ReactNode}      — optional icon rendered top-right
 *   valueClass {string}         — extra classes to override value color/style
 *   className  {string}         — extra classes on the Card root
 */
export function KpiCard({ title, value, sub, icon, iconBg, valueClass, className }) {
  return (
    <Card
      className={cn(
        'rounded-2xl border-none bg-card/50 shadow-sm ring-1 ring-border/50 dark:bg-card/20',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {icon && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', iconBg ?? 'bg-muted/80')}>
            {icon}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tracking-tight', valueClass)}>
          {value}
        </div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        )}
      </CardContent>
    </Card>
  )
}
