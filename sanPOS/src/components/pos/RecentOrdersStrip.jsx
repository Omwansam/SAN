import { format } from 'date-fns'
import { ChevronRight, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/currency'
import { useOrders } from '../../hooks/useOrders'
import { useTenant } from '../../hooks/useTenant'

/** Bottom strip inspired by table / ticket rails in restaurant POS shells. */
export function RecentOrdersStrip() {
  const { orders } = useOrders()
  const { tenantConfig } = useTenant()
  const recent = orders.slice(0, 6)

  return (
    <div className="shrink-0 rounded-2xl border border-gray-200/80 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/90">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <Receipt className="h-3.5 w-3.5 text-[var(--brand)]" aria-hidden />
          Recent tickets
        </div>
        <Link
          to="/pos/orders"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--brand)] hover:underline"
        >
          All orders
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          Completed sales will appear here for quick reference.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map((o) => (
            <div
              key={o.id}
              className="flex min-w-[9.5rem] shrink-0 flex-col rounded-xl border border-gray-100 bg-gray-50/90 px-2.5 py-2 dark:border-gray-700 dark:bg-gray-800/80"
            >
              <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                {String(o.id).slice(0, 8)}…
              </span>
              <span className="text-sm font-bold tabular-nums text-[var(--brand)]">
                {formatCurrency(o.total ?? 0, tenantConfig)}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {o.createdAt
                  ? format(new Date(o.createdAt), 'HH:mm')
                  : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
