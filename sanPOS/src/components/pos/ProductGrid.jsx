import { useMemo, useState } from 'react'
import { LayoutGrid, Search, Tag } from 'lucide-react'
import { Input } from '../shared/Input'
import { EmptyState } from '../shared/EmptyState'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'
import { ProductCard } from './ProductCard'

export function ProductGrid({
  products,
  categories,
  tenantConfig,
  showStock,
  onAddProduct,
  /** e.g. "12 products · 3 categories" */
  statsLine,
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [edit, setEdit] = useState(null)
  const [qty, setQty] = useState(1)
  const [disc, setDisc] = useState(0)
  const [note, setNote] = useState('')

  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products],
  )

  const categoryCounts = useMemo(() => {
    const m = { all: activeProducts.length }
    for (const c of categories) {
      m[c.id] = activeProducts.filter((p) => p.categoryId === c.id).length
    }
    return m
  }, [activeProducts, categories])

  const filtered = useMemo(() => {
    let list = [...activeProducts]
    if (cat !== 'all') list = list.filter((p) => p.categoryId === cat)
    const s = q.trim().toLowerCase()
    if (s) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          String(p.sku ?? '').toLowerCase().includes(s) ||
          String(p.barcode ?? '').includes(s),
      )
    }
    return list
  }, [activeProducts, cat, q])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            Menu
          </h2>
          {statsLine ? (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{statsLine}</p>
          ) : null}
        </div>
      </div>

      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id="pos-search"
          className="!rounded-full !border-gray-200/90 !py-3 !pl-11 !shadow-sm dark:!border-gray-700"
          placeholder="Search dishes, SKU, barcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
        />
      </div>

      <div className="flex shrink-0 gap-2.5 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCat('all')}
          className={`flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 text-center transition active:scale-[0.98] ${
            cat === 'all'
              ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm dark:bg-[var(--brand)]/15'
              : 'border-transparent bg-white shadow-md hover:border-gray-200 dark:bg-gray-800/90 dark:hover:border-gray-600'
          }`}
          aria-label="All categories"
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              cat === 'all'
                ? 'bg-[var(--brand)] text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <LayoutGrid className="h-5 w-5" aria-hidden />
          </span>
          <span
            className={`text-xs font-semibold ${cat === 'all' ? 'text-[var(--brand)]' : 'text-gray-800 dark:text-gray-100'}`}
          >
            All
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {categoryCounts.all ?? 0} items
          </span>
        </button>
        {categories.map((c) => {
          const active = cat === c.id
          const count = categoryCounts[c.id] ?? 0
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`flex min-w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 text-center transition active:scale-[0.98] ${
                active
                  ? 'border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm dark:bg-[var(--brand)]/15'
                  : 'border-transparent bg-white shadow-md hover:border-gray-200 dark:bg-gray-800/90 dark:hover:border-gray-600'
              }`}
              aria-label={`Filter ${c.name}`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-inner"
                style={{
                  backgroundColor: c.color || '#64748b',
                  opacity: active ? 1 : 0.72,
                }}
              >
                <Tag className="h-5 w-5 opacity-95" aria-hidden />
              </span>
              <span
                className={`max-w-[5.5rem] truncate text-xs font-semibold ${active ? 'text-[var(--brand)]' : 'text-gray-800 dark:text-gray-100'}`}
              >
                {c.name}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {count} items
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3 overflow-y-auto rounded-3xl border border-gray-200/70 bg-[var(--surface-elevated)]/80 p-3 shadow-inner sm:grid-cols-3 lg:grid-cols-4 dark:border-gray-700/70 dark:bg-gray-900/40 sm:p-4">
        {filtered.length === 0 ? (
          <div className="col-span-full flex min-h-[12rem] items-center justify-center">
            <EmptyState title="No dishes here" description="Try another category or clear search." />
          </div>
        ) : (
          filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              tenantConfig={tenantConfig}
              showStock={showStock}
              onAdd={(pr) => onAddProduct(pr)}
              onLongPress={(pr) => {
                setEdit(pr)
                setQty(1)
                setDisc(0)
                setNote('')
              }}
            />
          ))
        )}
      </div>

      <Modal
        open={Boolean(edit)}
        onOpenChange={(o) => !o && setEdit(null)}
        title={edit ? `Quick add: ${edit.name}` : ''}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!edit) return
                onAddProduct({
                  ...edit,
                  qty,
                  discount: Number(disc) || 0,
                  note,
                })
                setEdit(null)
              }}
            >
              Add to cart
            </Button>
          </>
        }
      >
        {edit ? (
          <div className="space-y-3">
            <Input
              id="qe-qty"
              label="Quantity"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              aria-label="Quantity"
            />
            <Input
              id="qe-disc"
              label="Line discount (flat)"
              type="number"
              min={0}
              value={disc}
              onChange={(e) => setDisc(e.target.value)}
              aria-label="Discount"
            />
            <Input
              id="qe-note"
              label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              aria-label="Line note"
            />
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
