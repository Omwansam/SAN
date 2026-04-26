import { getPlatformInvoices } from '../utils/platformData'

export default function PlatformInvoices() {
  const rows = getPlatformInvoices()
  const methodTotals = rows.reduce((acc, row) => {
    const m = String(row.method || 'unknown').toLowerCase()
    acc[m] = (acc[m] || 0) + row.amount
    return acc
  }, {})
  const maxMethod = Math.max(1, ...Object.values(methodTotals))

  function exportInvoicesCsv() {
    const rowsCsv = [
      ['invoice_id', 'tenant', 'method', 'amount', 'status', 'reference', 'created_at'],
      ...rows.map((row) => [
        row.id,
        row.businessName,
        row.method,
        row.amount,
        row.status,
        row.reference || '',
        row.createdAt || '',
      ]),
    ]
      .map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([rowsCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'platform-invoices.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Invoices & payment attempts</h1>
        <button
          type="button"
          onClick={exportInvoicesCsv}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
        >
          Export CSV
        </button>
      </div>
      <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Method totals</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(methodTotals).map(([method, amount]) => (
            <div key={method}>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span className="uppercase">{method}</span>
                <span>KES {Math.round(amount).toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                  style={{ width: `${Math.round((amount / maxMethod) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/50">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Method</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{row.id}</td>
                <td className="px-4 py-3 text-sm text-white">{row.businessName}</td>
                <td className="px-4 py-3 text-xs text-slate-400">{row.method}</td>
                <td className="px-4 py-3 text-xs text-slate-400">KES {row.amount.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
