import { format as formatDate } from 'date-fns'
import { formatCurrency } from './currency'
import { lineNet } from './posTotals'

const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  mpesa: 'M-Pesa',
  bank_transfer: 'Bank transfer',
  credit: 'Store credit',
}

export function payLabel(method) {
  return PAYMENT_LABELS[method] ?? method
}

function rxLine(it) {
  const bits = [`${it.name} × ${it.qty}`]
  if (it.controlled) bits.push('(controlled)')
  if (it.rxNumber) bits.push(`Rx #${it.rxNumber}`)
  if (it.prescriber) bits.push(String(it.prescriber))
  if (it.deaNumber) bits.push(`DEA ${it.deaNumber}`)
  if (it.patientDOB) bits.push(`DOB ${it.patientDOB}`)
  if (Number.isFinite(it.refillsAuthorized)) bits.push(`Rf auth ${it.refillsAuthorized}`)
  if (Number.isFinite(it.refillsRemaining)) bits.push(`left ${it.refillsRemaining}`)
  if (it.controlled && it.pickupVerified) bits.push('pickup ✓')
  if (it.pickupIdLast4) bits.push(`ID …${it.pickupIdLast4}`)
  return bits.join(' — ')
}

/**
 * Builds the neutral receipt document consumed by BOTH renderers:
 * generateReceiptHTML (browser preview / web print) and the desktop ESC/POS
 * renderer in the Electron main process. All money values are pre-formatted
 * strings so currency logic lives only here in the renderer.
 */
export function buildReceiptDoc(order, tenantConfig, meta = {}) {
  const rec = tenantConfig?.receipt ?? {}
  const fc = (v) => formatCurrency(v ?? 0, tenantConfig)

  const metaRows = []
  if (order.createdAt) {
    metaRows.push({ label: '', value: formatDate(new Date(order.createdAt), 'PPpp') })
  }
  if (meta.branchName) metaRows.push({ label: 'Branch', value: String(meta.branchName) })
  if (rec.showCashier !== false && meta.cashierName) {
    metaRows.push({ label: 'Cashier', value: String(meta.cashierName) })
  }
  if (rec.showCustomer !== false && meta.customerName) {
    metaRows.push({ label: 'Customer', value: String(meta.customerName) })
  }
  metaRows.push({ label: 'Register', value: String(meta.registerId ?? '—') })

  const items = (order.items ?? []).map((it) => ({
    name: String(it.name ?? 'Item'),
    qty: String(it.qty ?? 0),
    unitPrice: fc(it.unitPrice),
    total: fc(it.total ?? lineNet(it)),
    note: Number(it.discountPercent) > 0 ? `−${it.discountPercent}% discount` : undefined,
  }))

  const totals = [{ label: 'Subtotal', value: fc(order.subtotal) }]
  const discAmt = Number(order.discountAmount) || 0
  if (discAmt > 0) {
    totals.push({ label: 'Order discount', value: `−${fc(discAmt)}` })
    totals.push({ label: 'Taxable after discounts', value: fc(order.taxableBase) })
  }
  if (rec.showTax !== false) {
    const rate = Number(tenantConfig?.taxRate) || 0
    const taxLabel = tenantConfig?.taxLabel ?? 'Tax'
    totals.push({
      label: rate > 0 ? `${taxLabel} (${rate}%)` : taxLabel,
      value: fc(order.taxAmount),
    })
  }
  totals.push({ label: 'Total', value: fc(order.total), emphasis: true })
  if (order.tipsTotal > 0) totals.push({ label: 'Tips', value: fc(order.tipsTotal) })

  const payments = (order.payments ?? []).map((p) => ({
    label: payLabel(p.method),
    amount: fc(p.amount),
    reference: p.reference ? String(p.reference) : undefined,
  }))

  const rxLines = (order.items ?? [])
    .filter(
      (it) =>
        it.controlled || String(it.rxNumber ?? '').trim() || String(it.prescriber ?? '').trim(),
    )
    .map(rxLine)

  const logoUrl = (() => {
    const raw = String(rec.logoDataUrl ?? '').trim() || String(tenantConfig?.logo ?? '').trim()
    if (/^https?:\/\//i.test(raw) || raw.startsWith('data:image/')) return raw
    return undefined
  })()

  return {
    business: { name: tenantConfig?.businessName ?? 'Receipt', logoUrl },
    meta: metaRows,
    items,
    totals,
    payments,
    rxLines,
    change: order.change ? fc(order.change) : undefined,
    qrPayload: JSON.stringify({ id: order.id, total: order.total, at: order.createdAt ?? '' }),
    footer:
      String(rec.footerMessage ?? '').trim() || String(tenantConfig?.receiptFooter ?? '').trim(),
    orderId: String(order.id ?? ''),
  }
}
