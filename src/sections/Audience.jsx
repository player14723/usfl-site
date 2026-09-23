import { Fragment, useRef } from 'react'
import { gsap, ScrollTrigger, useGSAP, MQ } from '../lib/gsap'
import { itemsFrom } from '../platform/content'
import { useMotion } from '../platform/motion'
import { ScrollReveal, ScrollText } from '../components/ui/Reveal'
import Signal from '../components/ui/Signal'

/**
 * WHO THIS IS FOR — purely typographic. Three segments as large lines; on hover/focus the others recede,
 * the row's signal rule draws across and its description opens. On touch, descriptions are always visible.
 */
export default function Audience({ sid = 'audience', theme = 'light', eyebrow = '', lead = '', source = 'audience', items: own = [] }) {
  const m = useMotion()
  const AUDIENCE = itemsFrom(source, own)
  const hid = `${sid}-h`
  const root = useRef(null)
  const list = useRef(null)

  useGSAP(
    () => {
      if (!m.enabled) return
      const mm = gsap.matchMedia()
      mm.add(MQ.motion, () => {
        const rows = gsap.utils.toArray('.aud-row', list.current)
        rows.forEach((row, i) => {
          const rule = row.querySelector('.aud-rule i')
          const title = row.querySelectorAll('.si')
          gsap.set(title, { yPercent: 115 })
          gsap.set(rule, { scaleX: 0 })
          ScrollTrigger.create({
            trigger: row, start: 'top 86%', once: true,
            onEnter: () => {
              gsap.to(title, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05, delay: i * 0.05 })
              gsap.to(rule, { scaleX: 1, duration: 1.4, ease: 'expo.inOut' })
            },
          })
        })
      })
    },
    { scope: root },
  )

  return (
    <section ref={root} data-theme={theme} className="section" aria-labelledby={hid} style={{ padding: 'calc(var(--section-space) * clamp(80px,11vw,190px)) 0 calc(var(--section-space) * clamp(90px,12vw,200px))', overflow: 'clip' }}>
      <div className="wrap">
        <div className="aud-head">
          <p className="mono" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}><Signal /> {eyebrow}</p>
          <ScrollReveal kind="up" delay={0.1}>
            <p className="lead" style={{ margin: 0, maxWidth: '38ch' }}>{lead}</p>
          </ScrollReveal>
        </div>
        <h2 id={hid} className="sr-only">{eyebrow || 'Who this is for'}</h2>
        <ul ref={list} className="aud-list">
          {AUDIENCE.map((a) => (
            <li key={a.n + a.t} className="aud-row" tabIndex={0}>
              <span className="aud-rule" aria-hidden="true"><i /></span>
              <div className="aud-line">
                <span className="mono dim aud-n">{a.n}</span>
                <h3 className="display display-lg aud-t" aria-label={a.t} style={{ margin: 0 }}>
                  {a.t.split(' ').map((w, i, arr) => (
                    <Fragment key={i}>
                      <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }} aria-hidden="true"><span className="sw"><span className="si">{w}</span></span></span>{i < arr.length - 1 ? ' ' : null}
                    </Fragment>
                  ))}
                </h3>
                <p className="aud-d dim">{a.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .aud-head{display:grid;gap:24px;grid-template-columns:1fr;margin-bottom:clamp(40px,6vw,96px)}
        .aud-list{list-style:none;margin:0;padding:0}
        .aud-row{position:relative;padding:clamp(20px,2.6vw,40px) 0 clamp(22px,2.8vw,44px);outline-offset:-2px}
        .aud-rule{position:absolute;left:0;right:0;top:0;height:1px;background:color-mix(in srgb, var(--line-light-base) 16%, transparent);display:block}
        .aud-rule i{position:absolute;inset:0;background:var(--signal-ink);transform-origin:left;transform:scaleX(0);display:block}
        .aud-row::after{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:var(--signal-ink);transform:scaleX(0);transform-origin:left;transition:transform .8s var(--ease-out)}
        .aud-line{display:grid;gap:14px 28px;grid-template-columns:auto 1fr;align-items:baseline}
        .aud-t{transition:transform .8s var(--ease-out),color .6s var(--ease-out)}
        .aud-d{grid-column:2;margin:0;max-width:46ch;font-size:16px}
        @media (min-width:900px){
          .aud-line{grid-template-columns:72px minmax(0,1.5fr) minmax(0,.8fr);align-items:end}
          .aud-d{grid-column:3;padding-bottom:.6em;color:var(--faint-on-light);transition:color .6s var(--ease-out)}
          .aud-list:hover .aud-row:not(:hover) .aud-t{color:var(--recede-on-light)}
          .aud-row:hover::after,.aud-row:focus-visible::after{transform:scaleX(1)}
          .aud-row:hover .aud-t,.aud-row:focus-visible .aud-t{transform:translateX(16px)}
          .aud-row:hover .aud-d,.aud-row:focus-visible .aud-d,.aud-row:focus-within .aud-d{color:var(--muted-on-light)}
        }
        @media (min-width:900px) and (hover:none){.aud-d{color:var(--muted-on-light)}}
        .aud-t{font-size:clamp(2rem,5.2vw,6rem);max-width:16ch}
      `}</style>
    </section>
  )
}
