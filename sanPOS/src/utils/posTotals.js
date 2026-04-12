/**
 * Gross line amount before line-level discount.
 * @param {{ qty: number, unitPrice: number }} it
 */
export function lineGross(it) {
  return Number(it.qty) * Number(it.unitPrice)
}

/**
 * Line discount as currency: uses `discountPercent` (0–100) when set &gt; 0,
 * otherwise flat `discount`.
 * @param {{ qty: number, unitPrice: number, discount?: number, discountPercent?: number }} it
 */
export function lineDiscountAmount(it) {
  const gross = lineGross(it)
  const pct = Number(it.discountPercent)
  if (Number.isFinite(pct) && pct > 0) {
    return gross * (Math.min(100, Math.max(0, pct)) / 100)
  }
  return Number(it.discount) || 0
}

/**
 * Line net before order-level discount and tax.
 * @param {{ qty: number, unitPrice: number, discount?: number, discountPercent?: number }} it
 */
export function lineNet(it) {
  return Math.max(0, lineGross(it) - lineDiscountAmount(it))
}

/**
 * @param {Array<{ qty: number, unitPrice: number, discount?: number, discountPercent?: number }>} items
 * @param {{ type: string, value?: number }} orderDiscount
 * @param {number} taxRatePercent
 * @param {{ deliveryFee?: number, includeDeliveryFee?: boolean }} [feeOptions]
 */
export function computeCartTotals(
  items,
  orderDiscount,
  taxRatePercent,
  feeOptions = {},
) {
  let subtotal = 0
  for (const it of items) {
    subtotal += lineNet(it)
  }
  let afterDiscount = subtotal
  const od = orderDiscount ?? { type: 'none', value: 0 }
  if (od.type === 'percent' && od.value > 0) {
    afterDiscount *= 1 - Math.min(100, Number(od.value)) / 100
  } else if (od.type === 'flat' && od.value > 0) {
    afterDiscount = Math.max(0, afterDiscount - Number(od.value))
  }
  const discAmt = subtotal - afterDiscount
  const taxAmount = (afterDiscount * (Number(taxRatePercent) || 0)) / 100
  const deliveryRaw = Math.max(0, Number(feeOptions.deliveryFee) || 0)
  const deliveryFeeAmount =
    feeOptions.includeDeliveryFee && deliveryRaw > 0 ? deliveryRaw : 0
  const total = afterDiscount + taxAmount + deliveryFeeAmount
  return {
    subtotal,
    discountAmount: discAmt,
    taxableBase: afterDiscount,
    taxAmount,
    deliveryFeeAmount,
    total,
  }
}
