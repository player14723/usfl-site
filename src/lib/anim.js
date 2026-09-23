import { gsap, ScrollTrigger } from './gsap'
import { TEXT, EASE, textKind } from '../platform/motion'

/**
 * Typographic entrance presets — deliberately varied so no two sections feel the same.
 * `el` is a SplitText root (words: .si / chars: .sc) or a plain element.
 * Letterforms are never scaled, rotated, re-tracked or outlined: words only travel (masked) or fade.
 * motion.json → text.reveal can replace the designed variety with one style ("rise" | "fade" | "none").
 */
export function textIn(el, kindIn = 'up', vars = {}) {
  if (!el) return null
  const kind = textKind(kindIn)
  if (kind === 'none') return null
  const words = el.querySelectorAll('.si')
  const chars = el.querySelectorAll('.sc')
  const t = words.length ? words : [el]
  const base = { duration: TEXT.duration, ease: EASE.entrance, stagger: TEXT.stagger, ...vars }
  switch (kind) {
    case 'up':
      return gsap.fromTo(t, { yPercent: 115 }, { ...base, yPercent: 0 })
    case 'down':
      return gsap.fromTo(t, { yPercent: -115 }, { ...base, yPercent: 0 })
    case 'left':
      return gsap.fromTo(t, { xPercent: -110, opacity: 0 }, { ...base, xPercent: 0, opacity: 1, stagger: base.stagger * 0.83 })
    case 'right':
      return gsap.fromTo(t, { xPercent: 110, opacity: 0 }, { ...base, xPercent: 0, opacity: 1, stagger: base.stagger * 0.83 })
    case 'scale':
      return gsap.fromTo(chars.length ? chars : t, { yPercent: 115 }, { ...base, yPercent: 0, stagger: base.stagger * 0.42 })
    case 'chars':
      return gsap.fromTo(chars.length ? chars : t, { yPercent: 120 }, { ...base, yPercent: 0, stagger: base.stagger * 0.33 })
    case 'clip':
      return gsap.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { ...base, clipPath: 'inset(0 0% 0 0)', stagger: 0 })
    case 'track':
    case 'fade':
      return gsap.fromTo(t, { opacity: 0, y: 24 }, { ...base, opacity: 1, y: 0 })
    default:
      return gsap.fromTo(t, { yPercent: 115 }, { ...base, yPercent: 0 })
  }
}

/** Hide split text before it animates (avoids a flash of un-animated content). */
export function textHide(el, kindIn = 'up') {
  if (!el) return
  const kind = textKind(kindIn)
  if (kind === 'none') return
  const words = el.querySelectorAll('.si')
  const chars = el.querySelectorAll('.sc')
  const t = words.length ? words : [el]
  switch (kind) {
    case 'up': gsap.set(t, { yPercent: 115 }); break
    case 'down': gsap.set(t, { yPercent: -115 }); break
    case 'left': gsap.set(t, { xPercent: -110, opacity: 0 }); break
    case 'right': gsap.set(t, { xPercent: 110, opacity: 0 }); break
    case 'scale': gsap.set(chars.length ? chars : t, { yPercent: 115 }); break
    case 'chars': gsap.set(chars.length ? chars : t, { yPercent: 120 }); break
    case 'clip': gsap.set(el, { clipPath: 'inset(0 100% 0 0)' }); break
    default: gsap.set(t, { opacity: 0, y: 24 })
  }
}

/** Set a ScrollTrigger-driven `data-p` (0..1) on an element — used by nav theme + transitions. */
export function trackProgress(el, st) {
  if (!el) return
  el.dataset.p = String(st.progress)
}

export const px = (n) => `${n}px`
export { gsap, ScrollTrigger }
