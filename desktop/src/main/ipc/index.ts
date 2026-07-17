import { app, ipcMain } from 'electron'
import type {
  ApiProxyRequest,
  AppSettings,
  ConfigBootstrap,
  PrintOptions,
  ReceiptDoc,
} from '../../shared/ipc-contract'
import { IPC } from '../../shared/ipc-contract'
import { getSettings, updateSettings } from '../settings'
import { openCustomerDisplay } from '../windows'
import { handleApiRequest } from '../sync/api-proxy'
import { getSyncStatus, runSync } from '../sync/engine'
import { printReceipt, printTestPage, printerStatus } from '../hal/printer/index'
import { listSerialPorts } from '../hal/printer/transports/serial'
import { listUsbDevices } from '../hal/printer/transports/usb'
import { kickDrawer } from '../hal/drawer'
import {
  cancelFingerprint,
  fingerprintStatus,
  startEnroll,
  startVerify,
} from '../hal/fingerprint'
import { checkForUpdates, quitAndInstall } from '../updates'

function bootstrap(): ConfigBootstrap {
  const settings = getSettings()
  return {
    platform: process.platform,
    appVersion: app.getVersion(),
    serverUrl: settings.serverUrl,
    workspaceSlug: settings.workspaceSlug,
    devices: settings.devices,
  }
}

export function registerIpcHandlers(): void {
  // config
  ipcMain.on(IPC.CONFIG_BOOTSTRAP, (event) => {
    event.returnValue = bootstrap()
  })
  ipcMain.handle(IPC.CONFIG_GET, () => getSettings())
  ipcMain.handle(IPC.CONFIG_SET, (_event, patch: Partial<AppSettings>) => updateSettings(patch))

  // offline-aware HTTP proxy
  ipcMain.handle(IPC.API_REQUEST, (_event, req: ApiProxyRequest) => handleApiRequest(req))

  // hardware
  ipcMain.handle(IPC.PRINTER_PRINT, async (_event, doc: ReceiptDoc, opts: PrintOptions) => {
    await printReceipt(doc, opts)
    return printerStatus()
  })
  ipcMain.handle(IPC.PRINTER_TEST, async () => {
    await printTestPage()
    return printerStatus()
  })
  ipcMain.handle(IPC.PRINTER_STATUS, () => printerStatus())
  ipcMain.handle(IPC.PRINTER_LIST_SERIAL, () => listSerialPorts())
  ipcMain.handle(IPC.PRINTER_LIST_USB, () => listUsbDevices())
  ipcMain.handle(IPC.DRAWER_KICK, async () => {
    await kickDrawer()
    return true
  })

  // fingerprint
  ipcMain.handle(IPC.FP_STATUS, () => fingerprintStatus())
  ipcMain.handle(IPC.FP_ENROLL_START, () => startEnroll())
  ipcMain.handle(IPC.FP_VERIFY_START, (_event, templates: Array<{ userId: string; template: string }>) =>
    startVerify(templates),
  )
  ipcMain.handle(IPC.FP_CANCEL, () => cancelFingerprint())

  // sync
  ipcMain.handle(IPC.SYNC_STATUS, () => getSyncStatus())
  ipcMain.handle(IPC.SYNC_NOW, async () => {
    await runSync('manual')
    return getSyncStatus()
  })

  // updates
  ipcMain.handle(IPC.UPDATES_CHECK, () => checkForUpdates())
  ipcMain.handle(IPC.UPDATES_INSTALL, () => quitAndInstall())

  // windows / misc
  ipcMain.handle(IPC.WINDOW_OPEN_CUSTOMER_DISPLAY, () => openCustomerDisplay())
  ipcMain.handle(IPC.APP_INFO, () => ({ version: app.getVersion(), platform: process.platform }))
}
