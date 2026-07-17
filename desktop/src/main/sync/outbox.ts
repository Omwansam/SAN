import { randomUUID } from 'node:crypto'
import { getDb } from './db'

export interface OutboxRow {
  id: number
  client_ref: string
  kind: string
  method: string
  path: string
  body: string | null
  created_at: string
  attempts: number
  status: 'pending' | 'failed' | 'sent'
  last_error: string | null
}

export function enqueue(kind: string, method: string, path: string, body: unknown): string {
  const clientRef =
    (body && typeof body === 'object' && typeof (body as { clientRef?: string }).clientRef === 'string'
      ? (body as { clientRef: string }).clientRef
      : null) ?? randomUUID()
  const payload = body && typeof body === 'object' ? { ...(body as object), clientRef } : body
  getDb()
    .prepare(
      `INSERT INTO outbox (client_ref, kind, method, path, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(client_ref) DO NOTHING`,
    )
    .run(clientRef, kind, method, path, JSON.stringify(payload ?? null), new Date().toISOString())
  return clientRef
}

export function pendingRows(limit = 50): OutboxRow[] {
  return getDb()
    .prepare(`SELECT * FROM outbox WHERE status IN ('pending', 'failed') ORDER BY id LIMIT ?`)
    .all(limit) as OutboxRow[]
}

export function counts(): { pending: number; failed: number } {
  const row = getDb()
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM outbox WHERE status != 'sent'`,
    )
    .get() as { pending: number | null; failed: number | null }
  return { pending: row.pending ?? 0, failed: row.failed ?? 0 }
}

export function markSent(id: number, clientRef: string, serverId: string | null, entity: string): void {
  const db = getDb()
  const tx = db.transaction(() => {
    db.prepare(`UPDATE outbox SET status = 'sent', last_error = NULL WHERE id = ?`).run(id)
    if (serverId) {
      db.prepare(
        `INSERT INTO id_map (client_ref, server_id, entity) VALUES (?, ?, ?)
         ON CONFLICT(client_ref) DO UPDATE SET server_id = excluded.server_id`,
      ).run(clientRef, serverId, entity)
    }
  })
  tx()
}

export function markFailed(id: number, error: string, permanent: boolean): void {
  getDb()
    .prepare(
      `UPDATE outbox SET attempts = attempts + 1, last_error = ?, status = ? WHERE id = ?`,
    )
    .run(error, permanent ? 'failed' : 'pending', id)
}

export function mapServerId(clientRef: string): string | null {
  const row = getDb()
    .prepare(`SELECT server_id FROM id_map WHERE client_ref = ?`)
    .get(clientRef) as { server_id: string } | undefined
  return row?.server_id ?? null
}

// Rewrites offline client refs (e.g. an offline shift id referenced by a queued
// order) to real server ids before replay.
export function remapIds(value: unknown): unknown {
  if (typeof value === 'string') return mapServerId(value) ?? value
  if (Array.isArray(value)) return value.map(remapIds)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = remapIds(v)
    return out
  }
  return value
}
