import { LOWER_L, SW, widthOf } from '../lib/wordmark'
import { BRAND } from '../platform/config'

const TICKS = BRAND.wordmark?.tickColors?.length === 4 ? BRAND.wordmark.tickColors : ['var(--signal)', 'var(--cool)', 'var(--light)', 'var(--signal)']

/** The lowercase `usfl` mark with the four-signal underline (the initials of Usable · Solutions · For · Life). */
export default function Wordmark({ className = '', ticks = true, title = 'usfl' }) {
  const w = widthOf(LOWER_L)
  return (
    <svg
      className={className}
      viewBox={`${-SW / 2} ${-SW / 2} ${w + SW} ${ticks ? 118 : 104}`}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      data-wordmark
    >
      <g fill="none" stroke="currentColor" strokeWidth={SW} strokeLinejoin="miter">
        {LOWER_L.map((g) => (
          <path key={g.ch} d={g.d} transform={`translate(${g.x} 0)`} />
        ))}
      </g>
      {ticks &&
        LOWER_L.map((g, i) => (
          <rect key={g.ch} x={g.x + 2} y={104} width={g.w - 4} height={5} style={{ fill: TICKS[i] }} data-tick={i} className={i === 2 ? 'tick-f' : ''} />
        ))}
    </svg>
  )
}
