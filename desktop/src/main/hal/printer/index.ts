import type { PrinterSettings, PrinterStatus, PrintOptions, ReceiptDoc } from '../../../shared/ipc-contract'
import { getSettings } from '../../settings'
import { renderReceipt, renderTestPage } from './render-escpos'
import type { PrinterTransport } from './transports/types'
import { networkTransport } from './transports/network'
import { serialTransport } from './transports/serial'
import { usbTransport } from './transports/usb'

let lastResult: 'ok' | 'error' | null = null
let lastError: string | null = null

export function buildTransport(settings: PrinterSettings): PrinterTransport {
  switch (settings.transport) {
    case 'network':
      if (!settings.host) throw new Error('Printer host/IP is not configured')
      return networkTransport(settings.host, settings.port || 9100)
    case 'serial':
      if (!settings.comPort) throw new Error('Printer COM port is not configured')
      return serialTransport(settings.comPort, settings.baudRate || 9600)
    case 'usb':
      if (!settings.usbVendorId || !settings.usbProductId) {
        throw new Error('USB printer vendor/product id is not configured')
      }
      return usbTransport(settings.usbVendorId, settings.usbProductId)
    default:
      throw new Error('No receipt printer configured. Open Settings → Devices.')
  }
}

async function send(data: Buffer): Promise<void> {
  const settings = getSettings().devices.printer
  const transport = buildTransport(settings)
  try {
    await transport.write(data)
    lastResult = 'ok'
    lastError = null
  } catch (err) {
    lastResult = 'error'
    lastError = err instanceof Error ? err.message : String(err)
    throw err
  }
}

export async function printReceipt(doc: ReceiptDoc, opts: PrintOptions = {}): Promise<void> {
  const settings = getSettings().devices.printer
  const buffer = renderReceipt(doc, settings, Boolean(opts.kickDrawer))
  const copies = Math.max(1, Math.min(3, opts.copies ?? 1))
  const payload = copies === 1 ? buffer : Buffer.concat(Array.from({ length: copies }, () => buffer))
  await send(payload)
}

export async function printTestPage(): Promise<void> {
  const settings = getSettings().devices.printer
  await send(renderTestPage(settings))
}

export async function sendRaw(data: Buffer): Promise<void> {
  await send(data)
}

export function printerStatus(): PrinterStatus {
  const settings = getSettings().devices.printer
  return {
    configured: settings.transport !== null,
    transport: settings.transport,
    lastResult,
    lastError,
  }
}
