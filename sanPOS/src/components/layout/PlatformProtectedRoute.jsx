import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function PlatformProtectedRoute() {
  const location = useLocation()
  const { isAuthenticated, can } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!can('superadmin_panel')) {
    return <Navigate to="/pos" replace />
  }
  return <Outlet />
}
