import Cinematic from '../components/ui/Cinematic'
import MovingImage from '../components/ui/MovingImage'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'

/**
 * VIDEO / IMAGE FEATURE — a cinematic (or an image) in an editorial frame beside a headline and text.
 * mediaSide: "left" | "right" | "full" (media full width above the text). reveal: "up" | "left" | "right" | "down" | "none".
 * If the cinematic is missing or switched off, the image (or the cinematic's poster) is shown instead.
 */
export default function VideoFeature({ sid = 'feature', theme = 'dark', eyebrow = '', heading = '', text = '', link = {}, cinematic = '', image = '', imageAlt, aspect = '16/9', mediaSide = 'right', reveal = 'up' }) {
  const hid = `${sid}-h`
  const full = mediaSide === 'full'
  const media = cinematic
    ? <Cinematic id={cinematic} className="vf-media" style={{ aspectRatio: aspect, width: '100%' }} revealDirection={reveal} parallax={full ? 6 : 0} />
    : image ? <MovingImage name={image} alt={imageAlt} aspect={aspect} speed={8} reveal={reveal} className="vf-media" sizes={full ? '100vw' : '(min-width:900px) 58vw, 94vw'} /> : null
  return (
    <section data-theme={theme} className="section" aria-labelledby={heading ? hid : undefined} style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0', overflow: 'clip' }}>
      <div className={`wrap vf-grid vf-${mediaSide}`}>
        <div className="vf-copy">
          {eyebrow && <p className="mono" style={{ margin: '0 0 24px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
          {heading && <ScrollText as="h2" id={hid} kind="left" className="display display-md" text={heading} style={{ margin: 0, maxWidth: '18ch' }} />}
          {text && <ScrollReveal kind="up" delay={0.15}><p className="lead dim" style={{ margin: '28px 0 0' }}>{text}</p></ScrollReveal>}
          {link?.label && link?.to && <TLink to={link.to} className="tlink" style={{ marginTop: 24 }}>{link.label} <Arrow /></TLink>}
        </div>
        {media}
      </div>
      <style>{`
        .vf-grid{display:grid;gap:clamp(28px,5vw,80px);grid-template-columns:1fr;align-items:end}
        .vf-media{border-radius:var(--radius-media);overflow:hidden}
        .vf-full .vf-media{grid-row:1}
        @media(min-width:900px){
          .vf-right{grid-template-columns:.8fr 1.2fr}
          .vf-left{grid-template-columns:1.2fr .8fr}
          .vf-left .vf-media{grid-row:1;grid-column:1}
        }
      `}</style>
    </section>
  )
}
