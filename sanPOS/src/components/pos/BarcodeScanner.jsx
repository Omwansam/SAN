import { useCallback, useEffect, useRef, useState } from 'react'
import { Flashlight, RefreshCw, ScanLine, X } from 'lucide-react'
import {
  BARCODE_SCAN_FORMATS,
  isBarcodeDetectorSupported,
} from '../../utils/barcodeDetectorSupport'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'

function playScanBeep() {
  try {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 920
    gain.gain.value = 0.06
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.07)
    osc.onended = () => {
      ctx.close().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

function vibrateShort() {
  try {
    globalThis.navigator?.vibrate?.(35)
  } catch {
    /* ignore */
  }
}

/**
 * Camera + BarcodeDetector UI. When API is missing, shows manual entry.
 *
 * @param {{
 *   active: boolean
 *   onClose: () => void
 *   onDetected: (raw: string) => void
 *   continuous?: boolean
 *   playBeep?: boolean
 *   vibrate?: boolean
 * }} props
 */
export function BarcodeScanner({
  active,
  onClose,
  onDetected,
  continuous = false,
  playBeep = true,
  vibrate = true,
}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)
  const onDetectedRef = useRef(onDetected)
  const lastEmitRef = useRef({ code: '', at: 0 })
  const [facingMode, setFacingMode] = useState(
    /** @type {'environment' | 'user'} */ ('environment'),
  )
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [cameraError, setCameraError] = useState(/** @type {string | null} */ (null))
  const [flash, setFlash] = useState(false)
  const [manual, setManual] = useState('')
  const [scanHistory, setScanHistory] = useState(/** @type {string[]} */ ([]))

  const supported = isBarcodeDetectorSupported()

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  const stopStream = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const s = streamRef.current
    if (s) {
      for (const t of s.getTracks()) t.stop()
      streamRef.current = null
    }
    detectorRef.current = null
    const v = videoRef.current
    if (v) v.srcObject = null
    setTorchSupported(false)
    setTorchOn(false)
  }, [])

  const emit = useCallback(
    (raw) => {
      const code = String(raw ?? '').trim()
      if (!code) return
      const now = Date.now()
      if (continuous && code === lastEmitRef.current.code && now - lastEmitRef.current.at < 900) {
        return
      }
      lastEmitRef.current = { code, at: now }
      setFlash(true)
      window.setTimeout(() => setFlash(false), 160)
      if (playBeep) playScanBeep()
      if (vibrate) vibrateShort()
      setScanHistory((h) => {
        const next = [code, ...h.filter((x) => x !== code)]
        return next.slice(0, 8)
      })
      onDetectedRef.current(code)
      if (!continuous) {
        stopStream()
      }
    },
    [continuous, playBeep, vibrate, stopStream],
  )

  const tryTorch = useCallback(async (on) => {
    const track = streamRef.current?.getVideoTracks?.()[0]
    if (!track?.applyConstraints) return
    try {
      await track.applyConstraints({ advanced: [{ torch: Boolean(on) }] })
      setTorchOn(Boolean(on))
    } catch {
      setTorchOn(false)
    }
  }, [])

  useEffect(() => {
    if (!active || !supported) return undefined

    let cancelled = false
    const clearErrId = window.setTimeout(() => {
      setCameraError(null)
    }, 0)

    async function start() {
      stopStream()
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        const caps = track?.getCapabilities?.() ?? {}
        setTorchSupported(Boolean(caps.torch))

        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }

        const Detector = globalThis.BarcodeDetector
        const detector = new Detector({ formats: [...BARCODE_SCAN_FORMATS] })
        detectorRef.current = detector

        let lastFrameAt = 0
        const loop = async (ts) => {
          if (cancelled || !detectorRef.current || !videoRef.current || !streamRef.current)
            return
          if (ts - lastFrameAt < 90) {
            rafRef.current = requestAnimationFrame(loop)
            return
          }
          lastFrameAt = ts
          try {
            const codes = await detectorRef.current.detect(videoRef.current)
            if (codes.length > 0) {
              const raw = codes[0].rawValue?.trim()
              if (raw) {
                emit(raw)
                if (!continuous) return
              }
            }
          } catch {
            /* per-frame */
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e) {
        const name = e?.name ?? ''
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError('Camera permission was denied. Allow camera access or use manual entry below.')
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.')
        } else {
          setCameraError('Could not start the camera. Try again or use manual entry.')
        }
      }
    }

    start()
    return () => {
      cancelled = true
      window.clearTimeout(clearErrId)
      stopStream()
    }
  }, [active, supported, facingMode, continuous, emit, stopStream])

  useEffect(() => {
    if (active) return undefined
    const id = window.setTimeout(() => {
      setManual('')
      setCameraError(null)
      setFlash(false)
    }, 0)
    return () => window.clearTimeout(id)
  }, [active])

  const onManualSubmit = useCallback(
    (e) => {
      e.preventDefault()
      const v = manual.trim()
      if (!v) return
      emit(v)
      setManual('')
      if (!continuous) onClose()
    },
    [manual, emit, continuous, onClose],
  )

  if (!active) return null

  if (!supported) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-medium">Camera scanning not supported in this browser.</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
            Use <strong>Chrome</strong> or <strong>Edge</strong> on desktop or Android for live
            scanning (Barcode Detector API).
          </p>
        </div>
        <form onSubmit={onManualSubmit} className="space-y-3">
          <Input
            label="Enter barcode"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Scan or type code…"
            autoComplete="off"
            inputMode="numeric"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="!py-2 text-sm">
              Add to cart lookup
            </Button>
            <Button type="button" variant="secondary" className="!py-2 text-sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-3">
      <div
        className={`pointer-events-none absolute inset-0 z-10 rounded-2xl bg-white/40 transition-opacity duration-150 dark:bg-white/20 ${
          flash ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden
      />

      {cameraError ? (
        <div className="rounded-2xl border border-red-200/90 bg-red-50/95 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100">
          <p>{cameraError}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="!py-1.5 !px-3 text-xs"
              onClick={() => {
                setCameraError(null)
                setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
              }}
            >
              <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Retry camera
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-2xl bg-black shadow-inner ring-1 ring-black/20 dark:ring-white/10">
        <video
          ref={videoRef}
          className="aspect-[4/3] max-h-[min(52vh,28rem)] w-full object-cover sm:aspect-video sm:max-h-[min(48vh,22rem)]"
          muted
          playsInline
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div
            className="aspect-[2/1] w-[min(88%,20rem)] rounded-2xl border-2 border-[var(--brand)] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] dark:shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            aria-hidden
          />
        </div>
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
          <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            Align barcode in frame
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {torchSupported ? (
          <Button
            type="button"
            className="!py-1.5 !px-3 text-xs"
            variant={torchOn ? 'primary' : 'secondary'}
            onClick={() => tryTorch(!torchOn)}
            aria-pressed={torchOn}
          >
            <Flashlight className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Torch
          </Button>
        ) : null}
        <Button
          type="button"
          className="!py-1.5 !px-3 text-xs"
          variant="secondary"
          onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
        >
          <RefreshCw className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Flip camera
        </Button>
        <Button type="button" className="!py-1.5 !px-3 text-xs" variant="secondary" onClick={onClose}>
          <X className="mr-1 inline h-3.5 w-3.5" aria-hidden />
          Close
        </Button>
      </div>

      <form
        onSubmit={onManualSubmit}
        className="rounded-2xl border border-gray-200/90 bg-white/70 p-3 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/70"
      >
        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          <ScanLine className="mr-1 inline h-3.5 w-3.5 align-text-bottom" aria-hidden />
          Manual entry
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={null}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Type barcode, press Enter"
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="!py-2 !px-4 text-sm shrink-0">
            Lookup
          </Button>
        </div>
      </form>

      {scanHistory.length > 0 ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Recent: </span>
          {scanHistory.slice(0, 5).join(' · ')}
        </div>
      ) : null}
    </div>
  )
}
