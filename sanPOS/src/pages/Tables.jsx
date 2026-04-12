import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { getPosExperience } from '../config/posExperience'
import { useTenant } from '../hooks/useTenant'
import { getJSON, setJSON } from '../utils/storage'

export default function Tables() {
  const { tenantId, tenantConfig } = useTenant()
  const [tables, setTables] = useState([])
  const drag = useRef(null)

  useEffect(() => {
    if (!tenantId) return
    const map = getJSON(tenantId, 'tableMap', { tables: [] })
    queueMicrotask(() => setTables(map.tables?.length ? map.tables : []))
  }, [tenantId])

  const persist = useCallback(
    (next) => {
      if (!tenantId) return
      setJSON(tenantId, 'tableMap', { tables: next })
    },
    [tenantId],
  )

  const pos = getPosExperience(tenantConfig)
  if (!pos.canUseTablesPage) return <Navigate to="/pos" replace />

  function onPointerDown(e, id) {
    const t = tables.find((x) => x.id === id)
    if (!t) return
    drag.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: t.x,
      origY: t.y,
    }
    ;(e.currentTarget).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    setTables((prev) =>
      prev.map((t) =>
        t.id === d.id
          ? { ...t, x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) }
          : t,
      ),
    )
  }

  function onPointerUp(e) {
    if (drag.current) {
      setTables((prev) => {
        persist(prev)
        return prev
      })
      toast.success('Layout saved')
    }
    drag.current = null
    try {
      ;(e.currentTarget).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Tables
      </h1>
      <div
        className="relative h-[420px] rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="application"
        aria-label="Floor plan"
      >
        {tables.map((t) => (
          <button
            key={t.id}
            type="button"
            className="absolute flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-sm font-semibold shadow dark:border-gray-600 dark:bg-gray-800"
            style={{ left: t.x, top: t.y }}
            onPointerDown={(e) => onPointerDown(e, t.id)}
            aria-label={`Table ${t.label} ${t.status}`}
          >
            {t.label}
            <span className="text-[10px] font-normal capitalize text-gray-500">{t.status}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
