import { createElement, useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../../lib/gsap'
import { textHide, textIn } from '../../lib/anim'
import { useMotion, blockKind, BLOCKS, TEXT, EASE } from '../../platform/motion'
import SplitText from '../SplitText'

const D = 64 // designed travel distance (px) at intensity 1
const from = (kind, dist) => ({
  up: { y: dist(D), opacity: 0 },
  down: { y: -dist(D), opacity: 0 },
  left: { x: -dist(D * 1.4), opacity: 0 },
  right: { x: dist(D * 1.4), opacity: 0 },
  mask: { clipPath: 'inset(100% 0% 0% 0%)', y: dist(40) },
  maskr: { clipPath: 'inset(0% 100% 0% 0%)' },
  maskl: { clipPath: 'inset(0% 0% 0% 100%)' },
  scale: { y: dist(40), opacity: 0 },
  fade: { opacity: 0 },
}[kind] || { y: dist(D), opacity: 0 })
const TO = { y: 0, x: 0, opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' }

/** Generic scroll-triggered entrance for a block (or its children when `stagger` is set). */
export function ScrollReveal({ as = 'div', kind = 'up', delay = 0, duration, start, stagger = 0, className = '', children, ease, ...rest }) {
  const ref = useRef(null)
  const m = useMotion()
  const k = blockKind(kind)
  useGSAP(
    () => {
      if (!m.enabled || k === 'none') return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const el = ref.current
        if (!el) return
        const targets = stagger ? Array.from(el.children) : el
        const scale = (BLOCKS.distance || D) / D
        gsap.set(targets, from(k, (x) => m.dist(x) * scale))
        const st = ScrollTrigger.create({
          trigger: el,
          start: start || BLOCKS.triggerPoint,
          once: true,
          onEnter: () => gsap.to(targets, { ...TO, duration: m.dur(duration ?? BLOCKS.duration), delay, stagger: m.stagger(stagger), ease: ease || EASE.entrance, ...(k.startsWith('mask') ? { clearProps: 'clipPath' } : {}) }),
        })
        return () => st.kill()
      })
    },
    { scope: ref },
  )
  return createElement(as, { ref, className, ...rest }, children)
}

/** Masked, split-word headline that plays a chosen typographic entrance when it scrolls into view. */
export function ScrollText({ text, as = 'h2', kind = 'up', by = 'words', className = '', start, delay = 0, ...rest }) {
  const ref = useRef(null)
  const m = useMotion()
  useGSAP(
    () => {
      if (!m.enabled) return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const el = ref.current
        if (!el) return
        textHide(el, kind)
        const st = ScrollTrigger.create({ trigger: el, start: start || TEXT.triggerPoint, once: true, onEnter: () => textIn(el, kind, { delay, duration: m.dur(TEXT.duration), stagger: m.stagger(TEXT.stagger) }) })
        return () => st.kill()
      })
    },
    { scope: ref },
  )
  return <SplitText ref={ref} as={as} by={by} text={text} className={className} {...rest} />
}
