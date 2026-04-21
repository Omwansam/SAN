import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_IDLE_MS = 10_000

/**
 * After `idleMs` with no pointer or keyboard activity, sets overlay open.
 * While the overlay is closed, `pointerdown` (covers touch) and `keydown` on `window`
 * count as activity. While open, use `notifyUserActivity` from the splash surface so
 * one tap is not handled twice (window capture + target).
 * @param {{ idleMs?: number, paused?: boolean }} options
 * @returns {{ open: boolean, notifyUserActivity: () => void }}
 */
export function useLoginIdleOverlay({
  idleMs = DEFAULT_IDLE_MS,
  paused = false,
} = {}) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const timerRef = useRef(null)
  const pausedRef = useRef(paused)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleIdle = useCallback(() => {
    if (pausedRef.current) return
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      if (pausedRef.current) return
      openRef.current = true
      setOpen(true)
    }, idleMs)
  }, [clearTimer, idleMs])

  const bump = useCallback(() => {
    if (pausedRef.current) return

    if (openRef.current) {
      openRef.current = false
      setOpen(false)
    }

    scheduleIdle()
  }, [scheduleIdle])

  useEffect(() => {
    if (paused) return undefined
    scheduleIdle()
    return () => {
      clearTimer()
    }
  }, [paused, scheduleIdle, clearTimer])

  useEffect(() => {
    if (paused) return undefined

    const opts = { capture: true }
    window.addEventListener('keydown', bump, opts)
    if (!open) {
      window.addEventListener('pointerdown', bump, opts)
    }
    return () => {
      window.removeEventListener('keydown', bump, opts)
      window.removeEventListener('pointerdown', bump, opts)
    }
  }, [paused, bump, open])

  useEffect(() => {
    if (!paused) return undefined
    clearTimer()
    openRef.current = false
    // Defer close; do not clear this timeout on cleanup so a fast unpause cannot
    // cancel the close and leave the overlay visible during submit.
    window.setTimeout(() => {
      setOpen(false)
    }, 0)
    return undefined
  }, [paused, clearTimer])

  return { open, notifyUserActivity: bump }
}
