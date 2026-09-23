import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'

/**
 * RICH TEXT — a heading with paragraphs, sub-headings and bullet lists, set at a comfortable reading measure.
 * blocks: [{ type: "paragraph" | "heading" | "list" | "quote", text, items }]
 */
export default function RichText({ sid = 'text', theme = 'light', eyebrow = '', heading = '', blocks = [], link = {} }) {
  const hid = `${sid}-h`
  return (
    <section data-theme={theme} className="section" aria-labelledby={heading ? hid : undefined} style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,160px)) 0' }}>
      <div className="wrap rt-grid">
        <div>
          {eyebrow && <p className="mono" style={{ margin: '0 0 24px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
          {heading && <ScrollText as="h2" id={hid} kind="up" className="display display-md" text={heading} style={{ margin: 0, maxWidth: '20ch' }} />}
        </div>
        <div className="rt-body">
          {blocks.map((b, i) => (
            <ScrollReveal key={i} kind="up" delay={Math.min(i, 4) * 0.05}>
              {b.type === 'heading' ? <h3 className="display display-sm" style={{ margin: '12px 0 0' }}>{b.text}</h3>
                : b.type === 'list' ? <ul className="rt-list">{(b.items || []).map((x, j) => <li key={j}>{x}</li>)}</ul>
                  : b.type === 'quote' ? <blockquote className="rt-quote serif">{b.text}</blockquote>
                    : <p className="body-copy" style={{ margin: 0 }}>{b.text}</p>}
            </ScrollReveal>
          ))}
          {link?.label && link?.to && <TLink to={link.to} className="tlink">{link.label} <Arrow /></TLink>}
        </div>
      </div>
      <style>{`
        .rt-grid{display:grid;gap:clamp(32px,5vw,90px);grid-template-columns:1fr}
        .rt-body{display:grid;gap:22px;max-width:var(--copy-max)}
        .rt-list{margin:0;padding-left:1.2em;display:grid;gap:10px;font-size:var(--copy-size);line-height:var(--copy-lh)}
        .rt-quote{margin:12px 0;font-size:clamp(1.6rem,3vw,2.8rem);line-height:1.1;max-width:24ch}
        @media(min-width:900px){.rt-grid{grid-template-columns:.9fr 1.1fr}}
      `}</style>
    </section>
  )
}
