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

function payLabel(method) {
  return PAYMENT_LABELS[method] ?? method
}

function receiptLogoTag(logo) {
  const raw = String(logo ?? '')
    .trim()
    .replace(/"/g, '')
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:image/')) {
    return `<img src="${raw}" alt="" style="max-height:52px;display:block;margin:0 auto 10px;object-fit:contain" />`
  }
  return ''
}

function receiptQrImg(order) {
  const payload = JSON.stringify({
    id: order.id,
    total: order.total,
    at: order.createdAt ?? '',
  })
  const data = encodeURIComponent(payload)
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${data}`
}

function lineRow(it, tenantConfig) {
  const lineTotal = it.total ?? lineNet(it)
  const discNote =
    Number(it.discountPercent) > 0
      ? ` <span style="color:#666;font-size:11px">(−${escapeHtml(it.discountPercent)}%)</span>`
      : ''
  return `<tr><td>${escapeHtml(it.name)}${discNote}</td><td align="center">${escapeHtml(it.qty)}</td><td align="right">${formatCurrency(it.unitPrice, tenantConfig)}</td><td align="right">${formatCurrency(lineTotal, tenantConfig)}</td></tr>`
}

/**
 * @param {object} order
 * @param {object} tenantConfig
 * @param {{
 *   cashierName?: string
 *   registerId?: string
 *   customerName?: string
 *   branchName?: string
 * }} meta
 */
export function generateReceiptHTML(order, tenantConfig, meta = {}) {
  const rec = tenantConfig?.receipt ?? {}
  const name = tenantConfig?.businessName ?? 'Receipt'
  const lines = (order.items ?? []).map((it) => lineRow(it, tenantConfig)).join('')
  const sub = formatCurrency(order.subtotal ?? 0, tenantConfig)
  const tax = formatCurrency(order.taxAmount ?? 0, tenantConfig)
  const tot = formatCurrency(order.total ?? 0, tenantConfig)
  const rate = Number(tenantConfig?.taxRate) || 0
  const taxLabel = tenantConfig?.taxLabel ?? 'Tax'
  const discAmt = Number(order.discountAmount) || 0
  const orderDiscLine =
    discAmt > 0
      ? `<p style="margin:4px 0;color:#166534">Order discount: −${formatCurrency(discAmt, tenantConfig)}</p>`
      : ''
  const tipsLine =
    order.tipsTotal > 0
      ? `<p style="margin-top:8px;font-size:13px;">Tips: ${formatCurrency(order.tipsTotal, tenantConfig)}</p>`
      : ''
  const pay = (order.payments ?? [])
    .map(
      (p) =>
        `${escapeHtml(payLabel(p.method))}: ${formatCurrency(p.amount, tenantConfig)}${p.reference ? ` <span style="color:#555">(${escapeHtml(p.reference)})</span>` : ''}`,
    )
    .join('<br/>')
  const rxLines = (order.items ?? []).filter(
    (it) =>
      it.controlled ||
      String(it.rxNumber ?? '').trim() ||
      String(it.prescriber ?? '').trim(),
  )
  const rxBlock =
    rxLines.length > 0
      ? `<div style="margin-top:12px;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;">
    <strong>Rx / dispensing</strong>
    <ul style="margin:8px 0 0;padding-left:18px;">
      ${rxLines
        .map(
          (it) =>
            `<li>${escapeHtml(it.name)} × ${escapeHtml(it.qty)}${it.controlled ? ' <em>(controlled)</em>' : ''}${it.rxNumber ? ` — Rx #${escapeHtml(it.rxNumber)}` : ''}${it.prescriber ? ` — ${escapeHtml(it.prescriber)}` : ''}${it.deaNumber ? ` — DEA ${escapeHtml(it.deaNumber)}` : ''}${it.patientDOB ? ` — DOB ${escapeHtml(it.patientDOB)}` : ''}${Number.isFinite(it.refillsAuthorized) ? ` — Rf auth ${escapeHtml(it.refillsAuthorized)}` : ''}${Number.isFinite(it.refillsRemaining) ? ` / left ${escapeHtml(it.refillsRemaining)}` : ''}${it.controlled && it.pickupVerified ? ' — pickup ✓' : ''}${it.pickupIdLast4 ? ` — ID …${escapeHtml(it.pickupIdLast4)}` : ''}</li>`,
        )
        .join('')}
    </ul>
  </div>`
      : ''
  const when = order.createdAt
    ? formatDate(new Date(order.createdAt), 'PPpp')
    : ''
  const logoSrc = String(rec.logoDataUrl ?? '').trim() || tenantConfig?.logo
  const logo = receiptLogoTag(logoSrc)
  const qrSrc = receiptQrImg(order)
  const taxableNote =
    discAmt > 0
      ? `<p style="margin:2px 0;font-size:12px;color:#555">Taxable after discounts: ${formatCurrency(order.taxableBase ?? 0, tenantConfig)}</p>`
      : ''
  const showTax = rec.showTax !== false
  const showCashier = rec.showCashier !== false
  const showCustomer = rec.showCustomer !== false
  const cashierLine =
    showCashier && meta.cashierName
      ? `<p style="margin:4px 0;font-size:12px;">Cashier: ${escapeHtml(meta.cashierName)}</p>`
      : ''
  const customerLine =
    showCustomer && meta.customerName
      ? `<p style="margin:4px 0;font-size:12px;">Customer: ${escapeHtml(meta.customerName)}</p>`
      : ''
  const branchLine = meta.branchName
    ? `<p style="margin:4px 0;font-size:12px;">Branch: ${escapeHtml(meta.branchName)}</p>`
    : ''
  const taxBlock =
    showTax && rate > 0
      ? `<p style="margin:4px 0;">${escapeHtml(taxLabel)} (${rate}%): ${tax}</p>`
      : showTax
        ? `<p style="margin:4px 0;">${escapeHtml(taxLabel)}: ${tax}</p>`
        : ''
  const footerText =
    String(rec.footerMessage ?? '').trim() ||
    String(tenantConfig?.receiptFooter ?? '').trim()

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt ${escapeHtml(order.id)}</title></head><body style="font-family:system-ui,sans-serif;max-width:380px;margin:0 auto;padding:16px;">
  ${logo}
  <h1 style="font-size:1.15rem;margin:0 0 6px;text-align:center">${escapeHtml(name)}</h1>
  <p style="margin:0;font-size:12px;color:#555;text-align:center">${when}</p>
  ${branchLine}
  ${cashierLine}
  ${customerLine}
  <p style="margin:4px 0 12px;font-size:12px;">Register: ${escapeHtml(meta.registerId ?? '—')}</p>
  <table width="100%" cellpadding="5" style="border-collapse:collapse;font-size:13px;"><thead><tr style="border-bottom:1px solid #ddd"><th align="left">Item</th><th>Qty</th><th align="right">Price</th><th align="right">Total</th></tr></thead><tbody>${lines}</tbody></table>
  <div style="margin-top:14px;padding-top:10px;border-top:1px solid #eee">
    <p style="margin:4px 0;">Subtotal: ${sub}</p>
    ${orderDiscLine}
    ${taxableNote}
    ${taxBlock}
    <p style="margin:8px 0 0;font-size:1.05rem;font-weight:700;">Total: ${tot}</p>
    ${tipsLine}
    <p style="margin-top:10px;font-size:13px;line-height:1.5"><strong>Payments</strong><br/>${pay}</p>
  </div>
  ${rxBlock}
  ${order.change ? `<p style="margin-top:8px">Change: ${formatCurrency(order.change, tenantConfig)}</p>` : ''}
  <div style="margin-top:16px;text-align:center">
    <img src="${qrSrc}" width="140" height="140" alt="Receipt verification QR" style="display:inline-block" />
    <p style="margin:6px 0 0;font-size:10px;color:#888">Scan for order reference</p>
  </div>
  <p style="margin-top:16px;font-size:12px;color:#444;white-space:pre-wrap;text-align:center">${escapeHtml(footerText)}</p>
  <p style="margin-top:12px;font-size:11px;color:#888;text-align:center">Order ID: ${escapeHtml(order.id)}</p>
  </body></html>`
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
