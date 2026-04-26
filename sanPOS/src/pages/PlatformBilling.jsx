import { useMemo } from 'react'
import { CreditCard } from 'lucide-react'
import { listPlatformTenantRows } from '../utils/platformData'

function currency(n) {
  return `KES ${Number(n || 0).toLocaleString()}`
}

export default function PlatformBilling() {
  const tenants = listPlatformTenantRows()
  const grouped = useMemo(() => {
    return tenants.reduce((acc, row) => {
      const key = row.billingPlan || 'Starter'
      if (!acc[key]) acc[key] = []
      acc[key].push(row)
      return acc
    }, {})
  }, [tenants])
  const totalTenants = tenants.length || 1

  return (
    <div className="space-y-4">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-bold text-white">
          <CreditCard className="h-6 w-6 text-cyan-300" />
          Billing plans
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Revenue and tenant distribution by subscription plan.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(grouped).map(([plan, rows]) => {
          const totalRevenue = rows.reduce((sum, item) => sum + item.revenue, 0)
          const totalOrders = rows.reduce((sum, item) => sum + item.orders, 0)
          const totalPayments = rows.reduce((sum, item) => sum + item.paymentTotal, 0)
          return (
            <article key={plan} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{plan}</h2>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                  {rows.length} tenants
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {totalOrders} orders · {currency(totalRevenue)} revenue
              </p>
              <p className="text-sm text-slate-300">
                {currency(totalPayments)} payment capture
              </p>
              <ul className="mt-3 space-y-1 text-sm text-slate-400">
                {rows.slice(0, 5).map((item) => (
                  <li key={item.tenantId}>
                    {item.businessName} ({item.tenantId})
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Plan penetration</p>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                    style={{ width: `${Math.round((rows.length / totalTenants) * 100)}%` }}
                  />
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
