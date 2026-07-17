import { contextBridge, ipcRenderer } from 'electron'
import type {
  ApiProxyRequest,
  ApiProxyResponse,
  AppSettings,
  ConfigBootstrap,
  FingerprintEvent,
  FingerprintStatus,
  PrintOptions,
  PrinterStatus,
  ReceiptDoc,
  SerialPortInfo,
  SyncStatus,
  UsbDeviceInfo,
} from '../shared/ipc-contract'
import { IPC } from '../shared/ipc-contract'

// The one capability surface the sanPOS renderer sees. Web builds never have
// window.posBridge; sanPOS/src/utils/platform.js gates every feature on it.

function subscribe<T>(channel: string, handler: (payload: T) => void): () => void {
  const listener = (_event: unknown, payload: T) => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// Read once, synchronously, before React boots — api.js needs serverUrl and
// workspace slug at module-eval time.
const bootstrap = ipcRenderer.sendSync(IPC.CONFIG_BOOTSTRAP) as ConfigBootstrap

const posBridge = {
  platform: bootstrap.platform,
  appVersion: bootstrap.appVersion,

  config: {
    bootstrap,
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.CONFIG_GET),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.CONFIG_SET, patch),
  },

  api: {
    request: (req: ApiProxyRequest): Promise<ApiProxyResponse> =>
      ipcRenderer.invoke(IPC.API_REQUEST, req),
  },

  printer: {
    print: (doc: ReceiptDoc, opts?: PrintOptions): Promise<PrinterStatus> =>
      ipcRenderer.invoke(IPC.PRINTER_PRINT, doc, opts ?? {}),
    testPrint: (): Promise<PrinterStatus> => ipcRenderer.invoke(IPC.PRINTER_TEST),
    status: (): Promise<PrinterStatus> => ipcRenderer.invoke(IPC.PRINTER_STATUS),
    listSerialPorts: (): Promise<SerialPortInfo[]> => ipcRenderer.invoke(IPC.PRINTER_LIST_SERIAL),
    listUsbDevices: (): Promise<UsbDeviceInfo[]> => ipcRenderer.invoke(IPC.PRINTER_LIST_USB),
  },

  drawer: {
    kick: (): Promise<boolean> => ipcRenderer.invoke(IPC.DRAWER_KICK),
  },

  fingerprint: {
    status: (): Promise<FingerprintStatus> => ipcRenderer.invoke(IPC.FP_STATUS),
    startEnroll: (): Promise<boolean> => ipcRenderer.invoke(IPC.FP_ENROLL_START),
    startVerify: (templates: Array<{ userId: string; template: string }>): Promise<boolean> =>
      ipcRenderer.invoke(IPC.FP_VERIFY_START, templates),
    cancel: (): Promise<void> => ipcRenderer.invoke(IPC.FP_CANCEL),
    onEvent: (handler: (event: FingerprintEvent) => void) =>
      subscribe<FingerprintEvent>(IPC.FP_EVENT, handler),
  },

  sync: {
    status: (): Promise<SyncStatus> => ipcRenderer.invoke(IPC.SYNC_STATUS),
    syncNow: (): Promise<SyncStatus> => ipcRenderer.invoke(IPC.SYNC_NOW),
    onStatus: (handler: (status: SyncStatus) => void) =>
      subscribe<SyncStatus>(IPC.SYNC_STATUS_EVENT, handler),
  },

  updates: {
    check: (): Promise<{ checking: boolean }> => ipcRenderer.invoke(IPC.UPDATES_CHECK),
    install: (): Promise<void> => ipcRenderer.invoke(IPC.UPDATES_INSTALL),
    onReady: (handler: (info: { version: string }) => void) =>
      subscribe<{ version: string }>(IPC.UPDATES_READY_EVENT, handler),
  },

  windows: {
    openCustomerDisplay: (): Promise<void> =>
      ipcRenderer.invoke(IPC.WINDOW_OPEN_CUSTOMER_DISPLAY),
  },
}

export type PosBridge = typeof posBridge

contextBridge.exposeInMainWorld('posBridge', posBridge)
