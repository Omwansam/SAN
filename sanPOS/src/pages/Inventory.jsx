import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Input } from '../components/shared/Input'
import { Badge } from '../components/shared/Badge'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { useTenant } from '../hooks/useTenant'

export default function Inventory() {
  const { tenantConfig } = useTenant()
  const { can } = useAuth()
  const { products, updateProduct } = useProducts()
  const [adj, setAdj] = useState({})

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
    updateProduct({
      ...pr,
      stock: Math.max(0, (pr.stock ?? 0) + delta),
    })
    setAdj((a) => ({ ...a, [id]: '' }))
    toast.success('Stock updated')
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Inventory
      </h1>
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
                    (p.stock ?? 0) <= (p.lowStockAlert ?? 0) ? 'warning' : 'default'
                  }
                  className="mt-1"
                >
                  Stock {p.stock ?? 0}
                </Badge>
              </div>
              <Input
                id={`adj-${p.id}`}
                type="number"
                className="max-w-[120px]"
                placeholder="+/- qty"
                value={adj[p.id] ?? ''}
                onChange={(e) =>
                  setAdj((a) => ({ ...a, [p.id]: e.target.value }))
                }
                aria-label={`Adjust ${p.name}`}
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
