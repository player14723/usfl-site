import Cinematic from '../components/ui/Cinematic'
import MovingImage from '../components/ui/MovingImage'
import { ScrollText } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'

/**
 * FULL-SCREEN MEDIA — a cinematic or image edge to edge, with an optional headline over a darkening scrim.
 * height: "100svh" | "80svh" | "60svh". textPosition: "bottom-left" | "center".
 */
export default function FullscreenMedia({ sid = 'media', eyebrow = '', heading = '', link = {}, cinematic = '', image = '', imageAlt, height = '100svh', textPosition = 'bottom-left', scrim = true }) {
  const hid = `${sid}-h`
  const center = textPosition === 'center'
  const scrimBg = scrim ? 'linear-gradient(0deg, color-mix(in srgb, var(--overlay) 70%, transparent), transparent 55%)' : null
  return (
    <section data-theme="dark" className="section fs-media" aria-labelledby={heading ? hid : undefined} style={{ position: 'relative', height, minHeight: 360, overflow: 'clip' }}>
      {cinematic
        ? <Cinematic id={cinematic} overlay={scrimBg} style={{ position: 'absolute', inset: 0 }} parallax={8} />
        : image ? <MovingImage name={image} alt={imageAlt} speed={10} style={{ position: 'absolute', inset: 0 }} sizes="100vw" /> : null}
      {!cinematic && scrimBg && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: scrimBg, pointerEvents: 'none' }} />}
      {(eyebrow || heading) && (
        <div className="wrap" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: center ? 'center' : 'flex-end', alignItems: center ? 'center' : 'flex-start', textAlign: center ? 'center' : 'left', paddingBottom: center ? 0 : 'clamp(40px,8vh,96px)' }}>
          {eyebrow && <p className="mono" style={{ margin: '0 0 20px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
          {heading && <ScrollText as="h2" id={hid} kind="up" className="display display-lg" text={heading} style={{ margin: 0, maxWidth: '16ch' }} />}
          {link?.label && link?.to && <TLink to={link.to} className="tlink" style={{ marginTop: 24 }}>{link.label} <Arrow /></TLink>}
        </div>
      )}
    </section>
  )
}
