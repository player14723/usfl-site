import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { useMotion } from '../platform/motion'
import { ScrollText } from '../components/ui/Reveal'
import Signal from '../components/ui/Signal'

/**
 * CARDS — a row of tall cards, each with a large mark (a letter, number or short word), a title and a line.
 * tone per card: "accent" | "accent2" | "invert" | "plain". (The About page uses it for U · S · F · L.)
 */
export default function Cards({ sid = 'cards', theme = 'dark', eyebrow = '', heading = '', items = [] }) {
  const root = useRef(null)
  const m = useMotion()
  const hid = `${sid}-h`
  useGSAP(
    () => {
      if (!m.enabled) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        const cards = gsap.utils.toArray('.in-card', root.current)
        cards.forEach((el, i) => {
          gsap.set(el, { yPercent: m.dist(14 + i * 6), opacity: 0 })
          ScrollTrigger.create({ trigger: root.current, start: 'top 72%', once: true, onEnter: () => gsap.to(el, { yPercent: 0, opacity: 1, duration: m.dur(1.4), ease: 'expo.out', delay: i * 0.1 }) })
        })
      })
    },
    { scope: root },
  )
  const n = Math.max(1, Math.min(4, items.length))
  return (
    <section ref={root} data-theme={theme} className="section" aria-labelledby={heading ? hid : undefined} style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0' }}>
      <div className="wrap">
        {eyebrow && <p className="mono" style={{ margin: '0 0 24px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
        {heading && <ScrollText as="h2" id={hid} kind="up" className="display display-lg" text={heading} style={{ margin: 0, maxWidth: '12ch' }} />}
        <ul className="in-grid" style={{ '--cols': n }}>
          {items.map((x, i) => (
            <li key={i} className={`in-card in-${x.tone || 'plain'}`}>
              <span className="display in-l" aria-hidden="true">{x.mark}</span>
              <div>
                <h3 className="display display-sm" style={{ margin: 0 }}>{x.title}</h3>
                {x.text && <p className="in-text" style={{ margin: '10px 0 0', fontSize: 15, maxWidth: '30ch' }}>{x.text}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .in-grid{list-style:none;margin:clamp(40px,6vw,90px) 0 0;padding:0;display:grid;gap:14px;grid-template-columns:1fr}
        @media(min-width:700px){.in-grid{grid-template-columns:1fr 1fr}}
        @media(min-width:1100px){.in-grid{grid-template-columns:repeat(var(--cols),1fr)}}
        .in-card{position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:40px;min-height:clamp(260px,32vw,420px);padding:clamp(20px,2vw,32px);border:var(--hair-w) solid var(--line-dark);border-radius:var(--radius-card);background:var(--ink2);overflow:hidden;transition:transform .8s var(--ease-out),border-color .5s}
        .in-card:hover{transform:translateY(-8px)}
        .motion-off .in-card:hover{transform:none}
        .in-l{font-size:clamp(6rem,13vw,13rem);line-height:.78;letter-spacing:-.06em}
        .in-accent .in-l{color:var(--signal)}
        .in-accent2 .in-l{color:var(--cool)}
        .in-invert{background:var(--light);color:var(--ink);border-color:var(--light)}
        .in-invert .in-l{color:var(--ink)}
        .in-text{color:var(--dim)}
        .in-invert .in-text{color:var(--muted-on-light)}
      `}</style>
    </section>
  )
}
