import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/shared/Button'
import {
  getPlatformFeatureFlags,
  setPlatformFeatureFlags,
  listPlatformTenantRows,
} from '../utils/platformData'

export default function PlatformSecurity() {
  const [flags, setFlags] = useState(getPlatformFeatureFlags())
  const tenants = listPlatformTenantRows()
  const riskyTenants = useMemo(
    () => tenants.filter((tenant) => tenant.users === 0 || tenant.orders === 0),
    [tenants],
  )

  function toggleFlag(key) {
    const next = { ...flags, [key]: !flags[key] }
    setFlags(next)
    setPlatformFeatureFlags(next)
    toast.success(`Updated ${key}`)
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <ShieldCheck className="h-6 w-6 text-cyan-300" />
          Security & flags
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Global controls for platform behavior and operational checks.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {Object.entries(flags).map(([key, value]) => (
          <article key={key} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-sm font-semibold text-white">{key}</p>
            <p className="mt-1 text-xs text-slate-400">
              {value ? 'Enabled' : 'Disabled'}
            </p>
            <Button type="button" variant="secondary" className="mt-3" onClick={() => toggleFlag(key)}>
              {value ? 'Disable' : 'Enable'}
            </Button>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Workspace risk checks
        </h2>
        {riskyTenants.length ? (
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {riskyTenants.map((item) => (
              <li key={item.tenantId} className="rounded-xl bg-amber-500/10 px-3 py-2 text-amber-100">
                {item.businessName} ({item.tenantId}) — users: {item.users}, orders: {item.orders}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">No risky workspace signals detected.</p>
        )}
      </section>
    </div>
  )
}
