import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import { getJSON } from '../../utils/storage'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'
import { apiRequest } from '../../utils/api'

const IDLE_MS = 15 * 60 * 1000

export function SessionLockOverlay() {
  const { tenantId } = useTenant()
  const { currentUser } = useAuth()
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const lastRef = useRef(0)

  useEffect(() => {
    if (!tenantId || !currentUser) return
    lastRef.current = Date.now()
    const tick = () => {
      if (Date.now() - lastRef.current > IDLE_MS) setLocked(true)
    }
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [tenantId, currentUser])

  useEffect(() => {
    function bump() {
      lastRef.current = Date.now()
    }
    const ev = ['pointerdown', 'keydown', 'scroll']
    for (const e of ev) window.addEventListener(e, bump, { passive: true })
    return () => {
      for (const e of ev) window.removeEventListener(e, bump)
    }
  }, [])

  const unlock = useCallback(async () => {
    if (!tenantId || !currentUser) return
    const p = pin.replace(/\D/g, '').trim() || pin.trim()
    if (currentUser.hasPin === false) {
      setLocked(false)
      setPin('')
      setErr('')
      lastRef.current = Date.now()
      return
    }
    if (!p) {
      setErr('Enter your PIN.')
      return
    }
    if (currentUser.token) {
      setUnlocking(true)
      setErr('')
      try {
        await apiRequest(
          `/api/auth/verify-session-pin?workspace=${encodeURIComponent(tenantId)}`,
          { method: 'POST', body: { pin: p }, token: currentUser.token },
        )
        setLocked(false)
        setPin('')
        lastRef.current = Date.now()
      } catch (e) {
        setErr(e?.message || 'PIN does not match your profile.')
      } finally {
        setUnlocking(false)
      }
      return
    }
    const users = getJSON(tenantId, 'users', [])
    const u = (Array.isArray(users) ? users : []).find((x) => x.id === currentUser.id)
    if (u && String(u.pin ?? '') === p) {
      setLocked(false)
      setPin('')
      setErr('')
      lastRef.current = Date.now()
    } else {
      setErr('PIN does not match your profile.')
    }
  }, [tenantId, currentUser, pin])

  if (!locked) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Session locked
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Enter your staff PIN for {currentUser?.name ?? 'this session'}.
        </p>
        <div className="mt-4 space-y-2">
          <Input
            id="unlock-pin"
            type="password"
            label="PIN"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setErr('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') unlock()
            }}
          />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
        <Button type="button" className="mt-4 w-full" onClick={unlock} disabled={unlocking}>
          {unlocking ? 'Checking…' : 'Unlock'}
        </Button>
      </div>
    </div>
  )
}
