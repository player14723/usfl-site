import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import TLink from './ui/TLink'
import Arrow from './ui/Arrow'
import SystemLine from './ui/SystemLine'
import Signal from './ui/Signal'

const hoverOn = () => true

/**
 * NextBlock — the hand-off to the next page. A light panel wipes up over the block on hover/focus (desktop),
 * the title inverts along the panel edge, and the signal line above fills as the block scrolls into view.
 */
export default function NextBlock({ label = 'Next', title, to, sub, theme = 'dark2' }) {
  const root = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ fine: MQ.fine, motion: MQ.motion }, (ctx) => {
        if (!ctx.conditions.fine || !ctx.conditions.motion || !hoverOn()) return
        const el = root.current
        const panel = el.querySelector('.nb-panel')
        const on = () => gsap.to(panel, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' })
        const off = () => gsap.to(panel, { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' })
        const a = el.querySelector('a')
        a.addEventListener('pointerenter', on); a.addEventListener('pointerleave', off)
        a.addEventListener('focus', on); a.addEventListener('blur', off)
        return () => { a.removeEventListener('pointerenter', on); a.removeEventListener('pointerleave', off); a.removeEventListener('focus', on); a.removeEventListener('blur', off) }
      })
    },
    { scope: root },
  )
  const inner = (light) => (
    <div className="wrap" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color: light ? 'var(--muted-on-light)' : 'var(--dim)' }}>{!light && <Signal />}{label}</span>
      <span className="display nb-title">{title}</span>
      {sub && <span className="mono dim">{sub}</span>}
      <span className="nb-arrow" aria-hidden="true"><Arrow /></span>
    </div>
  )
  return (
    <section ref={root} data-theme={theme} className="section" aria-label={`${label}: ${title}`} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', height: 1 }}><SystemLine orientation="h" start="top 95%" end="top 45%" style={{ top: 0 }} /></div>
      <TLink to={to} className="nb-link" style={{ display: 'block', position: 'relative', overflow: 'hidden', color: 'var(--light)' }}>
        <div className="nb-face">{inner(false)}</div>
        <div className="nb-panel" aria-hidden="true">{inner(true)}</div>
      </TLink>
      <style>{`
        .nb-link{height:clamp(320px,52vh,560px)}
        .nb-panel .dim{color:var(--muted-on-light)}
        .nb-face,.nb-panel{position:absolute;inset:0}
        .nb-panel{background:var(--paper);color:var(--ink);clip-path:inset(100% 0% 0% 0%)}
        .nb-title{font-size:clamp(2.6rem,9vw,9.5rem);letter-spacing:-.04em;line-height:.9;max-width:18ch}
        .nb-arrow .arrow{width:56px;height:auto;transition:transform .6s var(--ease-out)}
        .nb-link:hover .nb-arrow .arrow{transform:translateX(12px)}
        @media (hover:none){.nb-panel{clip-path:none;display:none}}
      `}</style>
    </section>
  )
}
