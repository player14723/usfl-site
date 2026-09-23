/**
 * The website database (SQLite built into Node.js, one file: <DATA_DIR>/site.db).
 *
 *   docs         every editable document, with a DRAFT and a PUBLISHED copy
 *   revisions    earlier drafts of each document (for "restore an earlier draft")
 *   versions     a snapshot of the whole published site at every publish (for "restore a version")
 *   users        editor accounts (owner / admin / editor)
 *   sessions     signed-in browsers
 *   media        uploaded and built-in images and videos
 *   submissions  messages sent through website forms
 *   audit        who did what, when
 */
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

/** Thin wrapper over Node's built-in SQLite (no native add-on to compile): prepare / exec / transaction. */
class Db {
  constructor(file) { this.raw = new DatabaseSync(file); this.depth = 0 }
  exec(sql) { this.raw.exec(sql) }
  prepare(sql) { return this.raw.prepare(sql) }
  pragma(p) { this.raw.exec(`PRAGMA ${p}`) }
  /** transaction(fn) → a function that runs fn atomically (nested calls use savepoints) */
  transaction(fn) {
    return (...args) => {
      const sp = `sp${this.depth}`
      this.raw.exec(this.depth ? `SAVEPOINT ${sp}` : 'BEGIN IMMEDIATE')
      this.depth++
      try {
        const out = fn(...args)
        this.depth--
        this.raw.exec(this.depth ? `RELEASE ${sp}` : 'COMMIT')
        return out
      } catch (e) {
        this.depth--
        this.raw.exec(this.depth ? `ROLLBACK TO ${sp}; RELEASE ${sp}` : 'ROLLBACK')
        throw e
      }
    }
  }
  close() { this.raw.close() }
}

export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true })
  const db = new Db(path.join(dataDir, 'site.db'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS docs (
      key TEXT PRIMARY KEY,
      draft TEXT,              -- NULL = deleted in the draft (removed on the next publish)
      published TEXT,          -- NULL = never published (new in the draft)
      rev INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT, updated_by TEXT, published_at TEXT
    );
    CREATE TABLE IF NOT EXISTS revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL, data TEXT, created_at TEXT NOT NULL, created_by TEXT, reason TEXT
    );
    CREATE INDEX IF NOT EXISTS revisions_key ON revisions(key, id);
    CREATE TABLE IF NOT EXISTS versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, created_by TEXT, note TEXT, bundle TEXT NOT NULL, changes TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT, role TEXT NOT NULL,
      pass_hash TEXT NOT NULL, created_at TEXT NOT NULL, last_login TEXT, disabled INTEGER NOT NULL DEFAULT 0, must_change INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL,
      created_at TEXT NOT NULL, expires_at TEXT NOT NULL, ip TEXT, ua TEXT
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, src TEXT NOT NULL UNIQUE, src_small TEXT, poster TEXT, width INTEGER, height INTEGER, bytes INTEGER,
      mime TEXT, original_name TEXT, name TEXT, folder TEXT DEFAULT '', builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, created_by TEXT, deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, form TEXT, page TEXT, data TEXT NOT NULL, created_at TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, delivered TEXT
    );
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, user TEXT, action TEXT NOT NULL, target TEXT, detail TEXT
    );
  `)
  return db
}

export const now = () => new Date().toISOString()
