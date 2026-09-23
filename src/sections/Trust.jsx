import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { MARQUEE, PARTNER } from '../platform/content'
import { useMotion } from '../platform/motion'
import { ScrollReveal } from '../components/ui/Reveal'
import Signal from '../components/ui/Signal'

// {namedClients} and {sectors} in a fact's text are filled from src/content/company.json → partner
const fill = (t = '') => t.replace('{namedClients}', PARTNER.named.join(', ')).replace('{sectors}', PARTNER.sectors.join(' · '))

/** PARTNERS / TRUST — a marquee of what USFL does, the verified facts, and the partner badge as a slowly turning typographic seal. */
export default function Trust({ sid = 'trust', theme = 'dark', eyebrow = '', heading = '', facts = [], showMarquee = true, seal = {} }) {
  const root = useRef(null)
  const sealRef = useRef(null)
  const m = useMotion()
  const hid = `${sid}-h`
  const title = heading || PARTNER.partnerLine
  useGSAP(
    () => {
      if (!m.enabled || !sealRef.current) return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.to(sealRef.current, { rotate: 360, duration: 44, ease: 'none', repeat: -1 })
        gsap.fromTo(sealRef.current.parentElement, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 70%', once: true } })
      })
    },
    { scope: root },
  )
  const ring = seal.ring || `${PARTNER.partner.toUpperCase()} · `
  return (
    <section ref={root} data-theme={theme} className="section" aria-labelledby={hid} style={{ padding: 'calc(var(--section-space) * clamp(40px,6vw,100px)) 0 calc(var(--section-space) * clamp(80px,10vw,170px))', overflow: 'clip' }}>
      {showMarquee && MARQUEE.length > 0 && (
        <div className="marquee-wrap" aria-hidden="true" style={{ borderBlock: '1px solid color-mix(in srgb, var(--line-dark-base) 10%, transparent)', padding: 'clamp(16px,2vw,28px) 0', overflow: 'hidden' }}>
          <div className="marquee">
            {[0, 1].map((k) => (
              <div key={k} style={{ display: 'flex', flex: '0 0 auto' }}>
                {MARQUEE.map((mq, i) => (
                  <span key={i} className="display display-md" style={{ display: 'inline-flex', alignItems: 'center', gap: 'clamp(24px,3vw,56px)', paddingRight: 'clamp(24px,3vw,56px)', whiteSpace: 'nowrap', color: i % 2 ? 'var(--dim)' : 'var(--light)' }}>
                    {mq}<Signal />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="wrap trust-grid">
        <div>
          {eyebrow && <p className="mono" style={{ margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 10 }}><Signal /> {eyebrow}</p>}
          <h2 id={hid} className="display display-lg" style={{ margin: 0, maxWidth: '12ch' }}>
            {title.replace(/\.$/, '')}<span className="serif" style={{ color: 'var(--signal)' }}>.</span>
          </h2>
          {facts.length > 0 && (
            <ScrollReveal kind="up" delay={0.15}>
              <ul className="trust-facts">
                {facts.map((f, i) => (
                  <li key={i}>
                    <span className="mono dim">{f.label}</span>
                    <p style={{ margin: '8px 0 0' }}>{fill(f.text)}</p>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          )}
        </div>
        {seal.show !== false && (
          <div className="trust-seal" role="img" aria-label={seal.label || PARTNER.partner}>
            <svg ref={sealRef} viewBox="0 0 400 400" width="100%" height="100%" aria-hidden="true" style={{ overflow: 'visible' }}>
              <defs>
                <path id={`${sid}-ring`} d="M200,200 m-160,0 a160,160 0 1,1 320,0 a160,160 0 1,1 -320,0" />
              </defs>
              <circle cx="200" cy="200" r="196" fill="none" style={{ stroke: 'color-mix(in srgb, var(--light) 16%, transparent)' }} />
              <circle cx="200" cy="200" r="122" fill="none" style={{ stroke: 'color-mix(in srgb, var(--signal) 50%, transparent)' }} strokeDasharray="2 6" />
              <text style={{ fill: 'var(--light)', fontFamily: 'var(--font-mono)' }} fontSize="15" letterSpacing="4.2">
                <textPath href={`#${sid}-ring`} startOffset="0" textLength="1000" lengthAdjust="spacing">{ring}</textPath>
              </text>
            </svg>
            <div className="trust-seal-core">
              {seal.top && <span className="mono" style={{ color: 'var(--signal)' }}>{seal.top}</span>}
              <span className="display display-md" style={{ lineHeight: 0.9 }}>{seal.line1}{seal.line2 && <><br /><span className="serif">{seal.line2}</span></>}</span>
            </div>
          </div>
        )}
      </div>
      <style>{`
        .trust-grid{display:grid;gap:clamp(40px,6vw,96px);grid-template-columns:1fr;margin-top:clamp(56px,8vw,130px);align-items:center}
        .trust-facts{list-style:none;margin:clamp(32px,4vw,56px) 0 0;padding:0;display:grid;gap:22px;max-width:52ch}
        .trust-facts li{border-top:1px solid color-mix(in srgb, var(--line-dark-base) 12%, transparent);padding-top:16px}
        .trust-seal{position:relative;width:min(78vw,460px);aspect-ratio:1;justify-self:center}
        .trust-seal svg{position:absolute;inset:0}
        .trust-seal-core{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}
        @media(min-width:900px){.trust-grid{grid-template-columns:1.1fr .9fr}.trust-seal{justify-self:end;width:min(34vw,500px)}}
      `}</style>
    </section>
  )
}
