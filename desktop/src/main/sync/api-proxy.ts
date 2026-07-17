import { net } from 'electron'
import type { ApiProxyRequest, ApiProxyResponse } from '../../shared/ipc-contract'
import { getSettings } from '../settings'
import { getDb } from './db'
import { classifyRoute } from './route-table'
import { enqueue } from './outbox'
import { saveSession } from './session-store'
import { verifyPinOffline } from './offline-credentials'
import { notifyQueued } from './engine'

// All renderer HTTP funnels through here (the api.js bridge delegation).
// Online: forward, remember auth, cache catalog GET responses.
// Offline: serve catalog from cache, queue sales/shifts/stock, verify PINs locally.

function baseUrl(): string {
  const { serverUrl } = getSettings()
  return (serverUrl || 'http://localhost:5000').replace(/\/+$/, '')
}

function cacheKey(path: string): string {
  return path
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (err.name === 'AbortError') return true
  return /fetch failed|net::|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ERR_(CONNECTION|INTERNET|NAME|NETWORK|ADDRESS)/i.test(
    `${err.message} ${(err as { code?: string }).code ?? ''}`,
  )
}

async function doFetch(req: ApiProxyRequest): Promise<{ status: number; payload: unknown }> {
  const settings = getSettings()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 15000)
  try {
    const response = await net.fetch(`${baseUrl()}${req.path}`, {
      method: req.method ?? 'GET',
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(req.token ? { Authorization: `Bearer ${req.token}` } : {}),
        ...(settings.workspaceSlug ? { 'x-workspace-slug': settings.workspaceSlug } : {}),
        ...(req.headers ?? {}),
      },
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
    })
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    return { status: response.status, payload }
  } finally {
    clearTimeout(timeout)
  }
}

function storeCache(entity: string, path: string, status: number, payload: unknown): void {
  getDb()
    .prepare(
      `INSERT INTO http_cache (cache_key, entity, path, status, payload, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         status = excluded.status, payload = excluded.payload, updated_at = excluded.updated_at`,
    )
    .run(cacheKey(path), entity, path, status, JSON.stringify(payload ?? null), new Date().toISOString())
}

function readCache(path: string): { status: number; payload: unknown } | null {
  const row = getDb()
    .prepare(`SELECT status, payload FROM http_cache WHERE cache_key = ?`)
    .get(cacheKey(path)) as { status: number; payload: string } | undefined
  if (!row) return null
  return { status: row.status, payload: JSON.parse(row.payload) }
}

function synthesizeQueuedResponse(
  entity: 'order' | 'shift' | 'stock',
  req: ApiProxyRequest,
  clientRef: string,
): ApiProxyResponse {
  const body = (req.body ?? {}) as Record<string, unknown>
  const now = new Date().toISOString()
  if (entity === 'order') {
    const payment = body.payment as Record<string, unknown> | undefined
    return {
      ok: true,
      status: 201,
      offline: true,
      payload: {
        success: true,
        offline: true,
        data: {
          ...body,
          id: clientRef,
          clientRef,
          createdAt: now,
          payments: payment ? [{ ...payment, id: clientRef, createdAt: now }] : [],
        },
      },
    }
  }
  return {
    ok: true,
    status: 201,
    offline: true,
    payload: {
      success: true,
      offline: true,
      data: { ...body, id: clientRef, clientRef, createdAt: now },
    },
  }
}

export async function handleApiRequest(req: ApiProxyRequest): Promise<ApiProxyResponse> {
  const route = classifyRoute(req.method ?? 'GET', req.path)

  // Remember the freshest auth context for background sync after restarts.
  if (req.token) {
    try {
      saveSession({ token: req.token, workspaceSlug: getSettings().workspaceSlug })
    } catch {
      /* non-fatal */
    }
  }

  try {
    const { status, payload } = await doFetch(req)
    if (route.kind === 'cache' && status >= 200 && status < 300) {
      storeCache(route.entity, req.path, status, payload)
    }
    return { ok: status >= 200 && status < 300, status, payload, offline: false }
  } catch (err) {
    if (!isNetworkError(err)) throw err

    if (route.kind === 'cache') {
      const cached = readCache(req.path)
      if (cached) return { ok: true, status: cached.status, payload: cached.payload, offline: true }
    }
    if (route.kind === 'queue') {
      const clientRef = enqueue(route.entity, req.method ?? 'POST', req.path, req.body)
      notifyQueued()
      return synthesizeQueuedResponse(route.entity, req, clientRef)
    }
    if (route.kind === 'pin-verify') {
      return verifyPinOffline(req)
    }

    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      status: 0,
      payload: { success: false, error: 'You are offline and this action needs a connection.' },
      offline: true,
      networkError: message,
    }
  }
}
