import { getJSON, setJSON } from './storage'
import { newId } from './uuid'

const SEGMENT = 'stockLogs'

/**
 * @param {string} tenantId
 * @param {object} entry
 */
export function appendStockLog(tenantId, entry) {
  if (!tenantId) return
  const list = getJSON(tenantId, SEGMENT, [])
  const next = [
    {
      id: newId(),
      createdAt: new Date().toISOString(),
      ...entry,
    },
    ...(Array.isArray(list) ? list : []),
  ].slice(0, 5000)
  setJSON(tenantId, SEGMENT, next)
}

export function getStockLogs(tenantId) {
  const list = getJSON(tenantId, SEGMENT, [])
  return Array.isArray(list) ? list : []
}
