/**
 * Theme runtime — turns src/config/theme.json (and the motion easing curves) into CSS custom properties
 * on :root before the first render. Every component styles itself through these variables, so a colour,
 * font or spacing change in the config reaches the whole site.
 *
 * Accessibility guard: body-text and button-label colours are checked against their backgrounds
 * (WCAG 2.1). A pair that fails is replaced with the nearest safe colour (black or white) and a warning
 * is printed — so a palette experiment can never make the site unreadable.
 */
import { THEME, MOTION, BRAND } from './config'

const DEF = {
  colors: {
    ink: '#080A0D', ink2: '#10141A', ink3: '#161C23', paper: '#FFFFFF',
    textOnDark: '#F3F6F8', mutedOnDark: '#AAB3BC', faintOnDark: '#5D6873',
    textOnLight: '#080A0D', mutedOnLight: '#4C5660', faintOnLight: '#8A939C', recedeOnLight: '#B9C0C7',
    accent: '#C8FF3D', accentOnLight: '#4A7300', accent2: '#B8F7FF',
    buttonBackground: '#C8FF3D', buttonText: '#080A0D', buttonHoverBackground: '#F3F6F8',
    buttonOnLightBackground: '#080A0D', buttonOnLightText: '#F3F6F8', buttonOnLightHoverBackground: '#4A7300',
    hairlineOnDark: '#FFFFFF', hairlineOnLight: '#080A0D', decorOnDark: '#0F1318', decorOnLight: '#F1F3F5',
    overlay: '#080A0D', selectionBackground: '#C8FF3D', selectionText: '#080A0D', focusOnDark: '#C8FF3D', focusOnLight: '#080A0D',
  },
  opacity: { hairlineOnDark: 0.14, hairlineOnLight: 0.14, videoOverlay: 1, grain: 0.055, glow: 0.45 },
}

/* ---------- WCAG contrast ---------- */
function rgb(hex) {
  const h = String(hex || '').trim().replace('#', '')
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6)
  if (!/^[0-9a-f]{6}$/i.test(f)) return null
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255)
}
function lum(hex) {
  const c = rgb(hex)
  if (!c) return null
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a, b) {
  const la = lum(a), lb = lum(b)
  if (la == null || lb == null) return 21
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
const safeOn = (bg) => (contrast('#FFFFFF', bg) >= contrast('#000000', bg) ? '#FFFFFF' : '#000000')

// [foreground, background, minimum ratio, what it is]
const PAIRS = [
  ['textOnDark', 'ink', 4.5, 'body text on dark sections'],
  ['textOnDark', 'ink2', 4.5, 'body text on secondary dark sections'],
  ['textOnLight', 'paper', 4.5, 'body text on light sections'],
  ['mutedOnDark', 'ink', 4.5, 'secondary text on dark sections'],
  ['mutedOnLight', 'paper', 4.5, 'secondary text on light sections'],
  ['buttonText', 'buttonBackground', 4.5, 'button labels'],
  ['buttonOnLightText', 'buttonOnLightBackground', 4.5, 'button labels on light sections'],
  ['accentOnLight', 'paper', 3, 'accent lines and focus rings on light sections'],
  ['accent', 'ink', 3, 'accent words, lines and markers on dark sections'],
  ['accent2', 'ink', 3, 'second accent on dark sections'],
  ['focusOnDark', 'ink', 3, 'keyboard focus ring on dark sections'],
  ['focusOnLight', 'paper', 3, 'keyboard focus ring on light sections'],
  ['selectionText', 'selectionBackground', 4.5, 'selected text'],
]

export function resolveColors(input = {}) {
  const c = { ...DEF.colors, ...input }
  const problems = []
  for (const [fg, bg, min, what] of PAIRS) {
    const r = contrast(c[fg], c[bg])
    if (r < min) {
      problems.push(`${what}: ${fg} ${c[fg]} on ${bg} ${c[bg]} is ${r.toFixed(2)}:1 (needs ${min}:1) — using ${safeOn(c[bg])} instead`)
      c[fg] = safeOn(c[bg])
    }
  }
  return { colors: c, problems }
}

const mix = (hex, pct) => `color-mix(in srgb, ${hex} ${Math.round(pct * 1000) / 10}%, transparent)`

export function themeVariables(theme = THEME, motion = MOTION) {
  const { colors: c, problems } = resolveColors(theme.colors)
  const o = { ...DEF.opacity, ...(theme.opacity || {}) }
  const t = theme.typography || {}
  const s = theme.spacing || {}
  const l = theme.layout || {}
  const b = theme.borders || {}
  const e = motion.easing || {}
  const v = {
    // colour worlds
    '--ink': c.ink, '--ink2': c.ink2, '--ink3': c.ink3, '--paper': c.paper, '--warm': c.paper,
    '--light': c.textOnDark, '--dim': c.mutedOnDark, '--faint-on-dark': c.faintOnDark,
    '--text-on-light': c.textOnLight, '--muted-on-light': c.mutedOnLight, '--faint-on-light': c.faintOnLight, '--recede-on-light': c.recedeOnLight,
    '--signal': c.accent, '--signal-ink': c.accentOnLight, '--cool': c.accent2,
    '--btn-bg': c.buttonBackground, '--btn-fg': c.buttonText, '--btn-hover': c.buttonHoverBackground,
    '--btn-light-bg': c.buttonOnLightBackground, '--btn-light-fg': c.buttonOnLightText, '--btn-light-hover': c.buttonOnLightHoverBackground,
    '--line-dark': mix(c.hairlineOnDark, o.hairlineOnDark), '--line-dark-base': c.hairlineOnDark,
    '--line-light': mix(c.hairlineOnLight, o.hairlineOnLight), '--line-light-base': c.hairlineOnLight,
    '--decor-dark': c.decorOnDark, '--decor-light': c.decorOnLight,
    '--overlay': c.overlay, '--overlay-strength': o.videoOverlay,
    '--sel-bg': c.selectionBackground, '--sel-fg': c.selectionText, '--focus-dark': c.focusOnDark, '--focus-light': c.focusOnLight,
    '--grain-opacity': o.grain, '--glow': mix(c.accent, o.glow),
    // typography
    '--font-display': t.displayFont, '--font-sans': t.bodyFont, '--font-serif': t.serifFont, '--font-mono': t.monoFont,
    '--display-weight': t.displayWeight, '--display-width': t.displayWidth, '--display-ls': t.displayLetterSpacing, '--display-lh': t.displayLineHeight,
    '--fs-xxl': t.sizeXXL, '--fs-xl': t.sizeXL, '--fs-lg': t.sizeLG, '--fs-md': t.sizeMD, '--fs-sm': t.sizeSM,
    '--body-weight': t.bodyWeight, '--body-size': t.bodySize, '--body-lh': t.bodyLineHeight,
    '--lead-size': t.leadSize, '--lead-lh': t.leadLineHeight, '--lead-max': t.leadMaxWidth,
    '--copy-size': t.bodyCopySize, '--copy-lh': t.bodyCopyLineHeight, '--copy-max': t.bodyCopyMaxWidth,
    '--eyebrow-size': t.eyebrowSize, '--eyebrow-ls': t.eyebrowLetterSpacing, '--eyebrow-case': t.eyebrowCase, '--eyebrow-weight': t.eyebrowWeight,
    '--nav-size': t.navSize, '--btn-size': t.buttonSize, '--btn-ls': t.buttonLetterSpacing, '--btn-case': t.buttonCase, '--btn-weight': t.buttonWeight,
    // spacing, layout, borders
    '--gutter': s.gutter, '--section-space': s.sectionScale, '--nav-h': s.navHeight, '--btn-h': s.buttonHeight, '--btn-px': s.buttonPaddingX, '--grid-gap': s.gridGap,
    '--max-w': l.maxWidth,
    '--hair-w': b.hairlineWidth, '--radius-btn': b.buttonRadius, '--radius-tag': b.tagRadius, '--radius-media': b.mediaRadius, '--radius-card': b.cardRadius,
    // motion curves
    '--ease-out': e.css, '--ease-io': e.cssInOut,
  }
  for (const k of Object.keys(v)) if (v[k] === undefined || v[k] === null || v[k] === '') delete v[k]
  return { vars: v, colors: c, problems }
}

/** Resolved colour values for places that need a literal (SVG attributes, canvas, GSAP colour tweens). */
export let COLORS = resolveColors(THEME.colors).colors

export function applyTheme() {
  const { vars, colors, problems } = themeVariables()
  COLORS = colors
  const css = `:root{${Object.entries(vars).map(([k, val]) => `${k}:${val}`).join(';')}}`
  let el = document.getElementById('site-theme')
  if (!el) { el = document.createElement('style'); el.id = 'site-theme'; document.head.appendChild(el) }
  el.textContent = css
  // extra font stylesheets (e.g. a Google Fonts link) listed in theme.json → typography.fontStylesheets
  for (const href of THEME.typography?.fontStylesheets || []) {
    if (!href || document.querySelector(`link[data-font="${href}"]`)) continue
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = href; link.dataset.font = href
    document.head.appendChild(link)
  }
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && BRAND.themeColor) meta.setAttribute('content', BRAND.themeColor)
  const icon = document.querySelector('link[rel="icon"]')
  if (icon && BRAND.favicon) icon.setAttribute('href', BRAND.favicon.startsWith('/') ? (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + BRAND.favicon : BRAND.favicon)
  if (import.meta.env.DEV) problems.forEach((p) => console.warn('[theme] contrast:', p))
}
