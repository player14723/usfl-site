/**
 * Runs once before the first render: applies the theme, sets the site-wide motion state and the GSAP
 * clock speed, and writes the organisation structured data.
 */
import { gsap } from '../lib/gsap'
import { applyTheme } from './theme'
import { GLOBAL_MOTION, TIME_SCALE, FEATURES } from './motion'
import { applyStructuredData } from './seo'

export function boot() {
  applyTheme()
  const html = document.documentElement
  html.classList.toggle('motion-off', !GLOBAL_MOTION.enabled)
  html.classList.toggle('no-grain', FEATURES.filmGrain === false)
  if (isFinite(TIME_SCALE) && TIME_SCALE > 0) gsap.globalTimeline.timeScale(TIME_SCALE)
  applyStructuredData()
}
