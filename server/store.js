/**
 * Document store — drafts, publishing, versions and recovery.
 *
 * Every editable thing is a document with two copies:
 *   draft      what the editor sees and changes (autosaved)
 *   published  what the public website shows
 * Publishing copies every changed draft to published in one transaction and stores a snapshot of the whole
 * published site as a new version. Nothing an editor types reaches the public site until someone publishes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { now } from './db.js'
import { assemble, docTitle, diff, split } from '../shared/bundle.js'
import { isValidKey, docKind, COLLECTIONS, SETTING_KEYS } from '../shared/schema.js'
import { validateBundle, sanitize } from '../shared/validate.js'

const J = (v) => (v == null ? null : JSON.stringify(v))
const P = (s) => (s == null ? null : JSON.parse(s))

export class Store {
  constructor(db, { root, fileExists }) {
    this.db = db
    this.root = root
    this.fileExists = fileExists
    this._cache = { published: null }
  }

  /* ---------- seed from the project's JSON files (first start only) ---------- */
  seedIfEmpty(log = console.log) {
    const count = this.db.prepare('SELECT COUNT(*) n FROM docs').get().n
    if (count > 0) return false
    const docs = readProjectFiles(this.root)
    const ins = this.db.prepare('INSERT INTO docs (key, draft, published, rev, updated_at, updated_by, published_at) VALUES (?, ?, ?, 1, ?, ?, ?)')
    const t = now()
    this.db.transaction(() => {
      for (const { key, data } of docs) ins.run(key, J(data), J(data), t, 'setup', t)
      this.db.prepare('INSERT INTO versions (created_at, created_by, note, bundle, changes) VALUES (?, ?, ?, ?, ?)').run(t, 'setup', 'Original website (handover)', J(this.bundle('published')), J([]))
    })()
    log(`Database seeded with ${docs.length} documents from src/config and src/content.`)
    return true
  }

  /* ---------- reading ---------- */
  rows() { return this.db.prepare('SELECT key, draft, published, rev, updated_at, updated_by, published_at FROM docs ORDER BY key').all() }
  row(key) { return this.db.prepare('SELECT key, draft, published, rev, updated_at, updated_by, published_at FROM docs WHERE key = ?').get(key) }

  bundle(stage = 'published') {
    if (stage === 'published' && this._cache.published) return this._cache.published
    const b = assemble(this.rows().map((r) => ({ key: r.key, data: P(stage === 'draft' ? r.draft : r.published) })))
    if (stage === 'published') this._cache.published = b
    return b
  }

  /** Every document with its status: published | changed | new | deleted */
  list() {
    return this.rows().map((r) => {
      const status = r.published == null ? 'new' : r.draft == null ? 'deleted' : r.draft === r.published ? 'published' : 'changed'
      const data = P(r.draft ?? r.published)
      return { key: r.key, kind: docKind(r.key), title: docTitle(r.key, data), status, rev: r.rev, updatedAt: r.updated_at, updatedBy: r.updated_by, publishedAt: r.published_at, summary: summarise(r.key, data) }
    })
  }

  get(key) {
    const r = this.row(key)
    if (!r) return null
    return { key, draft: P(r.draft), published: P(r.published), rev: r.rev, updatedAt: r.updated_at, updatedBy: r.updated_by, publishedAt: r.published_at }
  }

  /* ---------- writing drafts ---------- */
  save(key, data, user, { rev, reason = 'edit' } = {}) {
    if (!isValidKey(key)) throw httpError(400, 'Unknown document')
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw httpError(400, 'The document must be an object')
    const clean = sanitize(data)
    if (docKind(key) === 'page') clean.id = key.slice(5)
    const r = this.row(key)
    const t = now()
    return this.db.transaction(() => {
      if (!r) {
        this.db.prepare('INSERT INTO docs (key, draft, published, rev, updated_at, updated_by) VALUES (?, ?, NULL, 1, ?, ?)').run(key, J(clean), t, user)
        this.revision(key, clean, user, 'created')
        return { key, rev: 1, updatedAt: t }
      }
      if (rev != null && Number(rev) !== r.rev) throw httpError(409, `This ${docTitle(key, P(r.draft)).split(':')[0].toLowerCase()} was changed by ${r.updated_by || 'someone else'} at ${r.updated_at}. Reload to see their changes.`)
      this.maybeRevision(key, r, user, reason)
      this.db.prepare('UPDATE docs SET draft = ?, rev = rev + 1, updated_at = ?, updated_by = ? WHERE key = ?').run(J(clean), t, user, key)
      return { key, rev: r.rev + 1, updatedAt: t }
    })()
  }

  create(kind, id, data, user) {
    if (!COLLECTIONS[kind]) throw httpError(400, 'Unknown kind')
    let base = String(id || 'untitled').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'untitled'
    let key = `${kind}:${base}`, n = 2
    while (this.row(key)) key = `${kind}:${base}-${n++}`
    this.save(key, data, user, { reason: 'created' })
    this.audit(user, 'create', key)
    return key
  }

  remove(key, user) {
    const r = this.row(key)
    if (!r) throw httpError(404, 'Not found')
    if (SETTING_KEYS.includes(key)) throw httpError(400, 'Site settings cannot be deleted')
    this.revision(key, P(r.draft), user, 'deleted')
    if (r.published == null) this.db.prepare('DELETE FROM docs WHERE key = ?').run(key)
    else this.db.prepare('UPDATE docs SET draft = NULL, rev = rev + 1, updated_at = ?, updated_by = ? WHERE key = ?').run(now(), user, key)
    this.audit(user, 'delete', key)
  }

  /** Throw away draft changes to one document (or all) and go back to what is published. */
  discard(key, user) {
    const keys = key ? [key] : this.rows().filter((r) => r.draft !== r.published).map((r) => r.key)
    this.db.transaction(() => {
      for (const k of keys) {
        const r = this.row(k)
        if (!r) continue
        this.revision(k, P(r.draft), user, 'discarded')
        if (r.published == null) this.db.prepare('DELETE FROM docs WHERE key = ?').run(k)
        else this.db.prepare('UPDATE docs SET draft = published, rev = rev + 1, updated_at = ?, updated_by = ? WHERE key = ?').run(now(), user, k)
      }
    })()
    this.audit(user, 'discard', key || 'all', `${keys.length} document(s)`)
    return keys.length
  }

  /* ---------- draft history ---------- */
  revision(key, data, user, reason) {
    this.db.prepare('INSERT INTO revisions (key, data, created_at, created_by, reason) VALUES (?, ?, ?, ?, ?)').run(key, J(data), now(), user, reason)
    // keep the 60 most recent per document
    this.db.prepare('DELETE FROM revisions WHERE key = ? AND id NOT IN (SELECT id FROM revisions WHERE key = ? ORDER BY id DESC LIMIT 60)').run(key, key)
  }
  /** Autosave runs often; keep a revision at most every 3 minutes per document, and whenever the editor changes. */
  maybeRevision(key, r, user, reason) {
    const last = this.db.prepare('SELECT created_at, created_by FROM revisions WHERE key = ? ORDER BY id DESC LIMIT 1').get(key)
    const old = !last || Date.now() - Date.parse(last.created_at) > 3 * 60 * 1000 || last.created_by !== user || reason !== 'edit'
    if (old && r.draft != null) this.revision(key, P(r.draft), r.updated_by || user, reason === 'edit' ? 'autosave' : reason)
  }
  revisions(key) {
    return this.db.prepare('SELECT id, created_at, created_by, reason FROM revisions WHERE key = ? ORDER BY id DESC LIMIT 60').all(key)
  }
  restoreRevision(key, id, user) {
    const rev = this.db.prepare('SELECT * FROM revisions WHERE id = ? AND key = ?').get(id, key)
    if (!rev || rev.data == null) throw httpError(404, 'That earlier draft no longer exists')
    const r = this.row(key)
    this.save(key, P(rev.data), user, { rev: r?.rev, reason: 'restored' })
    this.audit(user, 'restore-draft', key, `revision ${id}`)
  }

  /* ---------- changes, validation, publishing ---------- */
  changes() {
    return this.rows().filter((r) => r.draft !== r.published).map((r) => ({
      key: r.key,
      title: docTitle(r.key, P(r.draft ?? r.published)),
      status: r.published == null ? 'new' : r.draft == null ? 'deleted' : 'changed',
      updatedAt: r.updated_at, updatedBy: r.updated_by,
      diff: r.published == null || r.draft == null ? [] : diff(P(r.published), P(r.draft)),
    }))
  }

  validate(stage = 'draft') { return validateBundle(this.bundle(stage), { fileExists: this.fileExists }) }

  publish(user, note = '') {
    const changes = this.changes()
    if (!changes.length) throw httpError(400, 'There is nothing new to publish')
    const check = this.validate('draft')
    if (check.errors.length) {
      const e = httpError(422, 'Fix these problems before publishing')
      e.details = check.errors
      throw e
    }
    const t = now()
    let id
    this.db.transaction(() => {
      for (const c of changes) {
        if (c.status === 'deleted') this.db.prepare('DELETE FROM docs WHERE key = ?').run(c.key)
        else this.db.prepare('UPDATE docs SET published = draft, published_at = ? WHERE key = ?').run(t, c.key)
      }
      this._cache.published = null
      const summary = changes.map(({ key, title, status }) => ({ key, title, status }))
      id = this.db.prepare('INSERT INTO versions (created_at, created_by, note, bundle, changes) VALUES (?, ?, ?, ?, ?)').run(t, user, String(note).slice(0, 300), J(this.bundle('published')), J(summary)).lastInsertRowid; id = Number(id)
    })()
    this._cache.published = null
    this.audit(user, 'publish', `version ${id}`, `${changes.length} change(s)`)
    return { version: id, changes: changes.length, warnings: check.warnings }
  }

  versions() {
    return this.db.prepare('SELECT id, created_at, created_by, note, changes FROM versions ORDER BY id DESC LIMIT 200').all()
      .map((v) => ({ id: v.id, createdAt: v.created_at, createdBy: v.created_by, note: v.note, changes: P(v.changes) || [] }))
  }
  version(id) {
    const v = this.db.prepare('SELECT * FROM versions WHERE id = ?').get(id)
    return v ? { id: v.id, createdAt: v.created_at, createdBy: v.created_by, note: v.note, bundle: P(v.bundle), changes: P(v.changes) || [] } : null
  }

  /** Replace every draft with the site as it was in version `id`. Publish afterwards (or pass publish: true). */
  restoreVersion(id, user, { publish = false } = {}) {
    const v = this.version(id)
    if (!v) throw httpError(404, 'Version not found')
    const target = new Map(split(v.bundle).map((d) => [d.key, d.data]))
    const t = now()
    this.db.transaction(() => {
      for (const r of this.rows()) {
        if (!target.has(r.key)) {
          if (r.published == null) this.db.prepare('DELETE FROM docs WHERE key = ?').run(r.key)
          else this.db.prepare('UPDATE docs SET draft = NULL, rev = rev + 1, updated_at = ?, updated_by = ? WHERE key = ?').run(t, user, r.key)
        }
      }
      for (const [key, data] of target) {
        const r = this.row(key)
        if (r) { this.revision(key, P(r.draft), user, `before restoring version ${id}`); this.db.prepare('UPDATE docs SET draft = ?, rev = rev + 1, updated_at = ?, updated_by = ? WHERE key = ?').run(J(data), t, user, key) }
        else this.db.prepare('INSERT INTO docs (key, draft, published, rev, updated_at, updated_by) VALUES (?, ?, NULL, 1, ?, ?)').run(key, J(data), t, user)
      }
    })()
    this.audit(user, 'restore-version', `version ${id}`)
    if (publish && this.changes().length) return this.publish(user, `Restored version ${id}${v.note ? ` (${v.note})` : ''}`)
    return { restored: id }
  }

  /* ---------- export back to project files (for developers / Git) ---------- */
  exportToFiles(stage = 'published') {
    const b = this.bundle(stage)
    const written = []
    const dirOf = { page: 'src/config/pages', case: 'src/content/cases', capability: 'src/content/capabilities', insight: 'src/content/insights' }
    const settingFile = (k) => (['system', 'company'].includes(k) ? `src/content/${k}.json` : `src/config/${k}.json`)
    for (const d of Object.values(dirOf)) for (const f of fs.readdirSync(path.join(this.root, d))) if (f.endsWith('.json')) fs.unlinkSync(path.join(this.root, d, f))
    for (const { key, data } of split(b)) {
      const kind = docKind(key)
      const rel = kind === 'setting' ? settingFile(key) : `${dirOf[kind]}/${key.split(':')[1]}.json`
      fs.writeFileSync(path.join(this.root, rel), JSON.stringify(data, null, 2) + '\n')
      written.push(rel)
    }
    return written
  }

  audit(user, action, target = '', detail = '') {
    this.db.prepare('INSERT INTO audit (at, user, action, target, detail) VALUES (?, ?, ?, ?, ?)').run(now(), user || '', action, target, detail)
  }
  activity(limit = 100) { return this.db.prepare('SELECT at, user, action, target, detail FROM audit ORDER BY id DESC LIMIT ?').all(limit) }
}

function summarise(key, d) {
  if (!d) return ''
  const kind = docKind(key)
  if (kind === 'page') return `${d.path || ''}${d.visible === false ? ' · not published' : ''} · ${(d.sections || []).length} sections`
  if (kind === 'case' || kind === 'capability' || kind === 'insight') return `${d.slug || ''}${d.hidden ? ' · hidden' : ''}`
  return ''
}

export function httpError(status, message) {
  const e = new Error(message)
  e.status = status
  return e
}

/** Reads the website as shipped in the project (src/config + src/content) → [{ key, data }] */
export function readProjectFiles(root) {
  const out = []
  const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'))
  for (const k of ['site', 'brand', 'theme', 'motion', 'navigation', 'media']) out.push({ key: k, data: read(`src/config/${k}.json`) })
  for (const k of ['system', 'company']) out.push({ key: k, data: read(`src/content/${k}.json`) })
  const dirs = [['page', 'src/config/pages'], ['case', 'src/content/cases'], ['capability', 'src/content/capabilities'], ['insight', 'src/content/insights']]
  for (const [kind, dir] of dirs) {
    for (const f of fs.readdirSync(path.join(root, dir)).filter((x) => x.endsWith('.json')).sort()) {
      const data = read(`${dir}/${f}`)
      out.push({ key: `${kind}:${f.replace(/\.json$/, '')}`, data })
    }
  }
  return out
}
