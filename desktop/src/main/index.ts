import { app, BrowserWindow } from 'electron'
import { registerAppProtocol, registerSchemePrivileges } from './protocol'
import { createMainWindow } from './windows'
import { registerIpcHandlers } from './ipc/index'
import { startSyncEngine, stopSyncEngine } from './sync/engine'
import { startAutoUpdates } from './updates'
import { shutdownFingerprint } from './hal/fingerprint'

// One register = one app instance; a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  registerSchemePrivileges()

  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    registerAppProtocol()
    registerIpcHandlers()
    createMainWindow()
    startSyncEngine()
    startAutoUpdates()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    stopSyncEngine()
    shutdownFingerprint()
  })
}
