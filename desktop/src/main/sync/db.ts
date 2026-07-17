import { app } from 'electron'
import path from 'node:path'
import type Database from 'better-sqlite3'

// SQLite lives in the main process: the outbox needs ACID across renderer
// reloads, and both windows (POS + customer display) share one store.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS http_cache (
  cache_key   TEXT PRIMARY KEY,
  entity      TEXT NOT NULL,
  path        TEXT NOT NULL,
  status      INTEGER NOT NULL,
  payload     TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  client_ref  TEXT UNIQUE NOT NULL,
  kind        TEXT NOT NULL,
  method      TEXT NOT NULL,
  path        TEXT NOT NULL,
  body        TEXT,
  created_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending',
  last_error  TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status, id);
CREATE TABLE IF NOT EXISTS id_map (
  client_ref  TEXT PRIMARY KEY,
  server_id   TEXT NOT NULL,
  entity      TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT
);
CREATE TABLE IF NOT EXISTS offline_credentials (
  user_id     TEXT PRIMARY KEY,
  payload_enc BLOB NOT NULL,
  updated_at  TEXT NOT NULL
);
`

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite3 = require('better-sqlite3') as typeof Database
  const file = path.join(app.getPath('userData'), 'pos-sync.db')
  db = new BetterSqlite3(file)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)
  return db
}

export function kvGet(key: string): string | null {
  const row = getDb().prepare('SELECT v FROM kv WHERE k = ?').get(key) as { v: string } | undefined
  return row?.v ?? null
}

export function kvSet(key: string, value: string): void {
  getDb().prepare('INSERT INTO kv(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v').run(key, value)
}
