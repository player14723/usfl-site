/**
 * A "bundle" is the whole website as one object — what the public site renders:
 *   { site, brand, theme, motion, navigation, media, system, company, pages[], cases[], capabilities[], insights[] }
 * The server stores it as separate documents (one per page, case study, setting…); these helpers convert.
 */
import { docKind, docId, SETTING_KEYS } from './schema.js'

export const COLLECTION_OF = { page: 'pages', case: 'cases', capability: 'capabilities', insight: 'insights' }
export const KIND_OF = { pages: 'page', cases: 'case', capabilities: 'capability', insights: 'insight' }

export function emptyBundle() {
  return { site: {}, brand: {}, theme: {}, motion: {}, navigation: {}, media: { images: [], cinematics: [] }, system: {}, company: {}, pages: [], cases: [], capabilities: [], insights: [] }
}

/** docs: iterable of { key, data } (data null/undefined = skip) */
export function assemble(docs) {
  const b = emptyBundle()
  for (const { key, data } of docs) {
    if (!data) continue
    const kind = docKind(key)
    if (kind === 'setting') { if (SETTING_KEYS.includes(key)) b[key] = data; continue }
    const coll = COLLECTION_OF[kind]
    if (!coll) continue
    const item = { ...data, _id: docId(key) }
    if (kind === 'page') item.id = item._id
    b[coll].push(item)
  }
  for (const c of ['pages', 'cases', 'capabilities', 'insights']) b[c].sort((x, y) => (x.order ?? 99) - (y.order ?? 99) || String(x._id).localeCompare(String(y._id)))
  if (!Array.isArray(b.media.images)) b.media.images = []
  if (!Array.isArray(b.media.cinematics)) b.media.cinematics = []
  return b
}

/** The reverse: bundle → [{ key, data }] */
export function split(bundle) {
  const out = []
  for (const k of SETTING_KEYS) if (bundle[k]) out.push({ key: k, data: bundle[k] })
  for (const [coll, kind] of Object.entries(KIND_OF)) {
    for (const item of bundle[coll] || []) {
      const { _id, ...data } = item
      const id = _id || item.id || item.slug
      if (id) out.push({ key: `${kind}:${id}`, data })
    }
  }
  return out
}

/** Human title of a document, for lists and change summaries. */
export function docTitle(key, data) {
  const kind = docKind(key)
  if (kind === 'setting') return { site: 'Site settings & SEO', brand: 'Branding', theme: 'Colours, type & spacing', motion: 'Motion & interactions', navigation: 'Navigation & footer', media: 'Media library & films', system: 'The connected system', company: 'Company facts' }[key] || key
  const label = { page: 'Page', case: 'Case study', capability: 'Capability', insight: 'Insight' }[kind]
  return `${label}: ${data?.title || data?.name || docId(key)}`
}

/** A short list of what differs between two JSON values: [{ path, before, after }] */
export function diff(a, b, path = '', out = [], limit = 60) {
  if (out.length >= limit) return out
  if (JSON.stringify(a) === JSON.stringify(b)) return out
  const isObj = (v) => v && typeof v === 'object'
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) out.push({ path: path || '(list)', before: `${a.length} items`, after: `${b.length} items` })
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${path}[${i + 1}]`, out, limit)
    return out
  }
  if (isObj(a) && isObj(b) && !Array.isArray(a) && !Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], path ? `${path}.${k}` : k, out, limit)
    return out
  }
  const show = (v) => (v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v))
  out.push({ path: path || '(value)', before: show(a).slice(0, 160), after: show(b).slice(0, 160) })
  return out
}
