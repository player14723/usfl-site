import MovingImage from '../components/ui/MovingImage'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'

/**
 * TEXT + IMAGE — an editorial block: eyebrow, headline, paragraphs and an optional link beside a moving image.
 * imageSide: "right" | "left".
 */
export default function TextImage({ sid = 'text-image', theme = 'light', eyebrow = '', heading = '', paragraphs = [], image = '', imageAlt, imageAspect = '4/5', imageSide = 'right', link = {} }) {
  const hid = `${sid}-h`
  const left = imageSide === 'left'
  return (
    <section data-theme={theme} className="section" aria-labelledby={heading ? hid : undefined} style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0', overflow: 'clip' }}>
      <div className={`wrap ti-grid ${left ? 'ti-left' : ''} ${image ? '' : 'ti-solo'}`}>
        <div>
          {eyebrow && <p className="mono" style={{ margin: '0 0 24px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
          {heading && <ScrollText as="h2" id={hid} kind="left" className="display display-md" text={heading} style={{ margin: 0, maxWidth: '22ch' }} />}
          {paragraphs.length > 0 && (
            <div style={{ marginTop: heading ? 40 : 0, display: 'grid', gap: 22 }}>
              {paragraphs.map((p, i) => (
                <ScrollReveal key={i} kind="up" delay={0.1 + i * 0.08}><p className="body-copy dim" style={{ margin: 0 }}>{p}</p></ScrollReveal>
              ))}
            </div>
          )}
          {link?.label && link?.to && <TLink to={link.to} className="tlink" style={{ marginTop: 28 }}>{link.label} <Arrow /></TLink>}
        </div>
        {image && <MovingImage name={image} alt={imageAlt} aspect={imageAspect} speed={10} reveal={left ? 'left' : 'right'} className="ti-img" sizes="(min-width:900px) 38vw, 92vw" />}
      </div>
      <style>{`
        .ti-grid{display:grid;gap:clamp(32px,6vw,100px);grid-template-columns:1fr;align-items:end}
        .ti-img{width:100%;max-width:500px;justify-self:end}
        @media(min-width:900px){
          .ti-grid{grid-template-columns:1.2fr .8fr}
          .ti-left{grid-template-columns:.8fr 1.2fr}
          .ti-left .ti-img{grid-row:1;grid-column:1;justify-self:start}
          .ti-solo{grid-template-columns:minmax(0,1fr)}
        }
      `}</style>
    </section>
  )
}
