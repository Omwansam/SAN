/** Cross-window sync for customer-facing display (same origin). */
import { getJSON, setJSON } from './storage'

export const CUSTOMER_DISPLAY_CHANNEL = 'sanpos:customer-display'

/** Tenant-scoped flag: customer-facing “register open” / online for splash. */
export const REGISTER_ONLINE_SEGMENT = 'customerDisplayRegisterOnline'

export function readRegisterOnline(tenantId) {
  if (!tenantId) return true
  const v = getJSON(tenantId, REGISTER_ONLINE_SEGMENT, null)
  if (typeof v !== 'boolean') return true
  return v
}

export function setRegisterOnlineAndBroadcast(tenantId, online) {
  if (!tenantId) return
  setJSON(tenantId, REGISTER_ONLINE_SEGMENT, Boolean(online))
  postCustomerDisplayMessage({ type: 'register_status', online: Boolean(online) })
}

/**
 * @param {{ type: 'sale_complete'; total?: number; partial?: boolean; at?: string } | { type: 'register_status'; online: boolean }} payload
 */
export function postCustomerDisplayMessage(payload) {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    const ch = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL)
    ch.postMessage(payload)
    ch.close()
  } catch {
    /* ignore */
  }
}
