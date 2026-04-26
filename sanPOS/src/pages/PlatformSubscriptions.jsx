import { getPlatformSubscriptions } from '../utils/platformData'

export default function PlatformSubscriptions() {
  const rows = getPlatformSubscriptions()
  const statusMix = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1
    return acc
  }, {})

  function exportSubscriptionsCsv() {
    const csv = [
      ['tenant', 'plan', 'status', 'revenue', 'payment_total', 'expires_at'],
      ...rows.map((row) => [
        row.businessName,
        row.planName,
        row.status,
        row.revenue,
        row.paymentTotal,
        row.expiresAt || '',
      ]),
    ]
      .map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'platform-subscriptions.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <button
          type="button"
          onClick={exportSubscriptionsCsv}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
        >
          Export CSV
        </button>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {Object.entries(statusMix).map(([status, count]) => (
          <article key={status} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{status}</p>
            <p className="mt-1 text-xl font-bold text-white">{count}</p>
          </article>
        ))}
      </section>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/50">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.tenantId}>
                <td className="px-4 py-3 text-sm text-white">{row.businessName}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{row.planName}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{row.status}</td>
                <td className="px-4 py-3 text-xs text-slate-400">KES {row.revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
