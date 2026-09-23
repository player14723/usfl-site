import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { CASES, caseUrl } from '../platform/content'
import { SITE } from '../platform/config'
import CaseStudyHero from './CaseStudyHero'
import NextBlock from './NextBlock'
import MagneticButton from './ui/MagneticButton'
import SectionTransition from './ui/SectionTransition'
import SystemLine from './ui/SystemLine'
import MovingImage from './ui/MovingImage'
import Cinematic from './ui/Cinematic'
import { ScrollReveal, ScrollText } from './ui/Reveal'
import TLink from './ui/TLink'
import Arrow from './ui/Arrow'
import Signal from './ui/Signal'

const Label = ({ children, n }) => (
  <p className="mono" style={{ margin: '0 0 clamp(20px,3vw,36px)', display: 'flex', alignItems: 'center', gap: 10 }}><Signal />{n && <span className="dim">{n}</span>}<span>{children}</span></p>
)

/** Overview — light world. Context as a large statement; the facts of the engagement beside it. */
function Overview({ c }) {
  return (
    <section data-theme="light" className="section" aria-labelledby="ov-h" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0' }}>
      <div className="wrap cs-two">
        <div><Label n="01">Context</Label></div>
        <div>
          <ScrollText as="h2" id="ov-h" kind="up" className="display display-md" text={c.context} style={{ margin: 0, maxWidth: '26ch' }} />
          <ScrollReveal kind="up" delay={0.15} style={{ marginTop: 40 }}>
            <p className="dim body-copy" style={{ margin: 0 }}>{c.summary}</p>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

/** Challenge + approach — dark world, with a signal line connecting the steps. */
function Approach({ c }) {
  return (
    <section data-theme="dark" className="section" aria-labelledby="ch-h" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0 calc(var(--section-space) * clamp(60px,8vw,120px))' }}>
      <div className="wrap">
        <div className="cs-two">
          <div><Label n="02">The challenge</Label></div>
          <div>
            <ScrollText as="h2" id="ch-h" kind="left" className="display display-md" text={c.challenge.lead} style={{ margin: 0, maxWidth: '24ch' }} />
            <ScrollReveal kind="up" delay={0.15} style={{ marginTop: 32 }}>
              <p className="dim body-copy" style={{ margin: 0 }}>{c.challenge.body}</p>
            </ScrollReveal>
          </div>
        </div>
        {c.objectives && (
          <div className="cs-two" style={{ marginTop: 'clamp(56px,8vw,120px)' }}>
            <div><Label n="03">Objectives</Label></div>
            <ul className="cs-obj">
              {c.objectives.map((o, i) => (
                <li key={o}><ScrollReveal kind={i % 2 ? 'right' : 'left'}><span className="mono dim">0{i + 1}</span><p className="display display-sm" style={{ margin: '10px 0 0' }}>{o}</p></ScrollReveal></li>
              ))}
            </ul>
          </div>
        )}
        <div className="cs-two" style={{ marginTop: 'clamp(64px,9vw,150px)' }}>
          <div><Label n={c.objectives ? '04' : '03'}>Approach</Label></div>
          <ol className="cs-steps">
            <SystemLine orientation="v" style={{ left: 0 }} />
            {c.approach.map((a, i) => (
              <li key={a.t}>
                <ScrollReveal kind="up" duration={1.2}>
                  <span className="mono dim">Step 0{i + 1}</span>
                  <h3 className="display display-sm" style={{ margin: '10px 0 12px' }}>{a.t}</h3>
                  <p className="dim body-copy" style={{ margin: 0 }}>{a.d}</p>
                </ScrollReveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/** Variant scenes — each case gets its own centre of gravity. */
function Journey({ c }) {
  const lanes = ['Customer', 'Employee', 'Intermediary', 'System']
  return (
    <section data-theme="dark2" className="section" aria-labelledby="jr-h" style={{ padding: 'calc(var(--section-space) * clamp(70px,9vw,150px)) 0' }}>
      <div className="wrap">
        <div className="cs-two" style={{ marginBottom: 'clamp(36px,5vw,72px)' }}>
          <div><Label n="04">The journey, mapped</Label></div>
          <ScrollText as="h2" id="jr-h" kind="clip" className="display display-md" text="One journey. Four perspectives." style={{ margin: 0, maxWidth: '18ch' }} />
        </div>
        {c.cinematic ? <Cinematic id={c.cinematic} revealDirection="left" style={{ aspectRatio: '16/9', width: '100%' }} /> : <MovingImage name={c.imageB} alt={c.imageAlt} aspect="16/9" speed={6} reveal="left" sizes="100vw" />}
        <ul className="cs-lanes" aria-label="Audiences in the journey">
          {lanes.map((l, i) => (<li key={l}><span className="mono dim">0{i + 1}</span><span>{l}</span></li>))}
        </ul>
        <p className="mono dim" style={{ marginTop: 18, textTransform: 'none', letterSpacing: '.02em', fontSize: '.78rem' }}>Illustrative visualisation — not project footage.</p>
      </div>
    </section>
  )
}

function Principles({ c }) {
  return (
    <section data-theme="dark2" className="section" aria-labelledby="pr-h" style={{ padding: 'calc(var(--section-space) * clamp(70px,9vw,150px)) 0' }}>
      <div className="wrap">
        <div className="cs-two" style={{ marginBottom: 'clamp(40px,6vw,90px)' }}>
          <div><Label n="05">{c.principlesTitle}</Label></div>
          <ScrollText as="h2" id="pr-h" kind="chars" by="chars" className="display display-md" text="Design for the state a user is in." style={{ margin: 0, maxWidth: '18ch' }} />
        </div>
        <div className="cs-pr">
          {c.principles.map(([t, d], i) => (
            <ScrollReveal key={t} kind={['left', 'up', 'right'][i % 3]} className="cs-pr-i" duration={1.2}>
              <span className="display cs-pr-n outline" aria-hidden="true">0{i + 1}</span>
              <h3 className="display display-sm" style={{ margin: '14px 0 12px' }}>{t}</h3>
              <p className="dim" style={{ margin: 0, maxWidth: '32ch' }}>{d}</p>
            </ScrollReveal>
          ))}
        </div>
        <MovingImage name={c.imageB} alt="Illustrative dots progressing along a path" aspect="21/9" speed={12} reveal="up" className="cs-wide" sizes="100vw" />
      </div>
    </section>
  )
}

function Roadmap({ c }) {
  const root = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const dots = gsap.utils.toArray('.rm-dot', root.current)
        dots.forEach((d) => gsap.set(d, { scale: 0.2, opacity: 0.3 }))
        ScrollTrigger.create({
          trigger: root.current.querySelector('.rm-track'), start: 'top 70%', end: 'bottom 40%', scrub: 0.4,
          onUpdate: (s) => dots.forEach((d, i) => { const on = s.progress >= (i + 0.2) / dots.length; gsap.to(d, { scale: on ? 1 : 0.2, opacity: on ? 1 : 0.3, duration: 0.4, overwrite: true }) }),
        })
      })
      mm.add(MQ.reduce, () => { gsap.set('.rm-dot', { scale: 1, opacity: 1 }) })
    },
    { scope: root },
  )
  return (
    <section ref={root} data-theme="dark2" className="section" aria-labelledby="rm-h" style={{ padding: 'calc(var(--section-space) * clamp(70px,9vw,150px)) 0' }}>
      <div className="wrap">
        <div className="cs-two" style={{ marginBottom: 'clamp(40px,6vw,90px)' }}>
          <div><Label n="04">A proposed roadmap</Label></div>
          <ScrollText as="h2" id="rm-h" kind="right" className="display display-md" text="Four moves toward a connected journey." style={{ margin: 0, maxWidth: '18ch' }} />
        </div>
        <ol className="rm-track">
          <SystemLine orientation="v" className="rm-line-v" style={{ left: 3 }} />
          {c.roadmap.map(([t, d], i) => (
            <li key={t}>
              <span className="rm-dot signal-dot" aria-hidden="true" />
              <ScrollReveal kind="up" duration={1.1}>
                <span className="mono dim">Move 0{i + 1}</span>
                <h3 className="display display-sm" style={{ margin: '10px 0 10px' }}>{t}</h3>
                <p className="dim" style={{ margin: 0, maxWidth: '36ch' }}>{d}</p>
              </ScrollReveal>
            </li>
          ))}
        </ol>
        {c.reflection && (
          <blockquote className="cs-quote">
            <ScrollText as="p" kind="up" className="serif" text={c.reflection} style={{ margin: 0 }} />
          </blockquote>
        )}
        <MovingImage name={c.imageB} alt="Illustrative lattice of connected points" aspect="21/9" speed={12} reveal="up" className="cs-wide" sizes="100vw" />
      </div>
    </section>
  )
}

/** Result — light world. Honest: no numbers unless USFL has published them. */
function Result({ c }) {
  return (
    <section data-theme="light" className="section" aria-labelledby="rs-h" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,170px)) 0' }}>
      <div className="wrap">
        <div className="cs-two">
          <div><Label n="Result">What was built</Label></div>
          <div>
            <ScrollReveal kind="up"><p className="display display-sm" style={{ margin: 0, maxWidth: '34ch' }}>{c.built}</p></ScrollReveal>
          </div>
        </div>
        <div className="cs-two" style={{ marginTop: 'clamp(56px,8vw,120px)' }}>
          <div><Label>Outcome</Label></div>
          <div>
            <ScrollText as="h2" id="rs-h" kind="left" className="display display-lg" text={c.result.headline} style={{ margin: 0, maxWidth: '14ch' }} />
            {c.result.bullets && (
              <ul className="cs-bul">
                {c.result.bullets.map((b, i) => (<li key={b}><ScrollReveal kind="up" delay={i * 0.06}><Signal /><span>{b}</span></ScrollReveal></li>))}
              </ul>
            )}
            {c.result.note && <p className="mono dim" style={{ marginTop: 32, textTransform: 'none', letterSpacing: '.02em', fontSize: '.8rem', maxWidth: '60ch' }}>{c.result.note}</p>}
          </div>
        </div>
        {c.quote && (
          <blockquote className="cs-quote" style={{ marginTop: 'clamp(56px,8vw,120px)' }}>
            <ScrollText as="p" kind="up" className="serif" text={c.quote} style={{ margin: 0 }} />
          </blockquote>
        )}
      </div>
    </section>
  )
}

function Takeaways({ c }) {
  return (
    <section data-theme="light" className="section" aria-labelledby="tk-h" style={{ padding: '0 0 calc(var(--section-space) * clamp(80px,10vw,170px))' }}>
      <div className="wrap">
        <div className="hairline" style={{ marginBottom: 'clamp(32px,5vw,64px)' }} />
        <Label>Takeaways</Label>
        <h2 id="tk-h" className="sr-only">Takeaways</h2>
        <ul className="cs-tk">
          {c.takeaways.map((t, i) => (
            <li key={t}><ScrollReveal kind={['left', 'up', 'right'][i % 3]}><span className="mono dim">0{i + 1}</span><p className="display display-sm" style={{ margin: '12px 0 0' }}>{t}</p></ScrollReveal></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Related({ c }) {
  const others = CASES.filter((x) => x.slug !== c.slug)
  return (
    <section data-theme="dark" className="section" aria-labelledby="rel-h" style={{ padding: 'calc(var(--section-space) * clamp(80px,10vw,160px)) 0' }}>
      <div className="wrap">
        <Label>More work</Label>
        <h2 id="rel-h" className="sr-only">More case studies</h2>
        <div className="cs-rel">
          {others.map((o, i) => (
            <TLink key={o.slug} to={caseUrl(o.slug)} shared className="cs-rel-i" aria-label={`${o.title} — view case study`}>
              <MovingImage name={o.image} alt={o.imageAlt} aspect={i ? '4/5' : '16/11'} speed={7} shared sizes="(min-width:900px) 46vw, 94vw" />
              <span className="mono dim" style={{ marginTop: 16, display: 'block' }}>{o.n} — {o.kicker}</span>
              <span className="display display-sm" style={{ display: 'block', marginTop: 8, maxWidth: '26ch' }}>{o.title}</span>
              <span className="tlink" style={{ marginTop: 10 }}>View <Arrow /></span>
            </TLink>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function CaseStudy({ c }) {
  const idx = CASES.findIndex((x) => x.slug === c.slug)
  const next = CASES.length > 1 ? CASES[(idx + 1) % CASES.length] : null
  const Variant = c.layout === 'journey' ? Journey : c.layout === 'principles' ? Principles : Roadmap
  const RoadmapFirst = c.layout === 'roadmap'
  return (
    <>
      <CaseStudyHero c={c} />
      <SectionTransition from="dark" to="light" type="rise" height="170vh" kicker="The engagement" lines={[c.kicker + '.']} />
      <Overview c={c} />
      <SectionTransition from="light" to="dark" type={c.layout === 'journey' ? 'diagonal' : c.layout === 'principles' ? 'shutter' : 'circle'} height="190vh" kicker="The challenge" lines={c.statement} />
      <Approach c={c} />
      {RoadmapFirst ? <Roadmap c={c} /> : <Variant c={c} />}
      <SectionTransition from="dark" to="light" type={c.layout === 'principles' ? 'circle' : 'hbars'} origin={[0.3, 0.5]} height="180vh" kicker="The outcome" lines={c.result.headline.split(' — ')} />
      <Result c={c} />
      <Takeaways c={c} />
      {c.cta?.label && c.cta?.to && (
        <section data-theme="light" className="section" style={{ padding: '0 0 calc(var(--section-space) * clamp(60px,8vw,120px))' }}>
          <div className="wrap"><MagneticButton to={c.cta.to}>{c.cta.label}</MagneticButton></div>
        </section>
      )}
      {CASES.length > 1 && <Related c={c} />}
      {next && <NextBlock label="Next case study" title={next.display.join(' ')} to={caseUrl(next.slug)} sub={next.kicker} />}
      <style>{`
        .cs-two{display:grid;gap:clamp(16px,3vw,40px);grid-template-columns:1fr}
        @media(min-width:900px){.cs-two{grid-template-columns:minmax(0,.36fr) minmax(0,1fr)}}
        .cs-obj{list-style:none;margin:0;padding:0;display:grid;gap:clamp(28px,4vw,56px) 40px;grid-template-columns:1fr}
        @media(min-width:700px){.cs-obj{grid-template-columns:1fr 1fr}}
        .cs-obj li{border-top:1px solid var(--line-dark);padding-top:18px}
        .cs-steps{list-style:none;margin:0;padding:0 0 0 clamp(24px,3vw,56px);position:relative;display:grid;gap:clamp(40px,6vw,88px);max-width:70ch}
        .cs-lanes{list-style:none;margin:20px 0 0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
        .cs-lanes li{display:flex;gap:12px;align-items:baseline;border-top:1px solid var(--line-dark);padding-top:12px}
        @media(min-width:700px){.cs-lanes{grid-template-columns:repeat(4,1fr)}}
        .cs-pr{display:grid;gap:clamp(36px,5vw,72px);grid-template-columns:1fr}
        @media(min-width:900px){.cs-pr{grid-template-columns:repeat(3,1fr)}}
        .cs-pr-n{font-size:clamp(4rem,9vw,9rem);line-height:.8;color:var(--faint-on-dark);display:block}
        .cs-wide{width:100%;margin-top:clamp(56px,8vw,120px)}
        .rm-track{list-style:none;margin:0;padding:0 0 0 clamp(28px,4vw,64px);position:relative;display:grid;gap:clamp(36px,5vw,72px)}
        .rm-track li{position:relative}
        .rm-dot{position:absolute;left:calc(-1 * clamp(28px,4vw,64px) - 1px);top:6px;width:8px;height:8px;border-radius:50%}
        @media(min-width:900px){
          .rm-track{grid-template-columns:repeat(4,1fr);padding:clamp(28px,3vw,44px) 0 0;gap:clamp(20px,2.4vw,40px)}
          .rm-track .rm-line-v{display:none}
          .rm-track::before{content:"";position:absolute;left:0;right:0;top:3px;height:1px;background:color-mix(in srgb, var(--line-dark-base) 18%, transparent)}
          .rm-dot{left:0;top:calc(-1 * clamp(28px,3vw,44px) + 0px)}
        }
        .cs-quote{margin:clamp(56px,8vw,120px) 0 0;padding:0;font-size:clamp(1.8rem,4.2vw,4.4rem);line-height:1.08;max-width:24ch;letter-spacing:-.01em}
        .cs-bul{list-style:none;margin:36px 0 0;padding:0;display:grid;gap:14px;max-width:56ch}
        .cs-bul li>div{display:flex;gap:16px;align-items:center;border-top:1px solid var(--line-light);padding-top:14px;font-size:1.05rem}
        .cs-tk{list-style:none;margin:32px 0 0;padding:0;display:grid;gap:36px;grid-template-columns:1fr}
        @media(min-width:900px){.cs-tk{grid-template-columns:repeat(3,1fr);gap:56px}}
        .cs-rel{display:grid;gap:clamp(40px,5vw,72px);grid-template-columns:1fr;margin-top:8px}
        .cs-rel-i{display:block}
        @media(min-width:900px){.cs-rel{grid-template-columns:1.25fr .75fr;align-items:end}}
      `}</style>
    </>
  )
}
