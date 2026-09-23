import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, prefersReduced } from '../lib/gsap'
import { app } from '../lib/store'
import { UPPER_L, LOWER_L, SW, WORDS as DEFAULT_WORDS, widthOf } from '../lib/wordmark'
import { SITE, BRAND } from '../platform/config'
import { COLORS } from '../platform/theme'

// colours come from the theme; the four signal colours from brand.json → wordmark.tickColors
const LIGHT = COLORS.textOnDark
const INK = COLORS.ink
const SIGNAL = COLORS.accent
const INITIAL_COLORS = (BRAND.wordmark?.tickColors?.length === 4 ? BRAND.wordmark.tickColors : [COLORS.accent, COLORS.accent2, COLORS.textOnDark, COLORS.accent])
// the drawn letterforms are U·S·F·L, so exactly four words are used (site.json → intro.words)
const WORDS = Array.isArray(SITE.intro?.words) && SITE.intro.words.length === 4 ? SITE.intro.words : DEFAULT_WORDS
const SPREAD = [0, 152, 304, 444] // glyph-space x of U S F L while the four words emerge
const LOW_OFF = (widthOf(UPPER_L) - widthOf(LOWER_L)) / 2
const TAG = (SITE.tagline || '').toUpperCase()

/**
 * SplashScreen — the cinematic opening.
 * The hero video is already moving underneath. A single signal enters, travels, and *draws* U · S · F · L.
 * A light pass crosses the letters; the tagline resolves; then USFL separates into its four signals,
 * the words Usable · Solutions · For · Life emerge and collapse to their initials, and the wordmark
 * redraws as lowercase `usfl` — carrying the four initials as a signal underline — before flying into the nav.
 */
export default function SplashScreen({ onDone, storageKey = 'site-intro-seen' }) {
  const root = useRef(null)
  const svg = useRef(null)
  const [dim, setDim] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const tlRef = useRef(null)
  const doneRef = useRef(false)

  useLayoutEffect(() => {
    document.documentElement.classList.add('no-scroll')
    return () => document.documentElement.classList.remove('no-scroll')
  }, [])

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    try { sessionStorage.setItem(storageKey, '1') } catch (e) { /* private mode */ }
    document.documentElement.classList.remove('no-scroll')
    app.setSplashDone(true)
    app.flush()
    onDone?.()
  }

  useEffect(() => {
    const el = root.current
    const reduce = prefersReduced()
    const { w: vw, h: vh } = dim
    const Wu = widthOf(UPPER_L)
    const k = Math.min((vw * 0.62) / Wu, (vh * 0.3) / 92, 3.2)
    const ox = (vw - Wu * k) / 2
    const oy = vh * 0.5 - 62 * k

    const q = (s) => el.querySelectorAll(s)
    const one = (s) => el.querySelector(s)
    const wm = one('#sp-wm')
    const ups = Array.from(q('.sp-up'))
    const lows = Array.from(q('.sp-low'))
    const upG = Array.from(q('.sp-upg'))
    const lowG = Array.from(q('.sp-lowg'))
    const ticks = Array.from(q('.sp-tick'))
    const labels = Array.from(q('.sp-label'))
    const clips = Array.from(q('.sp-clip rect'))
    const tagChars = Array.from(q('.sp-tag .c'))
    const tint = one('.sp-tint')
    const dotG = one('#sp-dot')
    const trail = one('#sp-trail')
    const plate = one('#sp-plate')
    const skip = one('.sp-skip')

    gsap.set(wm, { attr: { transform: `translate(${ox} ${oy}) scale(${k})` } })
    gsap.set(ups, { strokeDasharray: 1, strokeDashoffset: 1 })
    gsap.set(lows, { strokeDasharray: 1, strokeDashoffset: 1 })
    gsap.set(ticks, { scaleX: 0, transformOrigin: '0% 50%', transformBox: 'fill-box' })
    gsap.set(plate, { scaleX: 0, transformOrigin: '0% 50%', transformBox: 'fill-box' })
    gsap.set(tagChars, { yPercent: 120, opacity: 0 })
    gsap.set(labels, { opacity: 0 })
    gsap.set(dotG, { opacity: 0 })

    if (reduce) {
      // Simple, calm: wordmark + tagline fade, then out. No motion.
      gsap.set(ups, { strokeDashoffset: 0 })
      gsap.set(tagChars, { yPercent: 0, opacity: 1 })
      gsap.set(tint, { opacity: 0.6 })
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.6 })
      const t = gsap.delayedCall(1.6, () => gsap.to(el, { opacity: 0, duration: 0.6, onComplete: finish }))
      return () => t.kill()
    }

    // signal entry path (glyph space): from off-screen left, gentle wave, arriving at the top-left of the U
    const sx = -ox / k - 40
    const entryD = `M ${sx} 60 C ${sx * 0.55} 120, ${sx * 0.3} -20, ${sx * 0.12} 30 S -4 6, 7 2`
    const entry = one('#sp-entry')
    entry.setAttribute('d', entryD)
    const entryLen = entry.getTotalLength()
    gsap.set(trail, { attr: { d: entryD }, strokeDasharray: entryLen, strokeDashoffset: entryLen, opacity: 1 })

    const place = (x, y) => dotG.setAttribute('transform', `translate(${x} ${y})`)
    const follow = (path, gx, prog) => {
      const p = path.getPointAtLength(prog * path.getTotalLength())
      place(gx + p.x, p.y)
    }
    const drawLetter = (i, dur, at, tl) => {
      const p = ups[i]
      const o = { v: 0 }
      tl.to(p, { strokeDashoffset: 0, duration: dur, ease: 'power1.inOut' }, at)
      tl.to(o, { v: 1, duration: dur, ease: 'power1.inOut', onUpdate: () => follow(p, UPPER_L[i].x, o.v) }, at)
    }

    const build = () => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } })
      tlRef.current = tl

      // 0 — the field is already alive under a tint that deepens
      tl.fromTo(tint, { opacity: 0.1 }, { opacity: 1, duration: 1.2, ease: 'power1.inOut' }, 0)

      // 1 — signal enters and travels
      tl.set(dotG, { opacity: 1 }, 0.45)
      const eo = { v: 0 }
      tl.to(eo, {
        v: 1, duration: 1.0, ease: 'power2.inOut',
        onUpdate: () => { const p = entry.getPointAtLength(eo.v * entryLen); place(p.x, p.y) },
      }, 0.5)
      tl.to(trail, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, 0.5)
      tl.to(trail, { opacity: 0, duration: 0.5 }, 1.55)

      // 2 — it constructs the letters
      drawLetter(0, 0.6, 1.5, tl)
      drawLetter(1, 0.75, 2.1, tl)
      drawLetter(2, 0.55, 2.85, tl)
      drawLetter(3, 0.5, 3.4, tl)
      tl.to(dotG, { opacity: 0, duration: 0.3 }, 3.95)

      // 3 — light pass across the letters
      const grad = one('#sp-pass')
      const go = { x: -260 }
      tl.to(go, {
        x: Wu + 200, duration: 1.0, ease: 'power2.inOut',
        onUpdate: () => { grad.setAttribute('x1', go.x); grad.setAttribute('x2', go.x + 220) },
      }, 3.9)

      // 4 — USABLE SOLUTIONS FOR LIFE resolves (tracking pulls in)
      tl.to(tagChars, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.028, ease: 'expo.out' }, 4.05)
      tl.fromTo(one('.sp-tag'), { letterSpacing: '0.9em' }, { letterSpacing: '0.44em', duration: 1.6, ease: 'expo.out' }, 4.05)

      // 5 — USFL separates into four signals
      const T = 5.6
      tl.to(tagChars, { yPercent: -120, opacity: 0, duration: 0.5, stagger: 0.012, ease: 'expo.in' }, T)
      tl.to(wm, { attr: { transform: `translate(${(vw - (SPREAD[3] + 68) * k * 0.84) / 2} ${oy + 8 * k}) scale(${k * 0.84})` }, duration: 1.0, ease: 'expo.inOut' }, T + 0.1)
      upG.forEach((g, i) => tl.to(g, { attr: { transform: `translate(${SPREAD[i]} 0)` }, duration: 1.0, ease: 'expo.inOut' }, T + 0.1))
      tl.set(ups, { stroke: LIGHT }, T)
      tl.to(ups[0], { stroke: INITIAL_COLORS[0], duration: 0.5 }, T + 0.7)
      tl.to(ups[1], { stroke: INITIAL_COLORS[1], duration: 0.5 }, T + 0.8)
      tl.to(plate, { scaleX: 1, duration: 0.6, ease: 'expo.inOut' }, T + 0.9)
      tl.to(ups[2], { stroke: INK, duration: 0.4 }, T + 1.05)
      tl.to(ups[3], { stroke: INITIAL_COLORS[3], duration: 0.5 }, T + 1.0)

      // 6 — Usable · Solutions · For · Life emerge…
      tl.set(labels, { opacity: 1 }, T + 1.3)
      const gt = (i) => ({ w: { v: 0 }, i })
      clips.forEach((r, i) => {
        const w = parseFloat(r.dataset.w)
        tl.fromTo(r, { attr: { width: 0 } }, { attr: { width: w }, duration: 0.7, ease: 'expo.out' }, T + 1.3 + i * 0.11)
      })
      // …and collapse back to their initials
      clips.forEach((r, i) => {
        tl.to(r, { attr: { width: parseFloat(r.dataset.iw) }, duration: 0.55, ease: 'expo.inOut' }, T + 2.5 + i * 0.05)
      })
      tl.to(labels, { opacity: 0, duration: 0.3 }, T + 3.05)

      // 7 — the wordmark redraws as lowercase; the initials become the underline signal
      const T2 = T + 3.0
      tl.to(wm, { attr: { transform: `translate(${ox} ${oy}) scale(${k})` }, duration: 0.9, ease: 'expo.inOut' }, T2)
      upG.forEach((g, i) => tl.to(g, { attr: { transform: `translate(${UPPER_L[i].x} 0)` }, duration: 0.9, ease: 'expo.inOut' }, T2))
      tl.to(plate, { scaleX: 0, duration: 0.45, ease: 'expo.inOut' }, T2)
      tl.to(ups, { strokeDashoffset: -1, duration: 0.5, stagger: 0.05, ease: 'power2.in' }, T2 + 0.5)
      lowG.forEach((g, i) => g.setAttribute('transform', `translate(${LOW_OFF + LOWER_L[i].x} 0)`))
      tl.to(lows, { strokeDashoffset: 0, duration: 0.6, stagger: 0.06, ease: 'power2.inOut' }, T2 + 0.75)
      tl.set(lows, { stroke: LIGHT }, T2 + 0.7)
      tl.to(ticks, { scaleX: 1, duration: 0.6, stagger: 0.07, ease: 'expo.out' }, T2 + 1.25)

      // 8 — settle, then fly into the navigation
      const T3 = T2 + 2.45
      tl.add(() => {
        const target = document.querySelector('[data-nav-logo] svg')
        const grp = one('#sp-final')
        if (!target || !grp) return
        const a = grp.getBoundingClientRect()
        const b = target.getBoundingClientRect()
        const s = b.width / a.width
        const cx = a.left + a.width / 2, cy = a.top + a.height / 2
        const tx = b.left + b.width / 2 - cx, ty = b.top + b.height / 2 - cy
        gsap.to(one('#sp-flight'), { x: tx, y: ty, scale: s, svgOrigin: `${cx} ${cy}`, duration: 1.05, ease: 'expo.inOut' })
        gsap.to(tint, { opacity: 0, duration: 0.9, ease: 'power1.inOut' })
        gsap.to(skip, { opacity: 0, duration: 0.3 })
        gsap.delayedCall(0.75, () => { app.setSplashDone(true); app.flush() })
        gsap.to(el, { opacity: 0, duration: 0.35, delay: 1.05, onComplete: finish })
      }, T3)


      return tl
    }

    // gate on fonts so the labels measure correctly
    const start = () => {
      // measure label widths for the clip reveals (needs the font)
      labels.forEach((g, i) => {
        const t = g.querySelector('text')
        const bb = t.getBBox()
        const ini = g.querySelector('tspan.i').getBBox()
        clips[i].dataset.w = String(Math.ceil(bb.width + 6))
        clips[i].dataset.iw = String(Math.ceil(ini.width + 3))
        clips[i].setAttribute('width', 0)
      })
      const tl = build()
      tl.play(0)
      tl.timeScale(1.18)
    }
    let alive = true
    const fontsReady = document.fonts?.load ? document.fonts.load(`600 26px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display') || 'sans-serif'}`) : Promise.resolve()
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(() => alive && start())
    const onResize = () => setDim({ w: window.innerWidth, h: window.innerHeight })
    return () => { alive = false; tlRef.current?.kill(); window.removeEventListener("resize", onResize) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skip = () => {
    if (doneRef.current) return
    tlRef.current?.kill()
    gsap.to(root.current, { opacity: 0, duration: 0.5, ease: 'power2.out', onComplete: finish })
    app.setSplashDone(true)
    app.flush()
  }

  const { w, h } = dim
  const Wu = widthOf(UPPER_L)
  const k = Math.min((w * 0.62) / Wu, (h * 0.3) / 92, 3.2)
  const tagTop = h * 0.5 - 62 * k + 92 * k + 46 * k * 0.55
  const tagSize = Math.max(10, Math.min(15, k * 5.4))

  return (
    <div ref={root} className="splash" role="dialog" aria-label="Introduction" aria-modal="false" style={{ position: 'fixed', inset: 0, zIndex: 150, overflow: 'hidden' }}>
      <div className="sp-tint" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 50%, color-mix(in srgb, var(--ink) 52%, transparent), color-mix(in srgb, var(--ink) 86%, transparent))', opacity: 0.1 }} />
      <svg ref={svg} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
        <defs>
          <linearGradient id="sp-pass" gradientUnits="userSpaceOnUse" x1="-260" y1="0" x2="-40" y2="0">
            <stop offset="0" stopColor={LIGHT} />
            <stop offset="0.42" stopColor={LIGHT} />
            <stop offset="0.5" stopColor={SIGNAL} />
            <stop offset="0.58" stopColor={LIGHT} />
            <stop offset="1" stopColor={LIGHT} />
          </linearGradient>
          <filter id="sp-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {WORDS.map((wd, i) => (
            <clipPath id={`sp-clip-${i}`} key={i} className="sp-clip">
              <rect x={SPREAD[i] - 4} y="98" width="0" height="60" data-w="60" data-iw="20" />
            </clipPath>
          ))}
        </defs>
        <g id="sp-flight">
          <g id="sp-wm">
            {/* entry line + signal */}
            <path id="sp-entry" d="M0 0" fill="none" stroke="none" />
            <path id="sp-trail" d="M0 0" fill="none" stroke={SIGNAL} strokeWidth="1.6" strokeLinecap="round" opacity="0" style={{ filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--signal) 80%, transparent))' }} />
            {/* F inversion plate */}
            <rect id="sp-plate" x={SPREAD[2] - 18} y="-16" width={68 + 30} height="124" fill={LIGHT} />
            {/* uppercase */}
            {UPPER_L.map((g, i) => (
              <g key={g.ch} className="sp-upg" transform={`translate(${g.x} 0)`}>
                <path className="sp-up" d={g.d} pathLength="1" fill="none" stroke="url(#sp-pass)" strokeWidth={SW} strokeLinejoin="miter" />
              </g>
            ))}
            <g id="sp-final">
              {LOWER_L.map((g, i) => (
                <g key={g.ch} className="sp-lowg" transform={`translate(${LOW_OFF + g.x} 0)`}>
                  <path className="sp-low" d={g.d} pathLength="1" fill="none" stroke={LIGHT} strokeWidth={SW} strokeLinejoin="miter" />
                  <rect className="sp-tick" x={2} y={104} width={g.w - 4} height={5} fill={INITIAL_COLORS[i]} />
                </g>
              ))}
            </g>
            {/* the four words */}
            {WORDS.map((wd, i) => (
              <g key={wd} className="sp-label" clipPath={`url(#sp-clip-${i})`} opacity="0">
                <text x={SPREAD[i]} y="134" style={{ fontFamily: 'var(--font-display)' }} fontWeight="600" fontSize="30" letterSpacing="-0.5" fill={LIGHT}>
                  <tspan className="i" fill={i === 2 ? LIGHT : INITIAL_COLORS[i]}>{wd[0]}</tspan>
                  <tspan>{wd.slice(1)}</tspan>
                </text>
              </g>
            ))}
            {/* signal head */}
            <g id="sp-dot" opacity="0">
              <circle r="9" fill={SIGNAL} opacity=".55" filter="url(#sp-glow)" />
              <circle r="4.5" fill={SIGNAL} />
              <circle r="1.8" fill="#FFFFFF" />
            </g>
          </g>
        </g>
      </svg>
      <div
        className="sp-tag mono"
        aria-hidden="true"
        style={{ position: 'absolute', left: 0, right: 0, top: tagTop, textAlign: 'center', fontSize: tagSize, letterSpacing: '0.9em', color: 'var(--light)', paddingLeft: '0.9em', whiteSpace: 'nowrap' }}
      >
        {TAG.split('').map((c, i) => (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', lineHeight: 1.4 }}>
            <span className="c" style={{ display: 'inline-block', whiteSpace: 'pre' }}>{c}</span>
          </span>
        ))}
      </div>
      <span className="sr-only">{SITE.name} — {SITE.tagline}</span>
      <button className="sp-skip mono" onClick={skip} style={{ position: 'absolute', right: 'var(--gutter)', bottom: 28, minHeight: 44, padding: '0 6px', color: 'var(--dim)' }} data-cursor="">
        {SITE.intro?.skipLabel || 'Skip intro'}
      </button>
    </div>
  )
}
