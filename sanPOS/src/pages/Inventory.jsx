import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Badge } from '../components/shared/Badge'
import { useAuth } from '../hooks/useAuth'
import { useBranch } from '../hooks/useBranch'
import { useProducts } from '../hooks/useProducts'
import { useTenant } from '../hooks/useTenant'
import { appendStockLog } from '../utils/stockLog'

export default function Inventory() {
  const { tenantId, tenantConfig } = useTenant()
  const { activeBranchId } = useBranch()
  const { can } = useAuth()
  const { products, updateProduct } = useProducts()
  const [adj, setAdj] = useState({})
  const [reason, setReason] = useState({})
  const [threshold, setThreshold] = useState({})

  if (!tenantConfig?.modules?.inventory)
    return <Navigate to="/pos" replace />
  if (!can('inventory')) return <Navigate to="/pos" replace />

  function apply(id) {
    const pr = products.find((p) => p.id === id)
    if (!pr) return
    const delta = Number(adj[id]) || 0
    if (!delta) {
      toast.error('Enter adjustment')
      return
    }
    const r = String(reason[id] ?? '').trim() || 'Manual adjustment'
    const nextStock = Math.max(0, (pr.stock ?? 0) + delta)
    const thRaw = threshold[id]
    const patch = { ...pr, stock: nextStock }
    if (thRaw !== undefined && String(thRaw).trim() !== '') {
      patch.lowStockAlert = Number(thRaw)
    }
    updateProduct(patch)
    if (!tenantId) return
    appendStockLog(tenantId, {
      branchId: activeBranchId,
      productId: pr.id,
      productName: pr.name,
      delta,
      reason: r,
    })
    setAdj((a) => ({ ...a, [id]: '' }))
    setReason((a) => ({ ...a, [id]: '' }))
    toast.success('Stock updated')
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Inventory
        </h1>
        <Link
          to="/inventory/logs"
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          View stock log
        </Link>
      </div>
      {products.length === 0 ? (
        <EmptyState title="No products" />
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.name}</p>
                <Badge
                  variant={
                    (p.stock ?? 0) <= (p.lowStockAlert ?? p.lowStockThreshold ?? 0)
                      ? 'warning'
                      : 'default'
                  }
                  className="mt-1"
                >
                  Stock {p.stock ?? 0}
                </Badge>
              </div>
              <Input
                id={`th-${p.id}`}
                type="number"
                className="max-w-[100px]"
                label="Low alert"
                placeholder="qty"
                value={threshold[p.id] ?? p.lowStockAlert ?? ''}
                onChange={(e) =>
                  setThreshold((a) => ({ ...a, [p.id]: e.target.value }))
                }
                aria-label={`Low stock threshold ${p.name}`}
              />
              <Input
                id={`adj-${p.id}`}
                type="number"
                className="max-w-[120px]"
                label="Δ qty"
                placeholder="+/- qty"
                value={adj[p.id] ?? ''}
                onChange={(e) =>
                  setAdj((a) => ({ ...a, [p.id]: e.target.value }))
                }
                aria-label={`Adjust ${p.name}`}
              />
              <Input
                id={`rs-${p.id}`}
                className="min-w-[140px] max-w-[200px]"
                label="Reason"
                placeholder="Count, waste…"
                value={reason[p.id] ?? ''}
                onChange={(e) =>
                  setReason((a) => ({ ...a, [p.id]: e.target.value }))
                }
              />
              <Button type="button" variant="secondary" onClick={() => apply(p.id)}>
                Apply
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
