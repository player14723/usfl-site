import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { useSeo } from '../platform/seo'
import { SITE } from '../platform/config'
import { textHide, textIn } from '../lib/anim'
import { app } from '../lib/store'
import SplitText from '../components/SplitText'
import MagneticButton from '../components/ui/MagneticButton'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'

/** 404 — the signal drifts off the line and comes back. */
export default function NotFound() {
  useSeo({ title: 'Page not found', robots: 'noindex' }, [])
  const NF = SITE.notFound || {}
  const root = useRef(null)
  const big = useRef(null)
  const dot = useRef(null)
  const txt = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        textHide(big.current, 'chars'); textHide(txt.current, 'up')
        const cancel = app.whenReady(() => {
          textIn(big.current, 'chars', { duration: 1.4 }); textIn(txt.current, 'up', { delay: 0.4 })
        })
        const t = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } })
        t.to(dot.current, { x: () => root.current.clientWidth * 0.6, y: -40, duration: 3.4 }).to(dot.current, { y: 60, duration: 2.2 }, 0.6)
        return () => { cancel(); t.kill() }
      })
    },
    { scope: root },
  )
  return (
    <section ref={root} data-theme="dark" className="section" style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', overflow: 'clip', paddingTop: 'var(--nav-h)' }}>
      <div className="wrap" style={{ position: 'relative', width: '100%' }}>
        <p className="mono dim" style={{ margin: '0 0 12px' }}>{NF.eyebrow}</p>
        <h1 className="display outline" aria-label={`${NF.title} — page not found`} style={{ margin: 0, fontSize: 'clamp(7rem,30vw,32rem)', lineHeight: 0.78, letterSpacing: '-.06em', color: 'var(--light)' }}>
          <SplitText ref={big} by="chars" text={NF.title || '404'} />
        </h1>
        <div style={{ position: 'relative', height: 1, background: 'color-mix(in srgb, var(--line-dark-base) 16%, transparent)', margin: 'clamp(24px,4vw,48px) 0' }} aria-hidden="true">
          <span ref={dot} className="signal-dot" style={{ position: 'absolute', left: 0, top: -3.5 }} />
        </div>
        <SplitText ref={txt} as="p" className="display display-md" text={NF.message || ''} style={{ margin: 0, maxWidth: '20ch' }} />
        <div style={{ marginTop: 36, display: 'flex', flexWrap: 'wrap', gap: '12px 28px', alignItems: 'center' }}>
          {NF.primary?.to && <MagneticButton to={NF.primary.to}>{NF.primary.label}</MagneticButton>}
          {NF.secondary?.to && <TLink to={NF.secondary.to} className="tlink">{NF.secondary.label} <Arrow /></TLink>}
        </div>
      </div>
    </section>
  )
}
