import { getJSON, setJSON } from './storage'
import { newId } from './uuid'

export function appendDispensingEntry(tenantId, entry) {
  const list = getJSON(tenantId, 'dispensingLog', [])
  list.unshift({
    id: newId(),
    createdAt: new Date().toISOString(),
    ...entry,
  })
  setJSON(tenantId, 'dispensingLog', list.slice(0, 500))
}
