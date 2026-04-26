import { useMemo, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { PlatformPageSkeleton } from '../components/shared/PlatformPageSkeleton'
import { useTenant } from '../hooks/useTenant'
import {
  exportTenantBundle,
  listPlatformTenantRows,
  setTenantPlan,
} from '../utils/platformData'
import { removeJSON, setGlobalJSON } from '../utils/storage'
import { TENANT_EXPORT_SEGMENTS } from '../utils/tenantExportKeys'

export default function PlatformTenants() {
  const { switchTenant } = useTenant()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [targetDelete, setTargetDelete] = useState(null)
  const [targetReset, setTargetReset] = useState(null)
  const [targetPlan, setTargetPlan] = useState(null)
  const [loading] = useState(false)
  const tenants = listPlatformTenantRows()
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return tenants.filter((tenant) => {
      const searchMatch =
        !needle ||
        tenant.tenantId.toLowerCase().includes(needle) ||
        tenant.businessName.toLowerCase().includes(needle)
      const planMatch = planFilter === 'all' || tenant.billingPlan === planFilter
      return searchMatch && planMatch
    })
  }, [tenants, search, planFilter])

  const plans = useMemo(() => {
    const unique = new Set(tenants.map((tenant) => tenant.billingPlan))
    return ['all', ...Array.from(unique)]
  }, [tenants])

  function wipeTenant(tenantId, hardDelete) {
    for (const seg of TENANT_EXPORT_SEGMENTS) removeJSON(tenantId, seg)
    if (hardDelete) {
      const next = tenants.filter((t) => t.tenantId !== tenantId).map((t) => ({
        tenantId: t.tenantId,
        businessName: t.businessName,
        createdAt: t.createdAt,
      }))
      setGlobalJSON('tenantRegistry', next)
      toast.success('Tenant deleted permanently.')
    } else {
      toast.success('Tenant data reset.')
    }
    setTargetDelete(null)
    setTargetReset(null)
    window.location.reload()
  }

  function handleExport(tenantId) {
    const data = exportTenantBundle(tenantId)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tenantId}-tenant-backup.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Tenant backup exported.')
  }

  function applyPlan(tenantId, planName) {
    setTenantPlan(tenantId, planName)
    setTargetPlan(null)
    toast.success(`Plan updated to ${planName}.`)
    window.location.reload()
  }

  function exportVisibleTenantsCsv() {
    const csv = [
      ['tenant_id', 'business_name', 'plan', 'orders', 'products', 'users', 'payments', 'payment_total', 'health_score'],
      ...filtered.map((tenant) => [
        tenant.tenantId,
        tenant.businessName,
        tenant.billingPlan,
        tenant.orders,
        tenant.products,
        tenant.users,
        tenant.payments,
        tenant.paymentTotal,
        tenant.healthScore,
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'platform-tenants-visible.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Visible tenants exported as CSV.')
  }

  if (loading) return <PlatformPageSkeleton blocks={4} />

  return (
    <div className="space-y-5">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <Building2 className="h-6 w-6 text-cyan-300" />
          Tenants
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Cross-workspace list for platform admin operations.
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4 md:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="tenant id or business"
            />
          </div>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</span>
          <select
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            {plans.map((plan) => (
              <option key={plan} value={plan}>
                {plan === 'all' ? 'All plans' : plan}
              </option>
            ))}
          </select>
        </label>
        <article className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible tenants</p>
          <p className="mt-1 text-xl font-bold text-white">{filtered.length}</p>
        </article>
        <div className="md:col-span-3">
          <Button type="button" variant="secondary" onClick={exportVisibleTenantsCsv}>
            Export visible as CSV
          </Button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-6 text-sm text-slate-400">
          No tenants match your current filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/50">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Business</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Scale</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((tenant) => (
                <tr key={tenant.tenantId}>
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    <Link to={`/platform/tenants/${tenant.tenantId}`} className="hover:text-cyan-300 hover:underline">
                      {tenant.businessName || 'Unnamed workspace'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{tenant.tenantId}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {tenant.orders} orders · {tenant.products} products · {tenant.users} users
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {tenant.payments} txns · KES {tenant.paymentTotal.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{tenant.billingPlan}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          switchTenant(tenant.tenantId)
                          navigate('/pos', { replace: true })
                          toast.success(`Switched to ${tenant.tenantId}`)
                        }}
                      >
                        Open
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => handleExport(tenant.tenantId)}>
                        Export
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setTargetPlan(tenant.tenantId)}>
                        Plan
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setTargetReset(tenant.tenantId)}>
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-red-600"
                        onClick={() => setTargetDelete(tenant.tenantId)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(targetReset)}
        title="Reset tenant data?"
        description="This clears all tenant segments but keeps the workspace in the registry."
        confirmLabel="Reset now"
        onConfirm={() => targetReset && wipeTenant(targetReset, false)}
        onOpenChange={(o) => !o && setTargetReset(null)}
      />
      <ConfirmDialog
        open={Boolean(targetDelete)}
        title="Delete tenant permanently?"
        description="This removes all tenant data and unregisters it from platform records."
        confirmLabel="Delete permanently"
        onConfirm={() => targetDelete && wipeTenant(targetDelete, true)}
        onOpenChange={(o) => !o && setTargetDelete(null)}
      />
      <ConfirmDialog
        open={Boolean(targetPlan)}
        title="Assign billing plan"
        description="Set this tenant to Pro plan? (Use Starter by resetting config manually.)"
        confirmLabel="Set Pro"
        onConfirm={() => targetPlan && applyPlan(targetPlan, 'Pro')}
        onOpenChange={(o) => !o && setTargetPlan(null)}
      />
    </div>
  )
}
