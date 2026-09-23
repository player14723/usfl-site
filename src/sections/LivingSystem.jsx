import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { SYSTEM } from '../platform/content'
import { useMotion, SCENES } from '../platform/motion'
import SplitText from '../components/SplitText'
import Cinematic from '../components/ui/Cinematic'

// The six designed compositions below repeat if the system has more (or fewer) stages.
const R = 'round 4px'
// Video-window keyframes (clip-path insets, % of the stage). One per beat: intro, then six stages, then the portal exit.
const DESK = [
  `inset(31% 12% 31% 60% ${R})`, // intro — small window
  `inset(16% 6% 16% 51% ${R})`, // 1 Strategy — right column
  `inset(0% 0% 0% 0% round 0px)`, // 2 Experience — full bleed
  `inset(13% 55% 13% 5% ${R})`, // 3 Data — left column
  `inset(0% 0% 0% 0% round 0px)`, // 4 Technology — full bleed, type in front
  `inset(39% 0% 39% 0% round 0px)`, // 5 Automation — a horizontal band
  `inset(9% 9% 9% 9% ${R})`, // 6 Growth — large centred
  `inset(47% 47% 47% 47% ${R})`, // exit — a portal
]
const MOB = [
  `inset(16% 8% 56% 8% ${R})`,
  `inset(12% 0% 50% 0% ${R})`,
  `inset(0% 0% 0% 0% round 0px)`,
  `inset(12% 0% 50% 0% ${R})`,
  `inset(0% 0% 0% 0% round 0px)`,
  `inset(30% 0% 50% 0% round 0px)`,
  `inset(10% 4% 46% 4% ${R})`,
  `inset(30% 30% 60% 30% ${R})`,
]
// Inner video drift per beat (x %, scale) — the composition of the picture changes as the window moves.
const DRIFT = [[0, 1.25], [-6, 1.15], [0, 1.02], [7, 1.2], [0, 1.08], [-4, 1.3], [0, 1.0], [0, 1.4]]
const KIND = ['left', 'up', 'right', 'rise', 'clip', 'chars']
// keyframes for n stages: intro, one per stage (cycling the six designed ones), exit
const frames = (A, n) => [A[0], ...Array.from({ length: n }, (_, i) => A[1 + (i % 6)]), A[7]]

/**
 * LIVING SYSTEM — the one place the six-stage system is explained.
 * A pinned scene ~7 screens long. Video 2 is a window into the system: it grows, travels, goes full-bleed,
 * slides behind type, becomes a band, and finally contracts into a portal. A signal rail tracks the stages.
 */
export default function LivingSystem({ label = 'The connected system', introLines = ['One connected', '*system.*'], cinematic = 'system-loop', scrollLength = 1 }) {
  const m = useMotion()
  const N = SYSTEM.length
  const LEN = (Number(scrollLength) || 1) * (Number(SCENES.scrollLength) || 1)
  const root = useRef(null)
  const stage = useRef(null)
  const vwrap = useRef(null)
  const video = useRef(null)
  const blocks = useRef([])
  const nodes = useRef([])
  const fill = useRef(null)
  const cnt = useRef(null)
  const intro = useRef(null)
  const dim = useRef(null)
  const band = useRef(null)
  const beatsEl = useRef([])

  useGSAP(
    () => {
      if (!m.enabled || !N) { nodes.current.forEach((n) => n && n.classList.add('on')); return }
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        const D = ctx.conditions.desktop
        const K = frames(D ? DESK : MOB, N)
        const DR = frames(DRIFT, N)
        const TOT = N + 1.6 // intro .6 + 6 stages + outro 1.0
        const at = (i) => (i === 0 ? 0 : 0.6 + (i - 1)) // start of beat i
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true,
            onUpdate: (self) => {
              const t = self.progress * TOT
              const idx = t < 0.6 ? -1 : Math.min(N - 1, Math.floor(t - 0.6 + 0.001))
              nodes.current.forEach((n, i) => n && n.classList.toggle('on', i <= idx))
              nodes.current.forEach((n, i) => n && n.setAttribute('aria-current', i === idx ? 'step' : 'false'))
              if (cnt.current) cnt.current.textContent = idx < 0 ? '—' : `${String(idx + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`
              if (fill.current) gsap.set(fill.current, D ? { scaleY: Math.min(1, Math.max(0, (t - 0.6) / (N - 0.0))) } : { scaleX: Math.min(1, Math.max(0, (t - 0.6) / N)) })
            },
          },
        })

        // ── the video window travels through the keyframes
        gsap.set(vwrap.current, { clipPath: K[0] })
        for (let i = 1; i < K.length; i++) {
          tl.to(vwrap.current, { clipPath: K[i], duration: i === K.length - 1 ? 0.9 : 0.55, ease: 'power2.inOut' }, Math.max(0, at(i) - 0.35))
          tl.to(video.current.inner, { xPercent: DR[i][0], scale: DR[i][1], duration: 1, ease: 'power1.inOut' }, Math.max(0, at(i) - 0.35))
        }
        gsap.set(video.current.inner, { xPercent: DR[0][0], scale: DR[0][1] })
        // dimmer follows: full-bleed beats darken the picture so type stays legible
        gsap.set(dim.current, { opacity: 0 })
        ;[2, 4].filter((i) => i <= N).forEach((i) => tl.to(dim.current, { opacity: i === 4 ? 0.62 : 0.5, duration: 0.4 }, at(i) - 0.3).to(dim.current, { opacity: 0, duration: 0.4 }, at(i) + 0.85))
        tl.to(dim.current, { opacity: 0.35, duration: 0.3 }, at(N) - 0.2)

        // ── intro copy
        gsap.set(intro.current.querySelectorAll('.si'), { yPercent: 115 })
        tl.to(intro.current.querySelectorAll('.si'), { yPercent: 0, duration: 0.3, stagger: 0.02, ease: 'power3.out' }, 0.02)
        tl.to(intro.current.querySelectorAll('.si'), { yPercent: -115, duration: 0.2, stagger: 0.01, ease: 'power2.in' }, 0.42)

        // ── stage copy — each stage enters from a different direction
        blocks.current.forEach((b, i) => {
          const name = b.querySelector('.st-name')
          const kind = KIND[i % KIND.length]
          const chars = kind === 'chars' ? name.querySelectorAll('.sc') : name.querySelectorAll('.si')
          const rest = b.querySelectorAll('.st-rest')
          const from =
            kind === 'left' ? { xPercent: -110, opacity: 0 }
            : kind === 'right' ? { xPercent: 110, opacity: 0 }
            : kind === 'clip' ? { yPercent: 0, clipPath: 'inset(0 100% 0 0)' }
            : { yPercent: 115 }
          const target = kind === 'clip' ? name : chars
          gsap.set(b, { visibility: 'hidden' })
          gsap.set(target, from)
          gsap.set(rest, { opacity: 0, y: 26 })
          const s = at(i + 1)
          tl.set(b, { visibility: 'visible' }, s - 0.06)
          tl.to(target, { xPercent: 0, yPercent: 0, scale: 1, opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 0.34, stagger: kind === 'clip' ? 0 : 0.03, ease: 'power3.out' }, s - 0.04)
          tl.to(rest, { opacity: 1, y: 0, duration: 0.3, stagger: 0.05, ease: 'power2.out' }, s + 0.12)
          // exit: opposite motion
          const outT = s + 0.74
          tl.to(target, kind === 'left' ? { xPercent: 60, opacity: 0, duration: 0.22 } : kind === 'right' ? { xPercent: -60, opacity: 0, duration: 0.22 } : kind === 'clip' ? { clipPath: 'inset(0 0 0 100%)', duration: 0.22 } : { yPercent: -115, duration: 0.22, stagger: 0.015 }, outT)
          tl.to(rest, { opacity: 0, y: -18, duration: 0.18 }, outT)
          tl.set(b, { visibility: 'hidden' }, s + 1 - 0.02)
        })

        // signal in the band beat (Automation): a lime point travels the band's edge
        gsap.set(band.current, { left: '0%', opacity: 0 })
        if (N >= 5) {
          tl.to(band.current, { opacity: 1, duration: 0.1 }, at(5) - 0.05)
          tl.to(band.current, { left: '100%', duration: 0.9, ease: 'power1.inOut' }, at(5))
          tl.to(band.current, { opacity: 0, duration: 0.1 }, at(5) + 0.9)
        }

        tl.to({}, { duration: 0.0001 }, TOT - 0.0001)
        return () => { tl.scrollTrigger?.kill(); tl.kill() }
      })
    },
    { scope: root },
  )

  const jump = (i) => {
    const st = ScrollTrigger.getAll().find((s) => s.trigger === root.current)
    if (!st) return
    const TOT = N + 1.6
    const t = 0.6 + i + 0.35
    window.scrollTo({ top: st.start + (st.end - st.start) * (t / TOT), behavior: window.matchMedia(MQ.reduce).matches ? 'auto' : 'smooth' })
  }

  return (
    <section ref={root} data-theme="dark" className="section living" style={{ height: `${Math.round((N + 1.6) * 100 * LEN)}vh` }} aria-label={label}>
      <div ref={stage} className="ls-stage">
        {/* faint construction grid */}
        <div aria-hidden="true" className="ls-grid" />

        {/* Video 2 — a window into the system */}
        <div ref={vwrap} className="ls-video">
          <Cinematic ref={video} id={cinematic} style={{ position: 'absolute', inset: 0 }} />
          <div ref={dim} style={{ position: 'absolute', inset: 0, background: 'var(--ink)', opacity: 0, pointerEvents: 'none' }} />
        </div>
        <span ref={band} className="signal-dot ls-band" aria-hidden="true" />

        {/* header + counter */}
        <div className="wrap ls-head mono">
          <span className="dim">{label}</span>
          <span ref={cnt} style={{ color: 'var(--signal)' }}>—</span>
        </div>

        {/* intro */}
        <div ref={intro} className="wrap ls-intro">
          {introLines.map((l, i) => (<SplitText key={i} as={i === 0 ? 'h2' : 'p'} text={l} className="display display-xl" style={{ margin: 0 }} />))}
        </div>

        {/* stages */}
        {SYSTEM.map((s, i) => (
          <div key={s.key} ref={(n) => (blocks.current[i] = n)} className={`ls-block b${(i % 6) + 1}`}>
            <div className="wrap ls-inner">
              <span className="st-rest mono" style={{ color: 'var(--signal)' }}>{String(i + 1).padStart(2, '0')} — {s.tags.join(' · ')}</span>
              <SplitText as="h3" by={KIND[i % KIND.length] === 'chars' ? 'chars' : 'words'} text={s.name} className={`st-name display ${i % 6 === 3 ? 'display-xxl' : 'display-xl'}`} style={{ margin: 0 }} />
              <p className="st-rest lead" style={{ margin: 0 }}>{s.line}</p>
              {(s.detail || s.related.length > 0) && (
                <p className="st-rest dim" style={{ margin: 0, maxWidth: '46ch', fontSize: 15 }}>
                  {s.detail}{s.detail && s.related.length ? ' ' : ''}{s.related.length > 0 && <span className="mono">Maps to: {s.related.join(' · ')}</span>}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* signal rail */}
        <nav className="ls-rail" aria-label="System stages">
          <span className="ls-rail-track" aria-hidden="true"><i ref={fill} /></span>
          <ol>
            {SYSTEM.map((s, i) => (
              <li key={s.key}>
                <button ref={(n) => (nodes.current[i] = n)} onClick={() => jump(i)} aria-label={`Go to ${s.name}`}>
                  <span className="node" aria-hidden="true" />
                  <span className="lbl mono">{s.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <style>{`
        .ls-stage{position:sticky;top:0;height:100vh;overflow:clip;background:var(--ink)}
        .ls-grid{position:absolute;inset:0;background-image:linear-gradient(color-mix(in srgb, var(--line-dark-base) 3.5%, transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb, var(--line-dark-base) 3.5%, transparent) 1px,transparent 1px);background-size:calc(100%/12) calc(100vh/8);mask-image:radial-gradient(70% 70% at 50% 50%,#000,transparent)}
        .ls-video{position:absolute;inset:0;will-change:clip-path}
        .ls-band{position:absolute;top:50%;margin-top:-4px;z-index:3}
        .ls-head{position:absolute;left:0;right:0;top:calc(var(--nav-h) + 8px);display:flex;justify-content:space-between;z-index:4;pointer-events:none}
        .ls-intro{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;z-index:3;pointer-events:none}
        .ls-block{position:absolute;inset:0;z-index:3;pointer-events:none}
        .ls-inner{position:absolute;inset:0;display:flex;flex-direction:column;gap:clamp(12px,2vh,22px)}
        .ls-inner .lead{max-width:34ch}
        /* per-stage composition (desktop) */
        @media (min-width:900px){
          .b1 .ls-inner{justify-content:center;padding-right:52%}
          .b2 .ls-inner{justify-content:flex-end;padding-bottom:12vh}
          .b2 .lead{color:var(--light)}
          .b3 .ls-inner{justify-content:center;padding-left:54%}
          .b4 .ls-inner{justify-content:center;align-items:flex-start}
          .b4 .st-name{color:var(--light);font-size:clamp(5rem,19vw,23rem);line-height:.82;margin-left:-.04em;letter-spacing:-.05em}
          .b4 .lead{position:absolute;left:var(--gutter);bottom:12vh}
          .b4 .st-rest.mono{position:absolute;left:var(--gutter);top:calc(var(--nav-h) + 48px)}
          .b5 .ls-inner{justify-content:space-between;padding-top:calc(var(--nav-h) + 40px);padding-bottom:9vh}
          .b5 .st-name{position:absolute;left:var(--gutter);top:calc(var(--nav-h) + 40px)}
          .b5 .lead{position:absolute;right:var(--gutter);bottom:9vh;max-width:30ch}
          .b5 .mono.st-rest{position:absolute;right:var(--gutter);top:calc(var(--nav-h) + 48px)}
          .b6 .ls-inner{justify-content:flex-end;align-items:center;text-align:center;padding-bottom:8vh}
          .b6 .st-name{position:absolute;left:0;right:0;top:calc(var(--nav-h) + 24px);text-align:center;color:var(--signal)}
          .b6 .lead{max-width:44ch;text-shadow:0 2px 24px color-mix(in srgb, var(--overlay) 85%, transparent)}
        }
        @media (max-width:899px){
          .ls-inner{justify-content:flex-end;padding-bottom:9vh}
          .ls-inner .st-name{font-size:clamp(3rem,15vw,6rem)}
          .ls-intro{justify-content:flex-end;padding-bottom:12vh}
          .ls-block .lead{font-size:1rem;text-shadow:0 2px 20px color-mix(in srgb, var(--overlay) 90%, transparent)}
        }
        /* rail */
        .ls-rail{position:absolute;z-index:5}
        .ls-rail ol{list-style:none;margin:0;padding:0;display:flex}
        .ls-rail button{display:flex;align-items:center;gap:12px;min-height:44px;min-width:44px;color:var(--dim);transition:color .4s}
        .ls-rail .node{width:9px;height:9px;border-radius:50%;border:1px solid currentColor;transition:all .5s var(--ease-out);flex:none}
        .ls-rail .lbl{font-size:.6rem}
        .ls-rail button.on{color:var(--light)}
        .ls-rail button.on .node{background:var(--signal);border-color:var(--signal);box-shadow:0 0 14px color-mix(in srgb, var(--signal) 70%, transparent)}
        .ls-rail button[aria-current="step"] .lbl{color:var(--signal);opacity:1}
        .ls-rail button:hover{color:var(--light)}
        .ls-rail-track{position:absolute;background:var(--line-dark);overflow:hidden}
        .ls-rail-track i{position:absolute;inset:0;background:var(--signal);box-shadow:0 0 12px color-mix(in srgb, var(--signal) 60%, transparent)}
        @media (min-width:900px){
          .ls-rail{right:var(--gutter);top:50%;transform:translateY(-50%)}
          .ls-rail ol{flex-direction:column;gap:14px;align-items:flex-end}
          .ls-rail button{flex-direction:row-reverse}
          .ls-rail-track{right:calc(4.5px + 0px);top:22px;bottom:22px;width:1px}
          .ls-rail-track i{transform-origin:top;transform:scaleY(0)}
        }
        @media (max-width:899px){
          .ls-rail{left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 4px)}
          .ls-rail ol{justify-content:space-around;padding:0 8px}
          .ls-rail .lbl{display:none}
          .ls-rail-track{left:calc(8px + 22px);right:calc(8px + 22px);top:50%;height:1px}
          .ls-rail-track i{transform-origin:left;transform:scaleX(0)}
        }
        /* static (motion off) */ 
          .motion-off .living{height:auto !important}
          .motion-off .ls-stage{position:relative !important;height:auto !important;overflow:visible !important;padding:14vh 0}
          .motion-off .ls-video{position:relative !important;clip-path:none !important;height:60vh;margin-bottom:6vh}
          .motion-off .ls-intro,.motion-off .ls-block,.motion-off .ls-inner,.motion-off .ls-head{position:relative !important;inset:auto !important;visibility:visible !important;padding-block:0 !important}
          .motion-off .ls-block{margin:6vh 0}
          .motion-off .ls-rail,.motion-off .ls-grid,.motion-off .ls-band{display:none}
          .motion-off .b4 .st-name{font-size:clamp(3rem,10vw,8rem)}
          .motion-off .b4 .lead,.motion-off .b4 .st-rest.mono,.motion-off .b5 .st-name,.motion-off .b5 .lead,.motion-off .b5 .mono.st-rest,.motion-off .b6 .st-name{position:static !important}
        
      `}</style>
    </section>
  )
}
