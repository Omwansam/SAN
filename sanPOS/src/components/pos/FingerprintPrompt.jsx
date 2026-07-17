import { useEffect, useRef, useState } from 'react'
import { Fingerprint } from 'lucide-react'
import { apiRequest } from '../../utils/api'
import { getBridge, hasFingerprint } from '../../utils/platform'

// Desktop-only fingerprint capture panel. While mounted (and `active`), it
// loads the tenant's enrolled templates (served from the offline cache when
// disconnected), arms the reader, and reports touches: onMatch({id,name,role})
// for a recognized finger. Matching happens locally in the DigitalPersona
// helper — the same trust model as the existing local PIN fallback. Renders
// nothing on the web build or when no reader/helper is present.
export function FingerprintPrompt({ active = true, roles = null, token, tenantId, onMatch }) {
  const [state, setState] = useState('idle') // idle | ready | no-match | error
  const [message, setMessage] = useState('')
  const templatesRef = useRef([])
  const onMatchRef = useRef(onMatch)
  useEffect(() => {
    onMatchRef.current = onMatch
  }, [onMatch])

  const enabled = hasFingerprint() && active

  useEffect(() => {
    if (!enabled) return undefined
    const bridge = getBridge()
    let cancelled = false

    async function arm() {
      const status = await bridge.fingerprint.status()
      if (cancelled || !status.available) return
      try {
        const workspace = tenantId ? `?workspace=${encodeURIComponent(tenantId)}` : ''
        const res = await apiRequest(`/api/users/fingerprints${workspace}`, { token })
        const templates = Array.isArray(res?.data) ? res.data : []
        templatesRef.current = templates
        if (cancelled || !templates.length) {
          if (!cancelled && !templates.length) {
            setState('error')
            setMessage('No fingerprints enrolled yet.')
          }
          return
        }
        await bridge.fingerprint.startVerify(
          templates.map((t) => ({ userId: t.userId, template: t.template })),
        )
        if (!cancelled) {
          setState('ready')
          setMessage('Touch the fingerprint sensor')
        }
      } catch (error) {
        if (!cancelled) {
          setState('error')
          setMessage(error?.message || 'Fingerprint reader unavailable.')
        }
      }
    }

    const unsubscribe = bridge.fingerprint.onEvent((event) => {
      if (cancelled) return
      if (event.type === 'match') {
        const hit = templatesRef.current.find((t) => t.userId === event.userId)
        if (!hit) return
        if (roles && !roles.includes(hit.role)) {
          setState('no-match')
          setMessage(`${hit.name} does not have permission for this action.`)
          return
        }
        setState('ready')
        onMatchRef.current?.({ id: hit.userId, name: hit.name, role: hit.role })
      } else if (event.type === 'no-match') {
        setState('no-match')
        setMessage('Fingerprint not recognized — try again or use your PIN.')
      } else if (event.type === 'error') {
        setState('error')
        setMessage(event.message)
      } else if (event.type === 'reader') {
        setState(event.connected ? 'ready' : 'error')
        setMessage(event.connected ? 'Touch the fingerprint sensor' : 'Reader disconnected.')
      }
    })

    void arm()
    return () => {
      cancelled = true
      unsubscribe()
      void bridge.fingerprint.cancel()
    }
  }, [enabled, roles, token, tenantId])

  if (!enabled || state === 'idle') return null

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        state === 'error'
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
          : state === 'no-match'
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
            : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300'
      }`}
    >
      <Fingerprint
        className={`h-6 w-6 shrink-0 ${state === 'ready' ? 'animate-pulse text-[var(--brand)]' : ''}`}
        aria-hidden
      />
      <span>{message}</span>
    </div>
  )
}
