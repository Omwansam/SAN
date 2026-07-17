import { useEffect, useState } from 'react'
import { CloudOff, DownloadCloud, RefreshCw } from 'lucide-react'
import { getBridge, isDesktop } from '../utils/platform'

// Desktop-only status strip: offline/queued-sales banner + update-ready toast.
// Renders nothing on the web build.
export function DesktopShellStatus() {
  const [sync, setSync] = useState(null)
  const [updateVersion, setUpdateVersion] = useState(null)

  useEffect(() => {
    if (!isDesktop()) return undefined
    const bridge = getBridge()
    bridge.sync.status().then(setSync)
    const unsubSync = bridge.sync.onStatus(setSync)
    const unsubUpdate = bridge.updates.onReady((info) => setUpdateVersion(info.version))
    return () => {
      unsubSync()
      unsubUpdate()
    }
  }, [])

  if (!isDesktop()) return null

  const showOffline = sync && (!sync.online || sync.pendingCount > 0)

  return (
    <>
      {showOffline ? (
        <div className="flex items-center justify-center gap-2 bg-amber-500/95 px-4 py-1.5 text-xs font-medium text-white">
          <CloudOff className="h-3.5 w-3.5" aria-hidden />
          {sync.online ? 'Syncing' : 'Offline'} — {sync.pendingCount} sale
          {sync.pendingCount === 1 ? '' : 's'} waiting to sync
          {sync.failedCount > 0 ? ` · ${sync.failedCount} need attention` : ''}
          <button
            type="button"
            className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30"
            onClick={() => getBridge().sync.syncNow().then(setSync)}
          >
            <RefreshCw className="h-3 w-3" aria-hidden />
            Sync now
          </button>
        </div>
      ) : null}
      {updateVersion ? (
        <div className="flex items-center justify-center gap-2 bg-[var(--brand)]/95 px-4 py-1.5 text-xs font-medium text-white">
          <DownloadCloud className="h-3.5 w-3.5" aria-hidden />
          SanPOS {updateVersion} is ready.
          <button
            type="button"
            className="ml-2 rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30"
            onClick={() => getBridge().updates.install()}
          >
            Restart to update
          </button>
          <button
            type="button"
            className="rounded-full px-2 py-0.5 hover:bg-white/10"
            onClick={() => setUpdateVersion(null)}
          >
            Later
          </button>
        </div>
      ) : null}
    </>
  )
}
