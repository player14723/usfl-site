import { PAGES, SITE } from '../platform/config'

export const IS_HASH = import.meta.env.VITE_HASH === '1'
/** href for a route path, correct for both BrowserRouter and HashRouter builds. */
const BASE = !IS_HASH && /^\/.+/.test(import.meta.env.BASE_URL || '/') ? import.meta.env.BASE_URL.replace(/\/$/, '') : ''
export const BASENAME = BASE || undefined
export const hrefFor = (to) => (IS_HASH ? `#${to}` : String(to).startsWith('/') ? BASE + to : to)
export const isExternal = (to = '') => /^(https?:|mailto:|tel:)/.test(to)

const clean = (p) => '/' + String(p || '').replace(/^\/+|\/+$/g, '')
const TEMPLATES = () => [
  [clean(SITE.routes.caseStudies) + '/', 'Case study'],
  [clean(SITE.routes.capabilities) + '/', 'Capability'],
  [clean(SITE.routes.insights) + '/', 'Insight'],
]

/** Name shown on the page-transition curtain (a page's `transitionLabel`, or its title). */
export function labelFor(path) {
  const page = PAGES.find((p) => p.path === path)
  if (page) return page.transitionLabel || page.title || SITE.name
  const t = TEMPLATES().find(([pre]) => path.startsWith(pre))
  if (t) return t[1]
  const parent = [...PAGES].sort((a, b) => b.path.length - a.path.length).find((p) => p.path !== '/' && path.startsWith(p.path))
  return parent ? parent.transitionLabel || parent.title : SITE.name
}
/** Small index shown above the curtain label (a page's `transitionIndex`). */
export function indexFor(path) {
  const page = PAGES.find((p) => p.path === path) || [...PAGES].sort((a, b) => b.path.length - a.path.length).find((p) => p.path !== '/' && path.startsWith(p.path))
  return page?.transitionIndex || '00'
}
