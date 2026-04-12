/**
 * First DNS label as workspace slug when host looks like slug.example.com.
 * @param {string} [hostname]
 * @returns {string|null}
 */
export function getWorkspaceSlugFromHostname(hostname) {
  if (typeof window === 'undefined' && !hostname) return null
  const h = (hostname ?? window.location.hostname).toLowerCase()
  if (h === 'localhost' || h === '127.0.0.1') return null
  const parts = h.split('.')
  if (parts.length < 2) return null
  const sub = parts[0]
  if (!sub || sub === 'www') return null
  return sub
}
