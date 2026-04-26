import {
  ArrowRight,
  BarChart3,
  Download,
  Layers3,
  Radio,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PlatformPageSkeleton } from '../components/shared/PlatformPageSkeleton'
import {
  buildAllTenantsExportPayload,
  getPlatformActivityFeed,
  getPlatformAlerts,
  getPlatformAnnouncements,
  getPlatformFeatureFlags,
  getPlatformOverview,
} from '../utils/platformData'

function StatTile({ icon: Icon, label, value, hint, accent = 'indigo' }) {
  const accents = {
    indigo: 'from-indigo-500/20 to-violet-500/10 border-indigo-500/30',
    cyan: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30',
    emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
  }
  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ${accents[accent] || accents.indigo}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{hint}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-indigo-300">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  )
}

export default function PlatformOverview() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const { totals, tenants } = getPlatformOverview()
  const flags = getPlatformFeatureFlags()
  const announcements = getPlatformAnnouncements()
  const alerts = getPlatformAlerts()
  const activity = getPlatformActivityFeed(10)
  const topTenant = useMemo(() => [...tenants].sort((a, b) => b.revenue - a.revenue)[0] || null, [tenants])
  const topByOrders = useMemo(() => [...tenants].sort((a, b) => b.orders - a.orders).slice(0, 5), [tenants])
  const revenueBars = useMemo(() => {
    const max = Math.max(1, ...tenants.map((t) => t.revenue))
    return tenants.slice(0, 8).map((t) => ({
      ...t,
      pct: Math.round((t.revenue / max) * 100),
    }))
  }, [tenants])

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 280)
    return () => clearTimeout(timer)
  }, [])

  function exportAll() {
    const payload = buildAllTenantsExportPayload()
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sanpos-platform-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Full platform export downloaded.')
  }

  if (loading) return <PlatformPageSkeleton blocks={6} />

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/40 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-cyan-200">
              <Radio className="h-3.5 w-3.5" />
              Live control plane
            </p>
            <h1 className="mt-4 flex flex-wrap items-center gap-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              <BarChart3 className="h-9 w-9 text-cyan-300" />
              Platform overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Cross-tenant intelligence for SaaS owners: revenue, health, modules, and operations in one
              surface. Connect to your backend when ready — today this reads local workspace data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/platform/tenants')}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100"
            >
              Tenant directory
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/platform/feature-flags')}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Feature flags
            </button>
            <button
              type="button"
              onClick={exportAll}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Export all data
            </button>
          </div>
        </div>

        {alerts.length > 0 ? (
          <div className="relative mt-6 space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  a.severity === 'critical'
                    ? 'border-red-500/40 bg-red-500/10 text-red-100'
                    : a.severity === 'warning'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-50'
                      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-50'
                }`}
              >
                <div>
                  <p className="text-sm font-bold">{a.title}</p>
                  <p className="text-xs opacity-90">{a.detail}</p>
                </div>
                {a.id === 'maint' ? (
                  <Link to="/platform/security" className="text-xs font-bold underline">
                    Open security
                  </Link>
                ) : a.id === 'tickets' ? (
                  <Link to="/platform/support" className="text-xs font-bold underline">
                    Open support
                  </Link>
                ) : (
                  <Link to="/platform/tenants" className="text-xs font-bold underline">
                    View tenants
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Layers3}
          label="Workspaces"
          value={totals.tenants}
          hint="Registered in this browser"
          accent="indigo"
        />
        <StatTile
          icon={Zap}
          label="Orders"
          value={totals.orders}
          hint="Across all tenants"
          accent="cyan"
        />
        <StatTile
          icon={Sparkles}
          label="Revenue"
          value={`KES ${Math.round(totals.revenue).toLocaleString()}`}
          hint="Sum of order totals"
          accent="emerald"
        />
        <StatTile
          icon={Shield}
          label="Flags on"
          value={Object.values(flags).filter(Boolean).length}
          hint={`of ${Object.keys(flags).length} platform toggles`}
          accent="amber"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Revenue by workspace</h2>
            <span className="text-xs text-slate-500">Top {revenueBars.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {revenueBars.length === 0 ? (
              <p className="text-sm text-slate-500">No tenants yet.</p>
            ) : (
              revenueBars.map((t) => (
                <div key={t.tenantId}>
                  <div className="mb-1 flex justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => navigate(`/platform/tenants/${t.tenantId}`)}
                      className="truncate text-left font-medium text-slate-200 hover:text-cyan-300"
                    >
                      {t.businessName}
                    </button>
                    <span className="shrink-0 font-mono text-slate-400">KES {t.revenue.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Workspace health</h2>
          <p className="mt-1 text-xs text-slate-500">Heuristic score from usage signals (local).</p>
          <ul className="mt-4 space-y-2">
            {tenants.slice(0, 6).map((t) => (
              <li key={t.tenantId} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                <button
                  type="button"
                  onClick={() => navigate(`/platform/tenants/${t.tenantId}`)}
                  className="truncate text-left text-sm font-medium text-slate-200 hover:text-cyan-300"
                >
                  {t.businessName}
                </button>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    t.healthScore >= 70
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : t.healthScore >= 40
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'bg-red-500/20 text-red-200'
                  }`}
                >
                  {t.healthScore}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            <Layers3 className="h-4 w-4 text-indigo-400" />
            Top workspace
          </h2>
          {topTenant ? (
            <div className="mt-4 space-y-2">
              <p className="text-lg font-bold text-white">{topTenant.businessName}</p>
              <p className="font-mono text-xs text-slate-500">{topTenant.tenantId}</p>
              <p className="text-sm text-slate-300">
                Orders {topTenant.orders} · Revenue KES {topTenant.revenue.toLocaleString()} · Health{' '}
                {topTenant.healthScore}
              </p>
              <button
                type="button"
                onClick={() => navigate(`/platform/tenants/${topTenant.tenantId}`)}
                className="mt-2 text-sm font-bold text-cyan-400 hover:underline"
              >
                Open tenant 360
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No tenant data yet.</p>
          )}
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Busiest workspaces</h2>
          <ol className="mt-4 space-y-2">
            {topByOrders.map((t, i) => (
              <li key={t.tenantId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <button type="button" className="truncate hover:text-cyan-300" onClick={() => navigate(`/platform/tenants/${t.tenantId}`)}>
                    {t.businessName}
                  </button>
                </span>
                <span className="shrink-0 font-mono text-xs text-slate-500">{t.orders} orders</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Role coverage</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li className="flex justify-between border-b border-white/5 py-1">
              <span>Cashiers</span>
              <span className="font-mono font-bold text-white">{totals.roleBreakdown.cashier}</span>
            </li>
            <li className="flex justify-between border-b border-white/5 py-1">
              <span>Managers</span>
              <span className="font-mono font-bold text-white">{totals.roleBreakdown.manager}</span>
            </li>
            <li className="flex justify-between border-b border-white/5 py-1">
              <span>Admins</span>
              <span className="font-mono font-bold text-white">{totals.roleBreakdown.admin}</span>
            </li>
            <li className="flex justify-between py-1">
              <span>Superadmins</span>
              <span className="font-mono font-bold text-white">{totals.roleBreakdown.superadmin}</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Activity feed</h2>
          {activity.length ? (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {activity.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-200">{item.message}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{new Date(item.at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No activity yet.</p>
          )}
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Recent broadcasts</h2>
          {announcements.length ? (
            <ul className="mt-4 space-y-2">
              {announcements.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-xl bg-indigo-500/10 px-3 py-2 text-sm text-indigo-100">
                  {item.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No broadcasts yet.</p>
          )}
          <Link to="/platform/broadcasts" className="mt-4 inline-block text-sm font-bold text-cyan-400 hover:underline">
            Manage broadcasts
          </Link>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">POS module coverage</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {['inventory', 'tables', 'appointments', 'kitchenDisplay', 'deliveries', 'multiRegister'].map((moduleKey) => {
            const enabledCount = tenants.filter((t) => Boolean(t.modules?.[moduleKey])).length
            const pct = totals.tenants ? Math.round((enabledCount / totals.tenants) * 100) : 0
            return (
              <div key={moduleKey} className="rounded-xl border border-white/5 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{moduleKey}</p>
                <p className="mt-1 text-lg font-black text-white">{pct}%</p>
                <p className="text-xs text-slate-500">
                  {enabledCount}/{totals.tenants} tenants
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/80 to-indigo-950/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Staff users" value={totals.users} />
        <Metric label="Customers" value={totals.customers} />
        <Metric label="Payment lines" value={totals.payments} />
        <Metric label="Payment volume" value={`KES ${Math.round(totals.paymentTotal).toLocaleString()}`} />
      </section>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  )
}
