/**
 * SEO — every page (and every case study, capability and insight) can set its own title, description,
 * social title/description/image, canonical URL and robots rule. Anything left blank falls back to the
 * site defaults in src/config/site.json → seo.
 */
import { useEffect } from 'react'
import { SITE, BRAND } from './config'

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!value) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', value)
}
function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!href) { el?.remove(); return }
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el) }
  el.href = href
}
const abs = (p) => {
  if (!p) return ''
  if (/^https?:/.test(p)) return p
  const base = (SITE.url || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')
  return base + (p.startsWith('/') ? p : '/' + p)
}

/** Title for the <title> tag from the template, e.g. "{title} — USFL". Blank title → the default title. */
export function fullTitle(title) {
  if (!title) return SITE.seo.defaultTitle || SITE.name
  return (SITE.seo.titleTemplate || '{title}').replace('{title}', title).replace('{site}', SITE.name)
}

export function applySeo({ title = '', description = '', ogTitle = '', ogDescription = '', image = '', canonical = '', robots = '', path = '/' } = {}) {
  const t = fullTitle(title)
  const d = description || SITE.seo.description || ''
  document.title = t
  setMeta('name', 'description', d)
  setMeta('name', 'robots', robots || SITE.seo.robots || '')
  setMeta('property', 'og:title', ogTitle || t)
  setMeta('property', 'og:description', ogDescription || d)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:site_name', SITE.name)
  setMeta('property', 'og:locale', SITE.locale)
  setMeta('property', 'og:image', abs(image || SITE.seo.socialImage || BRAND.socialImage))
  setMeta('property', 'og:url', SITE.url ? abs(path) : '')
  setMeta('name', 'twitter:card', SITE.seo.twitterCard || 'summary_large_image')
  setLink('canonical', canonical ? abs(canonical) : SITE.url ? abs(path) : '')
  document.documentElement.lang = SITE.language || 'en'
}

/** Organisation structured data (schema.org) built only from facts in site.json. */
export function applyStructuredData() {
  if (!SITE.seo.structuredData) return
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    ...(SITE.url ? { url: SITE.url } : {}),
    ...(SITE.descriptor ? { description: SITE.descriptor } : {}),
    ...(SITE.url && (SITE.seo.socialImage || BRAND.socialImage) ? { logo: abs(BRAND.socialImage || SITE.seo.socialImage) } : {}),
    sameAs: Object.values(SITE.social || {}).filter(Boolean),
  }
  let el = document.getElementById('org-ld')
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'org-ld'; document.head.appendChild(el) }
  el.textContent = JSON.stringify(data)
}

export function useSeo(seo, deps = []) {
  useEffect(() => {
    applySeo(seo || {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
