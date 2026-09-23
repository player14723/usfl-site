import { useEffect, useRef } from 'react'
import { gsap, MQ } from '../../lib/gsap'
import { feature } from '../../platform/motion'

/** Restrained custom cursor: a small signal dot + a ring that swells on interactive targets and can carry a label via data-cursor. */
export default function CursorGlow() {
  const root = useRef(null)
  const dot = useRef(null)
  const ring = useRef(null)
  useEffect(() => {
    if (!feature('customCursor') || !window.matchMedia(MQ.fine).matches) return
    const r = root.current
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3.out' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3.out' })
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.5, ease: 'power3.out' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.5, ease: 'power3.out' })
    let shown = false
    const move = (e) => {
      if (!shown) { gsap.to(r, { opacity: 1, duration: 0.4 }); shown = true }
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY)
      const t = e.target.closest?.('a, button, [data-cursor], input, textarea, summary')
      const label = t?.getAttribute?.('data-cursor')
      const isField = t && /INPUT|TEXTAREA/.test(t.tagName)
      if (t && !isField) {
        gsap.to(ring.current, { scale: label ? 1.9 : 1.5, duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
        gsap.to(ring.current, { backgroundColor: label ? '#fff' : 'transparent', duration: 0.3 })
        ring.current.textContent = label || ''
      } else {
        gsap.to(ring.current, { scale: isField ? 0.5 : 1, duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
        gsap.to(ring.current, { backgroundColor: 'transparent', duration: 0.3 })
        ring.current.textContent = ''
      }
    }
    const leave = () => { gsap.to(r, { opacity: 0, duration: 0.3 }); shown = false }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave) }
  }, [])
  return (
    <div className="cursor" ref={root} aria-hidden="true">
      <div className="cursor-ring" ref={ring} />
      <div className="cursor-dot" ref={dot} />
    </div>
  )
}
