import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../../lib/gsap'
import { feature } from '../../platform/motion'
import TLink from './TLink'
import Arrow from './Arrow'

/** Pill button with restrained magnetic pull (fine pointers only). */
export default function MagneticButton({ to, href, onClick, children, variant = 'primary', strength = 0.28, arrow = true, className = '', type, ...rest }) {
  const ref = useRef(null)
  const inner = useRef(null)
  useGSAP(
    () => {
      const el = ref.current
      if (!el || !feature('magneticButtons') || !window.matchMedia(MQ.fine).matches) return
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' })
      const ixTo = gsap.quickTo(inner.current, 'x', { duration: 0.6, ease: 'power3.out' })
      const iyTo = gsap.quickTo(inner.current, 'y', { duration: 0.6, ease: 'power3.out' })
      const move = (e) => {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        xTo(dx * strength); yTo(dy * strength)
        ixTo(dx * strength * 0.5); iyTo(dy * strength * 0.5)
      }
      const leave = () => { xTo(0); yTo(0); ixTo(0); iyTo(0) }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', leave)
      return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
    },
    { scope: ref },
  )
  const cls = `btn ${variant === 'primary' ? 'btn-primary' : 'btn-ghost'} ${className}`
  const content = (
    <span ref={inner} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8em' }}>
      {children}
      {arrow && <Arrow />}
    </span>
  )
  if (to) return <TLink ref={ref} to={to} className={cls} data-cursor="" {...rest}>{content}</TLink>
  if (href) return <a ref={ref} href={href} className={cls} onClick={onClick} {...rest}>{content}</a>
  return <button ref={ref} type={type || 'button'} className={cls} onClick={onClick} {...rest}>{content}</button>
}
