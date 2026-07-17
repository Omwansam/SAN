import type { PrinterSettings, ReceiptDoc } from '../../../shared/ipc-contract'

// node-thermal-printer is used purely as an in-memory ESC/POS encoder — our
// transports do the I/O. Export shape moved across v4 minors, so resolve both.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ntp = require('node-thermal-printer')
const ThermalPrinter = ntp.ThermalPrinter ?? ntp.printer
const PrinterTypes = ntp.PrinterTypes ?? ntp.types

const WIDTH_CHARS: Record<58 | 80, number> = { 58: 32, 80: 48 }

type NtpInstance = {
  alignCenter(): void
  alignLeft(): void
  bold(on: boolean): void
  println(text: string): void
  newLine(): void
  drawLine(): void
  setTextDoubleHeight(): void
  setTextNormal(): void
  tableCustom(rows: Array<{ text: string; align: 'LEFT' | 'RIGHT' | 'CENTER'; width: number; bold?: boolean }>): void
  printQR(data: string, opts?: { cellSize?: number; correction?: string; model?: number }): void
  openCashDrawer(): void
  cut(): void
  getBuffer(): Buffer
}

function createEncoder(settings: PrinterSettings): NtpInstance {
  return new ThermalPrinter({
    type: settings.dialect === 'star' ? PrinterTypes.STAR : PrinterTypes.EPSON,
    // never used for I/O — we only call getBuffer()
    interface: 'buffer',
    width: WIDTH_CHARS[settings.widthMM] ?? WIDTH_CHARS[80],
    removeSpecialCharacters: true,
    options: { timeout: 1000 },
  }) as NtpInstance
}

function labelValueRow(p: NtpInstance, label: string, value: string, bold = false) {
  p.tableCustom([
    { text: label, align: 'LEFT', width: 0.55, bold },
    { text: value, align: 'RIGHT', width: 0.45, bold },
  ])
}

export function renderReceipt(doc: ReceiptDoc, settings: PrinterSettings, kickDrawer: boolean): Buffer {
  const p = createEncoder(settings)

  if (kickDrawer) p.openCashDrawer()

  p.alignCenter()
  p.bold(true)
  p.println(doc.business.name)
  p.bold(false)
  for (const row of doc.meta) {
    p.println(row.label ? `${row.label}: ${row.value}` : row.value)
  }
  p.drawLine()

  p.alignLeft()
  for (const item of doc.items) {
    p.println(item.name)
    labelValueRow(p, `  ${item.qty} x ${item.unitPrice}`, item.total)
    if (item.note) p.println(`  ${item.note}`)
  }
  p.drawLine()

  for (const total of doc.totals) {
    if (total.emphasis) {
      p.setTextDoubleHeight()
      labelValueRow(p, total.label, total.value, true)
      p.setTextNormal()
    } else {
      labelValueRow(p, total.label, total.value)
    }
  }

  if (doc.payments.length) {
    p.drawLine()
    for (const pay of doc.payments) {
      labelValueRow(p, pay.label, pay.amount)
      if (pay.reference) p.println(`  Ref: ${pay.reference}`)
    }
  }
  if (doc.change) labelValueRow(p, 'Change', doc.change, true)

  if (doc.rxLines.length) {
    p.drawLine()
    p.bold(true)
    p.println('Rx / dispensing')
    p.bold(false)
    for (const line of doc.rxLines) p.println(line)
  }

  if (doc.qrPayload) {
    p.newLine()
    p.alignCenter()
    p.printQR(doc.qrPayload, { cellSize: 6, correction: 'M', model: 2 })
    p.println('Scan for order reference')
  }

  if (doc.footer) {
    p.newLine()
    p.alignCenter()
    p.println(doc.footer)
  }
  p.newLine()
  p.alignCenter()
  p.println(`Order: ${doc.orderId}`)
  p.newLine()
  p.cut()

  return p.getBuffer()
}

export function renderTestPage(settings: PrinterSettings): Buffer {
  const p = createEncoder(settings)
  p.alignCenter()
  p.bold(true)
  p.println('SanPOS printer test')
  p.bold(false)
  p.println(new Date().toLocaleString())
  p.drawLine()
  p.alignLeft()
  p.println(`Transport: ${settings.transport ?? 'not set'}`)
  p.println(`Width: ${settings.widthMM}mm  Dialect: ${settings.dialect}`)
  labelValueRow(p, 'Alignment check', 'OK')
  p.printQR('sanpos-test', { cellSize: 6 })
  p.newLine()
  p.cut()
  return p.getBuffer()
}

// ESC p — fires the drawer kick pulse on both common pins so any RJ11 wiring works.
export function drawerKickBuffer(): Buffer {
  return Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa, 0x1b, 0x70, 0x01, 0x19, 0xfa])
}
