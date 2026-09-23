/**
 * Editor bridge — loaded only when the site runs inside the editor's preview (window.__SITE_MODE__ = 'preview').
 *
 * It finds what on the page belongs to which piece of content (by matching the draft content against the page),
 * outlines it on hover, and tells the editor what was clicked:
 *   click         → select it (the editor opens the matching field)
 *   double-click  → edit the text right here on the page (Enter or click away to keep, Esc to cancel)
 * In "Browse" mode links work normally so the editor can move around the site.
 */
import { DATA } from '../platform/data'

const ORIGIN = window.location.origin
const send = (msg) => window.parent !== window && window.parent.postMessage({ src: 'usfl-preview', ...msg }, ORIGIN)
const norm = (s) => String(s ?? '').replace(/\*/g, '').replace(/\{[a-zA-Z]+\}/g, '').replace(/[ \s]+/g, ' ').trim().toLowerCase()
const SKIP_KEYS = new Set(['type', 'id', 'hidden', 'motion', 'spacing', 'theme', 'variant', 'height', 'to', 'linkTo', 'cinematic', 'caseStudy', 'pair', 'source', 'size', 'align', 'imageAspect', 'imageSide', 'aspect', 'mediaSide', 'reveal', 'textPosition', 'from', 'origin', 'slug', 'layout', 'path', 'kind', 'name', 'tone', 'style', 'order', 'number', '_id'])
const IMAGE_KEY = /^(image|imageSecondary|src|poster|imageOnLight|socialImage)$/

let mode = 'edit'
let map = [] // { el, doc, field, kind, label, raw, multiline }
let current = null
let editing = null

/* ---------- which document is this page? ---------- */
const clean = (p) => { const c = '/' + String(p || '').replace(/^\/+|\/+$/g, ''); return c === '/' ? '/' : c }
function routeDoc() {
  const p = clean(location.pathname)
  const page = (DATA.pages || []).find((x) => clean(x.path) === p)
  if (page) return { key: `page:${page._id || page.id}`, data: page, kind: 'page' }
  const R = { caseStudies: '/work', capabilities: '/capabilities', insights: '/insights', ...(DATA.site?.routes || {}) }
  for (const [kind, pre, list] of [['case', R.caseStudies, DATA.cases], ['capability', R.capabilities, DATA.capabilities], ['insight', R.insights, DATA.insights]]) {
    const base = clean(pre)
    if (p.startsWith(base + '/')) {
      const item = (list || []).find((x) => x.slug === p.slice(base.length + 1))
      if (item) return { key: `${kind}:${item._id}`, data: item, kind }
    }
  }
  return null
}

/* ---------- content leaves ---------- */
function leaves(obj, prefix = '', out = []) {
  if (obj == null) return out
  if (typeof obj === 'string') { out.push({ field: prefix, value: obj }); return out }
  if (Array.isArray(obj)) {
    if (obj.length && obj.every((x) => typeof x === 'string')) out.push({ field: prefix, value: obj.join(' '), joined: true, lines: obj })
    obj.forEach((v, i) => leaves(v, prefix ? `${prefix}.${i}` : String(i), out))
    return out
  }
  if (typeof obj === 'object') for (const [k, v] of Object.entries(obj)) {
    if (SKIP_KEYS.has(k) || k === 'seo') continue
    if (IMAGE_KEY.test(k) && typeof v === 'string') { out.push({ field: prefix ? `${prefix}.${k}` : k, value: v, image: true }); continue }
    leaves(v, prefix ? `${prefix}.${k}` : k, out)
  }
  return out
}
const labelOf = (field) => field.split('.').filter((x) => !/^\d+$/.test(x)).pop()?.replace(/([A-Z])/g, ' $1').toLowerCase() || 'text'

function mapRegion(root, doc, base, data, sectionIndex, sectionLabel) {
  const all = leaves(data)
  const texts = all.filter((l) => !l.image && norm(l.value).length >= 2)
  const byValue = new Map()
  for (const l of texts) { const k = norm(l.value); if (!byValue.has(k)) byValue.set(k, l) }
  const els = root instanceof Element ? [root, ...root.querySelectorAll('*')] : [...root].flatMap((r) => [r, ...r.querySelectorAll('*')])
  const taken = new Set()
  for (const el of els) {
    if (el.closest('.sr-only') || el.closest('[data-edit-field]') || el.matches('script,style,svg *,video,source,section,header,footer,main,nav,article,aside,ul,ol,form')) continue
    const t = norm(el.getAttribute('aria-label') || el.textContent)
    if (!t || t.length > 600) continue
    const hit = byValue.get(t)
    if (!hit || taken.has(hit.field)) continue
    const field = base ? `${base}.${hit.field}` : hit.field
    el.setAttribute('data-edit-field', field)
    map.push({ el, doc, field, kind: 'text', section: sectionIndex, label: `${sectionLabel ? sectionLabel + ' · ' : ''}${labelOf(hit.field)}`, raw: hit.joined ? hit.lines.join('\n') : hit.value, joined: !!hit.joined, multiline: !!hit.joined || hit.value.length > 90 || /text|lead|intro|summary|paragraph|body|dek|note/i.test(hit.field) })
    taken.add(hit.field)
  }
  // images
  const imgs = root instanceof Element ? root.querySelectorAll('img') : [...root].flatMap((r) => [...r.querySelectorAll('img')])
  for (const l of all.filter((x) => x.image && x.value)) {
    const stem = l.value.replace(/\.(webp|jpe?g|png|avif)$/i, '')
    for (const img of imgs) {
      const s = decodeURI(img.currentSrc || img.src || '')
      if (!s.includes(stem)) continue
      const target = img.closest('.frame, figure, .cv') || img
      if (target.hasAttribute('data-edit-field')) continue
      target.setAttribute('data-edit-field', base ? `${base}.${l.field}` : l.field)
      map.push({ el: target, doc, field: base ? `${base}.${l.field}` : l.field, kind: 'image', section: sectionIndex, label: `${sectionLabel ? sectionLabel + ' · ' : ''}image` })
    }
  }
  // films
  const cinField = data && typeof data === 'object' ? (data.cinematic !== undefined ? 'cinematic' : data.lead?.cinematic !== undefined ? 'lead.cinematic' : null) : null
  if (cinField) {
    const cvs = root instanceof Element ? root.querySelectorAll('.cv') : [...root].flatMap((r) => [...r.querySelectorAll('.cv')])
    for (const cv of cvs) {
      if (cv.hasAttribute('data-edit-field')) continue
      cv.setAttribute('data-edit-field', base ? `${base}.${cinField}` : cinField)
      map.push({ el: cv, doc, field: base ? `${base}.${cinField}` : cinField, kind: 'film', section: sectionIndex, label: `${sectionLabel ? sectionLabel + ' · ' : ''}film` })
    }
  }
}

function buildMap() {
  document.querySelectorAll('[data-edit-field]').forEach((e) => e.removeAttribute('data-edit-field'))
  map = []
  const route = routeDoc()
  if (route?.kind === 'page') {
    document.querySelectorAll('.sec[data-edit-sec]').forEach((sec) => {
      const i = Number(sec.getAttribute('data-edit-sec'))
      const s = route.data.sections?.[i]
      if (s) mapRegion(sec, route.key, `sections.${i}`, s, i, s.type)
    })
  } else if (route) {
    const main = document.querySelector('main')
    if (main) mapRegion(main, route.key, '', route.data, null, '')
  }
  const header = document.querySelector('header.nav'); const footer = document.querySelector('footer')
  if (header) mapRegion(header, 'navigation', '', { primary: DATA.navigation?.primary, cta: DATA.navigation?.cta, mobile: DATA.navigation?.mobile }, null, 'menu')
  if (footer) mapRegion(footer, 'navigation', '', { footer: DATA.navigation?.footer }, null, 'footer')
  send({ type: 'ready', path: location.pathname, doc: route?.key || null, title: document.title, height: document.documentElement.scrollHeight })
}

/* ---------- overlay ---------- */
const box = document.createElement('div')
const tag = document.createElement('div')
Object.assign(box.style, { position: 'fixed', zIndex: 2147483646, pointerEvents: 'none', border: '2px solid #C8FF3D', boxShadow: '0 0 0 1px rgba(8,10,13,.6)', borderRadius: '2px', display: 'none', transition: 'all .08s ease-out' })
Object.assign(tag.style, { position: 'fixed', zIndex: 2147483647, pointerEvents: 'none', background: '#C8FF3D', color: '#080A0D', font: '600 11px/1.2 system-ui, sans-serif', padding: '4px 7px', borderRadius: '2px', display: 'none', whiteSpace: 'nowrap', letterSpacing: '.02em' })
const selBox = box.cloneNode(); Object.assign(selBox.style, { border: '2px solid #C8FF3D', boxShadow: '0 0 0 2000px rgba(8,10,13,.0), 0 0 0 1px rgba(8,10,13,.6)' })
function rectOf(el) {
  if (!el) return null
  if (getComputedStyle(el).display === 'contents') {
    const kids = [...el.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width || r.height)
    if (!kids.length) return null
    const top = Math.min(...kids.map((r) => r.top)), left = Math.min(...kids.map((r) => r.left)), bottom = Math.max(...kids.map((r) => r.bottom)), right = Math.max(...kids.map((r) => r.right))
    return { top, left, width: right - left, height: bottom - top }
  }
  return el.getBoundingClientRect()
}
function place(b, el, label) {
  const r = rectOf(el)
  if (!r) { b.style.display = 'none'; if (b === box) tag.style.display = 'none'; return }
  Object.assign(b.style, { display: 'block', top: `${Math.max(0, r.top)}px`, left: `${Math.max(0, r.left)}px`, width: `${Math.min(r.width, innerWidth)}px`, height: `${Math.min(r.height, innerHeight - Math.max(0, r.top))}px` })
  if (b === box && label) { Object.assign(tag.style, { display: 'block', top: `${Math.max(0, r.top - 22)}px`, left: `${Math.max(0, r.left)}px` }); tag.textContent = label }
}
function fieldAt(e) {
  // overlays (scrims, pinned layers) can sit above text; look through everything under the pointer
  const direct = e.target.closest?.('[data-edit-field]')
  if (direct) return direct
  if (e.clientX == null) return null
  for (const el of document.elementsFromPoint(e.clientX, e.clientY)) {
    if (el === box || el === tag || el === selBox) continue
    const f = el.closest?.('[data-edit-field]')
    if (f) return f
  }
  // some layers ignore the pointer (pointer-events: none); fall back to geometry — the smallest mapped box under it
  let best = null, area = Infinity
  for (const m of map) {
    const r = m.el.getBoundingClientRect()
    if (!r.width || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue
    const a = r.width * r.height
    if (a < area) { area = a; best = m.el }
  }
  return best
}
function targetFrom(e) {
  const el = fieldAt(e)
  if (el) return map.find((m) => m.el === el) || null
  const sec = e.target.closest?.('[data-edit-sec]')
  if (sec) return { el: sec, doc: sec.getAttribute('data-edit-doc'), field: `sections.${sec.getAttribute('data-edit-sec')}`, kind: 'section', section: Number(sec.getAttribute('data-edit-sec')), label: `${sec.getAttribute('data-section')} section` }
  if (e.target.closest?.('header.nav')) return { el: document.querySelector('header.nav'), doc: 'navigation', field: 'primary', kind: 'section', label: 'menu' }
  if (e.target.closest?.('footer')) return { el: document.querySelector('footer'), doc: 'navigation', field: 'footer', kind: 'section', label: 'footer' }
  return null
}

/* ---------- inline editing ---------- */
function startInline(t) {
  if (editing || t.kind !== 'text') return
  const el = t.el
  editing = { t, html: el.innerHTML, styleUserSelect: el.style.userSelect }
  el.innerText = t.raw
  el.setAttribute('contenteditable', 'plaintext-only')
  if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true')
  Object.assign(el.style, { outline: '2px dashed #C8FF3D', outlineOffset: '6px', userSelect: 'text', cursor: 'text' })
  el.focus()
  const range = document.createRange(); range.selectNodeContents(el)
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range)
  box.style.display = 'none'; tag.style.display = 'none'
  send({ type: 'inline-start', doc: t.doc, field: t.field })
  el.addEventListener('input', onInlineInput)
  el.addEventListener('keydown', onInlineKey)
  el.addEventListener('blur', commitInline, { once: true })
}
function onInlineInput() { if (editing) send({ type: 'inline-input', doc: editing.t.doc, field: editing.t.field, value: valueOf(editing), joined: editing.t.joined }) }
function valueOf(ed) { return ed.t.el.innerText.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') }
function onInlineKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); cancelInline() }
  if (e.key === 'Enter' && !e.shiftKey && !editing?.t.multiline) { e.preventDefault(); editing.t.el.blur() }
}
function stopInline() {
  const el = editing.t.el
  el.removeAttribute('contenteditable'); el.style.outline = ''; el.style.outlineOffset = ''; el.style.cursor = ''; el.style.userSelect = editing.styleUserSelect
  el.removeEventListener('input', onInlineInput); el.removeEventListener('keydown', onInlineKey)
}
function commitInline() {
  if (!editing) return
  const value = valueOf(editing)
  const { t } = editing
  stopInline()
  editing = null
  if (value !== t.raw) send({ type: 'inline-commit', doc: t.doc, field: t.field, value, joined: t.joined })
  else send({ type: 'inline-cancel', unchanged: true })
}
function cancelInline() {
  if (!editing) return
  const { t, html } = editing
  t.el.removeEventListener('blur', commitInline)
  stopInline()
  t.el.innerHTML = html
  editing = null
  send({ type: 'inline-cancel' })
}

/* ---------- events ---------- */
function onMove(e) {
  if (mode !== 'edit' || editing) return
  const t = targetFrom(e)
  if (!t) { box.style.display = 'none'; tag.style.display = 'none'; return }
  place(box, t.el, t.label + (t.kind === 'text' ? ' — double-click to edit' : t.kind === 'image' ? ' — click to replace' : ''))
}
function onClick(e) {
  if (mode !== 'edit') {
    const a = e.target.closest?.('a[href]')
    if (a && a.origin !== ORIGIN) { e.preventDefault(); return } // never leave the preview
    return
  }
  if (editing && editing.t.el.contains(e.target)) return
  e.preventDefault(); e.stopPropagation()
  const t = targetFrom(e)
  if (!t) return
  current = t
  place(selBox, t.el)
  send({ type: 'select', doc: t.doc, field: t.field, kind: t.kind, section: t.section ?? null })
}
function onDbl(e) {
  if (mode !== 'edit') return
  const t = targetFrom(e)
  if (t?.kind === 'text') { e.preventDefault(); e.stopPropagation(); startInline(t) }
}
function onMessage(e) {
  if (e.origin !== ORIGIN || e.data?.src !== 'usfl-editor') return
  const m = e.data
  if (m.type === 'mode') { mode = m.mode; document.documentElement.classList.toggle('editor-browse', mode !== 'edit'); box.style.display = 'none'; tag.style.display = 'none'; selBox.style.display = 'none' }
  if (m.type === 'highlight') {
    const t = m.field ? map.find((x) => x.doc === m.doc && x.field === m.field) : null
    const el = t?.el || (m.section != null ? document.querySelector(`.sec[data-edit-sec="${m.section}"]`) : null)
    if (!el) { selBox.style.display = 'none'; return }
    const target = getComputedStyle(el).display === 'contents' ? el.firstElementChild : el
    if (m.scroll && target) {
      const r = target.getBoundingClientRect()
      if (r.top < 0 || r.top > innerHeight * 0.7) window.scrollTo({ top: window.scrollY + r.top - 120, behavior: 'instant' })
    }
    requestAnimationFrame(() => { current = t || { el }; place(selBox, el) })
  }
  if (m.type === 'rebuild') buildMap()
}

let raf = 0
const reposition = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (current?.el && selBox.style.display !== 'none') place(selBox, current.el) }) }
const saveScroll = () => { try { sessionStorage.setItem(`preview-scroll:${location.pathname}`, String(window.scrollY)) } catch {} }

export function start() {
  document.body.append(box, tag, selBox)
  const style = document.createElement('style')
  style.textContent = `html:not(.editor-browse) [data-edit-field], html:not(.editor-browse) [data-edit-sec] > * { cursor: pointer !important; }
    html:not(.editor-browse) .cursor { display: none !important; } html:not(.editor-browse) * { cursor: auto; }
    [contenteditable] { caret-color: #C8FF3D; } [contenteditable]:focus { outline: 2px dashed #C8FF3D !important; }`
  document.head.append(style)
  document.addEventListener('mousemove', onMove, true)
  document.addEventListener('click', onClick, true)
  document.addEventListener('dblclick', onDbl, true)
  window.addEventListener('message', onMessage)
  window.addEventListener('scroll', () => { reposition(); saveScroll() }, { passive: true })
  window.addEventListener('resize', reposition)
  document.addEventListener('mouseleave', () => { box.style.display = 'none'; tag.style.display = 'none' })
  // restore the scroll position after the editor reloads the preview
  let y = 0
  try { y = Number(sessionStorage.getItem(`preview-scroll:${location.pathname}`)) || 0 } catch {}
  const settle = () => { if (y) window.scrollTo(0, y); buildMap() }
  if (document.readyState === 'complete') setTimeout(settle, 350)
  else window.addEventListener('load', () => setTimeout(settle, 350))
  // rebuild after client-side navigation and after late renders
  let last = location.pathname
  setInterval(() => { if (location.pathname !== last) { last = location.pathname; setTimeout(buildMap, 900) } }, 250)
  setTimeout(buildMap, 2500)
}
