import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { GLOBAL_MOTION } from '../platform/motion'

gsap.registerPlugin(ScrollTrigger, useGSAP)
ScrollTrigger.config({ ignoreMobileResize: true })
gsap.defaults({ ease: 'power3.out' })

export { gsap, ScrollTrigger, useGSAP }

// the layout breakpoint is fixed at build time (vite.config.js reads src/config/theme.json), so CSS and JS always agree
// eslint-disable-next-line no-undef
const BP = typeof __LAYOUT_BREAKPOINT__ === 'number' ? __LAYOUT_BREAKPOINT__ : 900

/**
 * Media conditions used with gsap.matchMedia(). `motion` / `reduce` follow the motion system
 * (src/config/motion.json + the visitor's reduced-motion setting), not just the OS query.
 */
export const MQ = {
  motion: GLOBAL_MOTION.enabled ? 'all' : 'not all',
  reduce: GLOBAL_MOTION.enabled ? 'not all' : 'all',
  desktop: `(min-width: ${BP}px)`,
  mobile: `(max-width: ${BP - 0.02}px)`,
  fine: '(hover: hover) and (pointer: fine)',
}

export const prefersReduced = () => !GLOBAL_MOTION.enabled

export const isMobile = () => typeof window !== 'undefined' && window.matchMedia(MQ.mobile).matches

/** Refresh ScrollTrigger after layout-affecting things settle (fonts, images, route swaps). */
export function settle() {
  const go = () => ScrollTrigger.refresh()
  if (document.fonts?.ready) document.fonts.ready.then(() => requestAnimationFrame(go))
  setTimeout(go, 500)
  setTimeout(go, 1600)
}

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n))
export const lerp = (a, b, t) => a + (b - a) * t
