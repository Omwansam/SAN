import { BrowserWindow, screen, shell } from 'electron'
import path from 'node:path'
import { APP_ORIGIN } from './protocol'

let mainWindow: BrowserWindow | null = null
let customerWindow: BrowserWindow | null = null

function preloadPath() {
  return path.join(__dirname, '../preload/index.js')
}

export function devServerUrl(): string | null {
  if (process.env.POS_USE_DIST === '1') return null
  if (process.env.ELECTRON_RENDERER_URL) return process.env.ELECTRON_RENDERER_URL
  if (process.env.POS_DEV_SERVER_URL) return process.env.POS_DEV_SERVER_URL
  return null
}

function baseUrl(): string {
  return devServerUrl() ?? APP_ORIGIN
}

function commonWebPreferences() {
  return {
    preload: preloadPath(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    spellcheck: false,
  }
}

function wireWindow(win: BrowserWindow) {
  // The POS page opens the customer display via window.open('/customer-display').
  // Allow same-origin children (with the preload attached); everything external
  // goes to the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_ORIGIN) || (devServerUrl() && url.startsWith(devServerUrl()!))) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: commonWebPreferences(),
        },
      }
    }
    if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith(APP_ORIGIN) || (devServerUrl() && url.startsWith(devServerUrl()!))
    if (!allowed) {
      event.preventDefault()
      if (/^(https?|mailto):/i.test(url)) void shell.openExternal(url)
    }
  })
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus()
    return mainWindow
  }
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f9fafb',
    webPreferences: commonWebPreferences(),
  })
  wireWindow(mainWindow)
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
    if (customerWindow && !customerWindow.isDestroyed()) customerWindow.close()
  })
  void mainWindow.loadURL(`${baseUrl()}/`)
  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
}

// Opens (or focuses) the customer-facing display, fullscreen on a secondary
// monitor when one exists. State flows to it via BroadcastChannel, which works
// because both windows share the app://pos origin.
export function openCustomerDisplay(): void {
  if (customerWindow && !customerWindow.isDestroyed()) {
    customerWindow.focus()
    return
  }
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  const external = displays.find((d) => d.id !== primary.id)
  customerWindow = new BrowserWindow({
    x: external ? external.bounds.x : undefined,
    y: external ? external.bounds.y : undefined,
    width: external ? external.bounds.width : 1024,
    height: external ? external.bounds.height : 700,
    fullscreen: Boolean(external),
    autoHideMenuBar: true,
    webPreferences: commonWebPreferences(),
  })
  wireWindow(customerWindow)
  customerWindow.on('closed', () => {
    customerWindow = null
  })
  void customerWindow.loadURL(`${baseUrl()}/customer-display`)
}

export function broadcastToWindows(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}
