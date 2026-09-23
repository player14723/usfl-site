import { useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { CASES, caseBySlug, caseUrl } from '../platform/content'
import { resolveCinematic, resolveImage } from '../platform/media'
import { useMotion, SCENES } from '../platform/motion'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import Cinematic from '../components/ui/Cinematic'
import MovingImage from '../components/ui/MovingImage'
import TLink from '../components/ui/TLink'
import SplitText from '../components/SplitText'
import Arrow from '../components/ui/Arrow'

/**
 * LEAD SCENE — Video 3. It begins as a still editorial image, cropped like a magazine spread.
 * The picture drifts and re-crops as you approach; then one small detail starts to move (a circle of video
 * opens on the journey nodes, ringed by the signal); the circle grows until the whole still has come alive.
 */
function LeadScene({ lead = {}, scrollLength = 1 }) {
  const LEAD = caseBySlug(lead.caseStudy) || CASES[0]
  const m = useMotion()
  const cin = resolveCinematic(lead.cinematic)
  const stillSrc = cin?.poster || resolveImage(LEAD?.image)?.src || ''
  const TL = lead.titleLines?.length ? lead.titleLines : LEAD?.display || []
  const heightVh = Math.round(480 * (Number(scrollLength) || 1) * (Number(SCENES.scrollLength) || 1))
  const root = useRef(null)
  const still = useRef(null)
  const video = useRef(null)
  const frame = useRef(null)
  const vclip = useRef(null)
  const ring = useRef(null)
  const t1 = useRef(null), t2 = useRef(null), t3 = useRef(null), meta = useRef(null), sum = useRef(null), cta = useRef(null)
  const cap = useRef(null)

  useGSAP(
    () => {
      if (!m.enabled || !LEAD) { if (frame.current) gsap.set(frame.current, { clipPath: 'none' }); return }
      const mm = gsap.matchMedia()
      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (ctx) => {
        if (!ctx.conditions.motion) return
        const D = ctx.conditions.desktop
        const CX = D ? 62 : 58, CY = 52 // where the "detail" lives, % of frame
        const crop0 = D ? 'inset(9% 46% 9% 6% round 2px)' : 'inset(20% 12% 34% 12% round 2px)'
        const crop1 = D ? 'inset(7% 22% 7% 30% round 2px)' : 'inset(14% 4% 30% 4% round 2px)'
        const crop2 = D ? 'inset(0% 0% 0% 0% round 0px)' : 'inset(0% 0% 0% 0% round 0px)'
        const crop3 = D ? 'inset(6% 6% 6% 40% round 2px)' : 'inset(0% 0% 0% 0% round 0px)'
        const R = () => Math.hypot(window.innerWidth, window.innerHeight)
        gsap.set(frame.current, { clipPath: crop0 })
        gsap.set(still.current, { scale: 1.22, xPercent: -6 })
        if (video.current?.inner) gsap.set(video.current.inner, { scale: 1.22, xPercent: -6 })
        gsap.set(vclip.current, { clipPath: `circle(0px at ${CX}% ${CY}%)` })
        gsap.set(ring.current, { left: `${CX}%`, top: `${CY}%`, scale: 0, opacity: 0 })
        const words = [t1, t2, t3].map((r) => r.current.querySelectorAll('.si'))
        gsap.set(words[0], { xPercent: -105, opacity: 0 })
        gsap.set(words[1], { yPercent: 115 })
        gsap.set(words[2], { xPercent: 105, opacity: 0 })
        gsap.set([meta.current, sum.current, cta.current, cap.current], { opacity: 0, y: 24 })

        const o = { r: 0 }
        let played = false
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true,
            onUpdate: (self) => {
              // the video only spends CPU once the detail begins to move
              const v = video.current?.video
              if (self.progress > 0.24 && self.progress < 0.97) { if (v && v.paused) { v.currentTime = 0; v.play().catch(() => {}) } }
              else if (v && !v.paused) v.pause()
              if (v && self.progress > 0.24 && !played) { played = true; v.style.opacity = '1' }
            },
          },
        })
        // 1 — the still arrives as a cropped editorial frame; the picture drifts and the crop shifts
        tl.to(frame.current, { clipPath: crop1, duration: 1.1 }, 0)
        tl.to([still.current, video.current?.inner].filter(Boolean), { scale: 1.08, xPercent: 0, duration: 1.7 }, 0)
        tl.to(words[0], { xPercent: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.05)
        tl.to(words[1], { yPercent: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.15)
        tl.to(words[2], { xPercent: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' }, 0.25)
        tl.to([meta.current, cap.current], { opacity: 1, y: 0, duration: 0.4 }, 0.25)
        // 2 — one detail wakes: a ring, then a circle of motion
        tl.to(ring.current, { opacity: 1, scale: 0.18, duration: 0.3, ease: 'power2.out' }, 1.15)
        tl.to(o, { r: 1, duration: 0.55, ease: 'power2.out', onUpdate: () => { vclip.current.style.clipPath = `circle(${o.r * 0.09 * R()}px at ${CX}% ${CY}%)` } }, 1.2)
        // 3 — it spreads until the still has become film
        const p = { r: 0.09 }
        tl.to(p, { r: 1.05, duration: 1.15, ease: 'power2.inOut', onUpdate: () => { vclip.current.style.clipPath = `circle(${p.r * R()}px at ${CX}% ${CY}%)` } }, 1.75)
        tl.to(ring.current, { scale: () => (R() * 2.2) / 200, duration: 1.15, ease: 'power2.inOut' }, 1.75)
        tl.to(ring.current, { opacity: 0, duration: 0.2 }, 2.75)
        tl.to(frame.current, { clipPath: crop2, duration: 1.15, ease: 'power2.inOut' }, 1.75)
        // 4 — the title slides over the moving picture; summary and link arrive
        tl.to(words[1], { xPercent: D ? 8 : 0, duration: 1.2 }, 2.4)
        tl.to([sum.current, cta.current], { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out' }, 2.9)
        tl.to(frame.current, { clipPath: crop3, duration: 0.9, ease: 'power2.inOut' }, 3.3)
        tl.to({}, { duration: 0.001 }, 4.2)
        return () => { tl.scrollTrigger?.kill(); tl.kill() }
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="lead-scene" style={{ height: `${heightVh}vh`, position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'clip' }}>
        <div ref={frame} className="lead-frame" style={{ position: 'absolute', inset: 0 }}>
          {/* still — identical to frame 0 of the video, so the hand-off is invisible */}
          {stillSrc && <img ref={still} src={stillSrc} alt="" loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} data-shared-img />}
          {/* video, revealed through a circle around the detail (optional: without a cinematic the still carries the scene) */}
          <div ref={vclip} style={{ position: 'absolute', inset: 0 }}>
            {cin && !cin.disabled && cin.type === 'video' && <Cinematic ref={video} id={lead.cinematic} playback="manual" noPoster style={{ position: 'absolute', inset: 0 }} />}
          </div>
          <div ref={ring} aria-hidden="true" style={{ position: 'absolute', width: 200, height: 200, marginLeft: -100, marginTop: -100, borderRadius: '50%', border: '1px solid var(--signal)', boxShadow: '0 0 28px color-mix(in srgb, var(--signal) 40%, transparent)', pointerEvents: 'none' }} />
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, color-mix(in srgb, var(--overlay) 70%, transparent), transparent 60%)', pointerEvents: 'none' }} />
        </div>

        <div className="wrap lead-copy">
          <div ref={meta} className="mono" style={{ color: 'var(--signal)', marginBottom: 'clamp(12px,2vh,24px)' }}>{LEAD.n} — {LEAD.kicker}</div>
          <h3 className="display lead-title" aria-label={LEAD.title}>
            <SplitText ref={t1} as="span" text={TL[0] || ''} style={{ display: 'block' }} />
            <SplitText ref={t2} as="span" text={TL[1] || ''} style={{ display: 'block' }} />
            <SplitText ref={t3} as="span" text={TL.slice(2).join(' ')} style={{ display: 'block' }} />
          </h3>
          <p ref={sum} className="lead" style={{ margin: 'clamp(18px,3vh,32px) 0 0', maxWidth: '38ch', color: 'var(--light)' }}>
            {lead.summary || LEAD.summary}
          </p>
          <div ref={cta} style={{ marginTop: 22 }}>
            <TLink to={caseUrl(LEAD.slug)} shared className="tlink" data-cursor="View">{lead.linkLabel || 'Read the story'} <Arrow /></TLink>
          </div>
        </div>
        <div ref={cap} className="tag-illus" style={{ left: 'auto', right: 'var(--gutter)', bottom: 20, display: lead.caption ? undefined : 'none' }}>{lead.caption}</div>
      </div>
      <style>{`
        .lead-copy{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:clamp(40px,10vh,110px);pointer-events:none}
        .lead-copy>*{pointer-events:auto}
        .lead-title{margin:0;font-size:clamp(2.6rem,8.2vw,9.4rem);line-height:.9;letter-spacing:-.04em;font-weight:600;font-stretch:90%;max-width:12ch}
        .lead-title .si.serif{font-family:var(--font-serif);font-style:italic;font-weight:400}
        @media(max-width:899px){.lead-title{font-size:clamp(2.4rem,12.5vw,5rem);max-width:none}}
        /* static (motion off) */ .motion-off .lead-scene{height:auto !important}.motion-off .lead-scene>div{position:relative !important;height:100svh !important}
      `}</style>
    </div>
  )
}

function SupportingCase({ c, flip = false, ratio = '16/10', linkLabel }) {
  return (
    <TLink to={caseUrl(c.slug)} shared className={`sup ${flip ? 'sup-flip' : ''}`} data-cursor="View" aria-label={`${c.title} — read the case study`}>
      <MovingImage name={c.image} alt={c.imageAlt} aspect={ratio} speed={10} reveal={flip ? 'left' : 'right'} shared sizes="(min-width:900px) 58vw, 92vw" className="sup-img" />
      <div className="sup-copy">
        <span className="mono dim">{c.n} — {c.kicker}</span>
        <h3 className="display display-md" style={{ margin: '12px 0 0' }}>{c.display.join(' ')}</h3>
        <span className="tlink" style={{ marginTop: 20 }}>{linkLabel || 'Read the story'} <Arrow /></span>
      </div>
    </TLink>
  )
}

const RATIOS = ['16/10', '4/5']

/** SELECTED WORK — a lead case study as a scroll scene (still → film), then supporting case studies. */
export default function SelectedWork({ sid = 'selected-work', eyebrow = '', heading = '', linkLabel = '', linkTo = '', lead = {}, pair = [], scrollLength = 1 }) {
  const hid = `${sid}-h`
  const leadCase = caseBySlug(lead.caseStudy) || CASES[0]
  const pairCases = (pair?.length ? pair.map(caseBySlug) : CASES.filter((c) => c !== leadCase).slice(0, 2)).filter(Boolean)
  return (
    <section data-theme="dark" className="section" aria-labelledby={heading ? hid : undefined} aria-label={heading ? undefined : eyebrow || 'Selected work'} style={{ paddingTop: 'calc(var(--section-space) * clamp(90px,10vw,170px))' }}>
      {(eyebrow || heading || linkLabel) && (
        <div className="wrap" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 'clamp(40px,6vw,90px)' }}>
          <div>
            {eyebrow && <p className="mono dim" style={{ margin: '0 0 22px' }}>{eyebrow}</p>}
            {heading && <ScrollText as="h2" id={hid} kind="right" text={heading} className="display display-xl" style={{ margin: 0, maxWidth: '10ch' }} />}
          </div>
          {linkLabel && linkTo && <ScrollReveal kind="up" delay={0.15}><TLink to={linkTo} className="tlink">{linkLabel} <Arrow /></TLink></ScrollReveal>}
        </div>
      )}

      {leadCase && <LeadScene lead={{ ...lead, caseStudy: leadCase.slug }} scrollLength={scrollLength} />}

      {pairCases.length > 0 && (
        <div className="wrap sup-wrap">
          {pairCases.map((c, i) => (<SupportingCase key={c.slug} c={c} flip={i % 2 === 1} ratio={RATIOS[i % 2]} linkLabel={lead.linkLabel} />))}
        </div>
      )}
      <style>{`
        .sup-wrap{padding-top:clamp(60px,9vw,150px);padding-bottom:clamp(90px,12vw,200px);display:grid;gap:clamp(70px,10vw,170px)}
        .sup{display:grid;gap:22px;align-items:end}
        .sup-copy{display:flex;flex-direction:column;align-items:flex-start}
        .sup .frame{transition:transform .9s var(--ease-out)}
        .sup:hover .frame{transform:scale(.985)}
        @media(min-width:900px){
          .sup{grid-template-columns:repeat(12,1fr);gap:0 24px}
          .sup .sup-img{grid-column:1/9}.sup .sup-copy{grid-column:9/13;padding-bottom:4px}
          .sup .sup-copy{padding-left:clamp(8px,1.4vw,24px)}
          .sup-flip .sup-img{grid-column:7/12;grid-row:1}.sup-flip .sup-copy{grid-column:1/7;grid-row:1;align-items:flex-end;text-align:right}
          .sup-flip .sup-copy{padding-left:0;padding-right:clamp(8px,1.4vw,24px)}
        }
      `}</style>
    </section>
  )
}
