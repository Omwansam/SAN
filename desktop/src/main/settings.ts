import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppSettings, DeviceSettings } from '../shared/ipc-contract'

const DEFAULT_DEVICES: DeviceSettings = {
  printer: {
    transport: null,
    host: '',
    port: 9100,
    comPort: '',
    baudRate: 9600,
    usbVendorId: '',
    usbProductId: '',
    widthMM: 80,
    dialect: 'epson',
  },
  drawer: { mode: 'printer', comPort: '', baudRate: 9600 },
  autoPrintOnSale: true,
  kickDrawerOnCash: true,
}

const DEFAULTS: AppSettings = {
  serverUrl: '',
  workspaceSlug: '',
  updatesUrl: '',
  devices: DEFAULT_DEVICES,
}

type Listener = (settings: AppSettings) => void

let cached: AppSettings | null = null
const listeners = new Set<Listener>()

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function mergeDevices(base: DeviceSettings, patch?: Partial<DeviceSettings>): DeviceSettings {
  if (!patch) return base
  return {
    printer: { ...base.printer, ...(patch.printer ?? {}) },
    drawer: { ...base.drawer, ...(patch.drawer ?? {}) },
    autoPrintOnSale: patch.autoPrintOnSale ?? base.autoPrintOnSale,
    kickDrawerOnCash: patch.kickDrawerOnCash ?? base.kickDrawerOnCash,
  }
}

export function getSettings(): AppSettings {
  if (cached) return cached
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) as Partial<AppSettings>
    cached = {
      serverUrl: raw.serverUrl ?? DEFAULTS.serverUrl,
      workspaceSlug: raw.workspaceSlug ?? DEFAULTS.workspaceSlug,
      updatesUrl: raw.updatesUrl ?? DEFAULTS.updatesUrl,
      devices: mergeDevices(DEFAULT_DEVICES, raw.devices),
    }
  } catch {
    cached = { ...DEFAULTS, devices: DEFAULT_DEVICES }
  }
  return cached
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const next: AppSettings = {
    serverUrl: patch.serverUrl ?? current.serverUrl,
    workspaceSlug:
      patch.workspaceSlug !== undefined
        ? String(patch.workspaceSlug).trim().toLowerCase()
        : current.workspaceSlug,
    updatesUrl: patch.updatesUrl ?? current.updatesUrl,
    devices: mergeDevices(current.devices, patch.devices),
  }
  cached = next
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true })
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8')
  for (const fn of listeners) fn(next)
  return next
}

export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
