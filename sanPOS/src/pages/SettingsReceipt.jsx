import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import * as Switch from '@radix-ui/react-switch'
import { Button } from '../components/shared/Button'
import { Input } from '../components/shared/Input'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'

export default function SettingsReceipt() {
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

  const r = tenantConfig.receipt ?? {}

  function onLogoFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 400_000) {
      toast.error('Image too large (max ~400KB).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result ?? '')
      patch({ receipt: { ...r, logoDataUrl: data } })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Receipt
      </h1>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Logo</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Shown on printed receipts (PNG or JPEG, stored in this browser only).
        </p>
        {r.logoDataUrl ? (
          <img
            src={r.logoDataUrl}
            alt=""
            className="mx-auto max-h-24 object-contain"
          />
        ) : null}
        <input type="file" accept="image/*" onChange={onLogoFile} className="text-sm" />
        {r.logoDataUrl ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => patch({ receipt: { ...r, logoDataUrl: '' } })}
          >
            Remove logo
          </Button>
        ) : null}
      </section>
      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <Input
          label="Footer message"
          value={r.footerMessage ?? ''}
          onChange={(e) =>
            patch({
              receipt: { ...r, footerMessage: e.target.value },
              receiptFooter: e.target.value,
            })
          }
        />
        <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="text-sm">Show tax line</span>
          <Switch.Root
            checked={r.showTax !== false}
            onCheckedChange={(nv) => patch({ receipt: { ...r, showTax: nv } })}
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-[var(--brand)] dark:bg-gray-700"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
          </Switch.Root>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="text-sm">Show cashier name</span>
          <Switch.Root
            checked={r.showCashier !== false}
            onCheckedChange={(nv) => patch({ receipt: { ...r, showCashier: nv } })}
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-[var(--brand)] dark:bg-gray-700"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
          </Switch.Root>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800">
          <span className="text-sm">Show customer</span>
          <Switch.Root
            checked={r.showCustomer !== false}
            onCheckedChange={(nv) => patch({ receipt: { ...r, showCustomer: nv } })}
            className="h-6 w-11 rounded-full bg-gray-200 data-[state=checked]:bg-[var(--brand)] dark:bg-gray-700"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition data-[state=checked]:translate-x-5" />
          </Switch.Root>
        </div>
      </section>
    </div>
  )
}
