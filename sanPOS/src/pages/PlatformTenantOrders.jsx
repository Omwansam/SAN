import { Navigate, useParams } from 'react-router-dom'
import { getPlatformTenantById, getTenantOrders } from '../utils/platformData'

export default function PlatformTenantOrders() {
  const { tenantId } = useParams()
  const tenant = getPlatformTenantById(tenantId)
  if (!tenant) return <Navigate to="/platform/tenants" replace />
  const orders = getTenantOrders(tenantId)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">{tenant.businessName} · Orders output</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Orders" value={orders.length} />
        <Info label="Revenue" value={`KES ${orders.reduce((s, o) => s + Number(o?.total || 0), 0).toLocaleString()}`} />
        <Info label="Average ticket" value={`KES ${orders.length ? Math.round(orders.reduce((s, o) => s + Number(o?.total || 0), 0) / orders.length).toLocaleString() : 0}`} />
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </article>
  )
}
