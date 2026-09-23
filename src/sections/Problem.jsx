import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { resolveImage } from '../platform/media'
import { useMotion, SCENES } from '../platform/motion'
import SplitText from '../components/SplitText'
import SystemLine from '../components/ui/SystemLine'

/**
 * PROBLEM — made felt, not explained. Five short beats in USFL's own words while three illustrative fragments
 * drift apart at different depths… and, at the end, snap into one aligned row joined by a signal line.
 * (The six-stage system is deliberately NOT repeated here.)
 */
export default function Problem({ label = '', backgroundWords = [], images = [], beats: beatsIn = [], scrollLength = 1 }) {
  const m = useMotion()
  const BEATS = (Array.isArray(beatsIn) ? beatsIn : []).map((b) => ({ a: b.lineA || '', b: b.lineB || '', lines: b.list?.length ? b.list : null, hi: Boolean(b.highlight) }))
  const IMGS = (Array.isArray(images) ? images : []).slice(0, 3).map(resolveImage).filter(Boolean)
  const heightVh = Math.round(108 * Math.max(1, BEATS.length) * (Number(scrollLength) || 1) * (Number(SCENES.scrollLength) || 1))
  const root = useRef(null)
  const beatRefs = useRef([])
  const shard = useRef([])
  const rows = useRef([])
  const join = useRef(null)
  const counter = useRef(null)
  const bar = useRef(null)

  useGSAP(
    () => {
      if (!m.enabled) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        const D = ctx.conditions.desktop
        const beats = beatRefs.current
        const N = beats.length
        if (!N) return
        const words = (b) => b.querySelectorAll('.si')
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true,
            onUpdate: (self) => {
              const i = Math.min(N, Math.floor(self.progress * N * 0.999) + 1)
              if (counter.current) counter.current.textContent = `${String(i).padStart(2, '0')} / ${String(N).padStart(2, '0')}`
              if (bar.current) gsap.set(bar.current, { scaleX: self.progress })
            },
          },
        })
        // background words drift against each other
        rows.current.forEach((r, i) => tl.fromTo(r, { xPercent: i % 2 ? -34 : 4 }, { xPercent: i % 2 ? 4 : -34, duration: N }, 0))

        // fragments start scattered & misaligned…
        const S = D
          ? [
              { x: '52vw', y: '6vh', r: 7, s: 1.0, w: '30vw', h: '19vw' },
              { x: '2vw', y: '52vh', r: -9, s: 0.95, w: '15vw', h: '20vw' },
              { x: '60vw', y: '58vh', r: 4, s: 0.9, w: '24vw', h: '15vw' },
            ]
          : [
              { x: '46vw', y: '8vh', r: 8, s: 1, w: '46vw', h: '30vw' },
              { x: '-6vw', y: '58vh', r: -8, s: 0.95, w: '28vw', h: '36vw' },
              { x: '52vw', y: '66vh', r: 5, s: 0.9, w: '40vw', h: '26vw' },
            ]
        // …and converge into one row on the last beat
        const rowY = D ? '70vh' : '72vh'
        const H = D ? '17vh' : '13vh'
        const tgt = D
          ? [{ x: '8vw', w: '27vw' }, { x: '37vw', w: '12vw' }, { x: '51vw', w: '38vw' }]
          : [{ x: '4vw', w: '30.9vw' }, { x: '36.9vw', w: '13.7vw' }, { x: '52.6vw', w: '43.4vw' }] // same 27:12:38 as desktop
        shard.current.slice(0, IMGS.length).forEach((el, i) => {
          if (!el) return
          gsap.set(el, { left: S[i].x, top: S[i].y, width: S[i].w, height: S[i].h, rotate: S[i].r, scale: S[i].s, opacity: 0 })
          tl.to(el, { opacity: D ? 0.62 : 0.5, duration: 0.5 }, 0)
          // drift with depth
          tl.to(el, { yPercent: (i % 2 ? 1 : -1) * (16 + i * 8), rotate: S[i].r * 1.9, duration: N - 1.1 }, 0)
          tl.to(el, { left: tgt[i].x, width: tgt[i].w, top: rowY, height: H, yPercent: 0, rotate: 0, scale: 1, opacity: 0.95, duration: 0.9, ease: 'power3.inOut' }, N - 1.1)
        })
        gsap.set(join.current, { top: `calc(${rowY} + ${H} + 14px)` })
        tl.fromTo(join.current, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.out' }, N - 0.55)

        // beats — each with its own entrance/exit direction
        const dirs = [['left', 'right'], ['up', 'left'], ['up', 'up'], ['right', 'left'], ['up', 'down']]
        beats.forEach((b, i) => {
          const w = words(b)
          const [inn] = dirs[i % dirs.length]
          const t0 = i + 0.04
          const from = inn === 'left' ? { xPercent: -80, opacity: 0 } : inn === 'right' ? { xPercent: 80, opacity: 0 } : { yPercent: 110 }
          const to = { xPercent: 0, yPercent: 0, scale: 1, opacity: 1 }
          gsap.set(w, from)
          tl.set(b, { visibility: 'visible' }, t0)
          tl.fromTo(w, from, { ...to, duration: 0.3, stagger: 0.02, ease: 'power3.out', immediateRender: false }, t0)
          if (i < N - 1) {
            const out = i % 2 ? { xPercent: -60, opacity: 0 } : { yPercent: -110, opacity: 0 }
            tl.to(w, { ...out, duration: 0.2, stagger: 0.012, ease: 'power2.in' }, i + 0.78)
            tl.set(b, { visibility: 'hidden' }, i + 1)
          }
        })
        gsap.set(beats, { visibility: 'hidden' })
        gsap.set(beats[0], { visibility: 'visible' })
      })
    },
    { scope: root },
  )

  const lineStyle = { margin: 0, maxWidth: '18ch' }
  return (
    <section ref={root} data-theme="dark" className="section problem" style={{ height: `${heightVh}vh` }} aria-label={label || 'The problem'}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'clip' }}>
        {/* drifting words */}
        <div className="pb-decor" aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', pointerEvents: 'none' }}>
          {backgroundWords.slice(0, 3).map((w, i) => (
            <div key={w + i} ref={(n) => (rows.current[i] = n)} className="display outline" style={{ whiteSpace: 'nowrap', fontSize: 'clamp(6rem,20vw,26rem)', lineHeight: 0.85, color: 'var(--decor-dark)' }}>
              {w} &nbsp;{w}
            </div>
          ))}
        </div>

        {/* three fragments of ONE crossing — scattered, then re-aligned into a continuous picture */}
        {IMGS.map((im, i) => (
          <div key={i} ref={(e) => (shard.current[i] = e)} className="frame pb-decor" style={{ position: 'absolute', overflow: 'hidden', border: '1px solid color-mix(in srgb, var(--line-dark-base) 8%, transparent)' }} aria-hidden="true">
            <img src={im.src} srcSet={im.srcSet} sizes="40vw" alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
        <div ref={join} className="pb-decor" aria-hidden="true" style={{ position: 'absolute', left: '6vw', right: '6vw', top: 'calc(70vh + 17vh + 14px)', height: 1, background: 'var(--signal)', boxShadow: '0 0 14px color-mix(in srgb, var(--signal) 60%, transparent)', transformOrigin: 'left', transform: 'scaleX(0)' }} />

        {/* beats */}
        <div className="wrap" style={{ position: 'absolute', inset: 0 }}>
          {BEATS.map((b, i) => (
            <div key={i} ref={(n) => (beatRefs.current[i] = n)} className="beat" style={{ position: 'absolute', inset: '0 var(--gutter)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'clamp(8px,1.4vw,18px)', padding: 'var(--nav-h) 0 33vh', visibility: i === 0 ? 'visible' : 'hidden' }}>
              {b.lines ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'clamp(6px,1.2vw,16px)' }}>
                  {b.lines.map((l, j) => (
                    <li key={j} style={{ paddingLeft: `${(j % 2 ? 1 : 0) * 5 + j * 2}vw` }}>
                      <SplitText as="p" text={l} className="display display-md" style={{ margin: 0 }} />
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  {b.a && <SplitText as="p" text={b.a} className="display display-lg" style={lineStyle} />}
                  {b.b && <SplitText as="p" text={b.b} className={`display display-lg ${b.hi ? '' : 'dim'}`} style={{ ...lineStyle, color: b.hi ? 'var(--signal)' : undefined }} />}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="wrap mono dim" style={{ position: 'absolute', left: 0, right: 0, bottom: 'clamp(16px,3vh,32px)', display: 'flex', alignItems: 'center', gap: 20 }}>
          <span ref={counter}>{`01 / ${String(BEATS.length).padStart(2, '0')}`}</span>
          <span style={{ flex: 1, height: 1, background: 'color-mix(in srgb, var(--line-dark-base) 16%, transparent)', position: 'relative' }}>
            <i ref={bar} style={{ position: 'absolute', inset: 0, background: 'var(--signal)', transformOrigin: 'left', transform: 'scaleX(0)' }} />
          </span>
          <span>{label}</span>
        </div>
      </div>
      <style>{`
        /* static (motion off) */ 
          .motion-off .problem{height:auto !important}
          .motion-off .problem>div{position:relative !important;height:auto !important;overflow:visible !important}
          .motion-off .problem .wrap{position:relative !important;inset:auto !important}
          .motion-off .problem .beat{position:relative !important;visibility:visible !important;padding:10vh 0 !important}
          .motion-off .problem .pb-decor{display:none !important}
        
      `}</style>
    </section>
  )
}
