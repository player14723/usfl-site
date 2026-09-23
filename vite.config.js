import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'

/**
 * Breakpoint plugin — the desktop/mobile switch point lives in src/config/theme.json → breakpoints.desktop.
 * Component styles are authored at 900px; this rewrites those media queries to the configured value at
 * build time (CSS media queries cannot read CSS variables).
 */
function breakpoints() {
  const read = () => {
    try { return Number(JSON.parse(fs.readFileSync('src/config/theme.json', 'utf8')).breakpoints?.desktop) || 900 } catch { return 900 }
  }
  return {
    name: 'site-breakpoints',
    enforce: 'pre',
    transform(code, id) {
      if (!/\/src\/.*\.(jsx?|css)$/.test(id)) return null
      const bp = read()
      if (bp === 900) return null
      return code
        .replace(/min-width:\s?900px/g, `min-width: ${bp}px`)
        .replace(/max-width:\s?899px/g, `max-width: ${bp - 0.02}px`)
    },
  }
}

/**
 * Page-shell plugin — fills index.html's <head> (title, description, social tags, theme colour, favicon and the
 * hero poster preload) from src/config/site.json, brand.json and media.json, so search engines and link previews
 * see the same text as the editor. Each page then sets its own title and description when it loads.
 */
function siteHtml() {
  const json = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return {} } }
  const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  return {
    name: 'site-html',
    transformIndexHtml(html) {
      const site = json('src/config/site.json'), brand = json('src/config/brand.json'), media = json('src/config/media.json')
      const home = json('src/config/pages/home.json')
      const seo = site.seo || {}
      const rel = (x) => String(x || '').replace(/^\//, '')
      const hero = (home.sections || []).find((s) => s.type === 'hero' && !s.hidden)
      const cin = (media.cinematics || []).find((c) => c.id === (hero?.cinematic ?? 'hero-plunge'))
      const poster = cin && cin.enabled !== false ? rel(cin.poster || cin.sourceImage) : ''
      const vars = {
        TITLE: esc(seo.defaultTitle || site.name),
        DESCRIPTION: esc(seo.description || site.positioning),
        OG_TITLE: esc(seo.defaultTitle || site.name),
        OG_IMAGE: esc(rel(seo.socialImage || brand.socialImage)),
        THEME_COLOR: esc(brand.themeColor || '#000000'),
        FAVICON: esc(rel(brand.favicon || '/favicon.svg')),
        HERO_POSTER: esc(poster),
        NOSCRIPT: esc(`${site.name || ''} — ${site.tagline || ''}. ${site.positioning || ''}`),
      }
      return html.replace(/__SITE_([A-Z_]+)__/g, (m, k) => (k in vars ? vars[k] : m))
    },
  }
}

const BUILD_BP = (() => { try { return Number(JSON.parse(fs.readFileSync('src/config/theme.json', 'utf8')).breakpoints?.desktop) || 900 } catch { return 900 } })()

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  define: { __LAYOUT_BREAKPOINT__: BUILD_BP },
  plugins: [breakpoints(), siteHtml(), react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1200,
    // two entry points: the website and the editor (/admin)
    rollupOptions: { input: process.env.VITE_HASH ? { main: 'index.html' } : { main: 'index.html', admin: 'admin/index.html' } },
  },
})
