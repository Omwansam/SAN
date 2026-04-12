import toast from 'react-hot-toast'
import { Minus, Plus } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'
import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../hooks/useCart'
import { Badge } from '../shared/Badge'

export function ProductCard({
  product,
  tenantConfig,
  showStock,
  onAdd,
  onLongPress,
}) {
  const { can } = useAuth()
  const { items, updateQty, removeItem } = useCart()

  const lines = items.filter((i) => i.productId === product.id)
  const primaryLine = lines[0]
  const inCartQty = lines.reduce((a, b) => a + (Number(b.qty) || 0), 0)
  const inCart = inCartQty > 0

  function canAddControlled() {
    if (
      tenantConfig?.modules?.prescriptions &&
      product.controlled &&
      !can('controlled_substance')
    ) {
      toast.error('Controlled items need a manager or admin.')
      return false
    }
    return true
  }

  function handleAddOne() {
    if (!canAddControlled()) return
    onAdd(product)
  }

  function increment() {
    if (!canAddControlled()) return
    if (primaryLine) {
      updateQty(primaryLine.lineId, primaryLine.qty + 1)
    } else {
      onAdd(product)
    }
  }

  function decrement() {
    if (!primaryLine) return
    if (primaryLine.qty <= 1) {
      removeItem(primaryLine.lineId)
    } else {
      updateQty(primaryLine.lineId, primaryLine.qty - 1)
    }
  }

  function handleImagePointerDown() {
    const t = setTimeout(() => onLongPress?.(product), 600)
    const up = () => {
      clearTimeout(t)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointerup', up, { once: true })
  }

  const salePct = Number(product.salePercent)
  const showSale = Number.isFinite(salePct) && salePct > 0

  return (
    <div
      className={`group flex flex-col rounded-2xl border bg-white p-3 text-left shadow-md transition dark:bg-gray-900 ${
        inCart
          ? 'border-[var(--brand)]/55 ring-2 ring-[var(--brand)]/20 dark:border-[var(--brand)]/45'
          : 'border-gray-200/90 hover:border-[var(--brand)]/35 hover:shadow-lg dark:border-gray-700/90'
      }`}
    >
      <div
        className="relative mb-2 flex aspect-[4/3] max-h-[5.75rem] cursor-default items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
        onPointerDown={handleImagePointerDown}
        title="Hold for quick add options"
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <span className="text-3xl opacity-80" aria-hidden>
            📦
          </span>
        )}
        {showSale ? (
          <span className="absolute right-2 top-2 rounded-lg bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
            {salePct}% off
          </span>
        ) : null}
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {product.name}
        {product.controlled ? (
          <span className="ml-1 text-[10px] font-normal text-amber-700 dark:text-amber-400">
            (Rx)
          </span>
        ) : null}
      </p>
      {product.sku ? (
        <p className="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">
          {product.sku}
        </p>
      ) : null}
      <p className="mt-1.5 text-lg font-bold tabular-nums tracking-tight text-[var(--brand)]">
        {formatCurrency(product.price, tenantConfig)}
      </p>
      {product.dietary === 'veg' || product.dietary === 'nonveg' ? (
        <div className="mt-1.5 flex gap-1">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
              product.dietary === 'veg'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
            }`}
          >
            {product.dietary === 'veg' ? 'Veg' : 'Non-veg'}
          </span>
        </div>
      ) : null}
      {showStock ? (
        <Badge
          variant={product.stock <= product.lowStockAlert ? 'warning' : 'default'}
          className="mt-2 w-fit text-[10px]"
        >
          Stock {product.stock ?? 0}
        </Badge>
      ) : null}

      <div className="mt-3">
        {!inCart ? (
          <button
            type="button"
            onClick={handleAddOne}
            className="w-full rounded-xl bg-[var(--brand)]/12 py-2.5 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)]/20 active:scale-[0.98] dark:bg-[var(--brand)]/20 dark:hover:bg-[var(--brand)]/30"
          >
            Add to order
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--brand)]/25 bg-[var(--brand)]/[0.08] px-2 py-2 dark:bg-[var(--brand)]/15">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              onClick={decrement}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <span className="min-w-[2rem] text-center text-base font-bold tabular-nums text-gray-900 dark:text-gray-50">
              {inCartQty}
            </span>
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white shadow-sm transition hover:opacity-95 active:scale-95"
              onClick={increment}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
