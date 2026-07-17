// Classifies API traffic for the offline proxy. Anything unlisted passes
// through untouched and fails loudly when offline (reports, admin, onboarding).

export type RouteKind =
  | { kind: 'cache'; entity: string }
  | { kind: 'queue'; entity: 'order' | 'shift' | 'stock' }
  | { kind: 'pin-verify' }
  | { kind: 'passthrough' }

const CACHEABLE: Array<{ prefix: string; entity: string }> = [
  { prefix: '/api/products', entity: 'products' },
  { prefix: '/api/categories', entity: 'categories' },
  { prefix: '/api/customers', entity: 'customers' },
  { prefix: '/api/taxrates', entity: 'taxrates' },
  { prefix: '/api/discounts', entity: 'discounts' },
  { prefix: '/api/branches', entity: 'branches' },
  { prefix: '/api/users', entity: 'users' },
  { prefix: '/api/shifts', entity: 'shifts' },
  { prefix: '/api/orders', entity: 'orders' },
]

export function classifyRoute(method: string, path: string): RouteKind {
  const verb = method.toUpperCase()
  const clean = path.split('?')[0]

  if (verb === 'GET') {
    const hit = CACHEABLE.find((c) => clean === c.prefix || clean.startsWith(c.prefix + '/'))
    if (hit) return { kind: 'cache', entity: hit.entity }
    return { kind: 'passthrough' }
  }

  if (verb === 'POST') {
    if (clean === '/api/orders') return { kind: 'queue', entity: 'order' }
    if (clean === '/api/shifts' || /^\/api\/shifts\/[^/]+\/close$/.test(clean)) {
      return { kind: 'queue', entity: 'shift' }
    }
    if (clean === '/api/stock') return { kind: 'queue', entity: 'stock' }
    if (clean === '/api/auth/verify-manager-pin') return { kind: 'pin-verify' }
  }

  return { kind: 'passthrough' }
}
