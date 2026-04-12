import { useState } from 'react'
import { Minus, Pencil, Plus, Trash2 } from 'lucide-react'

/** Inputs inside frosted express cart (light + dark). */
const expressInputClass =
  '!border-gray-200/90 !bg-white/75 !py-1.5 text-xs !text-gray-900 dark:!border-white/10 dark:!bg-gray-950/30 dark:!text-gray-100'
import { formatCurrency } from '../../utils/currency'
import { lineNet } from '../../utils/posTotals'
import { Badge } from '../shared/Badge'
import { Input } from '../shared/Input'

export function CartItem({
  line,
  tenantConfig,
  prescriptions,
  onQty,
  onRemove,
  onUpdateLine,
  compact = false,
  /** Tighter express row for narrow desktop cart (~18rem). */
  dense = false,
  /** `express` = compact row with thumb (restaurant express cart). */
  visualStyle = 'default',
  imageUrl = '',
}) {
  const net = lineNet(line)
  const [expand, setExpand] = useState(false)

  const rxBlock =
    prescriptions && onUpdateLine ? (
      <div
        className={`space-y-2 border-t pt-3 ${
          visualStyle === 'express'
            ? 'mt-3 border-gray-200/70 dark:border-white/10'
            : 'mt-3 border-gray-100 dark:border-gray-700'
        }`}
      >
        <Input
          id={`rx-${line.lineId}`}
          label="Rx #"
          className={visualStyle === 'express' ? expressInputClass : '!py-1.5 text-xs'}
          value={line.rxNumber ?? ''}
          onChange={(e) => onUpdateLine(line.lineId, { rxNumber: e.target.value })}
          aria-label="Prescription number"
        />
        <Input
          id={`pr-${line.lineId}`}
          label="Prescriber"
          className={visualStyle === 'express' ? expressInputClass : '!py-1.5 text-xs'}
          value={line.prescriber ?? ''}
          onChange={(e) => onUpdateLine(line.lineId, { prescriber: e.target.value })}
          aria-label="Prescriber"
        />
        <Input
          id={`dea-${line.lineId}`}
          label="Prescriber DEA"
          className={visualStyle === 'express' ? expressInputClass : '!py-1.5 text-xs'}
          placeholder="FA1234567"
          value={line.deaNumber ?? ''}
          onChange={(e) =>
            onUpdateLine(line.lineId, {
              deaNumber: e.target.value.toUpperCase(),
            })
          }
          aria-label="DEA number"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            id={`ra-${line.lineId}`}
            label="Refills auth"
            type="number"
            min={0}
            max={11}
            className={visualStyle === 'express' ? expressInputClass : '!py-1.5 text-xs'}
            value={String(line.refillsAuthorized ?? 0)}
            onChange={(e) =>
              onUpdateLine(line.lineId, {
                refillsAuthorized: Number(e.target.value),
              })
            }
            aria-label="Refills authorized"
          />
          <Input
            id={`rr-${line.lineId}`}
            label="Refills left"
            type="number"
            min={0}
            className={visualStyle === 'express' ? expressInputClass : '!py-1.5 text-xs'}
            value={String(line.refillsRemaining ?? 0)}
            onChange={(e) =>
              onUpdateLine(line.lineId, {
                refillsRemaining: Number(e.target.value),
              })
            }
            aria-label="Refills remaining"
          />
        </div>
        <Input
          id={`dob-${line.lineId}`}
          label="Patient DOB"
          type="date"
          className={visualStyle === 'express' ? expressInputClass : '!py-1.5 text-xs'}
          value={line.patientDOB ?? ''}
          onChange={(e) => onUpdateLine(line.lineId, { patientDOB: e.target.value })}
          aria-label="Patient date of birth"
        />
        {line.controlled ? (
          <div
            className={`space-y-2 rounded-lg border p-2 ${
              visualStyle === 'express'
                ? 'border-amber-300/70 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-950/25'
                : 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
            }`}
          >
            <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200">
              Controlled pickup verification
            </p>
            <label className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200">
              <input
                type="checkbox"
                checked={Boolean(line.pickupVerified)}
                onChange={(e) =>
                  onUpdateLine(line.lineId, {
                    pickupVerified: e.target.checked,
                  })
                }
                aria-label="Pickup ID verified"
              />
              ID verified at pickup
            </label>
            <Input
              id={`id4-${line.lineId}`}
              label="Photo ID last 4 digits"
              inputMode="numeric"
              maxLength={4}
              className={visualStyle === 'express' ? expressInputClass : '!py-1.5 text-xs'}
              value={line.pickupIdLast4 ?? ''}
              onChange={(e) =>
                onUpdateLine(line.lineId, {
                  pickupIdLast4: e.target.value.replace(/\D/g, '').slice(0, 4),
                })
              }
              aria-label="Last four digits of photo ID"
            />
          </div>
        ) : null}
      </div>
    ) : null

  if (visualStyle === 'express') {
    const thumb = dense ? 'h-10 w-10' : 'h-[52px] w-[52px]'
    const pad = dense ? 'p-2' : 'p-3'
    const gap = dense ? 'gap-2' : 'gap-3'
    return (
      <div
        className={`rounded-2xl border border-gray-200/70 bg-white/50 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.06] ${pad}`}
      >
        <div className={`flex ${gap}`}>
          <div
            className={`relative ${thumb} shrink-0 overflow-hidden rounded-full ring-2 ring-gray-200/80 dark:ring-white/15`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-lg dark:from-zinc-700 dark:to-zinc-900">
                🍽
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`truncate font-bold text-gray-900 dark:text-white ${dense ? 'text-sm' : ''}`}
                >
                  {line.name}
                </p>
                {line.controlled ? (
                  <Badge variant="warning" className="mt-0.5 text-[9px]">
                    Controlled
                  </Badge>
                ) : null}
                <p
                  className={`mt-1 truncate text-gray-600 dark:text-gray-400 ${dense ? 'text-[11px]' : 'text-xs'}`}
                >
                  {line.note?.trim() ? line.note : 'Standard'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p
                  className={`font-bold tabular-nums text-gray-900 dark:text-white ${dense ? 'text-xs' : 'text-sm'}`}
                >
                  {formatCurrency(net, tenantConfig)}
                </p>
                <button
                  type="button"
                  className={`flex items-center justify-center rounded-full bg-white text-zinc-900 shadow-md transition hover:bg-gray-100 ${dense ? 'h-8 w-8' : 'h-9 w-9'}`}
                  onClick={() => setExpand((e) => !e)}
                  aria-label="Edit line"
                >
                  <Pencil
                    className={dense ? 'h-3.5 w-3.5' : 'h-4 w-4'}
                    strokeWidth={2.25}
                  />
                </button>
              </div>
            </div>
            <div className={`flex items-center ${dense ? 'mt-2 gap-1.5' : 'mt-2.5 gap-2'}`}>
              <button
                type="button"
                  className={`flex items-center justify-center rounded-full border border-gray-300/90 bg-white/90 text-gray-800 transition hover:bg-white dark:border-white/15 dark:bg-black/35 dark:text-white dark:hover:bg-black/50 ${dense ? 'h-7 w-7' : 'h-8 w-8'}`}
                onClick={() => onQty(line.lineId, line.qty - 1)}
                aria-label="Decrease quantity"
              >
                <Minus className={dense ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </button>
              <span
                className={`min-w-[1.75rem] text-center font-bold tabular-nums text-gray-900 dark:text-white ${dense ? 'text-xs' : 'text-sm'}`}
              >
                {line.qty}
              </span>
              <button
                type="button"
                className={`flex items-center justify-center rounded-full border border-white/15 bg-gradient-to-b from-red-500 to-red-900 text-white shadow-md ${dense ? 'h-7 w-7' : 'h-8 w-8'}`}
                onClick={() => onQty(line.lineId, line.qty + 1)}
                aria-label="Increase quantity"
              >
                <Plus className={dense ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              </button>
            </div>
            {expand ? (
              <div className="mt-3 space-y-2 border-t border-gray-200/80 pt-3 dark:border-white/10">
                <Input
                  id={`note-${line.lineId}`}
                  className="!border-gray-200/90 !bg-white/80 !py-2 text-sm !text-gray-900 placeholder:!text-gray-500 dark:!border-white/10 dark:!bg-gray-950/30 dark:!text-gray-100"
                  placeholder="e.g. Thin crust, no onion"
                  value={line.note ?? ''}
                  onChange={(e) =>
                    onUpdateLine(line.lineId, { note: e.target.value })
                  }
                  aria-label="Line note"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className={expressInputClass}
                    value={String(line.unitPrice ?? 0)}
                    onChange={(e) =>
                      onUpdateLine(line.lineId, {
                        unitPrice: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    aria-label="Unit price"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className={expressInputClass}
                    value={String(line.discountPercent ?? 0)}
                    onChange={(e) =>
                      onUpdateLine(line.lineId, {
                        discountPercent: Math.min(
                          100,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      })
                    }
                    aria-label="Line discount percent"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Unit price · line disc. %
                  </p>
                  <button
                    type="button"
                    className="rounded-full border border-red-300/80 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25"
                    onClick={() => onRemove(line.lineId)}
                    aria-label={`Remove ${line.name}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {rxBlock}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${
        compact ? 'p-2.5 shadow-sm' : 'p-3'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-gray-900 dark:text-gray-100">{line.name}</p>
            {line.controlled ? (
              <Badge variant="warning" className="text-[10px]">
                Controlled
              </Badge>
            ) : null}
          </div>
          {line.note ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{line.note}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          onClick={() => onRemove(line.lineId)}
          aria-label={`Remove ${line.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-gray-800 ${
          compact ? 'mt-2 gap-2 pt-2' : 'mt-3 pt-3'
        }`}
      >
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={`rounded-lg border border-gray-200 dark:border-gray-600 ${
              compact ? 'p-1' : 'p-1.5'
            }`}
            onClick={() => onQty(line.lineId, line.qty - 1)}
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums">
            {line.qty}
          </span>
          <button
            type="button"
            className={`rounded-lg border border-gray-200 dark:border-gray-600 ${
              compact ? 'p-1' : 'p-1.5'
            }`}
            onClick={() => onQty(line.lineId, line.qty + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div
          className={`flex flex-1 flex-wrap items-end sm:flex-nowrap ${
            compact ? 'gap-2' : 'gap-3'
          }`}
        >
          <div className={compact ? 'min-w-[5.5rem] flex-1' : 'min-w-[100px] flex-1'}>
            <label
              className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              htmlFor={`up-${line.lineId}`}
            >
              Unit price
            </label>
            <Input
              id={`up-${line.lineId}`}
              type="number"
              min={0}
              step={0.01}
              className="!mt-0.5 !py-1.5 text-sm tabular-nums"
              value={String(line.unitPrice ?? 0)}
              onChange={(e) =>
                onUpdateLine(line.lineId, {
                  unitPrice: Math.max(0, Number(e.target.value) || 0),
                })
              }
              aria-label={`Unit price for ${line.name}`}
            />
          </div>
          <div className="min-w-[72px]">
            <label
              className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
              htmlFor={`dp-${line.lineId}`}
            >
              Line disc. %
            </label>
            <Input
              id={`dp-${line.lineId}`}
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="!mt-0.5 !py-1.5 text-sm tabular-nums"
              value={String(line.discountPercent ?? 0)}
              onChange={(e) =>
                onUpdateLine(line.lineId, {
                  discountPercent: Math.min(
                    100,
                    Math.max(0, Number(e.target.value) || 0),
                  ),
                })
              }
              aria-label={`Line discount percent for ${line.name}`}
            />
          </div>
          <div className="ml-auto text-right sm:ml-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Line total
            </p>
            <p className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-50">
              {formatCurrency(net, tenantConfig)}
            </p>
          </div>
        </div>
      </div>

      {rxBlock}
    </div>
  )
}
