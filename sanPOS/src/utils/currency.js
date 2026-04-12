/**
 * @param {number} amount
 * @param {object} tenantConfig
 */
export function formatCurrency(amount, tenantConfig) {
  const c = tenantConfig?.currency ?? {
    code: 'KES',
    symbol: 'KSh',
    position: 'before',
  }
  const n = Number(amount)
  const abs = Number.isFinite(n) ? Math.abs(n) : 0
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const sign = n < 0 ? '-' : ''
  const sym = c.symbol ?? c.code ?? ''
  if (c.position === 'after') {
    return `${sign}${formatted} ${sym}`.trim()
  }
  return `${sign}${sym}${formatted}`.trim()
}
