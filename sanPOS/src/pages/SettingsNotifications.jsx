import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useTenant } from '../hooks/useTenant'
import { format } from 'date-fns'

export default function SettingsNotifications() {
  const { tenantConfig } = useTenant()
  const { can } = useAuth()
  const { notifications, dismissNotification, clearNotifications } =
    useNotifications()

  if (!tenantConfig) return null
  if (!can('pos')) return <Navigate to="/pos" replace />

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Notifications
        </h1>
        {notifications.length > 0 ? (
          <Button type="button" variant="secondary" onClick={clearNotifications}>
            Clear all
          </Button>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {n.title}
                </p>
                {n.message ? (
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{n.message}</p>
                ) : null}
                <p className="mt-2 text-xs text-gray-400">
                  {n.createdAt
                    ? format(new Date(n.createdAt), 'PPpp')
                    : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="!shrink-0 !px-2 !py-1 text-xs"
                onClick={() => dismissNotification(n.id)}
              >
                Dismiss
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
