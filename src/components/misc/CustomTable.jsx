import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export default function CustomTable({
  columns = [],
  data = [],
  isLoading = false,
  onRowClick,
  emptyState,
  skeletonRows = 6,
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground tracking-wide"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: skeletonRows }).map((_, row) => (
              <tr key={row} className="border-b last:border-0">
                {columns.map((col, col_i) => (
                  <td key={col_i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!data.length && emptyState) {
    return emptyState
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/30">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium text-muted-foreground tracking-wide',
                  col.headerClassName
                )}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, row) => (
            <tr
              key={item.id ?? row}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'border-b last:border-0 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-accent/30'
              )}
            >
              {columns.map((col, col_i) => (
                <td
                  key={col_i}
                  className={cn('px-4 py-3 text-sm', col.cellClassName)}
                  style={{ width: col.width }}
                >
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
