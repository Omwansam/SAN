import { getPlatformAuditLogs } from '../utils/platformData'

export default function PlatformAudit() {
  const logs = getPlatformAuditLogs()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Audit log</h1>
      {!logs.length ? (
        <p className="rounded-2xl border border-dashed border-white/20 bg-slate-950/50 p-4 text-sm text-slate-400">
          No audit actions yet.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <article key={log.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-white">{log.action}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
