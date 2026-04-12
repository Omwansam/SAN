import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Clock, MapPin, ShoppingCart } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'
import { useCart } from '../../hooks/useCart'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { CartItem } from './CartItem'

const MODES = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'dine_in', label: 'Dine In' },
  { id: 'takeaway', label: 'Takeaway' },
]

const PROMOS = {
  TRYNEW: { type: 'percent', value: 10 },
  WELCOME: { type: 'flat', value: 50 },
  SAVE5: { type: 'percent', value: 5 },
  FAST10: { type: 'flat', value: 100 },
}

function orderPreviewRef(items) {
  if (!items.length) return '—'
  const raw = items.map((i) => i.lineId).join('')
  const tail = raw.replace(/-/g, '').slice(-6).toUpperCase() || 'NEW'
  return `#${tail}`
}

function etaMinutesLabel(mode) {
  if (mode === 'delivery') return '20 min'
  if (mode === 'dine_in') return '15 min'
  return '12 min'
}

function addressHeader(mode, businessType) {
  const restaurant = businessType === 'restaurant'
  if (restaurant) {
    if (mode === 'delivery') return 'Delivery address'
    if (mode === 'dine_in') return 'Dine in'
    return 'Pickup'
  }
  if (mode === 'delivery') return 'Customer'
  if (mode === 'dine_in') return 'In store'
  return 'Pickup'
}

function addressLines(mode, activeCustomer, businessName, businessType) {
  const restaurant = businessType === 'restaurant'
  if (mode === 'delivery') {
    const name = activeCustomer?.name?.trim()
    const phone = activeCustomer?.phone ? String(activeCustomer.phone) : ''
    if (restaurant) {
      const line =
        [name, phone].filter(Boolean).join(' · ') ||
        'Add a customer — name & phone for the rider'
      return line
    }
    return (
      [name, phone].filter(Boolean).join(' · ') ||
      'Optional — search below or walk-in checkout'
    )
  }
  if (mode === 'dine_in') {
    return restaurant
      ? `${businessName ?? 'This location'} · table or counter service`
      : `${businessName ?? 'This location'} · counter checkout`
  }
  return restaurant
    ? `${activeCustomer?.name?.trim() || 'Walk-in pickup'} · collect at the pass`
    : `${activeCustomer?.name?.trim() || 'Counter pickup'} · ${businessName ?? 'this store'}`
}

/** Dashed rule with semi-circular notches (fills with app canvas). */
function TicketDivider() {
  return (
    <div
      className="relative my-2 flex h-7 w-full shrink-0 items-center overflow-visible"
      aria-hidden
    >
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 border-t border-dashed border-gray-300/90 dark:border-white/15" />
      <div className="absolute left-0 top-1/2 z-[1] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-muted)] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" />
      <div className="absolute right-0 top-1/2 z-[1] h-3.5 w-3.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--surface-muted)] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" />
    </div>
  )
}

const glassPanel =
  'rounded-2xl border border-gray-200/70 bg-white/55 backdrop-blur-md shadow-sm dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-none'

const expressField =
  '!border-gray-200/90 !bg-white/80 !text-gray-900 placeholder:!text-gray-500 dark:!border-white/10 dark:!bg-gray-950/30 dark:!text-gray-100 dark:placeholder:!text-gray-500'

/**
 * Dark, dashboard-style cart (delivery / dine-in / takeaway, promo, CTA).
 */
export function ExpressCartLayout({
  compact,
  /** Narrow right column on desktop: tighter padding and type scale. */
  slimSidebar = false,
  tenantConfig,
  items,
  activeCustomer,
  orderDiscount,
  totals,
  products,
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
  showSplitBill,
}) {
  const { serviceMode, setServiceMode } = useCart()
  const [promoInput, setPromoInput] = useState('')
  const rx = Boolean(tenantConfig?.modules?.prescriptions)
  const lineVisual = rx ? 'default' : 'express'

  const byId = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  )

  const previewId = useMemo(() => orderPreviewRef(items), [items])
  const businessType = tenantConfig?.businessType ?? 'retail'
  const addrTitle = addressHeader(serviceMode, businessType)
  const addrLine = addressLines(
    serviceMode,
    activeCustomer,
    tenantConfig?.businessName,
    businessType,
  )

  function applyPromoCode(code) {
    const upper = String(code).trim().toUpperCase()
    const rule = PROMOS[upper]
    if (!rule) {
      toast.error('Unknown code.')
      return
    }
    onOrderDiscount({ type: rule.type, value: rule.value })
    toast.success(`Applied ${upper}`)
    setPromoInput('')
  }

  function applyPromoFromInput() {
    const code = promoInput.trim().toUpperCase()
    if (!code) {
      toast.error('Enter a promotion code.')
      return
    }
    applyPromoCode(code)
  }

  /** Frosted shell — blends with POS light/dark surfaces. */
  const shellDesktop =
    'flex h-full min-h-0 min-w-0 max-w-full flex-col gap-3.5 rounded-3xl border border-gray-200/80 bg-white/60 p-4 pb-5 text-gray-900 shadow-[var(--surface-card-shadow)] backdrop-blur-2xl ring-1 ring-black/[0.04] dark:border-gray-600/50 dark:bg-gray-950/45 dark:text-gray-100 dark:ring-white/[0.05]'
  const shellMobile =
    'flex h-full min-h-0 min-w-0 max-w-full flex-col gap-2.5 rounded-2xl border border-gray-200/80 bg-white/60 p-3 text-gray-900 shadow-[var(--surface-card-shadow)] backdrop-blur-2xl ring-1 ring-black/[0.04] dark:border-gray-600/50 dark:bg-gray-950/45 dark:text-gray-100 dark:ring-white/[0.05]'

  const promoChips = ['TRYNEW', 'WELCOME', 'SAVE5']

  return (
    <div className={compact ? shellMobile : shellDesktop}>
      {/* Address + ETA */}
      <div className={`${glassPanel} ${slimSidebar ? 'px-2.5 py-2' : 'px-3 py-3'}`}>
        <p
          className={`font-bold uppercase tracking-[0.14em] text-gray-900 dark:text-white ${slimSidebar ? 'text-[10px]' : 'text-[11px]'}`}
        >
          {addrTitle}
        </p>
        <div
          className={`mt-2 flex items-start gap-2 text-gray-600 dark:text-gray-400 ${slimSidebar ? 'text-xs' : 'text-sm'}`}
        >
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-500" aria-hidden />
          <p className="min-w-0 leading-snug">{addrLine}</p>
        </div>
        <div
          className={`mt-2 flex items-center gap-2 text-gray-600 dark:text-gray-400 ${slimSidebar ? 'text-[11px]' : 'text-xs'}`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-gray-500" aria-hidden />
          <span>{etaMinutesLabel(serviceMode)}</span>
        </div>
      </div>

      {/* Cart title + order id */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`flex shrink-0 items-center justify-center rounded-xl bg-white/70 text-gray-800 ring-1 ring-gray-200/80 dark:bg-white/10 dark:text-white dark:ring-white/10 ${slimSidebar ? 'h-8 w-8' : 'h-9 w-9'}`}
          >
            <ShoppingCart className={slimSidebar ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
          </span>
          <h2
            className={`font-bold tracking-tight text-gray-900 dark:text-white ${slimSidebar ? 'text-base' : 'text-lg'}`}
          >
            Cart
          </h2>
        </div>
        <p
          className={`shrink-0 text-right text-gray-500 dark:text-gray-400 ${slimSidebar ? 'max-w-[7.5rem] truncate text-[10px]' : 'text-xs'}`}
        >
          Order ID:{' '}
          <span className="font-medium text-gray-900 dark:text-white">{previewId}</span>
        </p>
      </div>

      {businessType === 'restaurant' ? (
        <div
          className="flex gap-1 rounded-full border border-gray-200/70 bg-white/45 p-1 shadow-inner backdrop-blur-sm dark:border-white/[0.08] dark:bg-gray-950/40"
          role="tablist"
          aria-label="Order type"
        >
          {MODES.map((m) => {
            const on = serviceMode === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={`relative flex-1 rounded-full px-2 text-center text-[11px] font-semibold transition sm:text-xs ${
                  slimSidebar ? 'py-2' : 'py-2.5'
                } ${
                  on
                    ? 'bg-[var(--brand)] text-white shadow-sm shadow-black/10 ring-1 ring-black/[0.06] dark:shadow-black/40 dark:ring-white/10'
                    : 'text-gray-600 hover:bg-[var(--brand)]/[0.08] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100'
                }`}
                onClick={() => setServiceMode(m.id)}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className={`shrink-0 ${glassPanel} ${slimSidebar ? 'p-2' : compact ? 'p-2' : 'p-3'}`}>
        <label className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Customer
        </label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id={compact ? 'ex-cust-m' : 'ex-cust'}
            className={expressField}
            placeholder="Search or create…"
            value={customerQuery}
            onChange={(e) => onCustomerQuery(e.target.value)}
            aria-label="Customer search"
          />
          {activeCustomer ? (
            <Button type="button" variant="secondary" onClick={onClearCustomer}>
              Clear
            </Button>
          ) : null}
        </div>
        {customerQuery && !activeCustomer ? (
          <ul className="mt-2 max-h-28 overflow-y-auto rounded-xl border border-gray-200/80 bg-white/90 text-sm shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-gray-950/70">
            {customers.slice(0, 5).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10"
                  onClick={() => onSelectCustomer(c)}
                >
                  {c.name}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left font-medium text-[var(--brand)] hover:bg-[var(--brand)]/[0.08] dark:text-rose-300 dark:hover:bg-white/5"
                onClick={() =>
                  onSelectCustomer({
                    id: `walkin-${Date.now()}`,
                    name: customerQuery,
                    phone: '',
                    email: '',
                    loyaltyPoints: 0,
                    totalSpend: 0,
                    createdAt: new Date().toISOString(),
                    tags: [],
                  })
                }
              >
                + Create &ldquo;{customerQuery}&rdquo;
              </button>
            </li>
          </ul>
        ) : null}
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto ${slimSidebar ? 'space-y-1.5 pr-0.5' : 'space-y-2'} ${compact ? 'pr-0.5' : ''}`}
      >
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300/80 bg-white/50 py-10 text-center shadow-sm backdrop-blur-md dark:border-white/12 dark:bg-white/[0.06]">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Cart is empty
            </p>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Add items from the menu.
            </p>
          </div>
        ) : (
          items.map((line) => (
            <CartItem
              key={line.lineId}
              line={line}
              tenantConfig={tenantConfig}
              prescriptions={rx}
              onQty={onQty}
              onRemove={onRemove}
              onUpdateLine={onUpdateLine}
              compact={compact}
              dense={slimSidebar}
              visualStyle={lineVisual}
              imageUrl={byId.get(line.productId)?.imageUrl ?? ''}
            />
          ))
        )}
      </div>

      {items.length > 0 ? <TicketDivider /> : null}

      {/* Promotion */}
      <div
        className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${glassPanel} ${slimSidebar ? 'px-2 py-2' : 'px-3 py-3'}`}
      >
        <span
          className={`shrink-0 font-medium text-gray-900 dark:text-white ${slimSidebar ? 'text-xs' : 'text-sm'}`}
        >
          Promotion Code
        </span>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          {promoChips.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => applyPromoCode(code)}
              className={`rounded-full border border-gray-200/90 bg-white/80 font-bold tracking-wide text-gray-900 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-gray-950/40 dark:text-white dark:hover:bg-gray-900/60 ${slimSidebar ? 'px-2 py-1 text-[10px]' : 'px-3.5 py-2 text-xs'}`}
            >
              {code}
            </button>
          ))}
        </div>
        <details className="w-full border-t border-gray-200/70 pt-2 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900 dark:hover:text-gray-200">
            Other code or manual discount
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input
              id="promo-ex"
              className={`min-w-0 flex-1 ${expressField}`}
              placeholder="Type code"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              aria-label="Promotion code"
            />
            <Button type="button" variant="secondary" className="shrink-0" onClick={applyPromoFromInput}>
              Apply
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-gray-200/90 bg-white/80 px-2 py-1.5 text-sm text-gray-900 dark:border-white/10 dark:bg-gray-950/40 dark:text-gray-100"
              value={orderDiscount.type}
              onChange={(e) =>
                onOrderDiscount({ ...orderDiscount, type: e.target.value })
              }
              aria-label="Manual discount type"
            >
              <option value="none">None</option>
              <option value="percent">Percent</option>
              <option value="flat">Flat</option>
            </select>
            {orderDiscount.type !== 'none' ? (
              <Input
                type="number"
                className={`max-w-[100px] ${expressField}`}
                value={orderDiscount.value ?? 0}
                onChange={(e) =>
                  onOrderDiscount({
                    ...orderDiscount,
                    value: Number(e.target.value),
                  })
                }
                aria-label="Manual discount value"
              />
            ) : null}
          </div>
        </details>
      </div>

      <div
        className={`space-y-1.5 text-sm ${glassPanel} ${slimSidebar ? 'px-2 py-2 text-xs' : 'px-3 py-3'}`}
      >
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Sub Total</span>
          <span className="tabular-nums font-medium text-gray-900 dark:text-white">
            {formatCurrency(totals.subtotal, tenantConfig)}
          </span>
        </div>
        {totals.discountAmount > 0 ? (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400/90">
            <span>Discounts</span>
            <span className="tabular-nums font-medium">
              −{formatCurrency(totals.discountAmount, tenantConfig)}
            </span>
          </div>
        ) : null}
        {totals.deliveryFeeAmount > 0 ? (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Delivery charge</span>
            <span className="tabular-nums font-medium text-gray-900 dark:text-white">
              {formatCurrency(totals.deliveryFeeAmount, tenantConfig)}
            </span>
          </div>
        ) : null}
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>
            {tenantConfig?.taxLabel ?? 'Tax'}
            {Number(tenantConfig?.taxRate) > 0 ? (
              <span className="text-gray-500 dark:text-gray-500"> ({tenantConfig.taxRate}%)</span>
            ) : null}
          </span>
          <span className="tabular-nums font-medium text-gray-900 dark:text-white">
            {formatCurrency(totals.taxAmount, tenantConfig)}
          </span>
        </div>
        <div
          className={`flex justify-between border-t border-gray-200/90 font-bold text-gray-900 dark:border-white/10 dark:text-white ${slimSidebar ? 'pt-2 text-sm' : 'pt-2.5 text-base'}`}
        >
          <span>TOTAL</span>
          <span className={`tabular-nums text-[var(--brand)] dark:text-white ${slimSidebar ? 'text-base' : 'text-lg'}`}>
            {formatCurrency(totals.total, tenantConfig)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {showSplitBill && tenantConfig?.modules?.tables && items.length ? (
          <Button type="button" variant="secondary" className="w-full" onClick={onOpenSplit}>
            Split bill
          </Button>
        ) : null}
        <button
          type="button"
          disabled={!items.length}
          onClick={onPay}
          className={`w-full rounded-full border border-[var(--brand)]/30 bg-[var(--brand)] font-bold text-white shadow-md shadow-[var(--brand)]/25 transition hover:opacity-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 ${slimSidebar ? 'py-2.5 text-sm' : 'py-3.5 text-base'}`}
        >
          Confirm Order
        </button>
      </div>
    </div>
  )
}
