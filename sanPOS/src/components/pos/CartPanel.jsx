import { ExpressCartLayout } from './ExpressCartLayout'

/**
 * Cart for POS: all variants use the same dark dashboard layout (`ExpressCartLayout`).
 * - `express` / `sidebar` — desktop column (roomy)
 * - `express-drawer` / `drawer` — mobile bottom sheet (compact spacing)
 */
export function CartPanel({
  tenantConfig,
  items,
  activeCustomer,
  orderDiscount,
  totals,
  products = [],
  customers,
  onQty,
  onRemove,
  onUpdateLine,
  onCustomerQuery,
  onSelectCustomer,
  onClearCustomer,
  onOrderDiscount,
  onPay,
  onOpenSplit,
  customerQuery,
  /** When false, hide split bill even if the tables module is on (non-restaurant tenants). */
  showSplitBill = true,
  /** `drawer` | `express-drawer` = compact (mobile sheet). `sidebar` | `express` = desktop. */
  variant = 'sidebar',
}) {
  const compact =
    variant === 'drawer' || variant === 'express-drawer'

  return (
    <ExpressCartLayout
      compact={compact}
      slimSidebar={false}
      tenantConfig={tenantConfig}
      items={items}
      activeCustomer={activeCustomer}
      orderDiscount={orderDiscount}
      totals={totals}
      products={products}
      customers={customers}
      onQty={onQty}
      onRemove={onRemove}
      onUpdateLine={onUpdateLine}
      onCustomerQuery={onCustomerQuery}
      onSelectCustomer={onSelectCustomer}
      onClearCustomer={onClearCustomer}
      onOrderDiscount={onOrderDiscount}
      onPay={onPay}
      onOpenSplit={onOpenSplit}
      customerQuery={customerQuery}
      showSplitBill={showSplitBill}
    />
  )
}
