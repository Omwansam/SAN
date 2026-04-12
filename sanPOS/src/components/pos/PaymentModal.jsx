import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'

const METHOD_LABELS = {
  cash: 'Cash',
  card: 'Card',
  mpesa: 'M-Pesa',
  bank_transfer: 'Bank transfer',
  credit: 'Store credit',
}

function labelFor(method) {
  return METHOD_LABELS[method] ?? method
}

export function PaymentModal({
  open,
  onOpenChange,
  total,
  tenantConfig,
  onComplete,
  /** Remount with a new key so these initial values apply when opening. */
  splitRowsInitial = null,
  initialMode = 'single',
}) {
  const methods = useMemo(() => {
    const pm = tenantConfig?.paymentMethods
    return Array.isArray(pm) && pm.length ? pm : ['cash']
  }, [tenantConfig])

  const m0 = methods[0] ?? 'cash'
  const allowSplit = methods.length > 1

  const [mode, setMode] = useState(() =>
    splitRowsInitial?.length || initialMode === 'split' ? 'split' : 'single',
  )
  const [method, setMethod] = useState(m0)
  const [cashIn, setCashIn] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [mpesaAwaiting, setMpesaAwaiting] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [splitRows, setSplitRows] = useState(() =>
    splitRowsInitial?.length
      ? splitRowsInitial.map((r) => ({
          method: r.method ?? m0,
          amount: String(r.amount ?? ''),
          reference: r.reference ?? '',
        }))
      : [{ method: m0, amount: '', reference: '' }],
  )

  const displayMode = allowSplit ? mode : 'single'

  const change = useMemo(() => {
    if (method !== 'cash') return 0
    const rec = Number(cashIn) || 0
    return Math.max(0, rec - total)
  }, [method, cashIn, total])

  function reset() {
    setMode('single')
    setMethod(methods[0] ?? 'cash')
    setCashIn('')
    setMpesaPhone('')
    setMpesaAwaiting(false)
    setPaymentRef('')
    setSplitRows([{ method: methods[0] ?? 'cash', amount: '', reference: '' }])
  }

  function finishMpesa() {
    if (!mpesaPhone.trim()) {
      toast.error('Enter M-Pesa phone number.')
      return
    }
    onComplete({
      payments: [{ method: 'mpesa', amount: total, reference: mpesaPhone.trim() }],
      change: 0,
    })
    reset()
    onOpenChange(false)
    toast.success('M-Pesa payment recorded')
  }

  function submitSingle() {
    if (method === 'cash') {
      const rec = Number(cashIn) || 0
      if (rec < total) {
        toast.error('Cash received is less than total.')
        return
      }
      onComplete({
        payments: [{ method: 'cash', amount: total }],
        change: rec - total,
      })
      reset()
      onOpenChange(false)
      return
    }
    if (method === 'mpesa') {
      if (!mpesaPhone.trim()) {
        toast.error('Enter M-Pesa phone number.')
        return
      }
      setMpesaAwaiting(true)
      return
    }
    if (method === 'card') {
      if (!paymentRef.trim()) {
        toast.error('Enter card authorization or reference.')
        return
      }
      onComplete({
        payments: [{ method: 'card', amount: total, reference: paymentRef.trim() }],
        change: 0,
      })
      reset()
      onOpenChange(false)
      return
    }
    if (method === 'bank_transfer') {
      if (!paymentRef.trim()) {
        toast.error('Enter bank transfer reference or memo.')
        return
      }
      onComplete({
        payments: [
          { method: 'bank_transfer', amount: total, reference: paymentRef.trim() },
        ],
        change: 0,
      })
      reset()
      onOpenChange(false)
      return
    }
    if (method === 'credit') {
      if (!paymentRef.trim()) {
        toast.error('Enter a note for store credit (e.g. account or approval).')
        return
      }
      onComplete({
        payments: [{ method: 'credit', amount: total, reference: paymentRef.trim() }],
        change: 0,
      })
      reset()
      onOpenChange(false)
      return
    }
    onComplete({
      payments: [{ method, amount: total, reference: paymentRef.trim() || undefined }],
      change: 0,
    })
    reset()
    onOpenChange(false)
  }

  function submitSplit() {
    let sum = 0
    const payments = []
    for (const row of splitRows) {
      const a = Number(row.amount) || 0
      if (a <= 0) continue
      if (row.method === 'mpesa' && !String(row.reference ?? '').trim()) {
        toast.error('Each M-Pesa line needs the customer phone in Reference.')
        return
      }
      if (
        (row.method === 'card' ||
          row.method === 'bank_transfer' ||
          row.method === 'credit') &&
        !String(row.reference ?? '').trim()
      ) {
        toast.error(
          `${labelFor(row.method)} lines need a reference in the Ref field.`,
        )
        return
      }
      sum += a
      payments.push({
        method: row.method,
        amount: a,
        reference: row.reference?.trim() || undefined,
      })
    }
    if (Math.abs(sum - total) > 0.01) {
      toast.error('Split amounts must equal the order total.')
      return
    }
    onComplete({ payments, change: 0 })
    reset()
    onOpenChange(false)
  }

  function cancelMpesaAwaiting() {
    setMpesaAwaiting(false)
  }

  const singlePrimaryLabel =
    method === 'mpesa' && mpesaAwaiting
      ? 'Confirm payment received'
      : method === 'mpesa'
        ? 'Send STK push'
        : 'Complete sale'

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
      title="Payment"
      description={`Total ${formatCurrency(total, tenantConfig)}`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {displayMode === 'split' ? (
            <Button type="button" onClick={submitSplit} aria-label="Complete split payment">
              Complete sale
            </Button>
          ) : method === 'mpesa' && mpesaAwaiting ? (
            <>
              <Button type="button" variant="secondary" onClick={cancelMpesaAwaiting}>
                Back
              </Button>
              <Button type="button" onClick={() => finishMpesa()} aria-label="Confirm M-Pesa">
                Confirm payment received
              </Button>
            </>
          ) : (
            <Button type="button" onClick={submitSingle} aria-label={singlePrimaryLabel}>
              {singlePrimaryLabel}
            </Button>
          )}
        </>
      }
    >
      {allowSplit ? (
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={displayMode === 'single' ? 'primary' : 'secondary'}
            className="flex-1 !py-2"
            onClick={() => {
              setMode('single')
              setMpesaAwaiting(false)
            }}
          >
            Single method
          </Button>
          <Button
            type="button"
            variant={displayMode === 'split' ? 'primary' : 'secondary'}
            className="flex-1 !py-2"
            onClick={() => {
              setMode('split')
              setMpesaAwaiting(false)
            }}
          >
            Split payment
          </Button>
        </div>
      ) : null}

      {displayMode === 'single' ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Method
            <select
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value)
                setMpesaAwaiting(false)
                setPaymentRef('')
              }}
              aria-label="Payment method"
            >
              {methods.map((m) => (
                <option key={m} value={m}>
                  {labelFor(m)}
                </option>
              ))}
            </select>
          </label>
          {method === 'cash' ? (
            <>
              <Input
                id="cash"
                label="Amount received"
                type="number"
                value={cashIn}
                onChange={(e) => setCashIn(e.target.value)}
                aria-label="Cash received"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Change due:{' '}
                <span className="font-semibold tabular-nums">
                  {formatCurrency(change, tenantConfig)}
                </span>
              </p>
            </>
          ) : null}
          {method === 'mpesa' && !mpesaAwaiting ? (
            <Input
              id="mp"
              label="Customer phone (M-Pesa)"
              value={mpesaPhone}
              onChange={(e) => setMpesaPhone(e.target.value)}
              placeholder="2547…"
              aria-label="M-Pesa phone"
            />
          ) : null}
          {method === 'mpesa' && mpesaAwaiting ? (
            <div
              className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <Loader2
                  className="h-5 w-5 shrink-0 animate-spin text-emerald-700 dark:text-emerald-400"
                  aria-hidden
                />
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                    Awaiting STK push
                  </p>
                  <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                    The customer should approve the payment on their phone (
                    {mpesaPhone.trim() || '—'}). When their M-Pesa confirms, tap
                    &ldquo;Confirm payment received&rdquo; below.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          {method === 'card' ? (
            <Input
              id="cr"
              label="Card authorization / reference"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="Auth code or last 4 + ref"
              aria-label="Card reference"
            />
          ) : null}
          {method === 'bank_transfer' ? (
            <Input
              id="bk"
              label="Transfer reference / memo"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="e.g. confirmation code from bank"
              aria-label="Bank transfer reference"
            />
          ) : null}
          {method === 'credit' ? (
            <Input
              id="sc"
              label="Store credit note"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              placeholder="Account name or manager approval"
              aria-label="Store credit note"
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Allocate amounts across methods; they must sum to the order total. Use
            Reference for card auth, M-Pesa phone, bank memo, or credit note.
          </p>
          {splitRows.map((row, i) => (
            <div
              key={i}
              className="flex flex-wrap gap-2 rounded-xl border border-gray-100 p-2 dark:border-gray-800"
            >
              <select
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                value={row.method}
                onChange={(e) => {
                  const next = [...splitRows]
                  next[i] = { ...next[i], method: e.target.value }
                  setSplitRows(next)
                }}
                aria-label={`Split method ${i + 1}`}
              >
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {labelFor(m)}
                  </option>
                ))}
              </select>
              <Input
                id={`sp-${i}`}
                type="number"
                className="max-w-[110px]"
                placeholder="Amount"
                value={row.amount}
                onChange={(e) => {
                  const next = [...splitRows]
                  next[i] = { ...next[i], amount: e.target.value }
                  setSplitRows(next)
                }}
                aria-label={`Split amount ${i + 1}`}
              />
              <Input
                id={`sr-${i}`}
                className="min-w-[120px] flex-1"
                placeholder="Reference / phone"
                value={row.reference}
                onChange={(e) => {
                  const next = [...splitRows]
                  next[i] = { ...next[i], reference: e.target.value }
                  setSplitRows(next)
                }}
                aria-label={`Split reference ${i + 1}`}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            className="w-full !py-2"
            onClick={() =>
              setSplitRows((r) => [...r, { method: methods[0], amount: '', reference: '' }])
            }
          >
            Add another line
          </Button>
        </div>
      )}
    </Modal>
  )
}
