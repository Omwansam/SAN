import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { useAuth } from '../hooks/useAuth'
import { useTenant } from '../hooks/useTenant'
import { TENANT_EXPORT_SEGMENTS } from '../utils/tenantExportKeys'
import { getJSON, nsKey } from '../utils/storage'

export default function SettingsBackup() {
  const { tenantId, tenantConfig } = useTenant()
  const { can } = useAuth()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  if (!tenantConfig) return null
  if (!can('settings')) return <Navigate to="/settings" replace />

  function exportJson() {
    if (!tenantId) return
    const data = { tenantId, exportedAt: new Date().toISOString(), segments: {} }
    for (const seg of TENANT_EXPORT_SEGMENTS) {
      try {
        data.segments[seg] = getJSON(tenantId, seg, null)
      } catch {
        data.segments[seg] = null
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sanpos-backup-${tenantId}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready')
  }

  async function importJson(file) {
    if (!tenantId || !file) return
    setBusy(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid file')
      const tid = String(parsed.tenantId ?? '').trim()
      if (tid !== tenantId) {
        toast.error(
          `Backup is for workspace "${tid}" but you are signed into "${tenantId}".`,
        )
        return
      }
      const segs = parsed.segments
      if (!segs || typeof segs !== 'object') throw new Error('Missing segments')
      for (const key of Object.keys(segs)) {
        const val = segs[key]
        if (val === undefined) continue
        localStorage.setItem(nsKey(tenantId, key), JSON.stringify(val))
      }
      toast.success('Restore complete. Reload the page to refresh all screens.')
    } catch {
      toast.error('Could not import — invalid JSON or structure.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Backup & restore
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Exports every known data segment for this workspace. Import overwrites matching keys
        only for the signed-in tenant.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={exportJson}>
          Download JSON backup
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          Restore from JSON…
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => importJson(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
