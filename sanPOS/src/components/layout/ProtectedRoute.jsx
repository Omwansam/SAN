import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'

export function ProtectedRoute() {
  const { isAuthenticated, role } = useAuth()
  const { tenantId, tenantConfig } = useTenant()
  const loc = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  if (role === 'superadmin') {
    return <Navigate to="/platform" replace />
  }
  if (tenantId && !tenantConfig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-950">
        <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Preparing setup...
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Loading your workspace configuration.
          </p>
        </section>
      </main>
    )
  }
  const needsBusinessType = Boolean(tenantConfig && tenantConfig.businessTypeConfirmed === false)
  if (needsBusinessType && loc.pathname !== '/business-type') {
    return <Navigate to="/business-type" replace />
  }
  if (tenantConfig && !needsBusinessType && loc.pathname === '/business-type') {
    return <Navigate to="/pos" replace />
  }
  return <Outlet />
}
