/**
 * Platform config loader.
 *
 * Everything the site owner can change is edited in the website editor (/admin) and stored by the server.
 * It arrives through ./data.js — the published content on the live site, the draft in the editor's preview.
 * (src/config and src/content hold the original content the database was created from.)
 *
 * This module reads it once, fills anything missing with safe defaults, and exports
 * plain objects the components use. Components never import the JSON directly.
 */
import { DATA, IS_PREVIEW } from './data'

const siteJson = DATA.site || {}
const brandJson = DATA.brand || {}
const themeJson = DATA.theme || {}
const motionJson = DATA.motion || {}
const mediaJson = DATA.media || {}
const navJson = DATA.navigation || {}

/** Deep merge: values in `over` win; arrays are replaced, not merged. */
export function merge(base, over) {
  if (over === undefined || over === null) return base
  if (Array.isArray(base) || Array.isArray(over) || typeof base !== 'object' || typeof over !== 'object') return over
  const out = { ...base }
  for (const k of Object.keys(over)) out[k] = merge(base?.[k], over[k])
  return out
}

const warn = (...a) => { if (import.meta.env.DEV) console.warn('[config]', ...a) }

/* ---------- site ---------- */
const SITE_DEFAULTS = {
  name: 'Website', tagline: '', positioning: '', descriptor: '', audience: '', url: '', locale: 'en', language: 'en',
  social: {}, contact: { email: '', formEndpoint: '' },
  seo: { titleTemplate: '{title}', defaultTitle: '', description: '', socialImage: '', robots: 'index, follow', twitterCard: 'summary_large_image', structuredData: true },
  intro: { enabled: false, oncePerSession: true, words: [], skipLabel: 'Skip intro' },
  notFound: { eyebrow: 'Error 404', title: '404', message: 'Page not found.', primary: { label: 'Back home', to: '/' }, secondary: null },
  routes: { caseStudies: '/work', capabilities: '/capabilities', insights: '/insights' },
}
export const SITE = merge(SITE_DEFAULTS, siteJson)
// hosting-environment values take priority, so private details never need to live in the repository
SITE.contact.email = import.meta.env.VITE_CONTACT_EMAIL || SITE.contact.email || ''
SITE.contact.formEndpoint = import.meta.env.VITE_CONTACT_ENDPOINT || SITE.contact.formEndpoint || ''
if (import.meta.env.VITE_SITE_URL) SITE.url = import.meta.env.VITE_SITE_URL

/* ---------- brand ---------- */
export const BRAND = merge({ logo: { type: 'wordmark', image: '', imageOnLight: '', alt: SITE.name, height: '26px' }, wordmark: { showSignalTicks: true, tickColors: [] }, footerMark: { show: true }, favicon: '/favicon.svg', themeColor: '#000000', socialImage: '' }, brandJson)

/* ---------- theme / motion / media / navigation ---------- */
export const THEME = themeJson
export const MOTION = motionJson
export const MEDIA = merge({ images: {}, cinematics: {} }, mediaJson)
export const NAV = merge({ primary: [], cta: { label: '', to: '', visible: false }, mobile: { menuLabel: 'Menu', includeHome: true, showCta: true, extraLinks: [] }, footer: { columns: [], legalLinks: [], copyright: '', bottomRight: '' } }, navJson)

/* ---------- pages ---------- */
const PAGE_DEFAULTS = { title: '', path: '', visible: true, order: 99, transitionLabel: '', transitionIndex: '', seo: {}, sections: [] }
const allPages = (DATA.pages || [])
  .map((p) => {
    const id = p?._id || p?.id
    const page = merge(PAGE_DEFAULTS, { ...p, id })
    if (!page.path) { warn(`page "${id}" has no path — skipped`); return null }
    if (!page.path.startsWith('/')) page.path = '/' + page.path
    page.sections = (Array.isArray(page.sections) ? page.sections : []).filter((s) => s && s.type)
    return page
  })
  .filter(Boolean)
  .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))

const seen = new Set()
export const PAGES = allPages.filter((p) => {
  if (seen.has(p.path)) { warn(`two pages use the path ${p.path}; the second is ignored`); return false }
  seen.add(p.path)
  return true
})
// in the editor's preview, unpublished pages can be viewed too
export const visiblePages = () => (IS_PREVIEW ? PAGES : PAGES.filter((p) => p.visible !== false))
export const pageByPath = (path) => PAGES.find((p) => p.path === path)
