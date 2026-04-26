import { Navigate, useParams } from 'react-router-dom'
import { getPlatformTenantById, getTenantPayments } from '../utils/platformData'

export default function PlatformTenantPayments() {
  const { tenantId } = useParams()
  const tenant = getPlatformTenantById(tenantId)
  if (!tenant) return <Navigate to="/platform/tenants" replace />
  const payments = getTenantPayments(tenantId)
  const byMethod = payments.reduce((acc, p) => {
    const m = String(p?.method || 'unknown').toLowerCase()
    acc[m] = (acc[m] || 0) + Number(p?.amount || 0)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{tenant.businessName} · Payments output</h1>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(byMethod).map(([method, amount]) => (
          <article key={method} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{method}</p>
            <p className="mt-1 text-lg font-bold text-white">KES {Number(amount).toLocaleString()}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
