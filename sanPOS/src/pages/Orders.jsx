import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Badge } from '../components/shared/Badge'
import { formatCurrency } from '../utils/currency'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { useTenant } from '../hooks/useTenant'

export default function Orders() {
  const { tenantConfig } = useTenant()
  const { can } = useAuth()
  const { orders, refundOrder } = useOrders()
  const [q, setQ] = useState('')
  const [refundId, setRefundId] = useState(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return orders.filter((o) => {
      if (!s) return true
      return (
        o.id.toLowerCase().includes(s) ||
        String(o.customerId ?? '').includes(s) ||
        o.items.some((it) => it.name.toLowerCase().includes(s))
      )
    })
  }, [orders, q])

  if (!tenantConfig) return null
  if (!can('view_own_orders')) return <Navigate to="/pos" replace />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Orders
      </h1>
      <Input
        id="order-q"
        placeholder="Search orders…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search orders"
        className="mb-4 max-w-md"
      />
      {filtered.length === 0 ? (
        <EmptyState title="No orders" />
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="font-mono text-xs text-gray-500">{o.id}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {format(new Date(o.createdAt), 'PPpp')} ·{' '}
                  {o.items.length} line(s)
                </p>
                <Badge className="mt-1" variant={o.status === 'refunded' ? 'warning' : 'success'}>
                  {o.status}
                </Badge>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(o.total, tenantConfig)}</p>
                {can('refund') && o.status === 'completed' ? (
                  <button
                    type="button"
                    className="mt-2 text-sm font-medium text-red-600 hover:underline"
                    onClick={() => setRefundId(o.id)}
                    aria-label={`Refund order ${o.id}`}
                  >
                    Refund
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(refundId)}
        onOpenChange={(o) => !o && setRefundId(null)}
        title="Refund this order?"
        confirmLabel="Refund"
        danger
        onConfirm={() => {
          if (refundId) refundOrder(refundId)
          toast.success('Order marked refunded')
          setRefundId(null)
        }}
      />
    </div>
  )
}
