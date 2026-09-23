import { INSIGHTS, insightUrl } from '../platform/content'
import MovingImage from '../components/ui/MovingImage'
import { ScrollReveal } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'

function Card({ a, i, big, linkLabel, readLabel }) {
  return (
    <ScrollReveal as="article" kind={big ? 'up' : i % 2 ? 'right' : 'left'} className={`in-art ${big ? 'big' : ''}`}>
      <TLink to={insightUrl(a.slug)} className="in-link" aria-label={`${a.title} — ${linkLabel.toLowerCase()}`}>
        <MovingImage name={a.image} alt={a.imageAlt} aspect={big ? '16/9' : '4/3'} speed={8} sizes={big ? '(min-width:900px) 60vw, 94vw' : '(min-width:900px) 40vw, 94vw'} />
        <span className="mono dim" style={{ display: 'flex', gap: 14, marginTop: 20 }}><span>{a.category}</span>{a.read !== '' && <span>{a.read} {readLabel}</span>}</span>
        <h2 className={`display ${big ? 'display-md' : 'display-sm'}`} style={{ margin: '12px 0 0', maxWidth: big ? '22ch' : '24ch' }}>{a.title}</h2>
        <p className="dim" style={{ margin: '14px 0 0', maxWidth: '52ch', fontSize: 16 }}>{a.dek}</p>
        <span className="tlink" style={{ marginTop: 14 }}>{linkLabel} <Arrow /></span>
      </TLink>
    </ScrollReveal>
  )
}

/** Every visible insight: the first large, the rest in two columns (content/insights/*.json → order). */
export default function InsightList({ theme = 'light', linkLabel = 'Read insight', readLabel = 'min read' }) {
  const [first, ...rest] = INSIGHTS
  if (!first) return null
  return (
    <section data-theme={theme} className="section" aria-label="Articles" style={{ padding: 'calc(var(--section-space) * clamp(60px,8vw,140px)) 0 calc(var(--section-space) * clamp(80px,10vw,170px))' }}>
      <div className="wrap in-wrap">
        <Card a={first} i={0} big linkLabel={linkLabel} readLabel={readLabel} />
        {rest.length > 0 && <div className="in-rest">{rest.map((a, i) => (<Card key={a.slug} a={a} i={i + 1} linkLabel={linkLabel} readLabel={readLabel} />))}</div>}
      </div>
      <style>{`
        .in-wrap{display:grid;gap:clamp(56px,8vw,130px)}
        .in-rest{display:grid;gap:clamp(48px,6vw,90px);grid-template-columns:1fr}
        .in-link{display:block}
        @media(min-width:900px){.in-rest{grid-template-columns:1fr 1fr;align-items:start}.in-rest .in-art:nth-child(2){margin-top:clamp(40px,8vw,140px)}.in-art.big .in-link{display:grid;grid-template-columns:1.5fr 1fr;column-gap:clamp(24px,4vw,64px);align-items:end}.in-art.big .in-link>.frame{grid-row:1/6}}
      `}</style>
    </section>
  )
}
