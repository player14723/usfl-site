import { useRef } from 'react'
import { gsap, useGSAP, MQ } from '../lib/gsap'
import { CASES, caseUrl } from '../platform/content'
import { feature } from '../platform/motion'
import MovingImage from '../components/ui/MovingImage'
import { ScrollReveal } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'

const RATIOS = ['16/10', '4/5', '5/4']

function Row({ c, i, linkLabel, showCapabilities, mapsToLabel }) {
  const root = useRef(null)
  const flip = i % 2 === 1
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add({ fine: MQ.fine, motion: MQ.motion }, (ctx) => {
        if (!ctx.conditions.fine || !ctx.conditions.motion || !feature('hoverTilt')) return
        // only the picture answers the pointer; the title stays anchored to the grid
        const el = root.current
        const img = el.querySelector('.wk-media')
        const ix = gsap.quickTo(img, 'x', { duration: 1.2, ease: 'power3.out' })
        const move = (e) => { const r = el.getBoundingClientRect(); const p = (e.clientX - r.left) / r.width - 0.5; ix(p * -18) }
        const leave = () => ix(0)
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave)
        return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) }
      })
    },
    { scope: root },
  )
  const meta = [...c.meta.slice(0, 3), ...(showCapabilities && c.mapsTo.length ? [[mapsToLabel, c.mapsTo.join(' · ')]] : [])]
  return (
    <article ref={root} className={`wk-row ${flip ? 'flip' : ''}`}>
      <TLink to={caseUrl(c.slug)} shared className="wk-link" aria-label={`${c.title} — ${linkLabel.toLowerCase()}`}>
        <div className="wk-media">
          <MovingImage name={c.image} alt={c.imageAlt} aspect={RATIOS[i % 3]} speed={9} reveal={flip ? 'left' : 'right'} shared sizes="(min-width:900px) 58vw, 94vw" />
        </div>
      </TLink>
      <div className="wk-copy">
        <span className="mono dim">{c.n} — {c.kicker}</span>
        <h2 className="display wk-title" style={{ margin: 0 }}>
          <TLink to={caseUrl(c.slug)}>{c.display.join(' ')}</TLink>
        </h2>
        <ScrollReveal kind="up" delay={0.1}>
          <p className="dim body-copy" style={{ margin: '0 0 20px', fontSize: 16 }}>{c.summary}</p>
          <ul className="wk-meta">{meta.map(([k, v]) => (<li key={k}><span className="mono dim">{k}</span><span>{v}</span></li>))}</ul>
          <TLink to={caseUrl(c.slug)} className="tlink" style={{ marginTop: 22 }}>{linkLabel} <Arrow /></TLink>
        </ScrollReveal>
      </div>
    </article>
  )
}

/** Every visible case study, in the order set on each case study (content/cases/*.json → order). */
export default function CaseList({ theme = 'light', note = '', linkLabel = 'View case study', showCapabilities = true, mapsToLabel = 'Maps to' }) {
  return (
    <section data-theme={theme} className="section" aria-label="Case studies" style={{ padding: 'calc(var(--section-space) * clamp(60px,8vw,140px)) 0 calc(var(--section-space) * clamp(80px,10vw,180px))' }}>
      <div className="wrap wk-list">
        {CASES.map((c, i) => (<Row key={c.slug} c={c} i={i} linkLabel={linkLabel} showCapabilities={showCapabilities} mapsToLabel={mapsToLabel} />))}
      </div>
      {note && (
        <div className="wrap" style={{ marginTop: 'clamp(56px,8vw,120px)' }}>
          <p className="mono dim" style={{ margin: 0, maxWidth: '60ch', textTransform: 'none', letterSpacing: '.02em', fontSize: '.8rem' }}>{note}</p>
        </div>
      )}
      <style>{`
        .wk-list{display:grid;gap:clamp(72px,11vw,200px)}
        .wk-row{display:grid;gap:clamp(24px,4vw,56px);align-items:end;grid-template-columns:1fr}
        .wk-link{display:block}
        .wk-title{font-size:clamp(2.1rem,4.6vw,5.2rem);letter-spacing:-.04em;line-height:.95;text-wrap:balance}
        .wk-copy{display:flex;flex-direction:column;gap:18px;min-width:0}
        .wk-meta{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:15px}
        .wk-meta li{display:grid;grid-template-columns:110px 1fr;gap:12px;border-top:var(--hair-w) solid var(--line-light);padding-top:10px}
        [data-theme="dark"] .wk-meta li,[data-theme="dark2"] .wk-meta li{border-top-color:var(--line-dark)}
        @media(min-width:900px){
          .wk-row{grid-template-columns:repeat(12,1fr)}
          .wk-row .wk-link{grid-column:1/8}.wk-row .wk-copy{grid-column:8/13}
          .wk-row.flip .wk-link{grid-column:6/13;grid-row:1}.wk-row.flip .wk-copy{grid-column:1/6;grid-row:1}
          .wk-row:first-child .wk-link{grid-column:1/9}.wk-row:first-child .wk-copy{grid-column:9/13}
          .wk-title{margin-left:-6vw;position:relative;z-index:2}.wk-row.flip .wk-title{margin-left:0;margin-right:-6vw}
        }
        @media(max-width:899px){.wk-title{margin-top:-.2em}}
      `}</style>
    </section>
  )
}
