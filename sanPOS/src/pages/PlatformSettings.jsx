import { useState } from 'react'
import toast from 'react-hot-toast'
import { getGlobalJSON, setGlobalJSON } from '../utils/storage'

export default function PlatformSettings() {
  const [supportEmail, setSupportEmail] = useState(getGlobalJSON('platformSupportEmail', 'support@sanpos.dev'))
  const [statusPage, setStatusPage] = useState(getGlobalJSON('platformStatusPage', 'status.sanpos.dev'))

  function save() {
    setGlobalJSON('platformSupportEmail', supportEmail)
    setGlobalJSON('platformStatusPage', statusPage)
    toast.success('Platform settings saved')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Platform settings</h1>
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <label className="block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Support email</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status page</span>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={statusPage}
            onChange={(e) => setStatusPage(e.target.value)}
          />
        </label>
        <button type="button" onClick={save} className="mt-4 rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white">
          Save settings
        </button>
      </div>
    </div>
  )
}
