import { getGlobalJSON, setGlobalJSON } from './storage'

export function listRegisteredTenants() {
  return getGlobalJSON('tenantRegistry', [])
}

export function registerTenantInGlobalList(entry) {
  const list = getGlobalJSON('tenantRegistry', [])
  const next = list.filter((t) => t.tenantId !== entry.tenantId)
  next.push({
    tenantId: entry.tenantId,
    businessName: entry.businessName,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  })
  setGlobalJSON('tenantRegistry', next)
}
