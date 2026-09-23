import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { SITE } from '../platform/config'
import { useMotion } from '../platform/motion'
import { ScrollText } from '../components/ui/Reveal'
import MagneticButton from '../components/ui/MagneticButton'
import MovingImage from '../components/ui/MovingImage'
import Signal from '../components/ui/Signal'

/** FINAL CTA — the signal line runs the width of the page and lands on the button. */
/** Props left empty fall back to site.json → finalCta, so templates and new pages share one default. */
export default function FinalCTA({ sid = 'cta', theme = 'dark', eyebrow, heading, text, button, image, imageAlt }) {
  const D = SITE.finalCta || {}
  const m = useMotion()
  const hid = `${sid}-h`
  const eb = eyebrow ?? D.eyebrow, hd = heading ?? D.heading, tx = text ?? D.text, bt = button?.label ? button : D.button, im = image ?? D.image, ia = imageAlt ?? D.imageAlt
  const root = useRef(null)
  const line = useRef(null)
  const dot = useRef(null)
  useGSAP(
    () => {
      if (!m.enabled) { gsap.set(line.current, { scaleX: 1 }); gsap.set(dot.current, { left: '100%' }); return }
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        gsap.set(line.current, { scaleX: 0 })
        ScrollTrigger.create({
          trigger: root.current, start: 'top 60%', end: 'top 10%', scrub: 0.6,
          onUpdate: (s) => {
            gsap.set(line.current, { scaleX: s.progress })
            gsap.set(dot.current, { left: `${s.progress * 100}%` })
          },
        })
      })
    },
    { scope: root },
  )
  return (
    <section ref={root} data-theme={theme} className="section" aria-labelledby={hid} style={{ padding: 'calc(var(--section-space) * clamp(90px,12vw,200px)) 0', overflow: 'clip' }}>
      <div className="wrap">
        <div style={{ position: 'relative', height: 1, background: 'var(--line-dark)', marginBottom: 'clamp(40px,6vw,90px)' }} aria-hidden="true">
          <div ref={line} style={{ position: 'absolute', inset: 0, background: 'var(--signal)', transformOrigin: 'left', boxShadow: '0 0 14px color-mix(in srgb, var(--signal) 50%, transparent)' }} />
          <span ref={dot} className="signal-dot" style={{ position: 'absolute', top: -3.5, left: 0, marginLeft: -4 }} />
        </div>
        <div className="cta-grid">
          <div>
            <p className="mono" style={{ margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 10 }}><Signal /> {eb}</p>
            <ScrollText as="h2" id={hid} kind="up" className="display display-xl" text={hd || ''} style={{ margin: 0, maxWidth: '12ch' }} />
            {tx && <p className="lead dim" style={{ margin: '32px 0 40px' }}>{tx}</p>}
            {bt?.label && bt?.to && <div style={{ marginTop: tx ? 0 : 36 }}><MagneticButton to={bt.to}>{bt.label}</MagneticButton></div>}
          </div>
          {im && <MovingImage name={im} alt={ia} aspect="4/5" speed={10} reveal="down" className="cta-img" sizes="(min-width:900px) 34vw, 90vw" />}
        </div>
      </div>
      <style>{`
        .cta-grid{display:grid;gap:clamp(36px,5vw,90px);grid-template-columns:1fr;align-items:end}
        .cta-img{width:100%;max-width:460px;justify-self:end}
        @media(min-width:900px){.cta-grid{grid-template-columns:1.3fr .7fr}}
      `}</style>
    </section>
  )
}
