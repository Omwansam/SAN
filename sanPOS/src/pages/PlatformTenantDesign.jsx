import { Navigate, useParams } from 'react-router-dom'
import { getPlatformTenantById } from '../utils/platformData'

export default function PlatformTenantDesign() {
  const { tenantId } = useParams()
  const tenant = getPlatformTenantById(tenantId)
  if (!tenant) return <Navigate to="/platform/tenants" replace />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{tenant.businessName} · Design output</h1>
      <section className="grid gap-3 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary brand color</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-block h-8 w-8 rounded-lg border border-white/10" style={{ backgroundColor: tenant.primaryColor }} />
            <p className="font-mono text-sm text-slate-200">{tenant.primaryColor}</p>
          </div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Module profile</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {Object.entries(tenant.modules || {}).map(([key, enabled]) => (
              <li key={key}>
                {key}: {enabled ? 'enabled' : 'disabled'}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}
