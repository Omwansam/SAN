const PREFIX = 'pos'

/** @param {string} tenantId */
export function nsKey(tenantId, segment) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new TypeError('nsKey: tenantId must be a non-empty string')
  }
  return `${PREFIX}:${tenantId}:${segment}`
}

/** Keys not tied to a tenant (registry, super-admin helpers). */
export function globalKey(segment) {
  return `${PREFIX}:global:${segment}`
}

/**
 * @template T
 * @param {string} tenantId
 * @param {string} segment
 * @param {T} [fallback]
 * @returns {T}
 */
export function getJSON(tenantId, segment, fallback = null) {
  try {
    const raw = localStorage.getItem(nsKey(tenantId, segment))
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function setJSON(tenantId, segment, value) {
  localStorage.setItem(nsKey(tenantId, segment), JSON.stringify(value))
}

export function removeJSON(tenantId, segment) {
  localStorage.removeItem(nsKey(tenantId, segment))
}

/**
 * @template T
 * @param {string} segment
 * @param {T} [fallback]
 */
export function getGlobalJSON(segment, fallback = null) {
  try {
    const raw = localStorage.getItem(globalKey(segment))
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function setGlobalJSON(segment, value) {
  localStorage.setItem(globalKey(segment), JSON.stringify(value))
}

export function removeGlobalJSON(segment) {
  localStorage.removeItem(globalKey(segment))
}
