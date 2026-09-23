import { useRef } from 'react'
import { useParams } from 'react-router-dom'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { useSeo } from '../platform/seo'
import { SITE } from '../platform/config'
import { INSIGHTS, insightBySlug, insightUrl } from '../platform/content'
import PageHero from '../components/PageHero'
import NextBlock from '../components/NextBlock'
import SectionTransition from '../components/ui/SectionTransition'
import MovingImage from '../components/ui/MovingImage'
import MagneticButton from '../components/ui/MagneticButton'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import TLink from '../components/ui/TLink'
import Arrow from '../components/ui/Arrow'
import Signal from '../components/ui/Signal'
import NotFound from './NotFound'

function Block({ b }) {
  switch (b.t) {
    case 'p': return <ScrollReveal kind="up" duration={1}><p className="ar-p">{b.x}</p></ScrollReveal>
    case 'h': return <ScrollText as="h2" kind="left" className="display display-sm ar-h" text={b.x} />
    case 'pull': return <blockquote className="ar-pull"><ScrollText as="p" kind="up" className="serif" text={b.x} style={{ margin: 0 }} /></blockquote>
    case 'list': return <ul className="ar-list">{b.x.map((li, i) => (<li key={i}><ScrollReveal kind="up" delay={i * 0.05}><Signal /><span>{li}</span></ScrollReveal></li>))}</ul>
    case 'formula': return <ScrollReveal kind="up"><p className="ar-formula mono">{b.x}</p></ScrollReveal>
    case 'step': return (
      <ScrollReveal kind="up"><div className="ar-step"><span className="display outline ar-step-n" aria-hidden="true">{b.n}</span><div><h3 className="display display-sm" style={{ margin: 0 }}>{b.h}</h3><p className="ar-p" style={{ margin: '12px 0 0' }}>{b.x}</p></div></div></ScrollReveal>
    )
    case 'cta': return (
      <ScrollReveal kind="up"><div className="ar-cta"><p className="display display-sm" style={{ margin: '0 0 24px', maxWidth: '30ch' }}>{b.x}</p>{SITE.finalCta?.button?.to && <MagneticButton to={SITE.finalCta.button.to}>{SITE.finalCta.button.label}</MagneticButton>}</div></ScrollReveal>
    )
    default: return null
  }
}

function Progress({ target }) {
  const bar = useRef(null)
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const st = ScrollTrigger.create({ trigger: target.current, start: 'top 60%', end: 'bottom 60%', scrub: true, onUpdate: (s) => gsap.set(bar.current, { scaleY: s.progress }) })
        return () => st.kill()
      })
    },
    { dependencies: [] },
  )
  return (
    <div className="ar-prog" aria-hidden="true"><i ref={bar} /></div>
  )
}

export default function Article() {
  const { slug } = useParams()
  const a = insightBySlug(slug)
  const body = useRef(null)
  useSeo(a ? { title: a.seo?.title || a.title, description: a.seo?.description || a.dek, image: a.seo?.image, path: insightUrl(a.slug) } : { title: 'Not found', robots: 'noindex' }, [slug])
  if (!a) return <NotFound />
  const i = INSIGHTS.findIndex((x) => x.slug === a.slug)
  const next = INSIGHTS.length > 1 ? INSIGHTS[(i + 1) % INSIGHTS.length] : null
  const others = INSIGHTS.filter((x) => x.slug !== a.slug && x.slug !== next?.slug)
  return (
    <div key={a.slug}>
      <PageHero eyebrow={`${a.category} · ${a.read} min read`} lines={a.display} intro={a.dek} image={a.image} imageAlt={a.imageAlt} imageAspect="4/5" size="display-lg" />
      <SectionTransition from="dark" to="light" type="rise" height="150vh" kicker="Insight" lines={[a.category + '.']} />
      <article data-theme="light" className="section" style={{ padding: 'calc(var(--section-space) * clamp(70px,9vw,150px)) 0' }}>
        <div className="wrap ar-grid">
          <aside className="ar-side" aria-hidden="true"><Progress target={body} /></aside>
          <div ref={body} className="ar-body">
            {a.body.map((b, k) => (<Block key={k} b={b} />))}
          </div>
        </div>
        <style>{`
          .ar-grid{display:grid;grid-template-columns:1fr;gap:24px;position:relative}
          .ar-side{display:none}
          .ar-body{max-width:70ch;display:grid;gap:clamp(20px,2.4vw,32px)}
          .ar-p{margin:0;font-size:clamp(1.05rem,1.25vw,1.25rem);line-height:1.7;color:var(--text-on-light)}
          .ar-h{margin:clamp(24px,3vw,48px) 0 0!important}
          .ar-pull{margin:clamp(24px,4vw,56px) 0;padding:0;font-size:clamp(1.9rem,3.6vw,3.6rem);line-height:1.08;color:var(--ink);letter-spacing:-.01em}
          .ar-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
          .ar-list li>div{display:flex;gap:16px;align-items:baseline;border-top:1px solid var(--line-light);padding-top:12px;font-size:1.08rem}
          .ar-list .signal-dot{flex:none;transform:translateY(-2px)}
          .ar-formula{margin:8px 0;padding:clamp(20px,3vw,36px);background:var(--ink);color:var(--signal);font-size:clamp(.78rem,1.3vw,1.02rem);line-height:1.6;letter-spacing:.06em;text-transform:none;border-radius:2px}
          .ar-step{display:grid;grid-template-columns:auto 1fr;gap:clamp(16px,3vw,40px);border-top:1px solid var(--line-light);padding-top:22px}
          .ar-step-n{font-size:clamp(3.4rem,7vw,7rem);line-height:.8;color:var(--faint-on-light)}
          .ar-cta{margin-top:clamp(24px,4vw,56px);padding:clamp(24px,3vw,44px);background:var(--ink);color:var(--light);border-radius:var(--radius-card)}
          .ar-prog{position:sticky;top:calc(var(--nav-h) + 24px);height:38vh;width:1px;background:color-mix(in srgb, var(--line-light-base) 16%, transparent)}
          .ar-prog i{position:absolute;inset:0;background:var(--signal-ink);transform-origin:top;transform:scaleY(0)}
          @media(min-width:900px){.ar-grid{grid-template-columns:64px minmax(0,1fr);gap:clamp(24px,5vw,90px);margin-left:clamp(0px,8vw,160px)}.ar-side{display:block}}
        `}</style>
      </article>
      {others.length > 0 && <section data-theme="dark" className="section" aria-labelledby="ar-more" style={{ padding: 'calc(var(--section-space) * clamp(70px,9vw,140px)) 0' }}>
        <div className="wrap">
          <p className="mono" style={{ margin: '0 0 clamp(28px,4vw,56px)', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> Keep reading</p>
          <h2 id="ar-more" className="sr-only">More insights</h2>
          <div className="ar-more">
            {others.map((o) => (
              <TLink key={o.slug} to={insightUrl(o.slug)} className="ar-more-i" aria-label={`${o.title} — read insight`}>
                <MovingImage name={o.image} alt={o.imageAlt} aspect="16/9" speed={6} sizes="(min-width:900px) 40vw, 94vw" />
                <span className="mono dim" style={{ display: 'block', marginTop: 14 }}>{o.category} · {o.read} min read</span>
                <span className="display display-sm" style={{ display: 'block', marginTop: 8, maxWidth: '26ch' }}>{o.title}</span>
              </TLink>
            ))}
          </div>
        </div>
        <style>{`.ar-more{display:grid;gap:40px;grid-template-columns:1fr}.ar-more-i{display:block}@media(min-width:900px){.ar-more{grid-template-columns:repeat(2,1fr)}}`}</style>
      </section>}
      {next && <NextBlock label="Next insight" title={next.title} to={insightUrl(next.slug)} sub={`${next.category} · ${next.read} min read`} />}
    </div>
  )
}
