import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'

export default function SettingsBilling() {
  const { tenantConfig, mergeTenantConfig } = useTenant()
  const { can } = useAuth()

  const patch = useCallback(
    (partial) => {
      mergeTenantConfig(partial)
      toast.success('Saved')
    },
    [mergeTenantConfig],
  )

  if (!tenantConfig) return null
  if (!can('settings')) return <Navigate to="/settings" replace />

  const b = tenantConfig.billing ?? {}

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Billing (simulated)
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Plan metadata is stored locally for UI demos. A real deployment would sync from your billing provider.
      </p>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <Input
          label="Plan name"
          value={b.planName ?? ''}
          onChange={(e) =>
            patch({ billing: { ...b, planName: e.target.value } })
          }
        />
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Subscription renews / expires
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            value={
              b.expiresAt
                ? format(new Date(b.expiresAt), 'yyyy-MM-dd')
                : ''
            }
            onChange={(e) => {
              const v = e.target.value
              patch({
                billing: {
                  ...b,
                  expiresAt: v ? new Date(v).toISOString() : null,
                },
              })
            }}
          />
        </label>
      </section>
    </div>
  )
}
