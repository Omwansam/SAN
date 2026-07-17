import { safeStorage } from 'electron'
import type { ApiProxyRequest, ApiProxyResponse } from '../../shared/ipc-contract'
import { getDb } from './db'

// Mirrors GET /api/users/offline-credentials (bcrypt PIN hashes, roles) so
// manager overrides and re-locks keep working with the network down.
// bcryptjs is pure JS — no native ABI headaches inside Electron.

interface OfflineCredential {
  id: string
  name: string
  role: string
  pinHash: string | null
}

function encrypt(raw: string): Buffer {
  return safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(raw)
    : Buffer.from(raw, 'utf8')
}

function decrypt(blob: Buffer): string {
  try {
    return safeStorage.decryptString(blob)
  } catch {
    return blob.toString('utf8')
  }
}

export function storeOfflineCredentials(users: OfflineCredential[]): void {
  const db = getDb()
  const stmt = db.prepare(
    `INSERT INTO offline_credentials (user_id, payload_enc, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET payload_enc = excluded.payload_enc, updated_at = excluded.updated_at`,
  )
  const tx = db.transaction(() => {
    for (const user of users) {
      stmt.run(user.id, encrypt(JSON.stringify(user)), new Date().toISOString())
    }
  })
  tx()
}

function loadAll(): OfflineCredential[] {
  const rows = getDb().prepare(`SELECT payload_enc FROM offline_credentials`).all() as Array<{
    payload_enc: Buffer
  }>
  const out: OfflineCredential[] = []
  for (const row of rows) {
    try {
      out.push(JSON.parse(decrypt(row.payload_enc)) as OfflineCredential)
    } catch {
      /* skip corrupt row */
    }
  }
  return out
}

// Offline stand-in for POST /api/auth/verify-manager-pin — same response shape.
const MANAGER_ROLES = ['manager', 'admin', 'superadmin']

export function verifyPinOffline(req: ApiProxyRequest): ApiProxyResponse {
  const body = (req.body ?? {}) as { pin?: string }
  const pin = String(body.pin ?? '').replace(/\D/g, '')
  if (!pin) {
    return {
      ok: false,
      status: 400,
      payload: { success: false, error: 'PIN must be numeric and 4-8 digits.' },
      offline: true,
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bcrypt = require('bcryptjs') as { compareSync(data: string, hash: string): boolean }
  for (const user of loadAll()) {
    if (!user.pinHash || !MANAGER_ROLES.includes(user.role)) continue
    if (bcrypt.compareSync(pin, user.pinHash)) {
      return {
        ok: true,
        status: 200,
        payload: {
          success: true,
          offline: true,
          data: { id: user.id, name: user.name, role: user.role },
        },
        offline: true,
      }
    }
  }
  return {
    ok: false,
    status: 401,
    payload: { success: false, error: 'PIN did not match an active manager or admin.' },
    offline: true,
  }
}
