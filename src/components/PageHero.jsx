import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { textHide, textIn } from '../lib/anim'
import { app } from '../lib/store'
import SplitText from './SplitText'
import MovingImage from './ui/MovingImage'
import Signal from './ui/Signal'

const KINDS = ['left', 'up', 'right', 'up']

/**
 * PageHero — opening scene of every inner page. Headline lines arrive from alternating directions once the
 * page is visibly ready, a signal line draws beneath them, and on scroll the lines drift apart and the image window opens.
 */
export default function PageHero({ eyebrow, index, lines, intro, image, imageAlt, imageAspect = '4/5', kinds = KINDS, children, minHeight = '88svh', compact = false, size = 'display-xl', imagePosition = '50% 50%' }) {
  const root = useRef(null)
  const eb = useRef(null)
  const lineRefs = useRef([])
  const rule = useRef(null)
  const introRef = useRef(null)
  const media = useRef(null)
  const extra = useRef(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        const D = ctx.conditions.desktop
        const ls = lineRefs.current.filter(Boolean)
        ls.forEach((l, i) => textHide(l, kinds[i % kinds.length]))
        gsap.set([eb.current, introRef.current, extra.current].filter(Boolean), { opacity: 0, y: 22 })
        gsap.set(rule.current, { scaleX: 0 })
        if (media.current) gsap.set(media.current, { clipPath: 'inset(100% 0% 0% 0%)' })
        const cancel = app.whenReady(() => {
          gsap.to(eb.current, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' })
          ls.forEach((l, i) => textIn(l, kinds[i % kinds.length], { duration: 1.4, delay: 0.1 + i * 0.14 }))
          gsap.to(rule.current, { scaleX: 1, duration: 1.8, ease: 'expo.inOut', delay: 0.5 })
          gsap.to([introRef.current, extra.current].filter(Boolean), { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: 0.7, stagger: 0.1 })
          if (media.current) gsap.to(media.current, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', delay: 0.3, clearProps: 'clipPath' })
        })
        // scroll: lines drift apart, hero softly recedes
        const st = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.7 } })
        // the title block rises a little as one piece — solid, aligned, never see-through
        st.to(lineRefs.current[0]?.parentElement?.parentElement || root.current, { yPercent: D ? -8 : -4, duration: 1 }, 0)
        return () => { cancel(); st.scrollTrigger?.kill(); st.kill() }
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} data-theme="dark" className="section phero" style={{ minHeight: compact ? undefined : minHeight, paddingTop: 'calc(var(--nav-h) + clamp(32px,6vh,80px))', paddingBottom: 'clamp(40px,7vh,96px)', display: 'flex', alignItems: 'flex-end', overflow: 'clip' }}>
      <div className="wrap phero-grid" style={{ position: 'relative' }}>
        <div className="phero-copy">
          <p ref={eb} className="mono" style={{ margin: '0 0 clamp(22px,3.4vh,40px)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Signal />{index && <span className="dim">{index}</span>}<span>{eyebrow}</span>
          </p>
          <h1 className={`display ${size}`} style={{ margin: 0 }} aria-label={lines.join(' ').replace(/\*/g, '')}>
            {lines.map((l, i) => (
              <span key={i} style={{ display: 'block', paddingLeft: i % 2 ? 'clamp(0px,5vw,96px)' : 0 }} aria-hidden="true">
                <SplitText ref={(n) => (lineRefs.current[i] = n)} text={l} />
              </span>
            ))}
          </h1>
          <div ref={rule} aria-hidden="true" style={{ height: 1, background: 'var(--signal)', boxShadow: '0 0 14px color-mix(in srgb, var(--signal) 45%, transparent)', transformOrigin: 'left', margin: 'clamp(28px,4.4vh,52px) 0 clamp(20px,3vh,36px)', maxWidth: 'min(100%,720px)' }} />
          {intro && <p ref={introRef} className="lead" style={{ margin: 0, maxWidth: '46ch', color: 'var(--dim)' }}>{intro}</p>}
          {children && <div ref={extra} style={{ marginTop: 28 }}>{children}</div>}
        </div>
        {image && (
          <div className="phero-media" ref={media}>
            <MovingImage name={image} alt={imageAlt} aspect={imageAspect} speed={10} eager position={imagePosition} sizes="(min-width:900px) 38vw, 92vw" />
          </div>
        )}
      </div>
      <style>{`
        .phero-grid{display:grid;gap:clamp(32px,5vw,80px);grid-template-columns:1fr;align-items:end}
        .phero-copy{min-width:0}
        .phero-media{width:100%;max-width:520px}
        @media(min-width:900px){.phero-grid{grid-template-columns:${'minmax(0,1.5fr) minmax(0,.7fr)'}}.phero-media{justify-self:end}}
      `}</style>
    </section>
  )
}
