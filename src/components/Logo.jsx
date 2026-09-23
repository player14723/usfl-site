import { BRAND, SITE } from '../platform/config'
import { asset } from '../lib/asset'
import Wordmark from './Wordmark'

/**
 * The site logo. brand.json → logo.type "wordmark" draws the built-in USFL wordmark (it takes the text colour,
 * so it inverts with the navigation); "image" uses the uploaded file (logo.image, and logo.imageOnLight for light
 * sections if supplied).
 */
export default function Logo({ className = '', ticks = true, onLight = false, decorative = false, large = false }) {
  const L = BRAND.logo || {}
  if (L.type === 'image' && L.image) {
    const src = onLight && L.imageOnLight ? L.imageOnLight : L.image
    return <img className={large ? '' : className} src={/^https?:/.test(src) ? src : asset(src)} alt={decorative ? '' : L.alt || SITE.name} style={large ? { width: 'min(70vw, 1100px)', height: 'auto', display: 'block', objectFit: 'contain' } : { height: L.height || 26, width: 'auto', display: 'block' }} />
  }
  return <Wordmark className={className} ticks={ticks && BRAND.wordmark?.showSignalTicks !== false} title={decorative ? '' : L.alt || SITE.name} />
}
