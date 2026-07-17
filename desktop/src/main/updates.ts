import { app } from 'electron'
import { IPC } from '../shared/ipc-contract'
import { getSettings } from './settings'
import { broadcastToWindows } from './windows'

// electron-updater against a generic HTTPS feed (latest.yml + installer served
// by the existing VPS nginx). Only active in packaged builds.

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

let started = false

function feedUrl(): string | null {
  const { updatesUrl, serverUrl } = getSettings()
  if (updatesUrl) return updatesUrl
  if (serverUrl) return `${serverUrl.replace(/\/+$/, '')}/desktop-updates`
  return null
}

function autoUpdater() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('electron-updater') as typeof import('electron-updater')).autoUpdater
}

export function startAutoUpdates(): void {
  if (started || !app.isPackaged) return
  const url = feedUrl()
  if (!url) return
  started = true
  const updater = autoUpdater()
  updater.autoDownload = true
  updater.autoInstallOnAppQuit = true
  updater.setFeedURL({ provider: 'generic', url })
  updater.on('update-downloaded', (info) => {
    broadcastToWindows(IPC.UPDATES_READY_EVENT, { version: info.version })
  })
  updater.on('error', (err) => {
    console.warn('[updates] check failed:', err.message)
  })
  void updater.checkForUpdates().catch(() => {})
  setInterval(() => void updater.checkForUpdates().catch(() => {}), CHECK_INTERVAL_MS)
}

export async function checkForUpdates(): Promise<{ checking: boolean }> {
  if (!app.isPackaged || !feedUrl()) return { checking: false }
  startAutoUpdates()
  await autoUpdater().checkForUpdates().catch(() => null)
  return { checking: true }
}

export function quitAndInstall(): void {
  if (!app.isPackaged) return
  autoUpdater().quitAndInstall()
}
