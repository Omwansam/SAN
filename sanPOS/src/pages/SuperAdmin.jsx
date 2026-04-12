import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { listRegisteredTenants } from '../utils/tenantRegistry'

export default function SuperAdmin() {
  const { can } = useAuth()
  const { switchTenant } = useTenant()
  const navigate = useNavigate()
  const tenants = useMemo(() => listRegisteredTenants(), [])

  if (!can('superadmin_panel')) return <Navigate to="/pos" replace />

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Super admin
      </h1>
      {tenants.length === 0 ? (
        <EmptyState title="No tenants registered" description="Complete onboarding to register workspaces." />
      ) : (
        <ul className="space-y-2">
          {tenants.map((t) => (
            <li
              key={t.tenantId}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="font-medium">{t.businessName}</p>
                <p className="font-mono text-xs text-gray-500">{t.tenantId}</p>
              </div>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
