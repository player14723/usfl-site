import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../../lib/gsap'
import SplitText from '../SplitText'
import { useMotion, FEATURES } from '../../platform/motion'

const BARS = 8
const BG = { dark: 'var(--ink)', dark2: 'var(--ink2)', light: 'var(--paper)' }
const FG = { dark: 'var(--light)', dark2: 'var(--light)', light: 'var(--text-on-light)' }

const KICK = { dark: 'var(--dim)', dark2: 'var(--dim)', light: 'var(--muted-on-light)' }

function Statement({ lines, kicker, world }) {
  return (
    <div className="wrap" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(16px,2vw,28px)' }}>
      {kicker && <span className="mono" style={{ color: KICK[world] }}>{kicker}</span>}
      {lines.map((l, i) => (
        <SplitText key={i} as="p" text={l} className="display display-lg st-line" style={{ margin: 0, maxWidth: '18ch' }} />
      ))}
    </div>
  )
}

/**
 * SectionTransition — where one colour world becomes the other.
 * A pinned scene: the incoming world is revealed by a shaped mask (circle · shutter · diagonal · rise · hbars) while the
 * statement inverts exactly along the mask edge (the words exist in both worlds and are clipped by the same shape).
 * A signal ring / edge line travels with the mask so the change reads as the signal crossing over.
 */
/**
 * type: circle · diagonal · rise · shutter · hbars (the designed masks), "fade" (a scrubbed cross-fade between the
 * two worlds) or "cut" (no pinned scene: the statement sits on the destination colour as a normal section).
 * motion.json → features.sectionTransitions can force every transition to "cut" or "fade".
 */
export default function SectionTransition({ from = 'dark', to = 'light', type: typeIn = 'circle', origin = [0.76, 0.58], lines = [], kicker, height = '230vh', id }) {
  const m = useMotion()
  const forced = FEATURES.sectionTransitions
  const type = forced === 'cut' || forced === 'fade' ? forced : typeIn
  const root = useRef(null)
  const stick = useRef(null)
  const layerA = useRef(null)
  const layerB = useRef(null)
  const ring = useRef(null)
  const edge = useRef(null)
  const dotEl = useRef(null)
  const bars = useRef([])

  const isBars = type === 'shutter' || type === 'hbars'

  useGSAP(
    () => {
      if (type === 'cut') return
      if (!m.enabled) {
        // static: show the destination world
        if (layerB.current) gsap.set(layerB.current, { clipPath: 'none', opacity: 1 })
        bars.current.forEach((b) => b && gsap.set(b, { clipPath: 'none' }))
        root.current.dataset.p = '1'
        return
      }
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const S = stick.current
        const vw = () => S.clientWidth, vh = () => S.clientHeight
        const words = () => Array.from(S.querySelectorAll('.si'))
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true,
            onUpdate: (self) => { root.current.dataset.p = String(self.progress) },
          },
        })
        gsap.set(words(), { yPercent: 115 })
        tl.to(words(), { yPercent: 0, duration: 0.24, stagger: { each: 0.012, from: 'start' }, ease: 'power3.out' }, 0)
        const T0 = 0.36, D = 0.54
        const R = () => Math.hypot(vw(), vh()) * 1.05
        if (type === 'circle') {
          const cx = origin[0], cy = origin[1]
          gsap.set(dotEl.current, { left: `${cx * 100}%`, top: `${cy * 100}%`, opacity: 0 })
          gsap.set(layerB.current, { clipPath: () => `circle(0px at ${cx * 100}% ${cy * 100}%)` })
          gsap.set(ring.current, { left: `${cx * 100}%`, top: `${cy * 100}%`, scale: 0, opacity: 1 })
          tl.to(dotEl.current, { opacity: 1, duration: 0.08 }, T0 - 0.1)
          const o = { r: 0 }
          tl.to(o, { r: 1, duration: D, ease: 'power2.inOut', onUpdate: () => { layerB.current.style.clipPath = `circle(${o.r * R()}px at ${cx * 100}% ${cy * 100}%)` } }, T0)
          tl.to(ring.current, { scale: () => (R() * 2) / 200, duration: D, ease: 'power2.inOut' }, T0)
          tl.to(ring.current, { opacity: 0, duration: 0.08 }, T0 + D - 0.06)
          tl.to(dotEl.current, { opacity: 0, duration: 0.1 }, T0 + 0.06)
        } else if (type === 'diagonal') {
          gsap.set(layerB.current, { clipPath: 'polygon(0px 0px, 0px 0px, 0px 0px)' })
          gsap.set(edge.current, { opacity: 1 })
          const o = { a: 0 }
          tl.to(o, {
            a: 1, duration: D, ease: 'power2.inOut',
            onUpdate: () => {
              const a = o.a * (vw() + vh()) * 1.02
              layerB.current.style.clipPath = `polygon(0px 0px, ${a}px 0px, 0px ${a}px)`
              // edge line runs along the diagonal
              const len = Math.hypot(a, a)
              edge.current.style.width = `${len}px`
              edge.current.style.transform = `translate(0px, ${a}px) rotate(-45deg)`
              edge.current.style.opacity = o.a > 0.985 || o.a < 0.01 ? 0 : 1
            },
          }, T0)
        } else if (type === 'rise') {
          gsap.set(layerB.current, { clipPath: 'inset(100% 0% 0% 0%)' })
          gsap.set(edge.current, { opacity: 1, top: 0, left: 0, width: '100%', height: 2, transform: 'none' })
          const o = { y: 1 }
          tl.to(o, {
            y: 0, duration: D, ease: 'power3.inOut',
            onUpdate: () => {
              layerB.current.style.clipPath = `inset(${o.y * 100}% 0% 0% 0%)`
              edge.current.style.top = `${o.y * 100}%`
              edge.current.style.opacity = o.y < 0.01 ? 0 : 1
            },
          }, T0)
        } else if (type === 'fade') {
          gsap.set(layerB.current, { clipPath: 'none', opacity: 0 })
          gsap.set(edge.current, { opacity: 0 })
          tl.to(layerB.current, { opacity: 1, duration: D, ease: 'power1.inOut' }, T0)
        } else if (isBars) {
          const vert = type === 'shutter'
          bars.current.forEach((b, i) => {
            gsap.set(b, { clipPath: vert ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 0% 100%)' })
            tl.to(b, { clipPath: 'inset(0% 0% 0% 0%)', duration: D * 0.62, ease: 'power3.inOut' }, T0 + (i / (BARS - 1)) * D * 0.38)
          })
          gsap.set(edge.current, { opacity: 0 })
        }
        // when does the incoming world reach the navigation bar? (so the nav inverts exactly then, not at 50%)
        const inv = (fn, x) => { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (fn(m) < x) lo = m; else hi = m } return (lo + hi) / 2 }
        const TOT = tl.duration() || 1
        let flip = 0.6
        try {
          const NAVY = 38
          if (type === 'circle') {
            const dist = [0.5].map((fx) => Math.hypot(fx * vw() - origin[0] * vw(), NAVY - origin[1] * vh()))[0]
            flip = (T0 + inv(gsap.parseEase('power2.inOut'), Math.min(1, dist / R())) * D) / TOT
          } else if (type === 'diagonal') {
            const a = 0.5 * vw() + NAVY
            flip = (T0 + inv(gsap.parseEase('power2.inOut'), Math.min(1, a / ((vw() + vh()) * 1.02))) * D) / TOT
          } else if (type === 'rise') {
            flip = (T0 + inv(gsap.parseEase('power3.inOut'), 1 - NAVY / vh()) * D) / TOT
          } else if (type === 'hbars') {
            flip = (T0 + D * 0.62 * 0.9) / TOT
          } else if (type === 'fade') {
            flip = (T0 + D * 0.5) / TOT
          } else if (type === 'shutter') {
            flip = (T0 + D * 0.38 * 0.5 + D * 0.62 * 0.9) / TOT
          }
        } catch (e) { /* keep default */ }
        root.current.dataset.flip = String(Math.min(0.995, Math.max(0.05, flip)))
        return () => { tl.scrollTrigger?.kill(); tl.kill() }
      })
    },
    { scope: root, dependencies: [type] },
  )

  const content = (theme, hidden) => (
    <div style={{ position: 'absolute', inset: 0, background: BG[theme], color: FG[theme] }} aria-hidden={hidden ? 'true' : undefined}>
      <Statement lines={lines} kicker={kicker} world={theme} />
    </div>
  )

  if (type === 'cut') {
    // hard cut: the statement as an ordinary section in the destination colour (no pinned scene)
    return (
      <section id={id} className="section st-cut" data-theme={to} aria-label={lines.join(' ').replace(/\*/g, '')} style={{ position: 'relative', minHeight: '70vh', display: 'flex', alignItems: 'center', background: BG[to], color: FG[to] }}>
        <div style={{ position: 'relative', width: '100%', minHeight: '70vh' }}><Statement lines={lines} kicker={kicker} world={to} /></div>
      </section>
    )
  }

  return (
    <section ref={root} id={id} className="st" data-theme-from={from} data-theme-to={to} data-p="0" style={{ height, position: 'relative', background: BG[from] }} aria-label={lines.join(' ').replace(/\*/g, '')}>
      <div ref={stick} style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'clip', containerType: 'inline-size' }}>
        {/* world one */}
        <div ref={layerA} style={{ position: 'absolute', inset: 0 }}>{content(from, false)}</div>
        {/* world two, revealed by the mask */}
        {!isBars && (
          <div ref={layerB} style={{ position: 'absolute', inset: 0 }}>{content(to, true)}</div>
        )}
        {isBars && (
          <div style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
            {Array.from({ length: BARS }).map((_, i) => (
              <div
                key={i}
                ref={(n) => (bars.current[i] = n)}
                style={{
                  position: 'absolute', overflow: 'hidden',
                  ...(type === 'shutter'
                    ? { left: `${(i * 100) / BARS}%`, width: `${100 / BARS + 0.05}%`, top: 0, bottom: 0 }
                    : { top: `${(i * 100) / BARS}%`, height: `${100 / BARS + 0.05}%`, left: 0, right: 0 }),
                }}
              >
                <div style={{ position: 'absolute', ...(type === 'shutter' ? { left: `${-i * 100}%`, top: 0, width: '100cqw', height: '100%' } : { top: `${-i * 100}%`, left: 0, height: '100vh', width: '100%' }) }}>
                  {content(to, true)}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* signal artefacts */}
        <div ref={ring} aria-hidden="true" style={{ position: 'absolute', width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: '50%', border: '1px solid var(--signal)', boxShadow: '0 0 30px color-mix(in srgb, var(--signal) 35%, transparent)', opacity: 0, pointerEvents: 'none', display: type === 'circle' ? 'block' : 'none' }} />
        <span ref={dotEl} className="signal-dot" aria-hidden="true" style={{ position: 'absolute', marginLeft: -4, marginTop: -4, opacity: 0, display: type === 'circle' ? 'block' : 'none' }} />
        <div ref={edge} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, height: 2, background: 'var(--signal)', boxShadow: '0 0 20px 2px color-mix(in srgb, var(--signal) 50%, transparent)', opacity: 0, transformOrigin: '0 0', pointerEvents: 'none', display: type === 'diagonal' || type === 'rise' ? 'block' : 'none' }} />
      </div>
    </section>
  )
}
