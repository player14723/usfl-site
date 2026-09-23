import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { gsap, ScrollTrigger, MQ, prefersReduced } from '../lib/gsap'
import { subscribeTheme, measureTheme } from '../lib/navTheme'
import { NAV, SITE } from '../platform/config'
import { FEATURES } from '../platform/motion'
import { app } from '../lib/store'
import TLink from './ui/TLink'
import Logo from './Logo'
import MagneticButton from './ui/MagneticButton'
import { useGo } from './PageTransition'
import { hrefFor, isExternal } from '../lib/router'

const visible = (l) => l && l.label && l.to && l.visible !== false
const PRIMARY = (NAV.primary || []).filter(visible)
const CTA = NAV.cta?.visible !== false && NAV.cta?.label && NAV.cta?.to ? NAV.cta : null
const MOBILE = [...(NAV.mobile?.includeHome !== false ? [{ label: 'Home', to: '/' }] : []), ...PRIMARY.flatMap((n) => [n, ...(n.children || []).filter(visible)])]
const EXTRA = (NAV.mobile?.extraLinks || []).filter(visible)

export default function Navigation() {
  const loc = useLocation()
  const go = useGo()
  const root = useRef(null)
  const progress = useRef(null)
  const btn = useRef(null)
  const menu = useRef(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(app.splashDone)
  const openRef = useRef(false)

  useEffect(() => app.subscribe(() => setReady(app.splashDone)), [])

  // Theme: invert against light sections; solid glass after first scroll; scroll progress "signal" line.
  useEffect(() => {
    const el = root.current
    const off = FEATURES.navigationAutoTheme === false ? () => {} : subscribeTheme((t) => el.setAttribute('data-nav-theme', t))
    let raf = 0
    const tick = () => {
      raf = 0
      measureTheme(38)
      el.setAttribute('data-scrolled', window.scrollY > 60 ? 'true' : 'false')
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (progress.current) gsap.set(progress.current, { scaleX: max > 0 ? window.scrollY / max : 0 })
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(tick) }
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    ScrollTrigger.addEventListener('refresh', on)
    const t = setTimeout(on, 60)
    on()
    return () => { off(); clearTimeout(t); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); ScrollTrigger.removeEventListener('refresh', on) }
  }, [loc.pathname])

  const close = useCallback((returnFocus = true) => {
    if (!openRef.current) return
    openRef.current = false
    setOpen(false)
    document.documentElement.classList.remove('no-scroll')
    const m = menu.current
    const links = m.querySelectorAll('[data-m-item]')
    if (prefersReduced()) { gsap.set(m, { clipPath: 'inset(0 0 100% 0)', visibility: 'hidden' }) }
    else {
      gsap.timeline({ onComplete: () => gsap.set(m, { visibility: 'hidden' }) })
        .to(links, { yPercent: -110, duration: 0.4, stagger: 0.03, ease: 'expo.in' }, 0)
        .to(m, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'expo.inOut' }, 0.15)
    }
    if (returnFocus) btn.current?.focus()
  }, [])

  const openMenu = () => {
    openRef.current = true
    setOpen(true)
    document.documentElement.classList.add('no-scroll')
    const m = menu.current
    const links = m.querySelectorAll('[data-m-item]')
    gsap.set(m, { visibility: 'visible' })
    if (prefersReduced()) { gsap.set(m, { clipPath: 'inset(0 0 0 0)' }); gsap.set(links, { yPercent: 0 }) }
    else {
      gsap.set(links, { yPercent: 115 })
      gsap.timeline()
        .fromTo(m, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut' }, 0)
        .to(links, { yPercent: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' }, 0.35)
        .fromTo(m.querySelector('[data-m-line]'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.out' }, 0.4)
    }
    requestAnimationFrame(() => m.querySelector('a, button')?.focus())
  }

  // Escape closes; simple focus trap; close on route change; close when growing to desktop
  useEffect(() => {
    const onKey = (e) => {
      if (!openRef.current) return
      if (e.key === 'Escape') { e.preventDefault(); close() }
      if (e.key === 'Tab') {
        const f = [btn.current, ...menu.current.querySelectorAll('a, button')].filter((n) => n && !n.hasAttribute('disabled'))
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    const mq = window.matchMedia(MQ.desktop)
    const onMq = () => mq.matches && close(false)
    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => { document.removeEventListener('keydown', onKey); mq.removeEventListener('change', onMq) }
  }, [close])

  useEffect(() => { close(false) }, [loc.pathname, close])

  const goMobile = (to) => (e) => {
    e.preventDefault()
    close(false)
    setTimeout(() => go(to), 350)
  }

  return (
    <>
      <header ref={root} className="nav" data-nav-theme="dark" data-scrolled="false" data-open={open ? 'true' : 'false'} style={{ opacity: ready ? 1 : 0, pointerEvents: ready ? 'auto' : 'none', transition: 'opacity .8s, color .5s var(--ease-out)' }}>
        <div className="nav-bg" />
        <div className="wrap" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <TLink to="/" aria-label={`${SITE.name} — home`} className="nav-logo" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, minWidth: 44 }} data-nav-logo>
            <Logo className="nav-wordmark" decorative />
          </TLink>
          <nav aria-label="Primary" className="nav-desktop" style={{ display: 'none', gap: 'clamp(16px,2.4vw,40px)', alignItems: 'center' }}>
            {PRIMARY.map((n) => {
              const link = isExternal(n.to) || n.external
                ? <a key={n.to} href={n.to} className="nav-link" target="_blank" rel="noopener noreferrer">{n.label}<span className="sr-only"> (opens in a new tab)</span></a>
                : <TLink key={n.to} to={n.to} className="nav-link" aria-current={n.to !== '/' && loc.pathname.startsWith(n.to) ? 'page' : undefined}>{n.label}</TLink>
              const kids = (n.children || []).filter(visible)
              if (!kids.length) return link
              // a dropdown: opens on hover and when any of its links has keyboard focus
              return (
                <div key={n.to} className="nav-item">
                  {link}
                  <ul className="nav-sub" aria-label={`${n.label} links`}>
                    {kids.map((c) => <li key={c.to}>{isExternal(c.to) || c.external ? <a href={c.to} target="_blank" rel="noopener noreferrer">{c.label}<span className="sr-only"> (opens in a new tab)</span></a> : <TLink to={c.to}>{c.label}</TLink>}</li>)}
                  </ul>
                </div>
              )
            })}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {CTA && <MagneticButton to={CTA.to} className="nav-cta" strength={0.2}>{CTA.label}</MagneticButton>}
            <button
              ref={btn}
              className="nav-burger"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => (open ? close() : openMenu())}
              style={{ width: 48, height: 48, display: 'none', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 95 }}
            >
              <span className="burger-lines" aria-hidden="true" style={{ position: 'relative', width: 26, height: 12, display: 'block' }}>
                <span style={{ position: 'absolute', left: 0, right: 0, top: open ? 5 : 0, height: 1.5, background: 'currentColor', transform: open ? 'rotate(45deg)' : 'none', transition: 'all .5s var(--ease-out)' }} />
                <span style={{ position: 'absolute', left: 0, right: 0, top: open ? 5 : 10, height: 1.5, background: 'currentColor', transform: open ? 'rotate(-45deg)' : 'none', transition: 'all .5s var(--ease-out)' }} />
              </span>
            </button>
          </div>
        </div>
        {FEATURES.scrollProgressLine !== false ? <div className="nav-progress" ref={progress} aria-hidden="true" /> : null}
      </header>

      <div id="mobile-menu" ref={menu} inert={!open} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--ink3)', color: 'var(--light)', visibility: 'hidden', clipPath: 'inset(0 0 100% 0)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <nav aria-label="Mobile" className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="mono dim" style={{ marginBottom: 16 }}>{NAV.mobile?.menuLabel || 'Menu'}</span>
          {MOBILE.map((n, i) => (
            <div key={n.to + i} className="sw" style={{ display: 'block' }}>
              <a href={isExternal(n.to) ? n.to : hrefFor(n.to)} {...(isExternal(n.to) ? { target: '_blank', rel: 'noopener noreferrer' } : { onClick: goMobile(n.to) })} data-m-item className="si display display-lg" style={{ display: 'flex', alignItems: 'baseline', gap: 16, minHeight: 56, width: '100%' }}>
                <span className="mono dim" style={{ fontSize: 11 }}>{String(i).padStart(2, '0')}</span>
                {n.label}
              </a>
            </div>
          ))}
          <div data-m-line style={{ height: 1, background: 'var(--signal)', margin: '28px 0', transformOrigin: 'left' }} />
          {CTA && NAV.mobile?.showCta !== false && (
            <div className="sw" style={{ display: 'block' }}>
              <a href={hrefFor(CTA.to)} data-m-item onClick={goMobile(CTA.to)} className="si btn btn-primary" style={{ display: 'inline-flex' }}>{CTA.label}</a>
            </div>
          )}
          {EXTRA.map((l) => (
            <a key={l.to} href={l.to} target="_blank" rel="noopener noreferrer" className="tlink dim" style={{ marginTop: 20 }}>{l.label} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
          ))}
        </nav>
      </div>
      <style>{`
        @media (min-width: 900px){ .nav-desktop{display:flex !important} .nav-burger{display:none !important} }
        @media (max-width: 899px){ .nav-desktop{display:none !important} .nav-burger{display:inline-flex !important} .nav-cta{display:none !important} }
        .nav-wordmark{height:26px;width:auto;overflow:visible}
        .nav-logo{transition: transform .5s var(--ease-out)}
        .nav-logo:hover .tick-f{fill: var(--signal)}
        .nav .nav-cta{min-height:44px;padding:0 20px}
        .nav[data-nav-theme="light"] .btn-primary{background:var(--ink);color:var(--light)}
        .nav[data-nav-theme="light"] .btn-primary::before{background:var(--signal-ink)}
      `}</style>
    </>
  )
}
