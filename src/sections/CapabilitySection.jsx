import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { CAPABILITIES, SITE } from '../platform/content'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import ImageReveal from '../components/ui/ImageReveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import { feature } from '../platform/motion'

const hoverOn = () => feature('hoverTilt')

export const CAP_CSS = `
        .cap-list{display:grid;gap:clamp(72px,11vw,190px)}
        .cap{display:grid;gap:clamp(24px,4vw,64px);align-items:center;position:relative}
        .cap-media{will-change:transform}
        .cap-copy{position:relative;display:flex;flex-direction:column;gap:14px}
        .cap-title{font-size:clamp(2.8rem,7.4vw,9.4rem);letter-spacing:-.042em;line-height:.9;color:var(--ink);position:relative;pointer-events:none}
        .cap-services{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
        .cap-services li{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid color-mix(in srgb, var(--line-light-base) 22%, transparent);padding:8px 14px;border-radius:99px;transition:background .4s,color .4s,border-color .4s,transform .5s var(--ease-out)}
        .cap-services li:hover{background:var(--ink);color:var(--light);border-color:var(--ink);transform:translateY(-3px)}
        @media(min-width:900px){
          .cap{grid-template-columns:repeat(12,1fr)}
          .cap-v0 .cap-media{grid-column:1/6}.cap-v0 .cap-copy{grid-column:7/13}
          .cap-v1 .cap-media{grid-column:6/13;grid-row:1}.cap-v1 .cap-copy{grid-column:1/6;grid-row:1;align-items:flex-start}
          .cap-v1 .cap-title{text-align:left}
          .cap-v2{grid-template-columns:1fr}.cap-v2 .cap-media{grid-column:1/-1}
          .cap-v2 .cap-copy{grid-column:1/-1;margin-top:clamp(20px,2.6vw,44px);display:grid;grid-template-columns:repeat(12,1fr);gap:14px 24px;align-items:end}
          .cap-v2 .cap-n{grid-column:1/-1}.cap-v2 .cap-title{grid-column:1/8;font-size:clamp(3.4rem,10vw,12.5rem)}.cap-v2 .cap-body{grid-column:8/13;padding-bottom:.6vw}
          .cap-v3 .cap-media{grid-column:8/13;grid-row:1}.cap-v3 .cap-copy{grid-column:1/8;grid-row:1;align-items:flex-start}
          .cap-v0 .cap-body,.cap-v1 .cap-body,.cap-v3 .cap-body{max-width:44ch}
        }
        @media(max-width:899px){.cap-title{font-size:clamp(2.6rem,13vw,5.4rem)}}
      `

/** One capability as an editorial scene (not a card): oversized title that interacts with its image, services, hover response. */
export function CapabilityScene({ cap, variant = 0, className = '' }) {
  const root = useRef(null)
  const tilt = useRef(null)
  const title = useRef(null)
  const kinds = ['left', 'right', 'up', 'chars']
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ fine: MQ.fine, motion: MQ.motion }, (ctx) => {
        if (!ctx.conditions.fine || !ctx.conditions.motion || !hoverOn()) return
        const el = root.current
        const xTo = gsap.quickTo(tilt.current, 'x', { duration: 0.9, ease: 'power3.out' })
        const yTo = gsap.quickTo(tilt.current, 'y', { duration: 0.9, ease: 'power3.out' })
        const move = (e) => {
          const r = el.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width - 0.5
          const py = (e.clientY - r.top) / r.height - 0.5
          xTo(px * -22); yTo(py * -16) // only the picture answers the pointer; the type stays anchored
        }
        const leave = () => { xTo(0); yTo(0) }
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave)
        return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
      })
    },
    { scope: root },
  )
  const V = variant % 4
  return (
    <article ref={root} className={`cap cap-v${V} ${className}`} aria-labelledby={`cap-${cap.slug}`}>
      <div className="cap-media" ref={tilt}>
        <ImageReveal
          name={cap.image}
          alt={cap.imageAlt}
          reveal={['left', 'up', 'down', 'right'][V]}
          aspect={V === 2 ? '21/9' : V === 1 ? '3/2' : '4/5'}
          speed={V === 2 ? 14 : 9}
          scrollScale={V >= 2 ? [1.12, 1] : null} // the photograph settles as its title arrives
          sizes={V === 2 ? '100vw' : '(min-width:900px) 45vw, 92vw'}
        />
      </div>
      <div className="cap-copy">
        <span className="mono dim cap-n">{cap.n} / {String(CAPABILITIES.length).padStart(2, '0')}</span>
        <ScrollText as="h3" id={`cap-${cap.slug}`} kind={kinds[V]} by={V === 3 ? 'chars' : 'words'} text={cap.name} className="display cap-title" style={{ margin: 0 }} />
        <div ref={title} className="cap-body">
          <ScrollReveal kind="up" delay={0.15}>
            <p className="lead" style={{ margin: '0 0 22px' }}>{cap.short}</p>
            <ul className="cap-services">
              {cap.services.map((s) => (
                <li key={s}><span>{s}</span></li>
              ))}
            </ul>
            <TLink to={`${SITE.routes.capabilities}/${cap.slug}`} className="tlink" style={{ marginTop: 18 }}>Explore {cap.name.toLowerCase()} <Arrow /></TLink>
          </ScrollReveal>
        </div>
      </div>
    </article>
  )
}

/** Home "Capabilities" section: header + every visible capability as an editorial scene. */
export default function CapabilitySection({ sid = 'capabilities', theme = 'light', eyebrow = '', heading = '', intro = '', linkLabel = '', linkTo = '' }) {
  const hid = `${sid}-h`
  return (
    <section data-theme={theme} className="section" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,180px)) 0 calc(var(--section-space) * clamp(60px,8vw,140px))' }} aria-labelledby={heading ? hid : undefined} aria-label={heading ? undefined : eyebrow || 'Capabilities'}>
      <div className="wrap">
        {(eyebrow || heading || intro) && (
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', alignItems: 'end', marginBottom: 'clamp(48px,8vw,120px)' }}>
            <div>
              {eyebrow && <p className="mono" style={{ margin: '0 0 24px' }}>{eyebrow}</p>}
              {heading && <ScrollText as="h2" id={hid} kind="up" className="display display-xl" text={heading} style={{ margin: 0, maxWidth: '10ch' }} />}
            </div>
            {intro && <ScrollReveal kind="up" delay={0.2}><p className="lead dim" style={{ margin: 0 }}>{intro}</p></ScrollReveal>}
          </div>
        )}
        <CapabilityList />
        {linkLabel && linkTo && (
          <div style={{ marginTop: 'clamp(40px,6vw,90px)' }}>
            <TLink to={linkTo} className="tlink">{linkLabel} <Arrow /></TLink>
          </div>
        )}
      </div>
      <style>{CAP_CSS}</style>
    </section>
  )
}

/** The capability scenes on their own (used by the Capabilities page's "capability-list" section). */
export function CapabilityList() {
  return (
    <div className="cap-list">
      {CAPABILITIES.map((c, i) => (
        <CapabilityScene key={c.slug} cap={c} variant={i} />
      ))}
    </div>
  )
}
