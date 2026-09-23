/**
 * Content collections — case studies, capabilities, insights, the connected system and company facts.
 * Files live in src/content/. Each item has `order` (sorting) and `hidden` (true = removed from the site,
 * but kept so it can be restored). This module also adapts the editor-friendly JSON shapes
 * ({ title, text } objects) into the shapes the presentation components use.
 */
import { SITE } from './config'
import { DATA, IS_PREVIEW } from './data'

const systemJson = DATA.system || {}
const companyJson = DATA.company || {}
const caseFiles = DATA.cases || []
const capFiles = DATA.capabilities || []
const insightFiles = DATA.insights || []

// hidden items are left out of every list; in the editor's preview their own pages can still be opened
const list = (files) =>
  files
    .filter((x) => x && x.slug)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
const pairs = (arr) => (Array.isArray(arr) ? arr.map((x) => [x.title ?? x.label ?? '', x.text ?? x.value ?? '']) : [])
const arr = (a) => (Array.isArray(a) ? a : [])

/* ---------- capabilities ---------- */
const CAPABILITIES_ALL = list(capFiles).map((c, i) => ({
  ...c,
  n: c.number || String(i + 1).padStart(2, '0'),
  statement: arr(c.statement).length ? c.statement : [c.name || ''],
  services: arr(c.services),
  body: arr(c.body),
  principles: pairs(c.principles),
  insights: arr(c.relatedInsights),
}))
export const CAPABILITIES = CAPABILITIES_ALL.filter((c) => !c.hidden)
export const capabilityBySlug = (slug) => (IS_PREVIEW ? CAPABILITIES_ALL : CAPABILITIES).find((c) => c.slug === slug)

/* ---------- case studies ---------- */
const CASES_ALL = list(caseFiles).map((c, i) => {
  const caps = arr(c.capabilities).map(capabilityBySlug).filter(Boolean)
  return {
    ...c,
    n: c.number || String(i + 1).padStart(2, '0'),
    display: arr(c.display).length ? c.display : [c.title || ''],
    imageB: c.imageSecondary || c.image,
    video: Boolean(c.cinematic),
    meta: pairs(c.meta),
    mapsTo: caps.map((x) => x.name),
    approach: arr(c.approach).map((a) => ({ t: a.title || '', d: a.text || '' })),
    principles: c.principles ? pairs(c.principles) : undefined,
    roadmap: c.roadmap ? pairs(c.roadmap) : undefined,
    objectives: arr(c.objectives).length ? c.objectives : undefined,
    challenge: { lead: c.challenge?.lead || '', body: c.challenge?.body || '' },
    result: { headline: c.result?.headline || '', metrics: arr(c.result?.metrics), note: c.result?.note || '' },
    statement: arr(c.statement).length ? c.statement : [c.title || ''],
    takeaways: arr(c.takeaways),
    layout: ['journey', 'principles', 'roadmap'].includes(c.layout) ? c.layout : 'journey',
  }
})
export const CASES = CASES_ALL.filter((c) => !c.hidden)
export const caseBySlug = (slug) => (IS_PREVIEW ? CASES_ALL : CASES).find((c) => c.slug === slug)
/** Case studies that map to a capability (the relationship is set on each case study). */
export const casesForCapability = (slug) => CASES.filter((c) => arr(c.capabilities).includes(slug))

/* ---------- insights ---------- */
const BLOCK = { paragraph: 'p', heading: 'h', pullquote: 'pull', cta: 'cta', formula: 'formula', list: 'list', step: 'step' }
const INSIGHTS_ALL = list(insightFiles).map((a) => ({
  ...a,
  read: a.readMinutes ?? '',
  display: arr(a.display).length ? a.display : [a.title || ''],
  body: arr(a.body).map((b) =>
    b.type === 'step' ? { t: 'step', n: b.number, h: b.heading, x: b.text }
      : b.type === 'list' ? { t: 'list', x: arr(b.items) }
        : { t: BLOCK[b.type] || 'p', x: b.text || '' },
  ),
}))
export const INSIGHTS = INSIGHTS_ALL.filter((a) => !a.hidden)
export const insightBySlug = (slug) => (IS_PREVIEW ? INSIGHTS_ALL : INSIGHTS).find((a) => a.slug === slug)

/* ---------- connected system ---------- */
export const SYSTEM = arr(systemJson.stages).filter((s) => s && s.name && !s.hidden).map((s, i) => ({
  key: s.key || `stage-${i}`, name: s.name, line: s.line || '', tags: arr(s.tags), detail: s.detail || '',
  related: arr(s.capabilities).map(capabilityBySlug).filter(Boolean).map((c) => c.name),
  cases: arr(s.cases),
}))
export const SYSTEM_TITLE = systemJson.title || ''

/* ---------- company facts (shared by several sections) ---------- */
const norm = (items) => arr(items).map((x, i) => ({ n: x.number || String(i + 1).padStart(2, '0'), t: x.title || '', d: x.text || '' }))
export const AUDIENCE = norm(companyJson.audience)
export const WHY = norm(companyJson.why)
export const MARQUEE = arr(companyJson.marquee)
export const PARTNER = {
  partner: companyJson.partner?.name || '',
  partnerLine: companyJson.partner?.line || '',
  named: arr(companyJson.partner?.namedClients),
  sectors: arr(companyJson.partner?.sectors),
}
/** Named lists a section can pull from with `source: "audience"` etc. */
export const SOURCES = { audience: AUDIENCE, why: WHY }

export { SITE }

/* ---------- URLs (prefixes are set in site.json → routes) ---------- */
const clean = (p) => '/' + String(p || '').replace(/^\/+|\/+$/g, '')
export const caseUrl = (slug) => `${clean(SITE.routes.caseStudies)}/${slug}`
export const capabilityUrl = (slug) => `${clean(SITE.routes.capabilities)}/${slug}`
export const insightUrl = (slug) => `${clean(SITE.routes.insights)}/${slug}`

/** Items for a list section: a shared company list (`source: "audience" | "why"`) or the section's own items. */
export const itemsFrom = (source, items) => (source && SOURCES[source] ? SOURCES[source] : norm(items))
