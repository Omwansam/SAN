import { useEffect, useRef } from 'react'

// Global listener for HID keyboard-wedge barcode scanners (USB and Bluetooth
// scanners both present as keyboards). Scanners "type" the code in a burst far
// faster than a human (inter-key gap well under ~35ms) and finish with Enter.
// We buffer those bursts at the window level so a scan lands in the cart no
// matter what has focus, while human-speed typing in inputs is left alone.
//
// Works identically in the web build — no Electron involvement.

const MAX_INTERKEY_MS = 35
const MIN_LENGTH = 4

export function useScannerWedge(onScan, { enabled = true } = {}) {
  const handlerRef = useRef(onScan)
  useEffect(() => {
    handlerRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) return undefined

    let buffer = ''
    let lastKeyAt = 0
    let burst = false

    function reset() {
      buffer = ''
      burst = false
    }

    function onKeyDown(event) {
      if (event.ctrlKey || event.altKey || event.metaKey) return
      const now = performance.now()
      const gap = now - lastKeyAt
      lastKeyAt = now

      if (event.key === 'Enter') {
        if (burst && buffer.length >= MIN_LENGTH && gap <= MAX_INTERKEY_MS) {
          event.preventDefault()
          event.stopPropagation()
          const code = buffer
          reset()
          handlerRef.current?.(code)
        } else {
          reset()
        }
        return
      }

      if (event.key.length !== 1) {
        reset()
        return
      }

      if (gap > MAX_INTERKEY_MS) {
        // new potential burst starting from this key
        buffer = event.key
        burst = false
        return
      }

      buffer += event.key
      if (buffer.length >= 3) burst = true
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [enabled])
}
