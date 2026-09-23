import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { textHide, textIn } from '../lib/anim'
import { app } from '../lib/store'
import SplitText from './SplitText'
import MovingImage from './ui/MovingImage'
import Signal from './ui/Signal'

/**
 * CaseStudyHero — the destination of the shared-image transition. The picture is full-bleed (`data-hero-img`),
 * settles from a slight over-scale, and the title assembles over it; scrolling pushes the image in and lets the type recede.
 */
export default function CaseStudyHero({ c }) {
  const root = useRef(null)
  const imgWrap = useRef(null)
  const lines = useRef([])
  const top = useRef(null)
  const meta = useRef(null)
  const kinds = ['left', 'up', 'right']
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const ls = lines.current.filter(Boolean)
        ls.forEach((l, i) => textHide(l, kinds[i % 3]))
        gsap.set([top.current, meta.current], { opacity: 0, y: 24 })
        gsap.set(imgWrap.current, { scale: 1.12 })
        const cancel = app.whenReady(() => {
          gsap.to(imgWrap.current, { scale: 1, duration: 2.2, ease: 'expo.out' })
          gsap.to(top.current, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', delay: 0.2 })
          ls.forEach((l, i) => textIn(l, kinds[i % 3], { duration: 1.4, delay: 0.25 + i * 0.14 }))
          gsap.to(meta.current, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: 0.9 })
        })
        const st = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 } })
        st.to(imgWrap.current, { scale: 1.14, yPercent: 6, duration: 1 }, 0)
        st.fromTo([top.current, meta.current], { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.5, immediateRender: false }, 0)
        return () => { cancel(); st.scrollTrigger?.kill(); st.kill() }
      })
    },
    { scope: root },
  )
  return (
    <section ref={root} data-theme="dark" className="section cs-hero" style={{ position: 'relative', minHeight: '100svh', overflow: 'clip', display: 'flex', alignItems: 'flex-end' }} aria-label={c.title}>
      <div ref={imgWrap} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
        <MovingImage name={c.image} alt={c.imageAlt} speed={0} eager hero shared={false} style={{ position: 'absolute', inset: 0 }} sizes="100vw" />
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, color-mix(in srgb, var(--overlay) 92%, transparent) 0%, color-mix(in srgb, var(--overlay) 55%, transparent) 38%, color-mix(in srgb, var(--overlay) 15%, transparent) 70%, color-mix(in srgb, var(--overlay) 45%, transparent) 100%)' }} />
      <div className="wrap" style={{ position: 'relative', paddingTop: 'calc(var(--nav-h) + 40px)', paddingBottom: 'clamp(28px,5vh,64px)', width: '100%' }}>
        <p ref={top} className="mono" style={{ margin: '0 0 clamp(20px,3vh,36px)', display: 'flex', alignItems: 'center', gap: 12 }}><Signal /><span className="dim">Case study {c.n}</span><span>{c.kicker}</span></p>
        <h1 className="display" aria-label={c.title} style={{ margin: 0, fontSize: 'clamp(2.6rem,8.6vw,10.4rem)', letterSpacing: '-.045em', lineHeight: 0.9, maxWidth: '15ch' }}>
          {c.display.map((l, i) => (
            <span key={i} aria-hidden="true" style={{ display: 'block', paddingLeft: i === 1 ? 'clamp(0px,6vw,120px)' : 0 }}>
              <SplitText ref={(n) => (lines.current[i] = n)} text={l.split(' ').map((w) => (w === c.em ? `*${w}*` : w)).join(' ')} />
            </span>
          ))}
        </h1>
        <dl ref={meta} className="cs-meta">
          {[...c.meta, ...(c.mapsTo?.length ? [['Maps to', c.mapsTo.join(' · ')]] : [])].map(([k, v]) => (
            <div key={k}><dt className="mono dim">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>
      <style>{`
        .cs-meta{margin:clamp(28px,5vh,56px) 0 0;display:grid;gap:14px 40px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));border-top:1px solid color-mix(in srgb, var(--line-dark-base) 16%, transparent);padding-top:18px}
        .cs-meta dd{margin:6px 0 0;font-size:15px}
        .cs-hero .display .serif{color:var(--signal)}
      `}</style>
    </section>
  )
}
