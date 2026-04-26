import { Link, Navigate, useParams } from 'react-router-dom'
import { getPlatformTenantById } from '../utils/platformData'

export default function PlatformTenantDetail() {
  const { tenantId } = useParams()
  const tenant = getPlatformTenantById(tenantId)
  if (!tenant) return <Navigate to="/platform/tenants" replace />

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="font-mono text-xs text-slate-500">{tenant.tenantId}</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{tenant.businessName}</h1>
        <p className="mt-1 text-sm text-slate-400">
          Plan: {tenant.subscription.planName} · Status: {tenant.subscription.status} · Health{' '}
          <span className="font-mono font-semibold text-cyan-300">{tenant.healthScore}</span>
          /100
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={tenant.users} />
        <Stat label="Orders" value={tenant.orders} />
        <Stat label="Payments" value={tenant.payments} />
        <Stat label="Revenue" value={`KES ${tenant.revenue.toLocaleString()}`} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Tenant 360</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuickLink to={`/platform/tenants/${tenant.tenantId}/users`} label="Users & roles" />
          <QuickLink to={`/platform/tenants/${tenant.tenantId}/orders`} label="Orders output" />
          <QuickLink to={`/platform/tenants/${tenant.tenantId}/payments`} label="Payments output" />
          <QuickLink to={`/platform/tenants/${tenant.tenantId}/design`} label="Design output" />
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </article>
  )
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10">
      {label}
    </Link>
  )
}
