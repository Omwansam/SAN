import { useMemo } from 'react'
import { format } from 'date-fns'
import { Check, Printer, X } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'
import { formatCurrency } from '../../utils/currency'
import { generateReceiptHTML } from '../../utils/receipt'

const PAYMENT_LABELS = {
  cash: 'Cash',
  card: 'Card',
  mpesa: 'M-Pesa',
  bank_transfer: 'Bank transfer',
  credit: 'Store credit',
}

function paySummary(order, tenantConfig) {
  const parts = (order?.payments ?? []).map(
    (p) =>
      `${PAYMENT_LABELS[p.method] ?? p.method}: ${formatCurrency(p.amount, tenantConfig)}`,
  )
  return parts.join(' · ') || '—'
}

export function ReceiptModal({ open, onOpenChange, order, tenantConfig, meta }) {
  const html = useMemo(
    () => (order ? generateReceiptHTML(order, tenantConfig, meta) : ''),
    [order, tenantConfig, meta],
  )

  function print() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
    w.close()
  }

  function email() {
    const sub = encodeURIComponent(`Receipt ${order?.id ?? ''}`)
    const body = encodeURIComponent('Receipt attached as summary.\n')
    window.location.href = `mailto:?subject=${sub}&body=${body}`
  }

  const when = order?.createdAt
    ? format(new Date(order.createdAt), 'PPp')
    : '—'

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Payment receipt"
      bare
      contentClassName="max-w-md border-0 bg-transparent p-0 shadow-none"
      footer={null}
    >
      {order ? (
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/80 bg-white/90 text-gray-600 shadow-sm backdrop-blur-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="bg-gradient-to-b from-[var(--brand)]/12 to-transparent px-6 pb-2 pt-8 text-center dark:from-[var(--brand)]/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/35">
              <Check className="h-8 w-8" strokeWidth={3} aria-hidden />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              Payment successful
            </h2>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[var(--brand)]">
              {formatCurrency(order.total ?? 0, tenantConfig)}
            </p>
          </div>
          <div className="space-y-2.5 px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Order</span>
              <span className="max-w-[60%] truncate font-mono text-xs text-gray-900 dark:text-gray-100">
                {order.id}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-gray-100 pb-2 dark:border-gray-800">
              <span className="text-gray-500 dark:text-gray-400">Payment</span>
              <span className="max-w-[60%] text-right text-xs font-medium leading-snug">
                {paySummary(order, tenantConfig)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500 dark:text-gray-400">Time</span>
              <span className="text-xs font-medium">{when}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/80 px-6 py-4 dark:border-gray-800 dark:bg-gray-950/50">
            <Button
              type="button"
              className="w-full !py-3.5 text-base font-bold"
              onClick={() => onOpenChange(false)}
            >
              New sale
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1 !py-2.5"
                onClick={print}
                aria-label="Print receipt"
              >
                <Printer className="mr-2 inline h-4 w-4" aria-hidden />
                Print receipt
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1 !py-2.5"
                onClick={email}
                aria-label="Email receipt"
              >
                Email
              </Button>
            </div>
          </div>
          <div className="border-t border-gray-100 px-2 pb-3 pt-2 dark:border-gray-800">
            <iframe
              title="Receipt preview"
              srcDoc={html}
              className="h-48 w-full rounded-2xl border border-gray-200 bg-white dark:border-gray-700"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
