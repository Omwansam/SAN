import { useCallback, useEffect, useState } from 'react'
import {
  CUSTOMER_DISPLAY_CHANNEL,
  REGISTER_ONLINE_SEGMENT,
  readRegisterOnline,
  setRegisterOnlineAndBroadcast,
} from '../utils/customerDisplayChannel'
import { nsKey } from '../utils/storage'

/**
 * Syncs “customer display register online” for the active tenant (localStorage +
 * BroadcastChannel). Use on POS with `publish`; use on customer display read-only.
 */
export function useCustomerDisplayRegisterOnline(tenantId) {
  const [online, setOnline] = useState(() => readRegisterOnline(tenantId))

  useEffect(() => {
    setOnline(readRegisterOnline(tenantId))
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return undefined
    const key = nsKey(tenantId, REGISTER_ONLINE_SEGMENT)
    function onStorage(e) {
      if (e.key !== key) return
      if (e.newValue == null) {
        setOnline(true)
        return
      }
      try {
        setOnline(JSON.parse(e.newValue) === true)
      } catch {
        setOnline(true)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [tenantId])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    let ch
    try {
      ch = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL)
    } catch {
      return undefined
    }
    ch.onmessage = (ev) => {
      const data = ev?.data
      if (data?.type === 'register_status' && typeof data.online === 'boolean') {
        setOnline(data.online)
      }
    }
    return () => ch.close()
  }, [])

  const publish = useCallback(
    (next) => {
      if (!tenantId) return
      setOnline(Boolean(next))
      setRegisterOnlineAndBroadcast(tenantId, Boolean(next))
    },
    [tenantId],
  )

  return { online, publish }
}
