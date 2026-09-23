// Tracks which colour world sits under the navigation, so the nav can invert smoothly.
// Zones are any element with [data-theme]; scrubbed transitions carry data-theme-from/-to + data-p (0..1).
let current = null
const subs = new Set()

export function subscribeTheme(fn) {
  subs.add(fn)
  if (current) fn(current)
  return () => subs.delete(fn)
}

function themeOf(el) {
  const from = el.dataset.themeFrom
  if (from) {
    const p = parseFloat(el.dataset.p || '0')
    return p > parseFloat(el.dataset.flip || '0.5') ? el.dataset.themeTo : from
  }
  const t = el.dataset.theme
  return t === 'light' ? 'light' : 'dark'
}

export function measureTheme(y = 38) {
  const zones = document.querySelectorAll('[data-theme],[data-theme-from]')
  let found = null
  for (const el of zones) {
    const r = el.getBoundingClientRect()
    if (r.top <= y && r.bottom > y) found = el
  }
  const t = found ? themeOf(found) : 'dark'
  if (t !== current) {
    current = t
    subs.forEach((fn) => fn(t))
  }
}
