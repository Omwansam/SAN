import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const { tenantConfig } = useTenant()
  const loc = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  const needsBusinessType = Boolean(tenantConfig && tenantConfig.businessTypeConfirmed === false)
  if (needsBusinessType && loc.pathname !== '/business-type') {
    return <Navigate to="/business-type" replace />
  }
  if (!needsBusinessType && loc.pathname === '/business-type') {
    return <Navigate to="/pos" replace />
  }
  return <Outlet />
}
