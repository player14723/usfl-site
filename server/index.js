/**
 * USFL website server.
 *
 *   npm run dev     development (live reload, http://localhost:5173, editor at /admin)
 *   npm start       production (serves dist/, run `npm run build` first)
 *
 * Environment (see .env.example): PORT, DATA_DIR, ADMIN_EMAIL, ADMIN_PASSWORD, SITE_ORIGIN, TRUST_PROXY,
 * FORM_WEBHOOK_URL, NODE_ENV.
 */
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { openDb } from './db.js'
import { Store, httpError } from './store.js'
import { Auth, can, permissions, ROLES } from './auth.js'
import { Media } from './media.js'
import { resolveRoute, metaFor, renderShell, heroPosterOf, sitemap } from './html.js'
import { COLLECTIONS, SECTION_BY_TYPE } from '../shared/schema.js'
import { loadEnv } from './env.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnv(ROOT)
const DEV = process.argv.includes('--dev') || process.env.NODE_ENV === 'development'
const PORT = Number(process.env.PORT || (DEV ? 5173 : 3000))
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data')
const DIST = path.join(ROOT, 'dist')
const STATIC = DEV ? path.join(ROOT, 'public') : DIST
const SECURE = !DEV && process.env.INSECURE_COOKIES !== '1'

if (!DEV && !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.')
  process.exit(1)
}

/* ---------- services ---------- */
const db = openDb(DATA_DIR)
const fileExists = (p) => {
  const clean = decodeURIComponent(String(p).split('?')[0])
  if (clean.startsWith('/media/')) return fs.existsSync(path.join(DATA_DIR, clean))
  return fs.existsSync(path.join(STATIC, clean.replace(/^\//, ''))) || fs.existsSync(path.join(ROOT, 'public', clean.replace(/^\//, '')))
}
const store = new Store(db, { root: ROOT, fileExists })
store.seedIfEmpty()
const auth = new Auth(db, { secure: SECURE })
const media = new Media(db, { dataDir: DATA_DIR, staticRoot: STATIC, store })
await media.indexBuiltins()

if (auth.count() === 0) {
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    auth.createUser({ email: process.env.ADMIN_EMAIL, name: '', role: 'owner', password: process.env.ADMIN_PASSWORD, mustChange: false })
    console.log(`Owner account created for ${process.env.ADMIN_EMAIL}.`)
  } else {
    console.log('No editor accounts yet. Create one with:  npm run user:create -- you@example.com owner')
  }
}

/* ---------- app ---------- */
const app = express()
app.disable('x-powered-by')
const TP = process.env.TRUST_PROXY
if (TP) app.set('trust proxy', TP === 'true' ? true : /^\d+$/.test(TP) ? Number(TP) : TP)

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64')
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  })
  if (SECURE) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
})
app.use(auth.attach())

const api = express.Router()
api.use(express.json({ limit: '4mb' }))
api.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
const ok = (fn) => async (req, res, next) => { try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? { ok: true }) } catch (e) { next(e) } }
const who = (req) => req.user?.email || 'unknown'
const E = auth.require('edit')

/* session */
api.get('/session', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not signed in', needsSetup: auth.count() === 0 })
  res.json({ user: req.user, csrf: req.csrf, permissions: permissions(req.user.role) })
})
api.post('/session', ok((req, res) => {
  const r = auth.login(req.body?.email, req.body?.password, { ip: req.ip, ua: req.get('user-agent') })
  res.set('Set-Cookie', auth.cookie(r.token, r.expires))
  store.audit(r.user.email, 'sign-in')
  return { user: r.user, csrf: r.csrf, permissions: permissions(r.user.role) }
}))
api.delete('/session', ok((req, res) => { auth.logout(auth.tokenFrom(req)); res.set('Set-Cookie', auth.clearCookie()); return { ok: true } }))
api.post('/account/password', auth.require(), ok((req) => { auth.changeOwnPassword(req.user, req.body?.current, req.body?.next); store.audit(who(req), 'change-password'); return { ok: true, signedOut: true } }))

/* content */
api.get('/site', auth.require(), ok((req) => store.bundle(req.query.stage === 'published' ? 'published' : 'draft')))
api.get('/docs', auth.require(), ok(() => store.list()))
api.get('/docs/:key', auth.require(), ok((req) => store.get(req.params.key) || Promise.reject(httpError(404, 'Not found'))))
api.put('/docs/:key', E, ok((req) => {
  if (['theme', 'motion', 'brand', 'site'].includes(req.params.key) && !can(req.user, 'settings')) throw httpError(403, 'Only admins can change site-wide settings')
  return store.save(req.params.key, req.body?.data, who(req), { rev: req.body?.rev })
}))
api.post('/docs', E, ok((req) => {
  const { kind, id, data } = req.body || {}
  if (!COLLECTIONS[kind]) throw httpError(400, 'Unknown kind')
  return { key: store.create(kind, id, data || COLLECTIONS[kind].defaults || {}, who(req)) }
}))
api.delete('/docs/:key', E, ok((req) => { store.remove(req.params.key, who(req)); return { ok: true } }))
api.post('/docs/:key/discard', E, ok((req) => ({ discarded: store.discard(req.params.key, who(req)) })))
api.get('/docs/:key/revisions', auth.require(), ok((req) => store.revisions(req.params.key)))
api.post('/docs/:key/revisions/:id/restore', E, ok((req) => { store.restoreRevision(req.params.key, Number(req.params.id), who(req)); return store.get(req.params.key) }))
api.get('/revisions/:id', auth.require(), ok((req) => {
  const r = db.prepare('SELECT * FROM revisions WHERE id = ?').get(Number(req.params.id))
  if (!r) throw httpError(404, 'Not found')
  return { ...r, data: r.data ? JSON.parse(r.data) : null }
}))

api.get('/changes', auth.require(), ok(() => store.changes()))
api.get('/validate', auth.require(), ok(() => store.validate('draft')))
api.post('/publish', auth.require('publish'), ok((req) => store.publish(who(req), req.body?.note || '')))
api.post('/discard', auth.require('publish'), ok((req) => ({ discarded: store.discard(null, who(req)) })))
api.get('/versions', auth.require(), ok(() => store.versions()))
api.get('/versions/:id', auth.require(), ok((req) => { const v = store.version(Number(req.params.id)); if (!v) throw httpError(404, 'Not found'); return v }))
api.post('/versions/:id/restore', auth.require('restore'), ok((req) => store.restoreVersion(Number(req.params.id), who(req), { publish: !!req.body?.publish })))
api.get('/activity', auth.require(), ok(() => store.activity(150)))
api.get('/schema-info', auth.require(), ok(() => ({ sections: Object.keys(SECTION_BY_TYPE), roles: ROLES })))

/* media */
api.get('/media', auth.require(), ok((req) => ({ items: media.list({ q: req.query.q, kind: req.query.kind, folder: req.query.folder, trash: req.query.trash === '1' }), folders: media.folders() })))
api.post('/media', E, ok(async (req) => { const m = await media.upload(req, who(req)); store.audit(who(req), 'upload', m.src); return m }))
api.get('/media/:id/usage', auth.require(), ok((req) => { const m = media.get(req.params.id); if (!m) throw httpError(404, 'Not found'); return media.usage(m.src) }))
api.patch('/media/:id', E, ok((req) => media.update(req.params.id, req.body || {})))
api.post('/media/:id/poster', E, ok((req) => media.setPoster(req.params.id, req.body?.src)))
api.delete('/media/:id', auth.require('media.delete'), ok((req) => { const r = media.trash(req.params.id, { force: req.query.force === '1' }); store.audit(who(req), 'trash-media', req.params.id); return r }))
api.post('/media/:id/restore', E, ok((req) => media.restore(req.params.id)))
api.delete('/media/:id/purge', auth.require('media.delete'), ok((req) => { media.purge(req.params.id); store.audit(who(req), 'delete-media', req.params.id); return { ok: true } }))

/* accounts */
api.get('/users', auth.require('users'), ok(() => auth.users()))
api.post('/users', auth.require('users'), ok((req) => { const u = auth.createUser({ ...req.body, mustChange: true }); store.audit(who(req), 'create-user', u.email, u.role); return u }))
api.patch('/users/:id', auth.require('users'), ok((req) => { const u = auth.updateUser(Number(req.params.id), req.body || {}, req.user); store.audit(who(req), 'update-user', u.email); return u }))
api.delete('/users/:id', auth.require('users'), ok((req) => { auth.deleteUser(Number(req.params.id), req.user); store.audit(who(req), 'delete-user', req.params.id); return { ok: true } }))
api.post('/users/:id/password', auth.require('users'), ok((req) => { auth.setPassword(Number(req.params.id), req.body?.password, { mustChange: true }); store.audit(who(req), 'reset-password', req.params.id); return { ok: true } }))

/* form messages */
api.get('/inbox', auth.require('inbox'), ok(() => db.prepare('SELECT * FROM submissions ORDER BY id DESC LIMIT 500').all().map((s) => ({ ...s, data: JSON.parse(s.data) }))))
api.patch('/inbox/:id', auth.require('inbox'), ok((req) => { db.prepare('UPDATE submissions SET read = ? WHERE id = ?').run(req.body?.read ? 1 : 0, Number(req.params.id)); return { ok: true } }))
api.delete('/inbox/:id', auth.require('inbox'), ok((req) => { db.prepare('DELETE FROM submissions WHERE id = ?').run(Number(req.params.id)); return { ok: true } }))

/* public: form submissions */
const formHits = new Map()
api.post('/forms/:form', ok(async (req) => {
  const ipKey = crypto.createHash('sha256').update(String(req.ip)).digest('hex').slice(0, 16)
  const hits = (formHits.get(ipKey) || []).filter((t) => Date.now() - t < 10 * 60000)
  if (hits.length >= 5) throw httpError(429, 'Too many messages — please try again later.')
  const body = req.body || {}
  if (body.website) return { ok: true } // spam trap
  const b = store.bundle('published')
  const page = String(body._page || '').slice(0, 120)
  const section = (b.pages || []).flatMap((p) => (p.sections || []).filter((s) => s.type === 'contact' && !s.hidden)).find((s) => (s.id || 'contact') === req.params.form)
  if (!section || section.showForm === false) throw httpError(404, 'This form is not available')
  const fields = section.fields?.length ? section.fields : DEFAULT_FIELDS
  const data = {}
  for (const f of fields) {
    const key = String(f.name || '').replace(/[^a-z0-9_-]/gi, '')
    if (!key) continue
    let v = typeof body[key] === 'string' ? body[key].trim() : ''
    if (v.length > (f.kind === 'textarea' ? 5000 : 300)) throw httpError(400, `“${f.label}” is too long`)
    if (f.required && !v) throw httpError(400, `Please fill in “${f.label}”`)
    if (v && f.kind === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw httpError(400, 'Please enter a valid email address')
    if (v && f.kind === 'select' && Array.isArray(f.options) && f.options.length && !f.options.includes(v)) throw httpError(400, `Please choose an option for “${f.label}”`)
    data[f.label || key] = v
  }
  hits.push(Date.now()); formHits.set(ipKey, hits)
  const id = db.prepare('INSERT INTO submissions (form, page, data, created_at) VALUES (?, ?, ?, ?)').run(req.params.form, page, JSON.stringify(data), new Date().toISOString()).lastInsertRowid; const idn = Number(id)
  const hook = process.env.FORM_WEBHOOK_URL || b.site?.contact?.formEndpoint
  if (hook && /^https:\/\//.test(hook)) {
    fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ form: req.params.form, page, ...data }), signal: AbortSignal.timeout(10000) })
      .then((r) => db.prepare('UPDATE submissions SET delivered = ? WHERE id = ?').run(r.ok ? 'forwarded' : `forward failed (${r.status})`, id))
      .catch(() => db.prepare('UPDATE submissions SET delivered = ? WHERE id = ?').run('forward failed', id))
  }
  return { ok: true }
}))
const DEFAULT_FIELDS = [
  { label: 'Your name', name: 'name', kind: 'text', required: true }, { label: 'Email', name: 'email', kind: 'email', required: true },
  { label: 'Company', name: 'company', kind: 'text' }, { label: 'What would you like to talk about?', name: 'message', kind: 'textarea', required: true },
]

api.use((req, res, next) => next(httpError(404, 'Unknown request')))
app.use('/api', api)

/* ---------- files ---------- */
app.use('/media', express.static(path.join(DATA_DIR, 'media'), { maxAge: '365d', immutable: true, fallthrough: false, dotfiles: 'deny' }))
app.get('/robots.txt', (req, res) => {
  const b = store.bundle('published')
  const origin = (b.site?.url || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api\nSitemap: ${origin}/sitemap.xml\n`)
})
app.get('/sitemap.xml', (req, res) => res.type('application/xml').send(sitemap(store.bundle('published'), `${req.protocol}://${req.get('host')}`)))

let vite = null
if (DEV) {
  const { createServer } = await import('vite')
  vite = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: { port: PORT + 10000 } }, appType: 'custom' })
  app.use(vite.middlewares)
} else {
  app.use('/assets', express.static(path.join(DIST, 'assets'), { maxAge: '365d', immutable: true, index: false }))
  app.use(express.static(DIST, { index: false, redirect: false, maxAge: '7d', setHeaders: (res, p) => { if (p.endsWith('.html')) res.set('Cache-Control', 'no-cache') } }))
}

const templates = {}
async function template(name, url) {
  const file = name === 'admin' ? path.join(DEV ? ROOT : DIST, 'admin/index.html') : path.join(DEV ? ROOT : DIST, 'index.html')
  if (DEV) return vite.transformIndexHtml(url, fs.readFileSync(file, 'utf8'))
  return (templates[name] ||= fs.readFileSync(file, 'utf8'))
}

const csp = (nonce, b, { admin = false } = {}) => {
  const a = b?.site?.analytics || {}
  const extraScript = [a.plausibleDomain ? 'https://plausible.io' : '', a.googleTagId ? 'https://www.googletagmanager.com' : ''].filter(Boolean).join(' ')
  const extraConnect = [a.plausibleDomain ? 'https://plausible.io' : '', a.googleTagId ? 'https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com' : ''].filter(Boolean).join(' ')
  return [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' ${admin ? '' : extraScript}`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:", "media-src 'self' blob: https:", `connect-src 'self' ${admin ? '' : extraConnect}`.trim(),
    "frame-ancestors 'self'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
  ].join('; ')
}

/* ---------- the editor ---------- */
app.get(['/admin', /^\/admin\/.*/], async (req, res, next) => {
  try {
    const html = (await template('admin', req.originalUrl)).replace(/<script(?![^>]*\bnonce=)([^>]*)>/g, `<script nonce="${res.locals.nonce}"$1>`)
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' })
    if (!DEV) res.set('Content-Security-Policy', csp(res.locals.nonce, null, { admin: true }))
    res.type('html').send(html)
  } catch (e) { next(e) }
})

/* ---------- the website (and its draft preview) ---------- */
app.get(/.*/, async (req, res, next) => {
  try {
    if (req.path.includes('.') && !req.path.endsWith('.html')) return res.status(404).type('text/plain').send('Not found')
    const preview = req.query.__preview === '1'
    if (preview && !req.user) return res.redirect(302, `/admin/login?next=${encodeURIComponent(req.originalUrl)}`)
    const bundle = store.bundle(preview ? 'draft' : 'published')
    const route = resolveRoute(bundle, req.path, { preview })
    if (route.kind === 'redirect') return res.redirect(route.status, route.to + (preview ? '?__preview=1' : ''))
    const origin = process.env.SITE_ORIGIN || `${req.protocol}://${req.get('host')}`
    const meta = metaFor(bundle, route, req.path, origin)
    const html = renderShell(await template('site', req.originalUrl), { bundle, meta, mode: preview ? 'preview' : 'live', nonce: DEV ? '' : res.locals.nonce, heroPoster: heroPosterOf(bundle) })
    res.set('Cache-Control', preview ? 'no-store' : 'no-cache')
    if (preview) res.set('X-Robots-Tag', 'noindex, nofollow')
    if (!DEV) res.set('Content-Security-Policy', csp(res.locals.nonce, bundle))
    res.status(route.kind === 'missing' ? 404 : 200).type('html').send(html)
  } catch (e) { next(e) }
})

/* ---------- errors ---------- */
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500
  if (status >= 500) console.error(err)
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server' : err.message, details: err.details })
  res.status(status).type('text/plain').send(status === 404 ? 'Not found' : 'Something went wrong')
})

app.listen(PORT, () => console.log(`${DEV ? 'Development' : 'Website'} server on http://localhost:${PORT}  ·  editor: http://localhost:${PORT}/admin`))
