/**
 * Split a currency total into `parts` equal amounts (last row absorbs rounding).
 * @param {number} total
 * @param {number} parts
 * @param {string} defaultMethod
 */
export function buildEqualSplitRows(total, parts, defaultMethod) {
  const n = Math.max(2, Math.floor(parts) || 2)
  const cents = Math.round((Number(total) || 0) * 100)
  const base = Math.floor(cents / n)
  const rem = cents - base * n
  const rows = []
  for (let i = 0; i < n; i++) {
    const c = base + (i < rem ? 1 : 0)
    rows.push({
      method: defaultMethod,
      amount: String((c / 100).toFixed(2)),
      reference: `Party ${i + 1}`,
    })
  }
  return rows
}

/**
 * Equal split of merchandise total plus optional per-party tip (flat amount).
 * @param {number} orderTotal
 * @param {number} parts
 * @param {number[]} tipByParty length may be < parts (treated as 0)
 * @param {string} defaultMethod
 * @returns {{ rows: Array<{method: string, amount: string, reference: string}>, grandTotal: number, tipsTotal: number }}
 */
export function buildEqualSplitRowsWithTips(
  orderTotal,
  parts,
  tipByParty,
  defaultMethod,
) {
  const baseRows = buildEqualSplitRows(orderTotal, parts, defaultMethod)
  const n = baseRows.length
  const tips = Array.from({ length: n }, (_, i) =>
    Math.max(0, Number(tipByParty?.[i]) || 0),
  )
  const tipsTotal = tips.reduce((a, b) => a + b, 0)
  const rows = baseRows.map((row, i) => {
    const base = Number(row.amount) || 0
    const tip = tips[i]
    return {
      ...row,
      amount: String((base + tip).toFixed(2)),
      reference: tip > 0 ? `${row.reference} (+tip)` : row.reference,
    }
  })
  const grandTotal = (Number(orderTotal) || 0) + tipsTotal
  return { rows, grandTotal, tipsTotal }
}

