import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { formatCurrency } from '../../utils/currency'
import { lineNet } from '../../utils/posTotals'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'

export function SplitBillModal({
  open,
  onOpenChange,
  items,
  tenantConfig,
  /** Pay only selected line IDs (opens parent payment flow). */
  onPaySelected,
  /**
   * Equal N-way split on full cart; optional per-party tips (flat).
   * @param {number} parts
   * @param {number[]} tipsPerParty
   */
  onEqualSplitWithTips,
}) {
  const [sel, setSel] = useState(() => new Set())
  const [parties, setParties] = useState(3)
  const [tips, setTips] = useState(() => Array.from({ length: 8 }, () => ''))

  const lines = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        lineTotal: lineNet(it),
      })),
    [items],
  )

  const n = Math.min(8, Math.max(2, Math.floor(Number(parties)) || 2))

  function toggle(id) {
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function paySelected() {
    const ids = [...sel]
    if (!ids.length) {
      toast.error('Select at least one line.')
      return
    }
    onPaySelected(ids)
    setSel(new Set())
    onOpenChange(false)
  }

  function runEqualSplit() {
    const tipNums = Array.from({ length: n }, (_, i) => Number(tips[i]) || 0)
    onEqualSplitWithTips(n, tipNums)
    setSel(new Set())
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) setSel(new Set())
        onOpenChange(o)
      }}
      title="Split bill"
      description="Pay selected lines, or split the cart total across parties with optional per-party tips."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" variant="secondary" onClick={runEqualSplit}>
            Open equal split ({n} parties)
          </Button>
          <Button type="button" onClick={paySelected}>
            Pay selected lines
          </Button>
        </>
      }
    >
      <div className="mb-4 space-y-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Parties (2–8)
          <select
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            value={n}
            onChange={(e) => setParties(Number(e.target.value))}
            aria-label="Number of parties"
          >
            {[2, 3, 4, 5, 6, 7, 8].map((p) => (
              <option key={p} value={p}>
                {p} parties
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Optional flat tip per party (same currency as the sale). Payment total becomes cart total
          plus tips.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: n }, (_, i) => (
            <Input
              key={i}
              id={`tip-${i}`}
              label={`Party ${i + 1} tip`}
              type="number"
              min={0}
              value={tips[i]}
              onChange={(e) => {
                const next = [...tips]
                next[i] = e.target.value
                setTips(next)
              }}
              aria-label={`Party ${i + 1} tip amount`}
            />
          ))}
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Cart is empty.</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {lines.map((it) => (
            <li key={it.lineId}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={sel.has(it.lineId)}
                  onChange={() => toggle(it.lineId)}
                  aria-label={`Select ${it.name}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {it.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {it.qty}× — {formatCurrency(it.lineTotal, tenantConfig)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
