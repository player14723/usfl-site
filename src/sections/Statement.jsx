import { ScrollText } from '../components/ui/Reveal'
import Signal from '../components/ui/Signal'

/** STATEMENT — one or more large lines on their own. align: "left" | "center". size: "lg" | "xl" | "md". */
export default function Statement({ sid = 'statement', theme = 'dark', eyebrow = '', lines = [], align = 'left', size = 'lg', accentLast = false }) {
  const hid = `${sid}-h`
  const center = align === 'center'
  return (
    <section data-theme={theme} className="section" aria-labelledby={hid} style={{ padding: 'calc(var(--section-space) * clamp(90px,12vw,200px)) 0' }}>
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'flex-start', textAlign: center ? 'center' : 'left', gap: 'clamp(10px,1.6vw,22px)' }}>
        {eyebrow && <p className="mono" style={{ margin: '0 0 clamp(12px,2vw,24px)', display: 'flex', gap: 10, alignItems: 'center' }}><Signal /> {eyebrow}</p>}
        {lines.map((l, i) => (
          <ScrollText key={i} as={i === 0 ? 'h2' : 'p'} id={i === 0 ? hid : undefined} kind={i % 2 ? 'right' : 'left'} text={l}
            className={`display display-${['md', 'lg', 'xl'].includes(size) ? size : 'lg'} ${accentLast && i === lines.length - 1 ? 'st-accent' : ''}`}
            style={{ margin: 0, maxWidth: '18ch' }} />
        ))}
      </div>
      <style>{`.st-accent{color:var(--signal)} [data-theme="light"] .st-accent{color:var(--signal-ink)}`}</style>
    </section>
  )
}
