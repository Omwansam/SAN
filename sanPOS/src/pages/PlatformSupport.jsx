import { getPlatformSupportSummary, getPlatformSupportTickets } from '../utils/platformData'

export default function PlatformSupport() {
  const tickets = getPlatformSupportTickets()
  const summary = getPlatformSupportSummary()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Support desk</h1>
      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open" value={summary.open} />
        <Metric label="High priority" value={summary.high} />
        <Metric label="Resolved" value={summary.resolved} />
      </section>
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="font-semibold text-white">{ticket.subject}</p>
            <p className="mt-1 text-xs text-slate-400">
              {ticket.id} · Tenant: {ticket.tenantId} · Priority: {ticket.priority} · Status: {ticket.status}
            </p>
          </article>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </article>
  )
}
