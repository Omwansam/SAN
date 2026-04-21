import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/shared/Button'
import { EmptyState } from '../components/shared/EmptyState'
import { Badge } from '../components/shared/Badge'
import { getPosExperience } from '../config/posExperience'
import { useBranch } from '../hooks/useBranch'
import { useTenant } from '../hooks/useTenant'
import { getJSON, setJSON } from '../utils/storage'
import { DEFAULT_KITCHEN_STATIONS } from '../utils/tenantDefaults'

const NEXT = { queued: 'preparing', preparing: 'ready', ready: 'served' }

function advancePrepStatus(status) {
  const s = status || 'queued'
  const n = NEXT[s]
  return n || 'served'
}

export default function Kitchen() {
  const { tenantId, tenantConfig } = useTenant()
  const { activeBranchId } = useBranch()
  const [queue, setQueue] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()

  const stations = useMemo(() => {
    const ks = tenantConfig?.kitchenStations
    return Array.isArray(ks) && ks.length ? ks : DEFAULT_KITCHEN_STATIONS
  }, [tenantConfig])

  const stationFilter = searchParams.get('station') || 'all'

  useEffect(() => {
    if (!tenantId) return
    queueMicrotask(() => setQueue(getJSON(tenantId, 'kitchenQueue', [])))
  }, [tenantId, activeBranchId])

  const persist = useCallback(
    (next) => {
      if (!tenantId) return
      setJSON(tenantId, 'kitchenQueue', next)
      setQueue(next)
    },
    [tenantId],
  )

  const pos = getPosExperience(tenantConfig)
  if (!pos.canUseKitchenPage) return <Navigate to="/pos" replace />

  function setStation(id) {
    const next = new URLSearchParams(searchParams)
    if (!id || id === 'all') next.delete('station')
    else next.set('station', id)
    setSearchParams(next, { replace: true })
  }

  function ticketVisible(ticket) {
    if (
      activeBranchId &&
      ticket.branchId &&
      ticket.branchId !== activeBranchId
    ) {
      return false
    }
    if (stationFilter === 'all') return true
    return ticket.items.some((it) => (it.stationId || 'hot') === stationFilter)
  }

  function visibleItems(ticket) {
    if (stationFilter === 'all') return ticket.items
    return ticket.items.filter((it) => (it.stationId || 'hot') === stationFilter)
  }

  function stationLabel(id) {
    return stations.find((s) => s.id === id)?.name ?? id
  }

  function advanceLine(ticket, lineKey) {
    const items = ticket.items.map((it, idx) => {
      const key = it.lineKey ?? `idx-${idx}`
      if (key !== lineKey) return it
      return { ...it, prepStatus: advancePrepStatus(it.prepStatus) }
    })
    const next = queue.map((q) => (q.id === ticket.id ? { ...q, items } : q))
    persist(next)
    toast.success('Line updated')
  }

  function advanceAll(ticket) {
    const items = ticket.items.map((it) => ({
      ...it,
      prepStatus: advancePrepStatus(it.prepStatus),
    }))
    const next = queue.map((q) => (q.id === ticket.id ? { ...q, items } : q))
    persist(next)
    toast.success('Updated')
  }

  function removeDone(ticketId) {
    const next = queue.filter((q) => q.id !== ticketId)
    persist(next)
  }

  const visibleQueue = queue.filter(ticketVisible)

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Kitchen display
      </h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={stationFilter === 'all' ? 'primary' : 'secondary'}
          className="!py-2"
          onClick={() => setStation('all')}
        >
          All stations
        </Button>
        {stations.map((s) => (
          <Button
            key={s.id}
            type="button"
            variant={stationFilter === s.id ? 'primary' : 'secondary'}
            className="!py-2"
            onClick={() => setStation(s.id)}
          >
            {s.name}
          </Button>
        ))}
      </div>
      {visibleQueue.length === 0 ? (
        <EmptyState
          title="No tickets"
          description={
            stationFilter === 'all'
              ? 'Completed POS sales enqueue here when KDS is on.'
              : 'Nothing routed to this station for open tickets.'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleQueue.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="font-mono text-xs text-gray-500">{t.orderId}</p>
              <ul className="mt-2 space-y-2 text-sm">
                {visibleItems(t).map((it) => {
                  const gi = t.items.indexOf(it)
                  const lineKey = it.lineKey ?? `idx-${gi}`
                  const sid = it.stationId || 'hot'
                  return (
                    <li
                      key={lineKey}
                      className="flex flex-col gap-2 rounded-lg border border-gray-100 p-2 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        <Badge className="mb-1 mr-1 text-[10px]">
                          {stationLabel(sid)}
                        </Badge>
                        <span>
                          {it.qty}× {it.name}
                        </span>
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{it.prepStatus || 'queued'}</Badge>
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1 !px-2 text-xs"
                          onClick={() => advanceLine(t, lineKey)}
                        >
                          Next state
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              {stationFilter !== 'all' ? (
                <p className="mt-2 text-xs text-gray-500">
                  Showing lines for this station only. Use &ldquo;All stations&rdquo; to advance
                  other lines.
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="secondary" className="flex-1 !py-2" onClick={() => advanceAll(t)}>
                  Advance all
                </Button>
                <Button type="button" variant="secondary" className="!py-2" onClick={() => removeDone(t.id)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
