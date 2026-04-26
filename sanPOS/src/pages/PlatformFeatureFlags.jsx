import { useState } from 'react'
import toast from 'react-hot-toast'
import { getPlatformFeatureFlags, pushPlatformAuditLog, setPlatformFeatureFlags } from '../utils/platformData'

export default function PlatformFeatureFlags() {
  const [flags, setFlags] = useState(getPlatformFeatureFlags())

  function toggle(key) {
    const next = { ...flags, [key]: !flags[key] }
    setFlags(next)
    setPlatformFeatureFlags(next)
    pushPlatformAuditLog('feature_flag_toggled', { key, value: next[key] })
    toast.success(`${key} updated`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Feature flags</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(flags).map(([key, value]) => (
          <article key={key} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-sm font-semibold text-white">{key}</p>
            <p className="mt-1 text-xs text-slate-400">{value ? 'Enabled' : 'Disabled'}</p>
            <button
              type="button"
              onClick={() => toggle(key)}
              className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              {value ? 'Disable' : 'Enable'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
