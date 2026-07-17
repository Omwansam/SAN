import { buildReceiptDoc } from './receiptData'

// HTML renderer over the neutral receipt document (buildReceiptDoc). The
// desktop app renders the same document to ESC/POS in the Electron main
// process — keep content changes in receiptData.js so both outputs agree.
// The QR image is generated locally (utils/receiptQr.js) — no external APIs,
// so receipts render offline and inside the desktop shell.

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function itemRow(it) {
  const note = it.note
    ? ` <span style="color:#666;font-size:11px">(${escapeHtml(it.note)})</span>`
    : ''
  return `<tr><td>${escapeHtml(it.name)}${note}</td><td align="center">${escapeHtml(it.qty)}</td><td align="right">${escapeHtml(it.unitPrice)}</td><td align="right">${escapeHtml(it.total)}</td></tr>`
}

function totalRow(t) {
  if (t.emphasis) {
    return `<p style="margin:8px 0 0;font-size:1.05rem;font-weight:700;">${escapeHtml(t.label)}: ${escapeHtml(t.value)}</p>`
  }
  return `<p style="margin:4px 0;">${escapeHtml(t.label)}: ${escapeHtml(t.value)}</p>`
}

/**
 * @param {object} order
 * @param {object} tenantConfig
 * @param {{ cashierName?: string, registerId?: string, customerName?: string, branchName?: string }} meta
 * @param {{ qrDataUrl?: string }} extras locally generated QR image (see utils/receiptQr.js)
 */
export function generateReceiptHTML(order, tenantConfig, meta = {}, extras = {}) {
  const doc = buildReceiptDoc(order, tenantConfig, meta)
  return renderReceiptDocHTML(doc, extras)
}

export function renderReceiptDocHTML(doc, extras = {}) {
  const logo = doc.business.logoUrl
    ? `<img src="${doc.business.logoUrl.replace(/"/g, '')}" alt="" style="max-height:52px;display:block;margin:0 auto 10px;object-fit:contain" />`
    : ''
  const metaLines = doc.meta
    .map(
      (m) =>
        `<p style="margin:4px 0;font-size:12px;color:#555;text-align:center">${m.label ? `${escapeHtml(m.label)}: ` : ''}${escapeHtml(m.value)}</p>`,
    )
    .join('')
  const lines = doc.items.map(itemRow).join('')
  const totals = doc.totals.map(totalRow).join('')
  const pay = doc.payments
    .map(
      (p) =>
        `${escapeHtml(p.label)}: ${escapeHtml(p.amount)}${p.reference ? ` <span style="color:#555">(${escapeHtml(p.reference)})</span>` : ''}`,
    )
    .join('<br/>')
  const rxBlock = doc.rxLines.length
    ? `<div style="margin-top:12px;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;">
    <strong>Rx / dispensing</strong>
    <ul style="margin:8px 0 0;padding-left:18px;">${doc.rxLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>
  </div>`
    : ''
  const qrBlock = extras.qrDataUrl
    ? `<div style="margin-top:16px;text-align:center">
    <img src="${extras.qrDataUrl}" width="140" height="140" alt="Receipt verification QR" style="display:inline-block" />
    <p style="margin:6px 0 0;font-size:10px;color:#888">Scan for order reference</p>
  </div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt ${escapeHtml(doc.orderId)}</title></head><body style="font-family:system-ui,sans-serif;max-width:380px;margin:0 auto;padding:16px;">
  ${logo}
  <h1 style="font-size:1.15rem;margin:0 0 6px;text-align:center">${escapeHtml(doc.business.name)}</h1>
  ${metaLines}
  <table width="100%" cellpadding="5" style="border-collapse:collapse;font-size:13px;"><thead><tr style="border-bottom:1px solid #ddd"><th align="left">Item</th><th>Qty</th><th align="right">Price</th><th align="right">Total</th></tr></thead><tbody>${lines}</tbody></table>
  <div style="margin-top:14px;padding-top:10px;border-top:1px solid #eee">
    ${totals}
    <p style="margin-top:10px;font-size:13px;line-height:1.5"><strong>Payments</strong><br/>${pay || '—'}</p>
  </div>
  ${rxBlock}
  ${doc.change ? `<p style="margin-top:8px">Change: ${escapeHtml(doc.change)}</p>` : ''}
  ${qrBlock}
  <p style="margin-top:16px;font-size:12px;color:#444;white-space:pre-wrap;text-align:center">${escapeHtml(doc.footer)}</p>
  <p style="margin-top:12px;font-size:11px;color:#888;text-align:center">Order ID: ${escapeHtml(doc.orderId)}</p>
  </body></html>`
}
