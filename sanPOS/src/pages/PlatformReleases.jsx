import toast from 'react-hot-toast'
import { getPlatformReleases, pushPlatformAuditLog, setPlatformReleases } from '../utils/platformData'

export default function PlatformReleases() {
  const releases = getPlatformReleases()

  function rollForward(id) {
    const next = releases.map((release) =>
      release.id === id ? { ...release, rollout: Math.min(100, (release.rollout || 0) + 20) } : release,
    )
    setPlatformReleases(next)
    pushPlatformAuditLog('release_rollout_changed', { id, direction: 'up' })
    toast.success('Rollout increased')
  }

  function killSwitch(id) {
    const next = releases.map((release) =>
      release.id === id ? { ...release, status: 'paused', rollout: 0 } : release,
    )
    setPlatformReleases(next)
    pushPlatformAuditLog('release_kill_switch', { id })
    toast.success('Kill switch applied')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Releases & rollouts</h1>
      <div className="space-y-3">
        {releases.map((release) => (
          <article key={release.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="font-semibold text-white">{release.name}</p>
            <p className="mt-1 text-xs text-slate-400">
              Channel: {release.channel} · Status: {release.status} · Rollout: {release.rollout}%
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => rollForward(release.id)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">
                Increase rollout
              </button>
              <button type="button" onClick={() => killSwitch(release.id)} className="rounded-xl bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                Kill switch
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
