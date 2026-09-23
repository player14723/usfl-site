/**
 * Media library — src/config/media.json.
 *
 * Images are referenced by file path ("/images/cap-growth.webp", "/images/uploads/team.jpg", or a full https:// URL).
 * If that path (or a library name such as "cap-growth") is in the media library (media.json → images), the
 * library supplies the small-screen file, alt text, focal point, fit, caption and the "Illustrative" tag.
 * Any other path is used as-is.
 * A name that is not in the library falls back to /images/<name>.webp (+ -sm.webp), which is how the
 * original site's files are named. A missing / empty reference renders nothing, never a broken image.
 *
 * Cinematics (videos and still-image camera moves) are referenced by id ("hero-plunge").
 */
import { MEDIA } from './config'
import { asset } from '../lib/asset'

// the library is stored as lists (editor-friendly); index it by name, by file path and by id
const IMAGES = new Map()
for (const im of Array.isArray(MEDIA.images) ? MEDIA.images : Object.entries(MEDIA.images || {}).map(([name, v]) => ({ name, ...v }))) {
  if (!im) continue
  if (im.name) IMAGES.set(im.name, im)
  if (im.src) IMAGES.set(im.src, im)
}
const CINEMATICS = new Map(
  (Array.isArray(MEDIA.cinematics) ? MEDIA.cinematics : Object.entries(MEDIA.cinematics || {}).map(([id, v]) => ({ id, ...v }))).filter((c) => c && c.id).map((c) => [c.id, c]),
)
export const cinematicIds = () => [...CINEMATICS.keys()]

const isPath = (ref) => /^(\/|https?:|data:|blob:)/.test(ref) || /\.[a-z0-9]{2,5}$/i.test(ref)
const url = (p) => (!p ? '' : /^(https?:|data:|blob:)/.test(p) ? p : asset(p))

/** → { src, srcSet, width, alt, position, fit, illustrative, caption } or null */
export function resolveImage(ref) {
  if (!ref || typeof ref !== 'string') return null
  const entry = IMAGES.get(ref)
  if (entry) {
    const src = url(entry.src || `/images/${ref}.webp`)
    const w = Number(entry.width) || 1800
    const small = entry.srcSmall ? url(entry.srcSmall) : ''
    return {
      src,
      srcSet: small ? `${small} ${Math.round(w / 2)}w, ${src} ${w}w` : undefined,
      width: w,
      alt: entry.alt || '',
      position: entry.position || '50% 50%',
      fit: entry.fit || 'cover',
      illustrative: Boolean(entry.illustrative),
      caption: entry.caption || '',
    }
  }
  if (isPath(ref)) return { src: url(ref), srcSet: undefined, width: 1800, alt: '', position: '50% 50%', fit: 'cover', illustrative: false, caption: '' }
  // legacy naming convention: /images/<name>.webp with a half-width -sm twin
  return {
    src: url(`/images/${ref}.webp`),
    srcSet: `${url(`/images/${ref}-sm.webp`)} 900w, ${url(`/images/${ref}.webp`)} 1800w`,
    width: 1800, alt: '', position: '50% 50%', fit: 'cover', illustrative: false, caption: '',
  }
}

const CIN_DEFAULTS = {
  enabled: true, type: 'video', label: '', src: '', webm: '', mobileSrc: '', mobileWebm: '', poster: '', posterReducedMotion: '',
  sourceImage: '', playback: 'loop', muted: true, playbackRate: 1, position: '50% 50%', fit: 'cover', overlay: 1, still: null,
}

/** → a normalised cinematic, or null when the id is empty, unknown, or switched off. */
export function resolveCinematic(id) {
  if (!id) return null
  const raw = typeof id === 'object' ? id : CINEMATICS.get(id)
  if (!raw) {
    if (import.meta.env.DEV) console.warn(`[media] cinematic "${id}" is not in src/config/media.json`)
    return null
  }
  const c = { ...CIN_DEFAULTS, ...raw }
  if (c.enabled === false) return { ...c, disabled: true, poster: url(c.poster || c.sourceImage) }
  return {
    ...c,
    src: url(c.src), webm: url(c.webm), mobileSrc: url(c.mobileSrc), mobileWebm: url(c.mobileWebm),
    poster: url(c.poster || c.sourceImage), posterReducedMotion: url(c.posterReducedMotion), sourceImage: url(c.sourceImage),
  }
}
