import { useParams } from 'react-router-dom'
import { useSeo } from '../platform/seo'
import { CAPABILITIES, casesForCapability, insightBySlug, caseUrl, capabilityUrl, insightUrl } from '../platform/content'
import PageHero from '../components/PageHero'
import NextBlock from '../components/NextBlock'
import SectionTransition from '../components/ui/SectionTransition'
import SystemLine from '../components/ui/SystemLine'
import MovingImage from '../components/ui/MovingImage'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'
import FinalCTA from '../sections/FinalCTA'
import NotFound from './NotFound'

export default function CapabilityDetail() {
  const { slug } = useParams()
  const i = CAPABILITIES.findIndex((c) => c.slug === slug)
  const cap = CAPABILITIES[i]
  useSeo(cap ? { title: cap.seo?.title || cap.name, description: cap.seo?.description || cap.short, image: cap.seo?.image, path: capabilityUrl(cap.slug) } : { title: 'Not found', robots: 'noindex' }, [slug])
  if (!cap) return <NotFound />
  const next = CAPABILITIES.length > 1 ? CAPABILITIES[(i + 1) % CAPABILITIES.length] : null
  const cases = casesForCapability(cap.slug)
  const insights = cap.insights.map(insightBySlug).filter(Boolean)
  return (
    <div key={cap.slug}>
      <PageHero eyebrow={`Capability`} index={`${cap.n} / ${String(CAPABILITIES.length).padStart(2, '0')}`} lines={[cap.name + '.']} intro={cap.short} image={cap.image} imageAlt={cap.imageAlt} imageAspect="4/5" size="display-xl" kinds={['chars']} />
      <SectionTransition from="dark" to="light" type="rise" height="180vh" kicker={cap.name} lines={cap.statement} />
      <section data-theme="light" className="section" aria-labelledby="cd-h" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0' }}>
        <div className="wrap cd-grid">
          <div>
            <p className="mono" style={{ margin: '0 0 24px', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> In practice</p>
            <ScrollText as="h2" id="cd-h" kind="left" className="display display-md" text={cap.intro} style={{ margin: 0, maxWidth: '24ch' }} />
          </div>
          <div className="cd-body">
            {cap.body.map((b, k) => (<ScrollReveal key={k} kind="up" delay={k * 0.08}><p className="body-copy" style={{ margin: '0 0 24px' }}>{b}</p></ScrollReveal>))}
            <ul className="cd-services" aria-label="Services">
              {cap.services.map((s) => (<li key={s}>{s}</li>))}
            </ul>
          </div>
        </div>
      </section>
      <section data-theme="dark" className="section" aria-labelledby="cd-p" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0' }}>
        <div className="wrap">
          <p className="mono" style={{ margin: '0 0 clamp(28px,4vw,56px)', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> How we work</p>
          <h2 id="cd-p" className="sr-only">Principles</h2>
          <ol className="cd-pr">
            <SystemLine orientation="h" style={{ top: 0 }} className="cd-line" />
            {cap.principles.map(([t, d], k) => (
              <li key={t}>
                <ScrollReveal kind={['left', 'up', 'right'][k % 3]} duration={1.2}>
                  <span className="display outline cd-n" aria-hidden="true">0{k + 1}</span>
                  <h3 className="display display-sm" style={{ margin: '16px 0 12px' }}>{t}</h3>
                  <p className="dim" style={{ margin: 0, maxWidth: '34ch' }}>{d}</p>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {(cases.length > 0 || insights.length > 0) && (
        <section data-theme="dark2" className="section" aria-labelledby="cd-r" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,160px)) 0' }}>
          <div className="wrap">
            <p className="mono" style={{ margin: '0 0 clamp(28px,4vw,56px)', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> Related</p>
            <h2 id="cd-r" className="sr-only">Related work and insights</h2>
            <div className="cd-rel">
              {cases.map((c) => (
                <TLink key={c.slug} to={caseUrl(c.slug)} shared className="cd-card" aria-label={`${c.title} — view case study`}>
                  <MovingImage name={c.image} alt={c.imageAlt} aspect="16/10" speed={7} shared sizes="(min-width:900px) 40vw, 94vw" />
                  <span className="mono dim" style={{ display: 'block', marginTop: 16 }}>Case study — {c.kicker}</span>
                  <span className="display display-sm" style={{ display: 'block', marginTop: 8, maxWidth: '28ch' }}>{c.title}</span>
                  <span className="tlink" style={{ marginTop: 10 }}>View <Arrow /></span>
                </TLink>
              ))}
              {insights.map((a) => (
                <TLink key={a.slug} to={insightUrl(a.slug)} className="cd-card" aria-label={`${a.title} — read insight`}>
                  <MovingImage name={a.image} alt={a.imageAlt} aspect="16/10" speed={7} sizes="(min-width:900px) 40vw, 94vw" />
                  <span className="mono dim" style={{ display: 'block', marginTop: 16 }}>Insight — {a.category}</span>
                  <span className="display display-sm" style={{ display: 'block', marginTop: 8, maxWidth: '28ch' }}>{a.title}</span>
                  <span className="tlink" style={{ marginTop: 10 }}>Read <Arrow /></span>
                </TLink>
              ))}
            </div>
          </div>
        </section>
      )}
      {next && <NextBlock label="Next capability" title={next.name} to={capabilityUrl(next.slug)} sub={next.short} />}
      <FinalCTA />
      <style>{`
        .cd-grid{display:grid;gap:clamp(32px,5vw,90px);grid-template-columns:1fr}
        @media(min-width:900px){.cd-grid{grid-template-columns:1.1fr .9fr}}
        .cd-services{list-style:none;margin:36px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
        .cd-services li{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;border:1px solid color-mix(in srgb, var(--line-light-base) 22%, transparent);padding:8px 14px;border-radius:99px}
        .cd-pr{list-style:none;margin:0;padding:clamp(32px,4vw,56px) 0 0;position:relative;display:grid;gap:clamp(40px,5vw,72px);grid-template-columns:1fr}
        @media(min-width:900px){.cd-pr{grid-template-columns:repeat(3,1fr)}}
        .cd-n{font-size:clamp(4rem,9vw,9rem);line-height:.8;color:var(--faint-on-dark);display:block}
        .cd-rel{display:grid;gap:clamp(40px,5vw,72px);grid-template-columns:1fr}
        @media(min-width:900px){.cd-rel{grid-template-columns:1fr 1fr}}
        .cd-card{display:block}
      `}</style>
    </div>
  )
}
