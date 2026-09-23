import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { NAV, SITE, BRAND } from '../platform/config'
import { isExternal } from '../lib/router'
import TLink from './ui/TLink'
import Logo from './Logo'
import SplitText from './SplitText'
import MagneticButton from './ui/MagneticButton'
import Signal from './ui/Signal'

const visible = (l) => l && l.label && l.to && l.visible !== false
const F = NAV.footer || {}

function FooterLink({ l, large }) {
  const cls = large ? 'display display-sm' : 'tlink'
  const st = large ? { display: 'inline-flex', minHeight: 44, alignItems: 'center' } : undefined
  if (isExternal(l.to) || l.external) {
    return <a href={l.to} target="_blank" rel="noopener noreferrer" className={cls} style={st}>{l.label}<span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
  }
  return <TLink to={l.to} className={cls} style={st}>{l.label}</TLink>
}

/** Footer — everything here comes from src/config/navigation.json → footer. */
export default function Footer() {
  const root = useRef(null)
  const mark = useRef(null)
  useGSAP(
    () => {
      if (!mark.current) return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.fromTo(mark.current, { yPercent: 40, clipPath: 'inset(0% 0% 100% 0%)' }, { yPercent: 0, clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'bottom bottom', scrub: 0.6 } })
      })
    },
    { scope: root },
  )
  const cta = NAV.cta?.visible !== false && NAV.cta?.label && NAV.cta?.to ? NAV.cta : null
  const primary = (NAV.primary || []).filter(visible)
  const columns = (F.columns || []).map((c) => ({
    ...c,
    items: c.usePrimaryNavigation ? [...(c.includeHome ? [{ label: 'Home', to: '/' }] : []), ...primary] : (c.links || []).filter(visible),
  }))
  const copyright = (F.copyright || '').replace('{year}', String(new Date().getFullYear()))
  return (
    <footer ref={root} data-theme="dark2" className="section" style={{ paddingTop: 'calc(var(--section-space) * clamp(72px,10vw,150px))', overflow: 'clip' }}>
      <div className="wrap foot-grid" style={{ '--cols': columns.length }}>
        <div style={{ minWidth: 0 }}>
          {F.eyebrow && <p className="mono dim" style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}><Signal /> {F.eyebrow}</p>}
          {F.heading && <SplitText as="p" className="display display-md" text={F.heading} style={{ margin: 0, maxWidth: '16ch' }} />}
          {F.showCta !== false && cta && <div style={{ marginTop: 32 }}><MagneticButton to={cta.to}>{cta.label}</MagneticButton></div>}
        </div>
        {columns.map((c, i) => (
          <nav key={i} aria-label={c.title || `Footer ${i + 1}`}>
            {c.title && <p className="mono dim" style={{ margin: '0 0 16px' }}>{c.title}</p>}
            {c.items.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 2 }}>
                {c.items.map((l, j) => (<li key={j}><FooterLink l={l} large={c.style === 'large'} /></li>))}
              </ul>
            )}
            {c.text && <p className="dim" style={{ marginTop: 24, maxWidth: '30ch', fontSize: 15 }}>{c.text}</p>}
            {c.showContact && (SITE.contact?.email || SITE.contact?.phone || SITE.contact?.address) && (
              <address className="dim" style={{ marginTop: 20, fontStyle: 'normal', fontSize: 15, display: 'grid', gap: 6 }}>
                {SITE.contact.email && <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>}
                {SITE.contact.phone && <a href={`tel:${SITE.contact.phone.replace(/[^+\d]/g, '')}`}>{SITE.contact.phone}</a>}
                {SITE.contact.address && <span style={{ whiteSpace: 'pre-line' }}>{SITE.contact.address}</span>}
              </address>
            )}
          </nav>
        ))}
      </div>
      <div className="wrap" style={{ marginTop: 'clamp(56px,8vw,120px)' }}>
        <div className="hairline" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 8px' }}>
          <span className="mono dim">{copyright}</span>
          {(F.legalLinks || []).filter(visible).length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0 20px' }}>
              {(F.legalLinks || []).filter(visible).map((l, i) => (<li key={i}><FooterLink l={l} /></li>))}
            </ul>
          )}
          {F.bottomRight && <span className="mono dim">{F.bottomRight}</span>}
        </div>
      </div>
      {BRAND.footerMark?.show !== false && (
        <div ref={mark} aria-hidden="true" style={{ padding: '0 var(--gutter)', marginTop: 'clamp(16px,3vw,40px)', color: 'var(--light)', opacity: 1 }}>
          <Logo ticks large className="footer-wm" decorative />
        </div>
      )}
      <style>{`.foot-grid{display:grid;gap:clamp(36px,6vw,96px);grid-template-columns:1fr 1fr;align-items:start}.foot-grid>:first-child{grid-column:1/-1}@media(min-width:900px){.foot-grid{grid-template-columns:2fr repeat(var(--cols),1fr)}.foot-grid>:first-child{grid-column:auto}}@media(max-width:420px){.foot-grid{grid-template-columns:1fr}}.footer-wm{width:100%;height:auto;max-height:44vh;margin-bottom:-4vw}`}</style>
    </footer>
  )
}
