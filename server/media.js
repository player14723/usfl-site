/**
 * Media library — uploads, responsive image versions, video storage, usage checks, trash.
 *
 * Uploaded images are checked by their actual bytes (not the file name), re-encoded to WebP (EXIF and any hidden
 * payload removed), and stored in two sizes: a large version (up to 2400 px wide) and a half-width phone version.
 * Videos (MP4 / WebM) are stored as uploaded; if ffmpeg is installed on the server a poster frame is made
 * automatically. Files live in <DATA_DIR>/media and are served from /media/….
 *
 * Presentation details (description, focal point, caption, "Illustrative") belong to the draft/published
 * website, so they are kept in the "media" document, not here.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import sharp from 'sharp'
import Busboy from 'busboy'
import { now } from './db.js'
import { httpError } from './store.js'

const IMAGE_MAX = 30 * 1024 * 1024
const VIDEO_MAX = 400 * 1024 * 1024
const hasFfmpeg = (() => { try { return spawnSync('ffmpeg', ['-version'], { timeout: 4000 }).status === 0 } catch { return false } })()

function sniff(buf) {
  const s = (a, b) => buf.subarray(a, b).toString('latin1')
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', mime: 'image/jpeg' }
  if (buf[0] === 0x89 && s(1, 4) === 'PNG') return { kind: 'image', mime: 'image/png' }
  if (s(0, 3) === 'GIF') return { kind: 'image', mime: 'image/gif' }
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') return { kind: 'image', mime: 'image/webp' }
  if (s(4, 8) === 'ftyp') {
    const brand = s(8, 12)
    if (/avif|avis/.test(brand)) return { kind: 'image', mime: 'image/avif' }
    if (/heic|heix|mif1/.test(brand)) return { kind: 'image', mime: 'image/heic' }
    return { kind: 'video', mime: 'video/mp4', ext: 'mp4' }
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { kind: 'video', mime: 'video/webm', ext: 'webm' }
  if (s(0, 2) === 'II' || s(0, 2) === 'MM') return { kind: 'image', mime: 'image/tiff' }
  return null
}

const slugName = (n) => String(n || 'file').replace(/\.[a-z0-9]+$/i, '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'file'

export class Media {
  constructor(db, { dataDir, staticRoot, store }) {
    this.db = db
    this.dir = path.join(dataDir, 'media')
    this.staticRoot = staticRoot
    this.store = store
    fs.mkdirSync(this.dir, { recursive: true })
  }

  /** Register the images and videos that ship with the site so they appear in the library. */
  async indexBuiltins() {
    const ins = this.db.prepare(`INSERT OR IGNORE INTO media (id, kind, src, src_small, poster, width, height, bytes, mime, original_name, name, folder, builtin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`)
    const imgDir = path.join(this.staticRoot, 'images')
    if (fs.existsSync(imgDir)) {
      for (const f of fs.readdirSync(imgDir)) {
        if (!/\.(webp|jpe?g|png)$/i.test(f) || /-sm\.webp$/.test(f)) continue
        const src = `/images/${f}`
        if (this.db.prepare('SELECT 1 FROM media WHERE src = ?').get(src)) continue
        const full = path.join(imgDir, f)
        let meta = {}
        try { meta = await sharp(full).metadata() } catch {}
        const small = f.replace(/\.webp$/, '-sm.webp')
        ins.run('b-' + slugName(f), 'image', src, fs.existsSync(path.join(imgDir, small)) && small !== f ? `/images/${small}` : null, null, meta.width || null, meta.height || null, fs.statSync(full).size, meta.format ? `image/${meta.format}` : null, f, slugName(f), 'Site images', now())
      }
    }
    const vidDir = path.join(this.staticRoot, 'videos')
    if (fs.existsSync(vidDir)) {
      for (const f of fs.readdirSync(vidDir)) {
        if (!/\.(mp4|webm)$/i.test(f)) continue
        const src = `/videos/${f}`
        if (this.db.prepare('SELECT 1 FROM media WHERE src = ?').get(src)) continue
        const base = f.replace(/-mobile/, '').replace(/\.(mp4|webm)$/, '')
        const poster = fs.existsSync(path.join(vidDir, 'posters', `${base}.jpg`)) ? `/videos/posters/${base}.jpg` : null
        ins.run('b-' + slugName(f) + (f.endsWith('.webm') ? '-webm' : ''), 'video', src, null, poster, null, null, fs.statSync(path.join(vidDir, f)).size, f.endsWith('.webm') ? 'video/webm' : 'video/mp4', f, slugName(f), 'Site films', now())
      }
      const pdir = path.join(vidDir, 'posters')
      if (fs.existsSync(pdir)) for (const f of fs.readdirSync(pdir)) {
        const src = `/videos/posters/${f}`
        if (!/\.jpe?g$/i.test(f) || this.db.prepare('SELECT 1 FROM media WHERE src = ?').get(src)) continue
        let meta = {}
        try { meta = await sharp(path.join(pdir, f)).metadata() } catch {}
        ins.run('b-poster-' + slugName(f), 'image', src, null, null, meta.width || null, meta.height || null, fs.statSync(path.join(pdir, f)).size, 'image/jpeg', f, 'poster ' + slugName(f), 'Film posters', now())
      }
    }
  }

  list({ q = '', kind = '', folder = '', trash = false } = {}) {
    let rows = this.db.prepare(`SELECT * FROM media WHERE ${trash ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL'} ORDER BY builtin ASC, created_at DESC`).all()
    if (kind) rows = rows.filter((r) => r.kind === kind)
    if (folder) rows = rows.filter((r) => (r.folder || '') === folder)
    if (q) { const s = q.toLowerCase(); rows = rows.filter((r) => `${r.name} ${r.original_name} ${r.src} ${r.folder}`.toLowerCase().includes(s)) }
    return rows.map(this.shape)
  }
  shape = (r) => ({ id: r.id, kind: r.kind, src: r.src, srcSmall: r.src_small, poster: r.poster, width: r.width, height: r.height, bytes: r.bytes, mime: r.mime, originalName: r.original_name, name: r.name, folder: r.folder || '', builtin: !!r.builtin, createdAt: r.created_at, createdBy: r.created_by, deletedAt: r.deleted_at })
  get(id) { const r = this.db.prepare('SELECT * FROM media WHERE id = ?').get(id); return r ? this.shape(r) : null }
  folders() { return this.db.prepare("SELECT DISTINCT folder FROM media WHERE deleted_at IS NULL AND folder <> '' ORDER BY folder").all().map((r) => r.folder) }

  /** Where a file is used, in the draft and in the published site: ["Page: Home", …] */
  usage(src) {
    const out = new Set()
    const titles = new Map(this.store.list().map((d) => [d.key, d.title]))
    const needle = JSON.stringify(src)
    for (const r of this.store.rows()) {
      for (const [stage, json] of [['draft', r.draft], ['published', r.published]]) {
        if (!json || !json.includes(needle)) continue
        // the media document lists every image's description; only its films count as a use
        if (r.key === 'media' && !JSON.stringify(JSON.parse(json).cinematics || []).includes(needle)) continue
        out.add(`${titles.get(r.key) || r.key}${stage === 'published' ? ' (live site)' : ' (draft)'}`)
      }
    }
    return [...out]
  }

  update(id, { name, folder }) {
    const m = this.get(id)
    if (!m) throw httpError(404, 'File not found')
    this.db.prepare('UPDATE media SET name = COALESCE(?, name), folder = COALESCE(?, folder) WHERE id = ?').run(name == null ? null : String(name).slice(0, 80), folder == null ? null : String(folder).slice(0, 40), id)
    return this.get(id)
  }

  trash(id, { force = false } = {}) {
    const m = this.get(id)
    if (!m) throw httpError(404, 'File not found')
    if (m.builtin) throw httpError(400, 'Files that ship with the site cannot be deleted')
    const used = this.usage(m.src)
    if (used.length && !force) { const e = httpError(409, 'This file is still used'); e.details = used; throw e }
    this.db.prepare('UPDATE media SET deleted_at = ? WHERE id = ?').run(now(), id)
    return { trashed: id, usedBy: used }
  }
  restore(id) { this.db.prepare('UPDATE media SET deleted_at = NULL WHERE id = ?').run(id); return this.get(id) }
  purge(id) {
    const m = this.get(id)
    if (!m || !m.deletedAt) throw httpError(400, 'Only files in the trash can be removed permanently')
    fs.rmSync(path.join(this.dir, id), { recursive: true, force: true })
    this.db.prepare('DELETE FROM media WHERE id = ?').run(id)
  }

  /** Handles one multipart upload request (field "file", optional "folder"). */
  upload(req, user) {
    return new Promise((resolve, reject) => {
      let bb
      try { bb = Busboy({ headers: req.headers, limits: { files: 1, fileSize: VIDEO_MAX, fields: 5 } }) } catch { return reject(httpError(400, 'Expected a file upload')) }
      const fields = {}
      let job = null
      bb.on('field', (k, v) => { fields[k] = String(v).slice(0, 80) })
      bb.on('file', (_name, stream, info) => {
        const tmp = path.join(os.tmpdir(), `up-${crypto.randomBytes(8).toString('hex')}`)
        const out = fs.createWriteStream(tmp)
        let truncated = false
        stream.on('limit', () => { truncated = true })
        stream.pipe(out)
        job = new Promise((res, rej) => out.on('finish', () => (truncated ? rej(httpError(413, 'That file is too large (400 MB maximum for videos, 30 MB for images)')) : res({ tmp, info }))).on('error', rej))
      })
      bb.on('error', reject)
      bb.on('close', async () => {
        if (!job) return reject(httpError(400, 'No file received'))
        let tmp
        try {
          const r = await job
          tmp = r.tmp
          resolve(await this.store_(r.tmp, r.info.filename, fields.folder || '', user))
        } catch (e) { reject(e) } finally { if (tmp) fs.rmSync(tmp, { force: true }) }
      })
      req.pipe(bb)
    })
  }

  async store_(tmp, originalName, folder, user) {
    const fd = fs.openSync(tmp, 'r'); const head = Buffer.alloc(16); fs.readSync(fd, head, 0, 16, 0); fs.closeSync(fd)
    const type = sniff(head)
    if (!type) throw httpError(415, 'That file type is not supported. Use JPG, PNG, WebP, AVIF or GIF for images, MP4 or WebM for videos.')
    const size = fs.statSync(tmp).size
    const id = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
    const base = slugName(originalName)
    const dir = path.join(this.dir, id)
    fs.mkdirSync(dir, { recursive: true })
    try {
      if (type.kind === 'image') {
        if (size > IMAGE_MAX) throw httpError(413, 'Images can be up to 30 MB')
        const img = sharp(tmp, { failOn: 'error', limitInputPixels: 20000 * 20000 }).rotate()
        const meta = await img.metadata()
        if (!meta.width || !meta.height) throw httpError(415, 'That image could not be read')
        const W = Math.min(meta.autoOrient?.width || meta.width, 2400)
        const large = await img.clone().resize({ width: W, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, `${base}.webp`))
        let small = null
        if (large.width > 700) {
          small = await sharp(path.join(dir, `${base}.webp`)).resize({ width: Math.round(large.width / 2) }).webp({ quality: 80 }).toFile(path.join(dir, `${base}-sm.webp`))
        }
        const row = { id, kind: 'image', src: `/media/${id}/${base}.webp`, src_small: small ? `/media/${id}/${base}-sm.webp` : null, poster: null, width: large.width, height: large.height, bytes: large.size + (small?.size || 0), mime: 'image/webp' }
        this.insert(row, originalName, base, folder, user)
        return this.get(id)
      }
      if (size > VIDEO_MAX) throw httpError(413, 'Videos can be up to 400 MB')
      const file = path.join(dir, `${base}.${type.ext}`)
      fs.copyFileSync(tmp, file)
      let poster = null, width = null, height = null
      if (hasFfmpeg) {
        const p = path.join(dir, `${base}-poster.jpg`)
        const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-frames:v', '1', '-vf', 'scale=1600:-2', '-q:v', '3', p], { timeout: 60000 })
        if (r.status === 0 && fs.existsSync(p)) {
          poster = `/media/${id}/${base}-poster.jpg`
          const m = await sharp(p).metadata(); width = m.width; height = m.height
        }
      }
      this.insert({ id, kind: 'video', src: `/media/${id}/${base}.${type.ext}`, src_small: null, poster, width, height, bytes: size, mime: type.mime }, originalName, base, folder, user)
      return this.get(id)
    } catch (e) {
      fs.rmSync(dir, { recursive: true, force: true })
      if (e.status) throw e
      throw httpError(415, 'That file could not be processed. Try exporting it again as JPG, PNG or MP4.')
    }
  }

  insert(r, originalName, base, folder, user) {
    this.db.prepare(`INSERT INTO media (id, kind, src, src_small, poster, width, height, bytes, mime, original_name, name, folder, builtin, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`).run(r.id, r.kind, r.src, r.src_small, r.poster, r.width, r.height, r.bytes, r.mime, String(originalName || '').slice(0, 120), base, String(folder || '').slice(0, 40), now(), user)
  }

  /** Attach a separately uploaded poster image to a video. */
  setPoster(id, posterSrc) {
    this.db.prepare('UPDATE media SET poster = ? WHERE id = ? AND kind = ?').run(posterSrc || null, id, 'video')
    return this.get(id)
  }
}
