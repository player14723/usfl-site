import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../../lib/gsap'

/**
 * SystemLine — a hairline that fills as its container scrolls through, with a travelling signal head.
 * orientation 'v' (default) or 'h'. Sits absolutely inside a positioned parent unless `static`.
 */
export default function SystemLine({ orientation = 'v', start = 'top 75%', end = 'bottom 60%', className = '', style, dot = true, tone = 'auto' }) {
  const root = useRef(null)
  const fill = useRef(null)
  const head = useRef(null)
  const v = orientation === 'v'
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const trigger = root.current.parentElement
        const st = ScrollTrigger.create({
          trigger, start, end, scrub: 0.5,
          onUpdate: (self) => {
            const p = self.progress
            gsap.set(fill.current, v ? { scaleY: p } : { scaleX: p })
            if (head.current) gsap.set(head.current, v ? { top: `${p * 100}%` } : { left: `${p * 100}%` })
          },
        })
        return () => st.kill()
      })
      mm.add(MQ.reduce, () => {
        gsap.set(fill.current, v ? { scaleY: 1 } : { scaleX: 1 })
        if (head.current) gsap.set(head.current, v ? { top: '100%' } : { left: '100%' })
      })
    },
    { scope: root },
  )
  const track = { position: 'absolute', background: 'currentColor', opacity: 0.16 }
  const fillS = { position: 'absolute', background: 'var(--signal)', transformOrigin: v ? 'top' : 'left', boxShadow: '0 0 12px color-mix(in srgb, var(--signal) 50%, transparent)' }
  const light = tone === 'light'
  return (
    <div ref={root} className={className} style={{ position: 'absolute', pointerEvents: 'none', ...(v ? { top: 0, bottom: 0, width: 1 } : { left: 0, right: 0, height: 1 }), ...style }} aria-hidden="true" data-theme-passive>
      <div style={{ ...track, inset: 0 }} />
      <div ref={fill} style={{ ...fillS, inset: 0, background: light ? 'var(--signal-ink)' : 'var(--signal)', boxShadow: light ? 'none' : fillS.boxShadow, transform: v ? 'scaleY(0)' : 'scaleX(0)' }} />
      {dot && (
        <span
          ref={head}
          className="signal-dot"
          style={{ position: 'absolute', ...(v ? { left: -3.5, top: 0 } : { top: -3.5, left: 0 }), width: 8, height: 8, transform: 'translate(0,0)' }}
        />
      )}
    </div>
  )
}
