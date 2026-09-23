#!/usr/bin/env node
/**
 * End-to-end test of the content system: drafts, publishing, versions, permissions, media and forms.
 * Starts its own server on a spare port with a throw-away database, so it never touches real content.
 *
 *   npm run build && npm test
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) { console.error('Run `npm run build` first.'); process.exit(1) }
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'site-test-'))
const PORT = 3900 + Math.floor(Math.random() * 90)
const BASE = `http://127.0.0.1:${PORT}`
const OWNER = { email: 'owner@test.local', password: 'Owner-test-password-1' }

const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), DATA_DIR: DATA, ADMIN_EMAIL: OWNER.email, ADMIN_PASSWORD: OWNER.password, INSECURE_COOKIES: '1', FORM_WEBHOOK_URL: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let log = ''
server.stdout.on('data', (d) => { log += d })
server.stderr.on('data', (d) => { log += d })

let passed = 0, failed = 0
const check = (name, cond, extra = '') => { if (cond) { passed++; console.log(`  ✓ ${name}`) } else { failed++; console.log(`  ✗ ${name} ${extra}`) } }

class Client {
  constructor() { this.cookie = ''; this.csrf = '' }
  async req(p, { method = 'GET', body, raw, headers = {} } = {}) {
    const h = { Accept: 'application/json', ...headers }
    if (this.cookie) h.Cookie = this.cookie
    if (method !== 'GET' && this.csrf && !('X-CSRF-Token' in headers)) h['X-CSRF-Token'] = this.csrf
    if (body !== undefined) h['Content-Type'] = 'application/json'
    const r = await fetch(BASE + p, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined), redirect: 'manual' })
    const set = r.headers.get('set-cookie')
    if (set) this.cookie = set.split(';')[0]
    const text = await r.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { status: r.status, json, text }
  }
  async login(email, password) {
    const r = await this.req('/api/session', { method: 'POST', body: { email, password } })
    this.csrf = r.json?.csrf || ''
    return r
  }
}
const live = async (p = '/') => {
  const r = await fetch(BASE + p)
  const html = await r.text()
  const m = html.match(/window\.__SITE_DATA__=(\{[\s\S]*?\});window\.__SITE_MODE__/)
  return { status: r.status, html, data: m ? JSON.parse(m[1]) : null }
}
const home = (b) => b.pages.find((p) => p.path === '/')

async function run() {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE + '/robots.txt'); break } catch { await new Promise((r) => setTimeout(r, 250)) } }
  const owner = new Client()
  const anon = new Client()

  console.log('Security')
  check('signed-out requests are refused', (await anon.req('/api/docs')).status === 401)
  check('a wrong password is refused', (await anon.req('/api/session', { method: 'POST', body: { email: OWNER.email, password: 'nope-nope-nope' } })).status === 401)
  check('the owner can sign in', (await owner.login(OWNER.email, OWNER.password)).status === 200)
  check('changes without the CSRF token are refused', (await owner.req('/api/docs/theme', { method: 'PUT', body: { data: {} }, headers: { 'X-CSRF-Token': '' } })).status === 403)
  check('draft preview needs a sign-in', (await anon.req('/?__preview=1')).status === 302)
  check('the editor page is not indexed', (await fetch(BASE + '/admin')).headers.get('x-robots-tag')?.includes('noindex'))

  console.log('Drafts and publishing')
  const before = await live('/')
  const doc = (await owner.req('/api/docs/page:home')).json
  const edited = structuredClone(doc.draft)
  edited.sections[0].lines = ['Test', '*draft*', 'headline.']
  check('a draft saves', (await owner.req('/api/docs/page:home', { method: 'PUT', body: { data: edited, rev: doc.rev } })).status === 200)
  check('a stale save is refused (someone else changed it)', (await owner.req('/api/docs/page:home', { method: 'PUT', body: { data: edited, rev: doc.rev } })).status === 409)
  let now = await live('/')
  check('the live site does not show the draft', JSON.stringify(home(now.data).sections[0].lines) === JSON.stringify(home(before.data).sections[0].lines))
  const preview = await owner.req('/?__preview=1')
  check('the preview shows the draft', preview.text.includes('*draft*'))
  const created = (await owner.req('/api/docs', { method: 'POST', body: { kind: 'page', id: 'test-page', data: { title: 'Test page', path: '/test-page', visible: true, sections: [{ type: 'statement', lines: ['Hello'] }] } } })).json
  check('a page can be created', created?.key === 'page:test-page')
  check('an unpublished page is not on the live site', (await live('/test-page')).status === 404)
  const pub = await owner.req('/api/publish', { method: 'POST', body: { note: 'test' } })
  check('publishing works', pub.status === 200, JSON.stringify(pub.json))
  now = await live('/')
  check('the live site shows the published change', home(now.data).sections[0].lines[1] === '*draft*')
  check('the new page is live', (await live('/test-page')).status === 200)
  check('the page title comes from the page', (await live('/test-page')).html.includes('<title>Test page'))
  check('the sitemap lists it', (await (await fetch(BASE + '/sitemap.xml')).text()).includes('/test-page'))

  console.log('Validation')
  const dup = (await owner.req('/api/docs', { method: 'POST', body: { kind: 'page', id: 'clash', data: { title: 'Clash', path: '/test-page', sections: [] } } })).json
  const blocked = await owner.req('/api/publish', { method: 'POST', body: {} })
  check('publishing is blocked when two pages share an address', blocked.status === 422 && blocked.json.details?.some((d) => /also uses/.test(d.message)))
  await owner.req(`/api/docs/${dup.key}`, { method: 'DELETE' })

  console.log('Versions and recovery')
  const versions = (await owner.req('/api/versions')).json
  check('each publish is kept as a version', versions.length >= 2)
  const original = versions[versions.length - 1]
  check('restoring a version and publishing works', (await owner.req(`/api/versions/${original.id}/restore`, { method: 'POST', body: { publish: true } })).status === 200)
  now = await live('/')
  check('the live site is back to the original', JSON.stringify(home(now.data).sections[0].lines) === JSON.stringify(home(before.data).sections[0].lines))
  check('the removed page is gone again', (await live('/test-page')).status === 404)
  const revs = (await owner.req('/api/docs/page:home/revisions')).json
  check('earlier drafts are kept', revs.length > 0)

  console.log('Media')
  const png = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#335577' } }).png().toBuffer()
  const fd = new FormData()
  fd.append('file', new Blob([png], { type: 'image/png' }), 'Test Image.png')
  const up = await owner.req('/api/media', { method: 'POST', raw: fd })
  check('an image uploads and is converted to WebP', up.status === 200 && up.json.src.endsWith('.webp') && up.json.srcSmall, JSON.stringify(up.json))
  check('the uploaded file is served', (await fetch(BASE + up.json.src)).status === 200)
  const fake = new FormData()
  fake.append('file', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'evil.png')
  check('a file that is not really an image is refused', (await owner.req('/api/media', { method: 'POST', raw: fake })).status === 415)

  console.log('Accounts and roles')
  const acct = await owner.req('/api/users', { method: 'POST', body: { email: 'editor@test.local', role: 'editor', password: 'Temp-password-123' } })
  check('the owner can add an editor', acct.status === 200)
  const editor = new Client()
  await editor.login('editor@test.local', 'Temp-password-123')
  const d2 = (await editor.req('/api/docs/page:contact')).json
  check('an editor can save drafts', (await editor.req('/api/docs/page:contact', { method: 'PUT', body: { data: { ...d2.draft, title: 'Edited' }, rev: d2.rev } })).status === 200)
  check('an editor cannot publish', (await editor.req('/api/publish', { method: 'POST', body: {} })).status === 403)
  check('an editor cannot change site-wide design', (await editor.req('/api/docs/theme', { method: 'PUT', body: { data: {} } })).status === 403)
  check('an editor cannot manage accounts', (await editor.req('/api/users')).status === 403)
  await owner.req('/api/discard', { method: 'POST' })

  console.log('Forms')
  const sent = await anon.req('/api/forms/contact', { method: 'POST', body: { name: 'Test', email: 'test@example.com', message: 'Hello' } })
  check('the contact form accepts a message', sent.status === 200)
  check('a message without required fields is refused', (await anon.req('/api/forms/contact', { method: 'POST', body: { name: 'x' } })).status === 400)
  const inbox = (await owner.req('/api/inbox')).json
  check('messages appear in the inbox', inbox.some((m) => m.data.Email === 'test@example.com' || Object.values(m.data).includes('test@example.com')))

  console.log('Content safety')
  const d3 = (await owner.req('/api/docs/navigation')).json
  const bad = structuredClone(d3.draft); bad.cta = { ...bad.cta, to: 'javascript:alert(1)' }
  await owner.req('/api/docs/navigation', { method: 'PUT', body: { data: bad, rev: d3.rev } })
  check('script links are removed when saved', (await owner.req('/api/docs/navigation')).json.draft.cta.to === '')
  await owner.req('/api/discard', { method: 'POST' })
}

run()
  .catch((e) => { failed++; console.error(e) })
  .finally(() => {
    server.kill()
    fs.rmSync(DATA, { recursive: true, force: true })
    console.log(`\n${passed} passed, ${failed} failed`)
    if (failed) { console.log(log.slice(-2000)); process.exit(1) }
  })
