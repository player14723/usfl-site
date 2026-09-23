/**
 * Motion system — reads src/config/motion.json.
 *
 *  preset      none | subtle | standard | cinematic | dramatic   (standard = the site as designed)
 *  speed       global duration multiplier on top of the preset (1 = as designed, 1.5 = 50% slower)
 *  intensity   global distance multiplier on top of the preset (0.5 = half the travel)
 *
 * Sections can override the preset for themselves (`"motion": "subtle"` etc. in a page file) — the
 * override flows to everything inside that section through <MotionScope>.
 *
 * "Static" (motion off) happens when: the preset is `none`, a section sets `"motion": "none"`, or the
 * visitor's device asks for reduced motion and `respectReducedMotion` is true. Static layouts are styled
 * by `.motion-off` rules (on <html> for the whole site, or on a section wrapper for one section).
 */
import { createContext, createElement, useContext } from 'react'
import { MOTION } from './config'

const PRESETS = {
  none: { enabled: false, duration: 1, distance: 0, parallax: 0, stagger: 1 },
  subtle: { enabled: true, duration: 0.85, distance: 0.5, parallax: 0.5, stagger: 0.8 },
  standard: { enabled: true, duration: 1, distance: 1, parallax: 1, stagger: 1 },
  cinematic: { enabled: true, duration: 1.3, distance: 1.1, parallax: 1.25, stagger: 1.2 },
  dramatic: { enabled: true, duration: 1.15, distance: 1.6, parallax: 1.7, stagger: 1.1 },
  ...(MOTION.presets || {}),
}
export const PRESET_NAMES = Object.keys(PRESETS)

const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d)
const SPEED = Math.max(0.2, num(MOTION.speed, 1))
const INTENSITY = Math.max(0, num(MOTION.intensity, 1))
const RESPECT = MOTION.respectReducedMotion !== false

const systemReduce = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const TEXT = { reveal: 'as-designed', duration: 1.1, stagger: 0.06, triggerPoint: 'top 86%', ...(MOTION.text || {}) }
export const BLOCKS = { reveal: 'as-designed', duration: 1.1, distance: 64, triggerPoint: 'top 88%', ...(MOTION.blocks || {}) }
export const IMAGES = { reveal: 'as-designed', revealDuration: 1.5, parallax: 1, revealScaleFrom: 1.18, triggerPoint: 'top 86%', ...(MOTION.images || {}) }
export const SCENES = { scrollLength: 1, ...(MOTION.scenes || {}) }
export const EASE = { entrance: 'expo.out', inOut: 'expo.inOut', ...(MOTION.easing || {}) }
export const FEATURES = {
  introSplash: true, pageTransitions: true, sharedImageTransitions: true, sectionTransitions: 'as-designed',
  customCursor: true, magneticButtons: true, hoverTilt: true, filmGrain: true, scrollProgressLine: true, navigationAutoTheme: true,
  ...(MOTION.features || {}),
}

function resolve(name) {
  const p = PRESETS[name] || PRESETS.standard
  const globalOff = !(PRESETS[MOTION.preset] || PRESETS.standard).enabled || (RESPECT && systemReduce())
  const enabled = p.enabled !== false && !globalOff
  return {
    name: PRESETS[name] ? name : 'standard',
    enabled,
    dur: (x) => x * (p.duration ?? 1),
    dist: (x) => x * (p.distance ?? 1) * INTENSITY,
    parallax: (x) => x * (p.parallax ?? 1) * INTENSITY * num(IMAGES.parallax, 1),
    stagger: (x) => x * (p.stagger ?? 1),
  }
}

/** The site-wide motion state (what every component sees unless a section overrides it). */
export const GLOBAL_MOTION = resolve(MOTION.preset || 'standard')
/** Global duration multiplier applied to GSAP's clock in platform/boot.js. */
export const TIME_SCALE = 1 / ((PRESETS[MOTION.preset]?.duration ?? 1) * SPEED)
export const motionOn = () => GLOBAL_MOTION.enabled
/** A motion feature (cursor, magnetic buttons…) is on only when motion itself is on. */
export const feature = (name) => GLOBAL_MOTION.enabled && FEATURES[name] !== false && FEATURES[name] !== 'off'

const Ctx = createContext(GLOBAL_MOTION)
export const useMotion = () => useContext(Ctx)

/** Wrap part of a page to give it its own preset ("inherit" keeps the surrounding one). */
export function MotionScope({ preset, children }) {
  const parent = useContext(Ctx)
  if (!preset || preset === 'inherit' || preset === parent.name) return children
  const own = resolve(preset)
  // a section can calm itself down, but cannot switch motion back on when the site (or the visitor) turned it off
  const value = parent.enabled ? own : { ...own, enabled: false }
  return createElement(Ctx.Provider, { value }, children)
}

/** Maps a designed reveal onto the configured text / block style. */
export function textKind(kind) {
  if (TEXT.reveal === 'rise') return 'up'
  if (TEXT.reveal === 'fade') return 'fade'
  if (TEXT.reveal === 'none') return 'none'
  return kind
}
export function blockKind(kind) {
  if (BLOCKS.reveal === 'rise') return 'up'
  if (BLOCKS.reveal === 'fade') return 'fade'
  if (BLOCKS.reveal === 'none') return 'none'
  return kind
}
