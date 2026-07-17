// Single source of truth for every IPC channel between main, preload and the
// sanPOS renderer. Both sides import from here so payload shapes cannot drift.

export const IPC = {
  // config
  CONFIG_BOOTSTRAP: 'config:bootstrap', // sendSync — tiny payload read once at renderer startup
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  // api proxy (offline-aware HTTP)
  API_REQUEST: 'api:request',
  // hardware
  PRINTER_PRINT: 'printer:print',
  PRINTER_TEST: 'printer:test',
  PRINTER_STATUS: 'printer:status',
  PRINTER_LIST_SERIAL: 'printer:list-serial',
  PRINTER_LIST_USB: 'printer:list-usb',
  DRAWER_KICK: 'drawer:kick',
  // fingerprint
  FP_STATUS: 'fp:status',
  FP_ENROLL_START: 'fp:enroll-start',
  FP_VERIFY_START: 'fp:verify-start',
  FP_CANCEL: 'fp:cancel',
  FP_EVENT: 'fp:event', // main -> renderer
  // sync
  SYNC_STATUS: 'sync:status',
  SYNC_NOW: 'sync:now',
  SYNC_STATUS_EVENT: 'sync:status-event', // main -> renderer
  // updates
  UPDATES_CHECK: 'updates:check',
  UPDATES_INSTALL: 'updates:install',
  UPDATES_READY_EVENT: 'updates:ready-event', // main -> renderer
  // windows / misc
  WINDOW_OPEN_CUSTOMER_DISPLAY: 'window:open-customer-display',
  APP_INFO: 'app:info',
} as const

export type PrinterTransportKind = 'network' | 'serial' | 'usb'

export interface PrinterSettings {
  transport: PrinterTransportKind | null
  host: string
  port: number
  comPort: string
  baudRate: number
  usbVendorId: string
  usbProductId: string
  widthMM: 58 | 80
  dialect: 'epson' | 'star'
}

export interface DrawerSettings {
  mode: 'printer' | 'serial'
  comPort: string
  baudRate: number
}

export interface DeviceSettings {
  printer: PrinterSettings
  drawer: DrawerSettings
  autoPrintOnSale: boolean
  kickDrawerOnCash: boolean
}

export interface AppSettings {
  serverUrl: string
  workspaceSlug: string
  updatesUrl: string
  devices: DeviceSettings
}

export interface ConfigBootstrap {
  platform: NodeJS.Platform
  appVersion: string
  serverUrl: string
  workspaceSlug: string
  devices: DeviceSettings
}

export interface ApiProxyRequest {
  path: string
  method?: string
  body?: unknown
  token?: string | null
  headers?: Record<string, string>
  timeoutMs?: number
}

export interface ApiProxyResponse {
  ok: boolean
  status: number
  payload: unknown
  /** true when the answer came from the local cache / outbox rather than the server */
  offline: boolean
  /** network-level failure with no cached fallback */
  networkError?: string
}

// ---- receipt document: the neutral model produced by sanPOS/src/utils/receiptData.js.
// All money values arrive pre-formatted (currency logic stays in the renderer).
export interface ReceiptMetaRow {
  label: string
  value: string
}
export interface ReceiptItem {
  name: string
  qty: string
  unitPrice: string
  total: string
  note?: string
}
export interface ReceiptTotalRow {
  label: string
  value: string
  emphasis?: boolean
}
export interface ReceiptPayment {
  label: string
  amount: string
  reference?: string
}
export interface ReceiptDoc {
  business: { name: string; logoUrl?: string }
  meta: ReceiptMetaRow[]
  items: ReceiptItem[]
  totals: ReceiptTotalRow[]
  payments: ReceiptPayment[]
  rxLines: string[]
  change?: string
  qrPayload: string
  footer: string
  orderId: string
}

export interface PrintOptions {
  kickDrawer?: boolean
  copies?: number
}

export interface PrinterStatus {
  configured: boolean
  transport: PrinterTransportKind | null
  lastResult: 'ok' | 'error' | null
  lastError: string | null
}

export interface SerialPortInfo {
  path: string
  manufacturer?: string
  friendlyName?: string
}

export interface UsbDeviceInfo {
  vendorId: string
  productId: string
  isPrinterClass: boolean
}

export interface SyncStatus {
  online: boolean
  syncing: boolean
  pendingCount: number
  failedCount: number
  lastSyncAt: string | null
  lastError: string | null
}

export type FingerprintEvent =
  | { type: 'reader'; connected: boolean }
  | { type: 'sample'; quality: string }
  | { type: 'enrolled'; template: string }
  | { type: 'match'; userId: string }
  | { type: 'no-match' }
  | { type: 'error'; message: string }

export interface FingerprintStatus {
  available: boolean
  readerConnected: boolean
  reason?: string
}
