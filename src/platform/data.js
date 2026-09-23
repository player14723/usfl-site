/**
 * The website's content at runtime.
 *
 * On the live site the server writes the PUBLISHED content into the page (window.__SITE_DATA__); in the editor's
 * preview it writes the DRAFT. The JSON files in src/config and src/content are only a fallback, used when the
 * site is opened without the server (for example a static export).
 */
import { assemble } from '../../shared/bundle.js'

const pick = (files) => Object.entries(files).map(([file, data]) => ({ id: file.split('/').pop().replace(/\.json$/, ''), data }))
function fallback() {
  const cfg = import.meta.glob('../config/*.json', { eager: true, import: 'default' })
  const content = import.meta.glob('../content/*.json', { eager: true, import: 'default' })
  const docs = []
  for (const { id, data } of [...pick(cfg), ...pick(content)]) docs.push({ key: id, data })
  for (const [kind, files] of [
    ['page', import.meta.glob('../config/pages/*.json', { eager: true, import: 'default' })],
    ['case', import.meta.glob('../content/cases/*.json', { eager: true, import: 'default' })],
    ['capability', import.meta.glob('../content/capabilities/*.json', { eager: true, import: 'default' })],
    ['insight', import.meta.glob('../content/insights/*.json', { eager: true, import: 'default' })],
  ]) for (const { id, data } of pick(files)) docs.push({ key: `${kind}:${id}`, data })
  return assemble(docs)
}

const injected = typeof window !== 'undefined' && window.__SITE_DATA__
export const DATA = injected || fallback()
/** 'live' (public site) · 'preview' (inside the editor) · 'static' (no server) */
export const MODE = typeof window !== 'undefined' && window.__SITE_MODE__ ? window.__SITE_MODE__ : 'static'
export const IS_PREVIEW = MODE === 'preview'
