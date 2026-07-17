import { net } from 'electron'
import type { SyncStatus } from '../../shared/ipc-contract'
import { getSettings } from '../settings'
import { broadcastToWindows } from '../windows'
import { IPC } from '../../shared/ipc-contract'
import { getDb, kvGet, kvSet } from './db'
import { counts, markFailed, markSent, pendingRows, remapIds } from './outbox'
import { loadSession } from './session-store'
import { storeOfflineCredentials } from './offline-credentials'

// Push-then-refresh sync loop. Push drains the outbox FIFO (shift-open lands
// before orders that reference it because rows replay in insertion order, and
// remapIds rewrites offline shift ids once id_map knows the server id).
// Refresh re-fetches every cached catalog query with the last-known session so
// the local copy tracks the server; sales are append-only and never pulled back.

const SYNC_INTERVAL_MS = 30_000
const CREDENTIALS_REFRESH_MS = 15 * 60_000

let timer: NodeJS.Timeout | null = null
let syncing = false
let online = true
let lastError: string | null = null

function status(): SyncStatus {
  const { pending, failed } = counts()
  return {
    online,
    syncing,
    pendingCount: pending,
    failedCount: failed,
    lastSyncAt: kvGet('lastSyncAt'),
    lastError,
  }
}

function broadcastStatus(): void {
  broadcastToWindows(IPC.SYNC_STATUS_EVENT, status())
}

export function getSyncStatus(): SyncStatus {
  return status()
}

export function notifyQueued(): void {
  online = false
  broadcastStatus()
  // a queued write is a strong signal we should retry soon
  setTimeout(() => void runSync('queued-write'), 5_000)
}

function baseUrl(): string {
  return (getSettings().serverUrl || 'http://localhost:5000').replace(/\/+$/, '')
}

async function authedFetch(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; payload: unknown }> {
  const session = loadSession()
  if (!session?.token) throw new Error('No cached session for sync')
  const response = await net.fetch(`${baseUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(getSettings().workspaceSlug ? { 'x-workspace-slug': getSettings().workspaceSlug } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  return { status: response.status, payload }
}

async function pushOutbox(): Promise<void> {
  for (const row of pendingRows()) {
    const rawBody = row.body ? (JSON.parse(row.body) as unknown) : undefined
    const body = remapIds(rawBody)
    // path may embed an offline shift id (e.g. /api/shifts/<clientRef>/close)
    const path = row.path
      .split('/')
      .map((seg) => {
        const mapped = seg ? (remapIds(seg) as string) : seg
        return mapped
      })
      .join('/')
    try {
      const { status: httpStatus, payload } = await authedFetch(path, {
        method: row.method,
        body,
      })
      if (httpStatus >= 200 && httpStatus < 300) {
        const data = (payload as { data?: { id?: string } } | null)?.data
        markSent(row.id, row.client_ref, data?.id ?? null, row.kind)
      } else if (httpStatus === 401) {
        // token expired while offline: pause, never drop the queue
        lastError = 'Session expired — sign in to resume sync.'
        return
      } else {
        const message =
          ((payload as { error?: string } | null)?.error ?? `HTTP ${httpStatus}`) || 'Sync rejected'
        // 4xx = permanently rejected by the server; surface in the dead-letter UI
        markFailed(row.id, message, httpStatus >= 400 && httpStatus < 500)
        lastError = message
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      throw err // network gone again — stop draining, keep FIFO intact
    }
  }
}

async function refreshCache(): Promise<void> {
  const rows = getDb()
    .prepare(`SELECT cache_key, entity, path FROM http_cache`)
    .all() as Array<{ cache_key: string; entity: string; path: string }>
  const update = getDb().prepare(
    `UPDATE http_cache SET status = ?, payload = ?, updated_at = ? WHERE cache_key = ?`,
  )
  for (const row of rows) {
    try {
      const { status: httpStatus, payload } = await authedFetch(row.path)
      if (httpStatus >= 200 && httpStatus < 300) {
        update.run(httpStatus, JSON.stringify(payload ?? null), new Date().toISOString(), row.cache_key)
      }
    } catch {
      return // offline again; keep serving the current cache
    }
  }
}

async function refreshOfflineCredentials(): Promise<void> {
  const last = Number(kvGet('credentialsFetchedAt') ?? 0)
  if (Date.now() - last < CREDENTIALS_REFRESH_MS) return
  try {
    const { status: httpStatus, payload } = await authedFetch('/api/users/offline-credentials')
    const data = (payload as { data?: unknown } | null)?.data
    if (httpStatus === 200 && Array.isArray(data)) {
      storeOfflineCredentials(data as never[])
      kvSet('credentialsFetchedAt', String(Date.now()))
    }
  } catch {
    /* offline — retry next cycle */
  }
}

export async function runSync(reason: string): Promise<void> {
  if (syncing) return
  if (!loadSession()?.token) return
  syncing = true
  broadcastStatus()
  try {
    await pushOutbox()
    await refreshCache()
    await refreshOfflineCredentials()
    online = true
    kvSet('lastSyncAt', new Date().toISOString())
    if (lastError && counts().pending === 0) lastError = null
  } catch {
    online = false
  } finally {
    syncing = false
    broadcastStatus()
  }
  void reason
}

export function startSyncEngine(): void {
  if (timer) return
  timer = setInterval(() => void runSync('interval'), SYNC_INTERVAL_MS)
  // fires when Chromium regains connectivity signal
  setInterval(() => {
    const wasOnline = online
    if (!wasOnline && net.isOnline()) void runSync('online-again')
  }, 10_000)
  void runSync('startup')
}

export function stopSyncEngine(): void {
  if (timer) clearInterval(timer)
  timer = null
}
