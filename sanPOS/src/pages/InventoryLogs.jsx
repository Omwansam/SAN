import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import { EmptyState } from '../components/shared/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useBranch } from '../hooks/useBranch'
import { useTenant } from '../hooks/useTenant'
import { apiRequest } from '../utils/api'
import { getStockLogs } from '../utils/stockLog'

export default function InventoryLogs() {
  const { tenantId, tenantConfig } = useTenant()
  const { can, currentUser } = useAuth()
  const { activeBranchId } = useBranch()
  const [logs, setLogs] = useState([])

  useEffect(() => {
    if (!tenantId) return
    const token = currentUser?.token || null
    if (!token) {
      queueMicrotask(() => setLogs(getStockLogs(tenantId)))
      return
    }
    const workspace = `?workspace=${encodeURIComponent(tenantId)}`
    const branch = activeBranchId
      ? `&branchId=${encodeURIComponent(activeBranchId)}`
      : ''
    apiRequest(`/api/stock${workspace}${branch}`, { token })
      .then((res) => setLogs(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {
        queueMicrotask(() => setLogs(getStockLogs(tenantId)))
      })
  }, [tenantId, currentUser?.token, activeBranchId])

  const filtered = useMemo(
    () =>
      logs.filter(
        (l) => !l.branchId || !activeBranchId || l.branchId === activeBranchId,
      ),
    [logs, activeBranchId],
  )

  if (!tenantConfig?.modules?.inventory)
    return <Navigate to="/pos" replace />
  if (!can('inventory')) return <Navigate to="/pos" replace />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Stock movement log
      </h1>
      {filtered.length === 0 ? (
        <EmptyState title="No movements yet" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="p-3">When</th>
                <th className="p-3">Product</th>
                <th className="p-3">Δ</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Branch</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="p-3 text-gray-500">
                    {row.createdAt
                      ? format(new Date(row.createdAt), 'PPp')
                      : '—'}
                  </td>
                  <td className="p-3">{row.productName ?? row.productId ?? '—'}</td>
                  <td className="p-3 font-mono tabular-nums">{row.delta ?? '—'}</td>
                  <td className="p-3">{row.reason ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{row.branchId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
