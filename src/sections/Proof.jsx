import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { useMotion } from '../platform/motion'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import ImageReveal from '../components/ui/ImageReveal'
import Signal from '../components/ui/Signal'

/** PROOF — verified positioning only. Light world. */
export default function Proof({ eyebrow = '', heading = '', lead = '', image = '', imageAlt, backgroundWord = '', items = [] }) {
  const m = useMotion()
  const root = useRef(null)
  const big = useRef(null)
  useGSAP(
    () => {
      if (!m.enabled || !big.current) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        // the giant outlined word drifts slowly against scroll
        gsap.fromTo(big.current, { xPercent: ctx.conditions.desktop ? 6 : 12 }, { xPercent: ctx.conditions.desktop ? -14 : -30, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } })
      })
    },
    { scope: root },
  )
  const KINDS = ['left', 'up', 'right']
  return (
    <section ref={root} data-theme="light" className="section" style={{ padding: 'calc(var(--section-space) * clamp(80px,12vw,200px)) 0 calc(var(--section-space) * clamp(80px,10vw,160px))', overflow: 'clip' }} aria-labelledby="proof-h">
      {backgroundWord && <div ref={big} aria-hidden="true" className="display outline" style={{ position: 'absolute', top: '2%', left: 0, whiteSpace: 'nowrap', fontSize: 'clamp(9rem,26vw,32rem)', color: 'var(--decor-light)', pointerEvents: 'none', lineHeight: 0.8 }}>
        {backgroundWord}
      </div>}
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="proof-grid">
          <div>
            {eyebrow && <p className="mono" style={{ margin: '0 0 28px', display: 'flex', alignItems: 'center', gap: 10 }}><Signal /> {eyebrow}</p>}
            <ScrollText as="h2" id="proof-h" kind="left" className="display display-xl" text={heading} style={{ margin: 0, maxWidth: '11ch' }} />
            <ScrollReveal kind="up" delay={0.2} style={{ marginTop: 36 }}>
              <p className="lead" style={{ margin: 0 }}>{lead}</p>
            </ScrollReveal>
          </div>
          {image && <ImageReveal name={image} reveal="right" aspect="4/5" speed={9} className="proof-img" alt={imageAlt} sizes="(min-width:900px) 40vw, 90vw" />}
        </div>
        <ul className="proof-list">
          {items.map((it, i) => (
            <li key={i}>
              <ScrollReveal kind={KINDS[i % 3]} duration={1.2}>
                <div className="hairline" style={{ marginBottom: 22 }} />
                <span className="mono dim">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="display display-sm" style={{ margin: '14px 0 12px' }}>{it.title}</h3>
                <p className="dim" style={{ margin: 0, maxWidth: '40ch', fontSize: 16 }}>{it.text}</p>
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .proof-grid{display:grid;gap:clamp(32px,6vw,96px);grid-template-columns:1fr;align-items:end}
        .proof-img{width:100%;max-width:520px;justify-self:end}
        .proof-list{list-style:none;margin:clamp(56px,8vw,120px) 0 0;padding:0;display:grid;gap:clamp(28px,4vw,64px);grid-template-columns:1fr}
        @media(min-width:900px){.proof-grid{grid-template-columns:1.25fr .75fr}.proof-list{grid-template-columns:repeat(3,1fr)}}
      `}</style>
    </section>
  )
}
