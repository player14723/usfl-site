import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, ScrollTrigger, prefersReduced } from '../lib/gsap'
import { app } from '../lib/store'
import { labelFor, indexFor } from '../lib/router'
import { feature } from '../platform/motion'

const Ctx = createContext({ go: () => {} })
export const useGo = () => useContext(Ctx).go

const frames = (n = 2) => new Promise((r) => { const step = () => (n-- <= 0 ? r() : requestAnimationFrame(step)); step() })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const tlDone = (tl) => new Promise((res) => tl.eventCallback('onComplete', res))

/**
 * Connected page transitions.
 *  · default: a colour field rises from the bottom carrying a signal edge + the destination's name,
 *    the route swaps underneath, then the field exits through the top.
 *  · shared: a case-study image expands from its card to become the next page's hero.
 */
export function TransitionProvider({ children }) {
  const navigate = useNavigate()
  const loc = useLocation()
  const pathRef = useRef(loc.pathname)
  pathRef.current = loc.pathname
  const busy = useRef(false)
  const els = useRef({})

  const go = useCallback(
    async (to, opts = {}) => {
      if (busy.current) return
      const target = to.split('#')[0] || '/'
      if (target === pathRef.current) {
        window.scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' })
        return
      }
      if (prefersReduced() || !app.splashDone) {
        navigate(to)
        window.scrollTo(0, 0)
        return
      }
      // motion.json → features: pageTransitions (the curtain) / sharedImageTransitions (image expands into the next hero)
      const shared = Boolean(opts.sharedEl) && feature('sharedImageTransitions')
      if (!shared && !feature('pageTransitions')) {
        navigate(to)
        window.scrollTo(0, 0)
        return
      }
      busy.current = true
      app.setBusy(true)
      const { curtain, panel, edge, label, idx, line } = els.current
      const vh = window.innerHeight
      let clone = null

      if (shared) {
        const host = opts.sharedEl.closest('.frame') || opts.sharedEl
        const r = host.getBoundingClientRect()
        clone = document.createElement('img')
        clone.src = opts.sharedEl.currentSrc || opts.sharedEl.src
        clone.alt = ''
        Object.assign(clone.style, {
          position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px',
          objectFit: 'cover', zIndex: 110, pointerEvents: 'none', willChange: 'left, top, width, height',
        })
        document.body.appendChild(clone)
        gsap.to(document.querySelector('main'), { opacity: 0.25, duration: 0.6, ease: 'power2.out' })
        await tlDone(
          gsap.timeline().to(clone, { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, duration: 1.0, ease: 'expo.inOut' }),
        )
      } else {
        label.textContent = labelFor(target)
        idx.textContent = indexFor(target)
        // split label into chars for the masked entrance
        const text = label.textContent
        label.innerHTML = Array.from(text).map((c) => `<span class="sc" style="display:inline-block;white-space:pre">${c}</span>`).join('')
        const chars = label.querySelectorAll('.sc')
        gsap.set(curtain, { visibility: 'visible', pointerEvents: 'auto' })
        gsap.set(panel, { clipPath: 'inset(100% 0% 0% 0%)' })
        gsap.set(edge, { y: vh })
        gsap.set(chars, { yPercent: 110 })
        gsap.set(line, { scaleX: 0 })
        gsap.set(idx, { opacity: 0, y: 12 })
        const tl = gsap.timeline()
        tl.to(panel, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' }, 0)
          .to(edge, { y: 0, duration: 0.8, ease: 'expo.inOut' }, 0)
          .to(chars, { yPercent: 0, duration: 0.8, stagger: 0.025, ease: 'expo.out' }, 0.38)
          .to(idx, { opacity: 1, y: 0, duration: 0.5 }, 0.5)
          .to(line, { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.35)
        await tlDone(tl)
      }

      navigate(to)
      window.scrollTo(0, 0)
      await frames(3)
      ScrollTrigger.refresh()

      if (clone) {
        // wait for the destination hero image so the hand-off is seamless
        const t0 = performance.now()
        while (performance.now() - t0 < 1500) {
          const h = document.querySelector('[data-hero-img]')
          if (h && h.complete && h.naturalWidth) break
          await wait(40)
        }
        gsap.set(document.querySelector('main'), { opacity: 1 })
        busy.current = false
        app.setBusy(false)
        app.flush()
        await tlDone(gsap.timeline().to(clone, { opacity: 0, duration: 0.7, ease: 'power2.inOut' }))
        clone.remove()
      } else {
        const { label: l } = els.current
        const chars = l.querySelectorAll('.sc')
        const tl = gsap.timeline()
        tl.to(chars, { yPercent: -110, duration: 0.5, stagger: 0.015, ease: 'expo.in' }, 0)
          .set(edge, { y: vh }, 0.2)
          .to(panel, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.95, ease: 'expo.inOut' }, 0.2)
          .to(edge, { y: 0, duration: 0.95, ease: 'expo.inOut' }, 0.2)
          .add(() => {
            busy.current = false
            app.setBusy(false)
            app.flush()
          }, 0.42)
        await tlDone(tl)
        gsap.set(curtain, { visibility: 'hidden', pointerEvents: 'none' })
      }
      busy.current = false
      app.setBusy(false)
      const main = document.getElementById('main')
      main?.focus({ preventScroll: true })
    },
    [navigate],
  )

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  }, [])

  // browser back/forward (no curtain): reset scroll + let pages start
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (!busy.current) {
      window.scrollTo(0, 0)
      requestAnimationFrame(() => ScrollTrigger.refresh())
    }
  }, [loc.pathname])

  return (
    <Ctx.Provider value={{ go }}>
      {children}
      <div
        className="curtain"
        aria-hidden="true"
        ref={(n) => {
          if (n) els.current.curtain = n
        }}
      >
        <div className="curtain-panel" ref={(n) => n && (els.current.panel = n)}>
          <div className="wrap" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="mono dim" ref={(n) => n && (els.current.idx = n)} style={{ marginBottom: 12 }}>00</span>
            <div className="display display-xl" style={{ overflow: 'hidden', paddingBottom: '.12em' }}>
              <span ref={(n) => n && (els.current.label = n)} />
            </div>
          </div>
          <div style={{ position: 'absolute', left: 'var(--gutter)', right: 'var(--gutter)', bottom: 56, height: 1, background: 'var(--line-dark)' }}>
            <div ref={(n) => n && (els.current.line = n)} style={{ height: '100%', background: 'var(--signal)', transformOrigin: 'left', transform: 'scaleX(0)' }} />
          </div>
        </div>
        <div className="curtain-edge" ref={(n) => n && (els.current.edge = n)} />
      </div>
    </Ctx.Provider>
  )
}
