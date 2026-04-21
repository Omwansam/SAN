import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, Navigate } from 'react-router-dom'
import * as Switch from '@radix-ui/react-switch'
import { Button } from '../components/shared/Button'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useCustomers } from '../hooks/useCustomers'
import { useOrders } from '../hooks/useOrders'
import { useProducts } from '../hooks/useProducts'
import { useTenant } from '../hooks/useTenant'
import { seedTenant } from '../utils/seedTenant'

export default function Settings() {
  const { tenantId, tenantConfig, mergeTenantConfig } = useTenant()
  const { can } = useAuth()
  const { reloadFromStorage: reloadProducts } = useProducts()
  const { reloadFromStorage: reloadOrders } = useOrders()
  const { reloadFromStorage: reloadCustomers } = useCustomers()
  const [dangerOpen, setDangerOpen] = useState(false)

  const patch = useCallback(
    (partial) => {
      mergeTenantConfig(partial)
      toast.success('Saved')
    },
    [mergeTenantConfig],
  )

  if (!tenantConfig) return null
  if (!can('settings')) return <Navigate to="/pos" replace />

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Settings
      </h1>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Branding</h2>
        <Input
          label="Business name"
          value={tenantConfig.businessName}
          onChange={(e) => patch({ businessName: e.target.value })}
        />
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Primary color
          <input
            type="color"
            className="mt-1 h-10 w-24 cursor-pointer rounded border-0"
            value={tenantConfig.primaryColor}
            onChange={(e) => patch({ primaryColor: e.target.value })}
            aria-label="Primary color"
          />
        </label>
        <Input
          label="Receipt footer"
          value={tenantConfig.receiptFooter ?? ''}
          onChange={(e) => patch({ receiptFooter: e.target.value })}
        />
      </section>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Tax</h2>
        <Input
          label="Tax rate %"
          type="number"
          value={tenantConfig.taxRate}
          onChange={(e) => patch({ taxRate: Number(e.target.value) })}
        />
        <Input
          label="Tax label"
          value={tenantConfig.taxLabel}
          onChange={(e) => patch({ taxLabel: e.target.value })}
        />
      </section>
      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Modules</h2>
        {Object.entries(tenantConfig.modules).map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800"
          >
            <span className="text-sm capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
            <Switch.Root
              checked={v}
              onCheckedChange={(nv) =>
                patch({ modules: { ...tenantConfig.modules, [k]: nv } })
              }
              className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-[var(--brand)] dark:bg-gray-700"
              aria-label={`Toggle ${k}`}
            >
              <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>
        ))}
      </section>
      {tenantConfig.modules?.kitchenDisplay ? (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-semibold">Kitchen stations</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            KDS filters and ticket routing use these IDs. Assign products to a station in
            Products.
          </p>
          <div className="space-y-3">
            {(tenantConfig.kitchenStations ?? []).map((st, idx) => (
              <div
                key={st.id}
                className="grid gap-2 rounded-xl border border-gray-100 p-3 dark:border-gray-800 sm:grid-cols-2"
              >
                <Input
                  label="Station ID"
                  value={st.id}
                  disabled
                  className="opacity-80"
                />
                <Input
                  label="Display name"
                  value={st.name}
                  onChange={(e) => {
                    const next = [...(tenantConfig.kitchenStations ?? [])]
                    next[idx] = { ...st, name: e.target.value }
                    patch({ kitchenStations: next })
                  }}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <section className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Workspace</h2>
        <ul className="flex flex-col gap-2 text-sm font-medium text-[var(--brand)]">
          <li>
            <Link to="/settings/branches" className="hover:underline">
              Branches &amp; staff access
            </Link>
          </li>
          <li>
            <Link to="/settings/receipt" className="hover:underline">
              Receipt layout
            </Link>
          </li>
          <li>
            <Link to="/settings/backup" className="hover:underline">
              Backup &amp; restore
            </Link>
          </li>
          <li>
            <Link to="/settings/billing" className="hover:underline">
              Billing (simulated)
            </Link>
          </li>
          <li>
            <Link to="/settings/notifications" className="hover:underline">
              Notification history
            </Link>
          </li>
        </ul>
      </section>
      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900 dark:bg-red-950/20">
        <h2 className="font-semibold text-red-800 dark:text-red-200">Danger zone</h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          Load demo catalogue, users (password demo123), and sample orders. Replaces
          demo orders.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 border-red-300 text-red-800"
          onClick={() => setDangerOpen(true)}
        >
          Load demo data
        </Button>
      </section>
      <ConfirmDialog
        open={dangerOpen}
        onOpenChange={setDangerOpen}
        title="Load demo data?"
        description="This will replace seeded orders and catalogue data."
        confirmLabel="Load demo"
        danger
        onConfirm={async () => {
          if (!tenantId) return
          await seedTenant(tenantId, tenantConfig.businessType)
          reloadProducts()
          reloadOrders()
          reloadCustomers()
          toast.success('Demo data loaded')
        }}
      />
    </div>
  )
}
