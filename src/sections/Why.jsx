import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { itemsFrom } from '../platform/content'
import { useMotion } from '../platform/motion'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import SystemLine from '../components/ui/SystemLine'
import MovingImage from '../components/ui/MovingImage'
import Signal from '../components/ui/Signal'

/** WHY USFL — dark world. A signal line runs down the list; each reason arrives from a different direction. */
export default function Why({ sid = 'why', theme = 'dark', eyebrow = '', heading = '', lead = '', image = '', imageAlt, source = 'why', items: own = [] }) {
  const m = useMotion()
  const WHY = itemsFrom(source, own)
  const hid = `${sid}-h`
  const root = useRef(null)
  const list = useRef(null)
  useGSAP(
    () => {
      if (!m.enabled) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        const dirs = [{ x: -70 }, { y: 70 }, { x: 70 }, { y: 70 }]
        gsap.utils.toArray('.why-item', list.current).forEach((el, i) => {
          gsap.set(el, { opacity: 0, ...dirs[i % dirs.length] })
          ScrollTrigger.create({ trigger: el, start: 'top 86%', once: true, onEnter: () => gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 1.2, ease: 'expo.out' }) })
        })
      })
    },
    { scope: root },
  )
  return (
    <section ref={root} data-theme={theme} className="section" aria-labelledby={hid} style={{ padding: 'calc(var(--section-space) * clamp(80px,11vw,190px)) 0 calc(var(--section-space) * clamp(80px,10vw,170px))', overflow: 'clip' }}>
      <div className="wrap why-grid">
        <div className="why-side">
          <p className="mono" style={{ margin: '0 0 28px', display: 'flex', alignItems: 'center', gap: 10 }}><Signal /> {eyebrow}</p>
          <ScrollText as="h2" id={hid} kind="chars" by="chars" className="display display-lg" text={heading || eyebrow} style={{ margin: 0 }} />
          <ScrollReveal kind="up" delay={0.2} style={{ marginTop: 32 }}>
            <p className="lead dim" style={{ margin: 0 }}>{lead}</p>
          </ScrollReveal>
          {image && <MovingImage name={image} alt={imageAlt} aspect="4/3" speed={8} reveal="left" className="why-img" sizes="(min-width:900px) 34vw, 90vw" />}
        </div>
        <ol ref={list} className="why-list">
          <SystemLine orientation="v" style={{ left: 0 }} />
          {WHY.map((w) => (
            <li key={w.n + w.t} className="why-item">
              <span className="mono dim">{w.n}</span>
              <h3 className="display display-md" style={{ margin: '14px 0 16px' }}>{w.t}</h3>
              <p className="dim body-copy" style={{ margin: 0 }}>{w.d}</p>
            </li>
          ))}
        </ol>
      </div>
      <style>{`
        .why-grid{display:grid;gap:clamp(40px,6vw,110px);grid-template-columns:1fr}
        .why-list{list-style:none;margin:0;padding:0 0 0 clamp(24px,3vw,56px);position:relative;display:grid;gap:clamp(48px,7vw,120px)}
        .why-item{max-width:52ch}
        .why-img{margin-top:clamp(36px,5vw,72px);width:100%;max-width:520px}
        @media(min-width:900px){.why-grid{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)}.why-side{position:sticky;top:calc(var(--nav-h) + 24px);align-self:start}}
      `}</style>
    </section>
  )
}
