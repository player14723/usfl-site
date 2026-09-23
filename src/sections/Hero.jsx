import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { textHide, textIn } from '../lib/anim'
import { app } from '../lib/store'
import { useMotion, SCENES } from '../platform/motion'
import SplitText from '../components/SplitText'
import Cinematic from '../components/ui/Cinematic'
import MagneticButton from '../components/ui/MagneticButton'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'

/**
 * Hero — first scene. The video settles from full-bleed into a window that the headline overlaps;
 * on scroll the window opens back out to full-bleed while the headline rises away as one solid block.
 * The video is the plunge built from Image 01: orbit → cloud layer → city → central hub. It plays once, then holds.
 */
const desktopNow = () => typeof window !== 'undefined' && window.matchMedia(MQ.desktop).matches

export default function Hero({
  eyebrow = '', lines = [], lead = '', primaryCta, secondaryCta, cinematic = 'hero-plunge',
  figureLabel = '', liveLabel = '', scrollLabel = 'Scroll', scrollLength = 1,
}) {
  const m = useMotion()
  const L = [lines[0] || '', lines[1] || '', lines[2] || '']
  const heightVh = Math.round(250 * (Number(scrollLength) || 1) * (Number(SCENES.scrollLength) || 1))
  const root = useRef(null)
  const wrap = useRef(null)
  const video = useRef(null)
  const l1 = useRef(null), l2 = useRef(null), l3 = useRef(null)
  const eyeRef = useRef(null), meta = useRef(null), cta = useRef(null), cue = useRef(null), tags = useRef(null)
  const h1ref = useRef(null)

  useGSAP(
    () => {
      if (!m.enabled) {
        // static: the composed frame (video window + headline), no scroll choreography
        gsap.set(wrap.current, { clipPath: desktopNow() ? 'inset(15% 5% 14% 45% round 4px)' : 'inset(47% 0% 4% 0% round 4px)' })
        return
      }
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        const { desktop } = ctx.conditions
        const WIN = desktop ? 'inset(15% 5% 14% 45% round 4px)' : 'inset(47% 0% 4% 0% round 4px)'
        const FULL = 'inset(0% 0% 0% 0% round 0px)'
        gsap.set(wrap.current, { clipPath: FULL })
        textHide(l1.current, 'left'); textHide(l2.current, 'up'); textHide(l3.current, 'right')
        gsap.set([eyeRef.current, meta.current, cta.current, cue.current, tags.current].filter(Boolean), { opacity: 0, y: 24 })
        let scrollTl
        const buildScroll = () => {
          scrollTl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true },
          })
          scrollTl
            .fromTo(wrap.current, { clipPath: WIN }, { clipPath: FULL, duration: 0.6, immediateRender: false }, 0)
            .fromTo(video.current.inner, { scale: 1.0 }, { scale: 1.12, duration: 1, immediateRender: false }, 0)
            // the headline stays locked to the grid: it rises as one block and leaves, letterforms untouched
            .fromTo(h1ref.current, { yPercent: 0, clipPath: 'inset(-10% -5% -10% -5%)' }, { yPercent: -14, duration: 0.8, immediateRender: false }, 0)
            .to(h1ref.current, { clipPath: 'inset(-10% -5% 110% -5%)', duration: 0.34, ease: 'power2.in' }, 0.36)
            .fromTo([eyeRef.current, meta.current, cta.current, tags.current].filter(Boolean), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', y: -30, duration: 0.2, stagger: 0.02, immediateRender: false }, 0.04)
            .to(cue.current, { opacity: 0, duration: 0.1 }, 0)
        }
        let tl
        const cancel = app.whenReady(() => {
          video.current?.start() // the plunge begins the moment the splash hands over
          tl = gsap.timeline({ onComplete: () => { if (root.current && video.current) buildScroll() } })
          tl.to(wrap.current, { clipPath: WIN, duration: 1.7, ease: 'expo.inOut' }, 0)
          textIn(l1.current, 'left', { duration: 1.5, delay: 0.7 })
          textIn(l2.current, 'up', { duration: 1.5, delay: 0.85 })
          textIn(l3.current, 'right', { duration: 1.5, delay: 1.0 })
          gsap.to([eyeRef.current, tags.current, meta.current, cta.current, cue.current].filter(Boolean), { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, delay: 1.1, ease: 'expo.out' })
        })
        return () => { cancel(); tl?.kill(); scrollTl?.scrollTrigger?.kill(); scrollTl?.kill() }
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} data-theme="dark" className="hero" style={{ position: 'relative', height: `${heightVh}vh` }} aria-label={L.join(' ').replace(/\*/g, '')}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'clip', background: 'var(--ink)' }}>
        {/* Video 1 — entry */}
        <div ref={wrap} style={{ position: 'absolute', inset: 0, willChange: 'clip-path' }}>
          <Cinematic
            ref={video}
            id={cinematic}
            priority
            overlay="var(--hero-scrim)"
            style={{ position: 'absolute', inset: 0 }}
          />
        </div>

        {/* technical labels tied to the window */}
        <div ref={tags} className="hero-tags mono dim" aria-hidden="true">
          {figureLabel && <span>{figureLabel}</span>}
          {liveLabel && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Signal /> {liveLabel}</span>}
        </div>

        <div className="wrap hero-copy">
          {eyebrow && <p ref={eyeRef} className="mono" style={{ margin: '0 0 clamp(16px,2.6vh,30px)', color: 'var(--signal)' }}>{eyebrow}</p>}
          <h1 ref={h1ref} className="display hero-h1" aria-label={L.join(' ').replace(/\*/g, '')}>
            <span className="hl" style={{ display: 'block' }}><SplitText ref={l1} text={L[0]} /></span>
            <span className="hl" style={{ display: 'block', paddingLeft: 'clamp(0px,7vw,140px)' }}><SplitText ref={l2} text={L[1]} className="serif-h" /></span>
            <span className="hl" style={{ display: 'block' }}><SplitText ref={l3} text={L[2]} /></span>
          </h1>
        </div>

        <div className="wrap hero-foot">
          {lead ? <p ref={meta} className="lead" style={{ margin: 0, maxWidth: '34ch', color: 'var(--light)' }}>{lead}</p> : <span ref={meta} />}
          <div ref={cta} className="hero-cta">
            {primaryCta?.label && primaryCta?.to && <MagneticButton to={primaryCta.to}>{primaryCta.label}</MagneticButton>}
            {secondaryCta?.label && secondaryCta?.to && <TLink to={secondaryCta.to} className="tlink">{secondaryCta.label} <Arrow /></TLink>}
          </div>
        </div>

        <div ref={cue} className="hero-cue mono dim" aria-hidden="true">
          <span>{scrollLabel}</span>
          <span className="hero-cue-line"><i /></span>
        </div>
      </div>
      <style>{`
        .hero-h1{margin:0;font-size:min(10.2vw,20vh);line-height:.9;letter-spacing:-.044em;font-weight:600;font-stretch:88%;color:var(--light)}
        .hero-h1 .serif-h .si{font-family:var(--font-serif);font-style:italic;font-weight:400;letter-spacing:-.03em;padding-right:.06em}
        .hero{--hero-scrim:linear-gradient(90deg, color-mix(in srgb, var(--overlay) 72%, transparent) 0%, color-mix(in srgb, var(--overlay) 30%, transparent) 34%, transparent 52%), linear-gradient(0deg, color-mix(in srgb, var(--overlay) 55%, transparent) 0%, transparent 35%)}
        .hero-copy{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;pointer-events:none;padding-bottom:6vh}
        .hero-copy>*{pointer-events:auto}
        .hero-foot{position:absolute;left:0;right:0;bottom:clamp(20px,5vh,56px);display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:24px}
        .hero-cta{display:flex;flex-wrap:wrap;align-items:center;gap:12px 28px}
        .hero-tags{position:absolute;right:calc(5vw + 4px);top:calc(15% - 30px);display:flex;gap:22px;font-size:.62rem}
        .hero-cue{position:absolute;right:var(--gutter);bottom:clamp(24px,5vh,56px);display:none;flex-direction:column;align-items:center;gap:10px;font-size:.62rem}
        .hero-cue-line{width:1px;height:54px;background:color-mix(in srgb, var(--line-dark-base) 18%, transparent);position:relative;overflow:hidden;display:block}
        .hero-cue-line i{position:absolute;left:0;top:-40%;width:1px;height:40%;background:var(--signal);animation:cue 2.2s var(--ease-io) infinite}
        @keyframes cue{to{top:100%}}
        @media (min-width:900px){.hero-cue{display:flex}.hero-foot{padding-right:calc(var(--gutter) + 60px)}}
        @media (max-width:899px){
          .hero-h1{font-size:min(17vw,12vh)}
          .hero-copy{justify-content:flex-start;padding-top:calc(var(--nav-h) + 3vh);padding-bottom:0}
          .hero-tags{right:var(--gutter);top:auto;bottom:calc(4% + 12px);flex-direction:column;gap:6px;align-items:flex-end}
          .hero-foot{flex-direction:column;align-items:flex-start;gap:18px;bottom:calc(4% + 16px);}
          .hero-foot .lead{font-size:1rem;max-width:30ch}
          .hero{--hero-scrim:linear-gradient(0deg, color-mix(in srgb, var(--overlay) 92%, transparent) 0%, color-mix(in srgb, var(--overlay) 78%, transparent) 28%, color-mix(in srgb, var(--overlay) 20%, transparent) 52%, transparent 64%), linear-gradient(180deg, color-mix(in srgb, var(--overlay) 78%, transparent) 0%, color-mix(in srgb, var(--overlay) 45%, transparent) 30%, transparent 44%)}
          .hero-tags{display:none}
        }
        /* static (motion off) */ .motion-off .hero-cue-line i{animation:none}
      `}</style>
    </section>
  )
}
