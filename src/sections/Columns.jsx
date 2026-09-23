import { itemsFrom } from '../platform/content'
import { ScrollReveal } from '../components/ui/Reveal'
import Signal from '../components/ui/Signal'

/** COLUMNS — numbered items in two to four columns. `source: "audience" | "why"` reuses a company list. */
export default function Columns({ sid = 'columns', theme = 'dark2', eyebrow = '', source = '', items: own = [], columns = 3 }) {
  const cols = Math.max(2, Math.min(4, Number(columns) || 3))
  const items = itemsFrom(source, own)
  const hid = `${sid}-h`
  return (
    <section data-theme={theme} className="section" aria-labelledby={hid} style={{ padding: 'calc(var(--section-space) * clamp(70px,9vw,150px)) 0' }}>
      <div className="wrap">
        {eyebrow && <p className="mono" style={{ margin: '0 0 clamp(28px,4vw,56px)', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
        <h2 id={hid} className="sr-only">{eyebrow || 'Details'}</h2>
        <ul className="col-list" style={{ '--cols': cols }}>
          {items.map((a, i) => (
            <li key={i}>
              <ScrollReveal kind={['left', 'up', 'right'][i % 3]}>
                <span className="mono dim">{a.n}</span>
                <h3 className="display display-sm" style={{ margin: '12px 0' }}>{a.t}</h3>
                <p className="dim" style={{ margin: 0, maxWidth: '34ch', fontSize: 15 }}>{a.d}</p>
              </ScrollReveal>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .col-list{list-style:none;margin:0;padding:0;display:grid;gap:clamp(32px,4vw,64px);grid-template-columns:1fr}
        .col-list li{border-top:var(--hair-w) solid var(--line-dark);padding-top:20px}
        [data-theme="light"] .col-list li{border-top-color:var(--line-light)}
        @media(min-width:700px){.col-list{grid-template-columns:repeat(2,1fr)}}
        @media(min-width:900px){.col-list{grid-template-columns:repeat(var(--cols),1fr)}}
      `}</style>
    </section>
  )
}
