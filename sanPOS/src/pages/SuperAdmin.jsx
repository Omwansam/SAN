import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { EmptyState } from '../components/shared/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { TENANT_EXPORT_SEGMENTS } from '../utils/tenantExportKeys'
import { getGlobalJSON, getJSON, removeJSON, setGlobalJSON } from '../utils/storage'
import { listRegisteredTenants } from '../utils/tenantRegistry'

function tenantStats(tenantId) {
  const orders = getJSON(tenantId, 'orders', [])
  const products = getJSON(tenantId, 'products', [])
  const orderCount = Array.isArray(orders) ? orders.length : 0
  const productCount = Array.isArray(products) ? products.length : 0
  return { orderCount, productCount }
}

export default function SuperAdmin() {
  const { can } = useAuth()
  const { switchTenant } = useTenant()
  const navigate = useNavigate()
  const tenants = useMemo(() => listRegisteredTenants(), [])
  const [resetId, setResetId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  if (!can('superadmin_panel')) return <Navigate to="/pos" replace />

  function wipeTenant(tenantId, removeRegistry) {
    for (const seg of TENANT_EXPORT_SEGMENTS) {
      try {
        removeJSON(tenantId, seg)
      } catch {
        /* ignore */
      }
    }
    if (removeRegistry) {
      const list = getGlobalJSON('tenantRegistry', []).filter(
        (x) => x.tenantId !== tenantId,
      )
      setGlobalJSON('tenantRegistry', list)
    }
    toast.success(removeRegistry ? 'Tenant deleted' : 'Tenant data reset')
    setResetId(null)
    setDeleteId(null)
    window.location.reload()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Super admin
      </h1>
      {tenants.length === 0 ? (
        <EmptyState title="No tenants registered" description="Complete onboarding to register workspaces." />
      ) : (
        <ul className="space-y-2">
          {tenants.map((t) => {
            const st = tenantStats(t.tenantId)
            return (
              <li
                key={t.tenantId}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{t.businessName}</p>
                  <p className="font-mono text-xs text-gray-500">{t.tenantId}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {st.productCount} products · {st.orderCount} orders (local)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      switchTenant(t.tenantId)
                      toast.success(`Switched to ${t.tenantId}`)
                      navigate('/pos', { replace: true })
                    }}
                    aria-label={`Open workspace ${t.tenantId}`}
                  >
                    Open
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setResetId(t.tenantId)}>
                    Reset data
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-red-600"
                    onClick={() => setDeleteId(t.tenantId)}
                  >
                    Delete tenant
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(resetId)}
        title="Reset tenant data?"
        description="Removes products, orders, users, and all segments for this workspace slug. The workspace entry stays in the registry."
        confirmLabel="Reset"
        onConfirm={() => resetId && wipeTenant(resetId, false)}
        onOpenChange={(o) => !o && setResetId(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete tenant?"
        description="Removes all stored segments and unregisters this workspace. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deleteId && wipeTenant(deleteId, true)}
        onOpenChange={(o) => !o && setDeleteId(null)}
      />
    </div>
  )
}
