import { ScrollReveal } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'
import SplitText from '../components/SplitText'

/** SPLIT STATEMENT — a large statement on one side, supporting text and a link on the other. */
export default function SplitStatement({ sid = 'statement', theme = 'dark', eyebrow = '', heading = '', text = '', link = {} }) {
  const hid = `${sid}-h`
  return (
    <section data-theme={theme} className="section" aria-labelledby={heading ? hid : undefined} style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0' }}>
      <div className="wrap ss-two">
        <div>
          {eyebrow && <p className="mono" style={{ margin: '0 0 24px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
          {heading && <SplitText as="h2" id={hid} className="display display-lg ss-h" text={heading} style={{ margin: 0, maxWidth: '12ch' }} />}
        </div>
        <ScrollReveal kind="up">
          {text && <p className="lead dim" style={{ margin: '0 0 24px' }}>{text}</p>}
          {link?.label && link?.to && <TLink to={link.to} className="tlink">{link.label} <Arrow /></TLink>}
        </ScrollReveal>
      </div>
      <style>{`
        .ss-two{display:grid;gap:clamp(32px,5vw,90px);grid-template-columns:1fr;align-items:end}
        .ss-h .serif{color:var(--signal)}
        @media(min-width:900px){.ss-two{grid-template-columns:1fr 1fr}}
      `}</style>
    </section>
  )
}
