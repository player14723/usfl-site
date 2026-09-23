/**
 * Server-side page shell: puts the website data into the HTML and writes the right title, description, social
 * tags and canonical address for every address, so search engines and link previews see real content.
 */
import { cleanPath } from '../shared/validate.js'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const plain = (s) => String(s ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
/** JSON that is safe inside a <script> element */
export const scriptJson = (v) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')

/** What lives at this address? → { kind: 'page'|'case'|'capability'|'insight'|'redirect'|'missing', item, to, status } */
export function resolveRoute(b, pathname, { preview = false } = {}) {
  const p = cleanPath(decodeURIComponent(pathname))
  const R = { caseStudies: '/work', capabilities: '/capabilities', insights: '/insights', ...(b.site?.routes || {}) }
  const page = (b.pages || []).find((x) => (preview || x.visible !== false) && cleanPath(x.path) === p)
  if (page) return { kind: 'page', item: page }
  for (const [kind, prefix, list] of [['case', R.caseStudies, b.cases], ['capability', R.capabilities, b.capabilities], ['insight', R.insights, b.insights]]) {
    const pre = cleanPath(prefix)
    if (p.startsWith(pre + '/')) {
      const slug = p.slice(pre.length + 1)
      const item = (list || []).find((x) => x.slug === slug && (preview || !x.hidden))
      if (item) return { kind, item }
    }
  }
  if (p === '/case-studies' || p.startsWith('/case-studies/')) {
    const to = cleanPath(R.caseStudies) + p.slice('/case-studies'.length)
    if (to !== p) return { kind: 'redirect', to, status: 301 }
  }
  const r = (b.site?.redirects || []).find((x) => x?.from && x?.to && cleanPath(x.from) === p)
  if (r) return { kind: 'redirect', to: r.to, status: r.permanent === false ? 302 : 301 }
  return { kind: 'missing' }
}

export function metaFor(b, route, pathname, origin) {
  const site = b.site || {}, seo = site.seo || {}, brand = b.brand || {}
  const tpl = (t) => (t ? String(seo.titleTemplate || '{title}').replace('{title}', t) : seo.defaultTitle || site.name || '')
  const base = (site.url || origin || '').replace(/\/$/, '')
  let title, description, image, robots = seo.robots || 'index, follow', canonical = base + cleanPath(pathname), ogTitle, ogDescription
  const it = route.item || {}
  const s = it.seo || {}
  if (route.kind === 'page') {
    const home = cleanPath(it.path) === '/'
    title = s.title ? tpl(s.title) : home ? seo.defaultTitle || tpl('') : tpl(it.title)
    description = s.description || seo.description
    image = s.image || seo.socialImage || brand.socialImage
  } else if (route.kind === 'case' || route.kind === 'capability' || route.kind === 'insight') {
    const name = s.title || it.title || it.name
    title = tpl(plain(name))
    description = s.description || it.summary || it.short || it.dek || seo.description
    image = s.image || it.image || seo.socialImage
  } else {
    title = tpl(site.notFound?.title ? `Not found` : 'Not found')
    description = seo.description
    robots = 'noindex'
  }
  if (s.canonical) canonical = s.canonical
  if (s.robots) robots = s.robots
  ogTitle = s.ogTitle || title
  ogDescription = s.ogDescription || description
  const abs = (u) => (!u ? '' : /^https?:/.test(u) ? u : base + (u.startsWith('/') ? u : '/' + u))
  return { title: plain(title), description: plain(description), image: abs(image), robots, canonical, ogTitle: plain(ogTitle), ogDescription: plain(ogDescription), themeColor: brand.themeColor || '#000000', favicon: brand.favicon || '/favicon.svg', lang: site.language || 'en' }
}

/** Fills the built index.html with data + meta. mode: 'live' | 'preview' */
export function renderShell(template, { bundle, meta, mode = 'live', nonce = '', heroPoster = '' }) {
  let html = template
  const n = nonce ? ` nonce="${nonce}"` : ''
  const set = (re, val) => { html = html.replace(re, val) }
  set(/<html lang="[^"]*"/, `<html lang="${esc(meta.lang)}"`)
  set(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
  set(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`)
  set(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(meta.ogTitle)}" />`)
  set(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(meta.ogDescription)}" />`)
  set(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(meta.image)}" />`)
  set(/<meta name="theme-color" content="[^"]*"\s*\/?>/, `<meta name="theme-color" content="${esc(meta.themeColor)}" />`)
  set(/<link rel="icon" href="[^"]*"/, `<link rel="icon" href="${esc(meta.favicon)}"`)
  html = html.replace(/var f="[^"]*";if\(!f\)return;/, `var f=${JSON.stringify(heroPoster.replace(/^\//, ''))};if(!f)return;`)
  const head = [
    `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta name="robots" content="${esc(mode === 'preview' ? 'noindex, nofollow' : meta.robots)}" />`,
    `<meta property="og:type" content="website" /><meta property="og:url" content="${esc(meta.canonical)}" /><meta name="twitter:card" content="summary_large_image" />`,
    `<script${n}>window.__SITE_DATA__=${scriptJson(bundle)};window.__SITE_MODE__=${JSON.stringify(mode)};</script>`,
  ].join('\n    ')
  html = html.replace('</head>', `    ${head}\n  </head>`)
  if (nonce) html = html.replace(/<script(?![^>]*\bnonce=)([^>]*)>/g, `<script nonce="${nonce}"$1>`)
  return html
}

export function heroPosterOf(b) {
  const home = (b.pages || []).find((p) => cleanPath(p.path) === '/')
  const hero = (home?.sections || []).find((s) => s.type === 'hero' && !s.hidden)
  const c = (b.media?.cinematics || []).find((x) => x.id === (hero?.cinematic ?? 'hero-plunge'))
  return c && c.enabled !== false ? c.poster || c.sourceImage || '' : ''
}

export function sitemap(b, origin) {
  const base = (b.site?.url || origin).replace(/\/$/, '')
  const R = { caseStudies: '/work', capabilities: '/capabilities', insights: '/insights', ...(b.site?.routes || {}) }
  const urls = []
  for (const p of b.pages || []) if (p.visible !== false && !/noindex/.test(p.seo?.robots || '')) urls.push(cleanPath(p.path))
  for (const [pre, list] of [[R.caseStudies, b.cases], [R.capabilities, b.capabilities], [R.insights, b.insights]]) for (const x of list || []) if (!x.hidden) urls.push(`${cleanPath(pre)}/${x.slug}`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(base + u)}</loc></url>`).join('\n')}\n</urlset>\n`
}
