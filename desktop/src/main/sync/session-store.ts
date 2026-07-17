import { safeStorage } from 'electron'
import { kvGet, kvSet } from './db'

// Last-known auth context, encrypted at rest with the OS keychain (DPAPI on
// Windows). The sync engine replays queued writes and refreshes the cache with
// it after a restart, without waiting for the renderer to log in again.
export interface CachedSession {
  token: string
  workspaceSlug: string
}

const KEY = 'session'

function canEncrypt(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export function saveSession(session: CachedSession): void {
  const raw = JSON.stringify(session)
  if (canEncrypt()) {
    kvSet(KEY, safeStorage.encryptString(raw).toString('base64'))
    kvSet(`${KEY}:enc`, '1')
  } else {
    kvSet(KEY, raw)
    kvSet(`${KEY}:enc`, '0')
  }
}

export function loadSession(): CachedSession | null {
  const raw = kvGet(KEY)
  if (!raw) return null
  try {
    const encrypted = kvGet(`${KEY}:enc`) === '1'
    const json = encrypted
      ? safeStorage.decryptString(Buffer.from(raw, 'base64'))
      : raw
    const parsed = JSON.parse(json) as CachedSession
    return parsed?.token ? parsed : null
  } catch {
    return null
  }
}

export function clearSession(): void {
  kvSet(KEY, '')
  kvSet(`${KEY}:enc`, '0')
}
