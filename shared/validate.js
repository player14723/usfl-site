/**
 * Website validation — the same rules run in three places:
 *   - the editor, live (shows problems next to the Publish button);
 *   - the server, before every publish (errors block publishing);
 *   - scripts/check-config.mjs, before every build.
 *
 * validateBundle(bundle, { fileExists }) → { errors: [{ doc, message }], warnings: [{ doc, message }] }
 *
 * ERRORS would break the site or show something wrong: pages without an address, two pages on one address,
 * unknown section types, links to pages that do not exist, case studies mapped to missing capabilities, etc.
 * WARNINGS are shown but do not block: missing files, missing image descriptions, low contrast, hidden pages
 * still linked from the menu.
 */
import { SECTION_BY_TYPE } from './schema.js'

const TRANSITIONS = ['circle', 'diagonal', 'rise', 'shutter', 'hbars', 'fade', 'cut']
const PLAYBACK = ['loop', 'once', 'once-after-intro', 'manual']
export const cleanPath = (p) => {
  const c = '/' + String(p || '').trim().replace(/^\/+|\/+$/g, '')
  return c === '/' ? '/' : c
}

/* ---------- contrast ---------- */
function lum(hex) {
  const h = String(hex || '').replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6)
  if (!/^[0-9a-f]{6}$/i.test(f)) return null
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrastRatio = (a, b) => { const x = lum(a), y = lum(b); if (x == null || y == null) return 21; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
export const CONTRAST_PAIRS = [
  ['textOnDark', 'ink', 4.5], ['textOnDark', 'ink2', 4.5], ['textOnLight', 'paper', 4.5], ['mutedOnDark', 'ink', 4.5], ['mutedOnLight', 'paper', 4.5],
  ['buttonText', 'buttonBackground', 4.5], ['buttonOnLightText', 'buttonOnLightBackground', 4.5], ['selectionText', 'selectionBackground', 4.5],
  ['accentOnLight', 'paper', 3], ['accent', 'ink', 3], ['accent2', 'ink', 3], ['focusOnDark', 'ink', 3], ['focusOnLight', 'paper', 3],
]

export function validateBundle(b, { fileExists = () => true } = {}) {
  const errors = []
  const warnings = []
  const err = (doc, message) => errors.push({ doc, message })
  const warn = (doc, message) => warnings.push({ doc, message })
  const site = b.site || {}, theme = b.theme || {}, motion = b.motion || {}, media = b.media || {}, nav = b.navigation || {}
  const pages = b.pages || [], cases = b.cases || [], caps = b.capabilities || [], insights = b.insights || []

  const exists = (p) => !p || /^(https?:|data:|blob:)/.test(p) || fileExists(p)

  /* media */
  const images = new Map()
  for (const im of Array.isArray(media.images) ? media.images : []) {
    if (!im) continue
    if (im.name) images.set(im.name, im)
    if (im.src) images.set(im.src, im)
    if (im.src && !exists(im.src)) warn('media', `Image "${im.name || im.src}": file not found (${im.src})`)
  }
  const cins = new Map((Array.isArray(media.cinematics) ? media.cinematics : []).filter((c) => c && c.id).map((c) => [c.id, c]))
  const cinIds = new Set()
  for (const c of Array.isArray(media.cinematics) ? media.cinematics : []) {
    if (!c) continue
    if (!c.id) { err('media', 'A cinematic has no name'); continue }
    if (cinIds.has(c.id)) err('media', `Two cinematics are called "${c.id}"`)
    cinIds.add(c.id)
    if (c.enabled === false) continue
    for (const k of ['src', 'webm', 'mobileSrc', 'mobileWebm', 'poster', 'posterReducedMotion', 'sourceImage']) if (c[k] && !exists(c[k])) warn('media', `Cinematic "${c.id}": ${k} file not found (${c[k]})`)
    if ((c.type || 'video') === 'video' && !c.src) warn('media', `Cinematic "${c.id}" is a video without a video file — its poster is shown instead`)
    if (c.type === 'still' && !c.sourceImage && !c.poster) warn('media', `Cinematic "${c.id}" is a photo move without a photo`)
    if (!PLAYBACK.includes(c.playback || 'loop')) warn('media', `Cinematic "${c.id}": unknown playback "${c.playback}"`)
    if (!c.label) warn('media', `Cinematic "${c.id}" has no description for screen readers`)
  }
  const checkImage = (doc, where, ref) => {
    if (!ref || images.has(ref)) return
    if (/^(\/|https?:)/.test(ref)) { if (!exists(ref)) warn(doc, `${where}: image file not found (${ref})`); return }
    if (!exists(`/images/${ref}.webp`)) warn(doc, `${where}: image "${ref}" is not in the media library`)
  }
  const checkCin = (doc, where, id) => { if (id && !cins.has(id)) warn(doc, `${where}: film "${id}" does not exist (see Films & cinematics)`) }

  /* collections */
  const capSlugs = new Set(caps.filter((c) => c && !c.hidden).map((c) => c.slug))
  const allCapSlugs = new Set(caps.map((c) => c?.slug).filter(Boolean))
  const caseSlugs = new Set()
  const insightSlugs = new Set(insights.filter((i) => i && !i.hidden).map((i) => i.slug))
  const slugOk = (s) => /^[a-z0-9][a-z0-9-]*$/.test(String(s || ''))
  for (const c of cases) {
    const doc = `case:${c._id}`
    if (!c.slug) { err(doc, `Case study "${c.title || c._id}" has no address name`); continue }
    if (!slugOk(c.slug)) err(doc, `Case study "${c.title}": the address name may only use lower-case letters, numbers and dashes`)
    if (caseSlugs.has(c.slug)) err(doc, `Two case studies use the address name "${c.slug}"`)
    caseSlugs.add(c.slug)
    for (const cap of c.capabilities || []) if (!allCapSlugs.has(cap)) err(doc, `Case study "${c.title}" maps to capability "${cap}", which does not exist`)
    checkImage(doc, `Case study "${c.title}"`, c.image); checkImage(doc, `Case study "${c.title}"`, c.imageSecondary); checkCin(doc, `Case study "${c.title}"`, c.cinematic)
    if (c.image && !c.imageAlt) warn(doc, `Case study "${c.title}": the image has no description`)
  }
  const visibleCaseSlugs = new Set(cases.filter((c) => c && !c.hidden).map((c) => c.slug))
  const seenCap = new Set()
  for (const c of caps) {
    const doc = `capability:${c._id}`
    if (!c.slug) { err(doc, `Capability "${c.name || c._id}" has no address name`); continue }
    if (!slugOk(c.slug)) err(doc, `Capability "${c.name}": the address name may only use lower-case letters, numbers and dashes`)
    if (seenCap.has(c.slug)) err(doc, `Two capabilities use the address name "${c.slug}"`)
    seenCap.add(c.slug)
    checkImage(doc, `Capability "${c.name}"`, c.image)
    for (const s of c.relatedInsights || []) if (!insights.some((i) => i.slug === s)) warn(doc, `Capability "${c.name}": related insight "${s}" does not exist`)
  }
  const seenIns = new Set()
  for (const i of insights) {
    const doc = `insight:${i._id}`
    if (!i.slug) { err(doc, `Insight "${i.title || i._id}" has no address name`); continue }
    if (!slugOk(i.slug)) err(doc, `Insight "${i.title}": the address name may only use lower-case letters, numbers and dashes`)
    if (seenIns.has(i.slug)) err(doc, `Two insights use the address name "${i.slug}"`)
    seenIns.add(i.slug)
    checkImage(doc, `Insight "${i.title}"`, i.image)
  }

  /* pages */
  const R = { caseStudies: '/work', capabilities: '/capabilities', insights: '/insights', ...(site.routes || {}) }
  const templates = [cleanPath(R.caseStudies), cleanPath(R.capabilities), cleanPath(R.insights)]
  const paths = new Map()
  for (const p of pages) {
    const doc = `page:${p._id}`
    if (!p.path) { err(doc, `Page "${p.title || p._id}" has no address`); continue }
    if (!String(p.path).startsWith('/')) err(doc, `Page "${p.title}": the address must start with /`)
    if (!/^\/[a-z0-9\-/]*$/.test(p.path)) err(doc, `Page "${p.title}": the address may only use lower-case letters, numbers, dashes and /`)
    const path = cleanPath(p.path)
    if (paths.has(path)) err(doc, `Page "${p.title}" uses the address ${path}, which "${paths.get(path).title}" also uses`)
    if (templates.some((t) => path.startsWith(t + '/'))) err(doc, `Page "${p.title}": the address ${path} is reserved for case studies, capabilities or insights`)
    paths.set(path, { title: p.title, visible: p.visible !== false })
    const ids = new Set()
    ;(p.sections || []).forEach((s, i) => {
      const where = `${p.title} → section ${i + 1}`
      if (!s || !s.type) return err(doc, `${where}: missing type`)
      const def = SECTION_BY_TYPE[s.type]
      if (!def) return err(doc, `${where}: unknown section type "${s.type}"`)
      if (s.id) { if (ids.has(s.id)) warn(doc, `${where}: another section on this page is also called "${s.id}"`); ids.add(s.id) }
      if (s.type === 'transition' && !TRANSITIONS.includes(s.variant || 'circle')) err(doc, `${where}: unknown transition style "${s.variant}"`)
      checkImage(doc, where, s.image)
      ;(s.images || []).forEach((im) => checkImage(doc, where, im))
      checkCin(doc, where, s.cinematic); checkCin(doc, where, s.lead?.cinematic)
      if (s.image && !s.imageAlt && !s.hidden && !['problem'].includes(s.type)) {
        const lib = images.get(s.image)
        if (!lib || !lib.alt) warn(doc, `${where}: the image has no description`)
      }
      if (s.type === 'selected-work') {
        if (s.lead?.caseStudy && !caseSlugs.has(s.lead.caseStudy)) err(doc, `${where}: lead case study "${s.lead.caseStudy}" does not exist`)
        else if (s.lead?.caseStudy && !visibleCaseSlugs.has(s.lead.caseStudy)) warn(doc, `${where}: lead case study "${s.lead.caseStudy}" is hidden`)
        for (const c of s.pair || []) if (!caseSlugs.has(c)) err(doc, `${where}: case study "${c}" does not exist`)
      }
    })
  }
  if (!paths.has('/')) err('pages', 'No page uses the address "/" — the site has no home page')
  else if (!paths.get('/').visible) err('pages', 'The home page ("/") is not published')

  /* links */
  const linkOk = (to) => {
    if (!to || /^(https?:|mailto:|tel:|#)/.test(to)) return true
    const p = cleanPath(to.split('#')[0].split('?')[0])
    if (paths.has(p)) return true
    const t = templates.find((pre) => p.startsWith(pre + '/'))
    if (!t) return (site.redirects || []).some((r) => cleanPath(r.from) === p)
    const slug = p.slice(t.length + 1)
    return t === cleanPath(R.caseStudies) ? caseSlugs.has(slug) : t === cleanPath(R.capabilities) ? allCapSlugs.has(slug) : insights.some((i) => i.slug === slug)
  }
  const navLinks = [
    ...(nav.primary || []).flatMap((l) => [l, ...(l?.children || [])]), nav.cta, ...(nav.mobile?.extraLinks || []),
    ...(nav.footer?.columns || []).flatMap((c) => c?.links || []), ...(nav.footer?.legalLinks || []),
  ].filter(Boolean)
  for (const l of navLinks) {
    if (l.visible === false || !l.to) continue
    if (!linkOk(l.to)) err('navigation', `Menu link "${l.label}" goes to ${l.to}, which is not a page on the site`)
    const pg = paths.get(cleanPath(l.to))
    if (pg && !pg.visible) warn('navigation', `Menu link "${l.label}" goes to ${l.to}, but that page is not published`)
  }
  for (const r of site.redirects || []) {
    if (!r?.from) continue
    if (paths.has(cleanPath(r.from))) warn('site', `Redirect from ${r.from}: a page already uses that address, so the redirect is ignored`)
    if (!linkOk(r.to)) warn('site', `Redirect from ${r.from} goes to ${r.to}, which is not a page on the site`)
  }
  for (const p of pages) for (const s of p.sections || []) {
    for (const l of [s.primaryCta, s.secondaryCta, s.button, s.link].filter(Boolean)) if (l.to && !linkOk(l.to)) warn(`page:${p._id}`, `${p.title}: the button "${l.label}" goes to ${l.to}, which is not a page on the site`)
    if (s.linkTo && !linkOk(s.linkTo)) warn(`page:${p._id}`, `${p.title}: the link "${s.linkLabel}" goes to ${s.linkTo}, which is not a page on the site`)
  }

  /* design */
  const C = theme.colors || {}
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    if (C[fg] && C[bg]) { const r = contrastRatio(C[fg], C[bg]); if (r < min) warn('theme', `${fg} on ${bg} is ${r.toFixed(2)}:1 (needs ${min}:1) — the site will use black or white instead`) }
  }
  if (motion.preset && !['none', 'subtle', 'standard', 'cinematic', 'dramatic', ...Object.keys(motion.presets || {})].includes(motion.preset)) warn('motion', `Unknown motion preset "${motion.preset}" — "standard" will be used`)
  const bp = Number(theme.breakpoints?.desktop)
  if (theme.breakpoints && !(bp >= 480 && bp <= 1600)) warn('theme', `The desktop breakpoint ${theme.breakpoints?.desktop} looks wrong (expected 480–1600)`)

  return { errors, warnings, counts: { pages: pages.length, cases: cases.length, capabilities: caps.length, insights: insights.length } }
}

/* ---------- sanitising what the editor sends ---------- */
const BAD_URL = /^\s*(javascript|vbscript|data:text\/html)/i
const LINK_KEYS = new Set(['to', 'href', 'linkTo', 'canonical', 'url', 'formEndpoint', 'linkedin', 'instagram', 'x', 'youtube'])
/** Removes script URLs and control characters, trims oversized strings, drops prototype keys. Returns a clean copy. */
export function sanitize(value, key = '', depth = 0) {
  if (depth > 20) return null
  if (typeof value === 'string') {
    let s = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    if (s.length > 20000) s = s.slice(0, 20000)
    if ((LINK_KEYS.has(key) || /src|image|poster|favicon|webm/i.test(key)) && BAD_URL.test(s)) return ''
    return s
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'boolean' || value === null) return value
  if (Array.isArray(value)) return value.slice(0, 500).map((v) => sanitize(v, key, depth + 1))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
      if (v === undefined) continue
      out[k] = sanitize(v, k, depth + 1)
    }
    return out
  }
  return null
}
